// Minimal MIDI parser + Web Audio synthesizer for background music
function readVLQ(view, offset) {
    let value = 0;
    let byte;
    do {
        byte = view.getUint8(offset++);
        value = (value << 7) | (byte & 0x7F);
    } while (byte & 0x80);
    return [value, offset];
}
function parseTrack(view, start, end) {
    const events = [];
    let offset = start;
    let running = 0;
    let tick = 0;
    while (offset < end) {
        const [delta, o1] = readVLQ(view, offset);
        offset = o1;
        tick += delta;
        let status = view.getUint8(offset);
        if (status === 0xFF) {
            offset++;
            const metaType = view.getUint8(offset++);
            const [len, o2] = readVLQ(view, offset);
            offset = o2;
            const data = [];
            for (let i = 0; i < len; i++)
                data.push(view.getUint8(offset++));
            events.push({ tick, status: 0xFF00 | metaType, channel: 0, data });
            running = 0;
        }
        else if (status === 0xF0 || status === 0xF7) {
            offset++;
            const [len, o2] = readVLQ(view, offset);
            offset = o2 + len;
            running = 0;
        }
        else {
            if (status & 0x80) {
                running = status;
                offset++;
            }
            else {
                status = running;
            }
            const type = status & 0xF0;
            const channel = status & 0x0F;
            if (type === 0xC0 || type === 0xD0) {
                events.push({ tick, status: type, channel, data: [view.getUint8(offset++)] });
            }
            else {
                const d1 = view.getUint8(offset++);
                const d2 = view.getUint8(offset++);
                events.push({ tick, status: type, channel, data: [d1, d2] });
            }
        }
    }
    return events;
}
function parseMidi(buffer) {
    const view = new DataView(buffer);
    const headerLen = view.getUint32(4);
    const numTracks = view.getUint16(10);
    const division = view.getUint16(12);
    let offset = 8 + headerLen;
    const all = [];
    for (let t = 0; t < numTracks; t++) {
        offset += 4; // "MTrk"
        const len = view.getUint32(offset);
        offset += 4;
        all.push(...parseTrack(view, offset, offset + len));
        offset += len;
    }
    all.sort((a, b) => a.tick - b.tick);
    // Convert ticks to seconds with tempo tracking
    let currentTick = 0;
    let currentTime = 0;
    let tempo = 500000; // 120 BPM default
    const tickTime = new Map();
    for (const e of all) {
        if (e.tick > currentTick) {
            currentTime += ((e.tick - currentTick) / division) * (tempo / 1_000_000);
            currentTick = e.tick;
        }
        tickTime.set(e.tick, currentTime);
        if (e.status === (0xFF00 | 0x51) && e.data.length >= 3) {
            tempo = (e.data[0] << 16) | (e.data[1] << 8) | e.data[2];
        }
    }
    // Pair note-on / note-off
    const active = new Map();
    const notes = [];
    for (const e of all) {
        const time = tickTime.get(e.tick) ?? 0;
        if (e.status === 0x90 && e.data[1] > 0) {
            const key = `${e.channel}-${e.data[0]}`;
            active.set(key, { time, velocity: e.data[1], channel: e.channel, note: e.data[0] });
        }
        else if (e.status === 0x80 || (e.status === 0x90 && e.data[1] === 0)) {
            const key = `${e.channel}-${e.data[0]}`;
            const on = active.get(key);
            if (on) {
                notes.push({ time: on.time, duration: Math.max(time - on.time, 0.05), note: on.note, velocity: on.velocity, channel: on.channel });
                active.delete(key);
            }
        }
    }
    // Close orphaned notes
    for (const [, on] of active) {
        notes.push({ ...on, duration: Math.max(currentTime - on.time, 0.1) });
    }
    return { notes, duration: currentTime + 0.5 };
}
// ── Web Audio Player ──
export default class MusicPlayer {
    ctx = null;
    masterGain = null;
    notes = [];
    duration = 0;
    _playing = false;
    async load(url) {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const parsed = parseMidi(buf);
        this.notes = parsed.notes;
        this.duration = parsed.duration;
    }
    toggle() {
        if (this._playing) {
            this._playing = false;
            this.ctx?.suspend();
        }
        else {
            this._playing = true;
            if (this.ctx) {
                this.ctx.resume();
            }
            else {
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.25;
                this.masterGain.connect(this.ctx.destination);
                this.schedulePlayback();
            }
        }
    }
    get isPlaying() {
        return this._playing;
    }
    schedulePlayback() {
        const ctx = this.ctx;
        const master = this.masterGain;
        const now = ctx.currentTime + 0.05;
        for (const n of this.notes) {
            if (n.channel === 9)
                continue; // skip percussion channel
            const freq = 440 * Math.pow(2, (n.note - 69) / 12);
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const vol = (n.velocity / 127) * 0.12;
            const start = now + n.time;
            const end = start + n.duration;
            const attack = Math.min(0.015, n.duration / 3);
            const release = Math.min(0.05, n.duration / 3);
            env.gain.setValueAtTime(0, start);
            env.gain.linearRampToValueAtTime(vol, start + attack);
            if (end - release > start + attack) {
                env.gain.setValueAtTime(vol, end - release);
            }
            env.gain.linearRampToValueAtTime(0, end);
            osc.connect(env);
            env.connect(master);
            osc.start(start);
            osc.stop(end + 0.02);
        }
        // Silent sentinel triggers the next loop
        const sentinel = ctx.createOscillator();
        const silent = ctx.createGain();
        silent.gain.value = 0;
        sentinel.connect(silent);
        silent.connect(ctx.destination);
        sentinel.start(now + this.duration);
        sentinel.stop(now + this.duration + 0.01);
        sentinel.onended = () => {
            if (this._playing)
                this.schedulePlayback();
        };
    }
}
