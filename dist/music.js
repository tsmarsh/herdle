export default class MusicPlayer {
    audio;
    constructor(url) {
        this.audio = new Audio(url);
        this.audio.loop = true;
        this.audio.volume = 0.25;
    }
    toggle() {
        if (this.audio.paused) {
            this.audio.play();
        }
        else {
            this.audio.pause();
        }
    }
    get isPlaying() {
        return !this.audio.paused;
    }
}
