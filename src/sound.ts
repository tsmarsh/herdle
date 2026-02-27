// Procedural sound effects via Web Audio API

interface DogVoice {
    freq: number;
    type: OscillatorType;
}

const DOG_VOICES: Record<string, DogVoice> = {
    ace:  { freq: 320, type: 'square' },
    shep: { freq: 440, type: 'sawtooth' },
    duke: { freq: 220, type: 'square' },
    fido: { freq: 520, type: 'triangle' },
};

export default class SoundEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;

    private getCtx(): AudioContext {
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.4;
            this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    private out(): GainNode {
        this.getCtx();
        return this.master!;
    }

    // ── Dog barks ──

    /** Short bark when dog receives a destination */
    dogAck(dogId: string): void {
        const voice = DOG_VOICES[dogId] ?? DOG_VOICES.ace;
        this.barkOnce(voice.freq, voice.type, 0);
    }

    /** Happy double-bark when dog arrives */
    dogDone(dogId: string): void {
        const voice = DOG_VOICES[dogId] ?? DOG_VOICES.ace;
        const pitch = voice.freq * 1.15; // slightly higher = happy
        this.barkOnce(pitch, voice.type, 0);
        this.barkOnce(pitch * 1.05, voice.type, 0.12);
    }

    private barkOnce(freq: number, type: OscillatorType, delay: number): void {
        const ctx = this.getCtx();
        const now = ctx.currentTime + delay;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + 0.09);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.setValueAtTime(0.25, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.out());
        osc.start(now);
        osc.stop(now + 0.12);
    }

    // ── Sheep sounds ──

    /** Gentle bleat for moving sheep */
    bleat(): void {
        this.sheepSound(350 + Math.random() * 100, 8, 40, 0.08, 0.25);
    }

    /** Panicked scream for spooked sheep */
    scream(): void {
        this.sheepSound(550 + Math.random() * 150, 14, 90, 0.15, 0.35);
    }

    private sheepSound(freq: number, vibratoRate: number, vibratoDepth: number, volume: number, duration: number): void {
        const ctx = this.getCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const env = ctx.createGain();

        // Main voice
        osc.type = 'triangle';
        osc.frequency.value = freq;

        // Vibrato
        lfo.type = 'sine';
        lfo.frequency.value = vibratoRate;
        lfoGain.gain.value = vibratoDepth;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        // Envelope
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(volume, now + 0.02);
        env.gain.setValueAtTime(volume, now + duration * 0.6);
        env.gain.linearRampToValueAtTime(0, now + duration);

        osc.connect(env);
        env.connect(this.out());

        osc.start(now);
        lfo.start(now);
        osc.stop(now + duration + 0.02);
        lfo.stop(now + duration + 0.02);
    }
}
