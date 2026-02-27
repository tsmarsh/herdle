export default class MusicPlayer {
    private audio: HTMLAudioElement;

    constructor(url: string) {
        this.audio = new Audio(url);
        this.audio.loop = true;
        this.audio.volume = 0.25;
    }

    toggle(): void {
        if (this.audio.paused) {
            this.audio.play().catch(() => {});
        } else {
            this.audio.pause();
        }
    }

    get isPlaying(): boolean {
        return !this.audio.paused;
    }
}
