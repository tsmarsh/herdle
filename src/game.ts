import { Dog, Sheep, Obstacle, Pen, SheepState } from './entities.js';
import Renderer from './renderer.js';
import { LEVELS } from './levels.js';
import Vector from './vector.js';
import { GameConfig, loadConfig, saveConfig, DEFAULT_CONFIG } from './config.js';
import MusicPlayer from './music.js';
import SoundEngine from './sound.js';

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private renderer: Renderer;
    private dogs: Dog[] = [];
    private activeDogs: Dog[] = [];
    private sheep: Sheep[] = [];
    private numSheep: number = 0;
    private obstacles: Obstacle[] = [];
    private pen!: Pen;
    private pennedCount: number = 0;
    private keysPressed: Record<string, boolean> = {};
    private lastTime: number = 0;
    private currentLevelIndex: number = 0;
    private levelComplete: boolean = false;
    private currentLevelName: string = '';
    private config: GameConfig;
    private configOpen: boolean = false;
    private music: MusicPlayer;
    private sound: SoundEngine = new SoundEngine();

    constructor() {
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        const context = this.canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        this.ctx = context;

        const hudItems = {
            'dog-ace': document.getElementById('dog-ace'),
            'dog-shep': document.getElementById('dog-shep'),
            'dog-duke': document.getElementById('dog-duke'),
            'dog-fido': document.getElementById('dog-fido')
        };

        this.renderer = new Renderer(this.canvas, hudItems);
        this.config = loadConfig();
        this.music = new MusicPlayer('music.ogg');

        this.initGame();
        this.setupInput();
        this.setupConfigUI();
        this.setupMusicUI();
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.loadLevel(0);
        requestAnimationFrame((t) => this.loop(t));
    }

    private initGame(): void {
        this.dogs = this.config.dogs.map(dc =>
            new Dog(dc.id, dc.name, dc.key, dc.color, 50, 50, dc.personality)
        );
    }

    private loadLevel(index: number): void {
        this.currentLevelIndex = index;
        const levelConfig = LEVELS[this.currentLevelIndex];
        this.currentLevelName = levelConfig.name;
        this.numSheep = levelConfig.numSheep;
        this.levelComplete = false;
        this.pennedCount = 0;

        const env = levelConfig.setupEnvironment(this.canvas.width, this.canvas.height);
        this.pen = env.pen;
        this.obstacles = env.obstacles;

        const { sheepPanicRadius, sheepFlockRadius } = this.config.settings;
        this.sheep = env.sheepSpawns.map(pos => new Sheep(pos.x, pos.y, sheepPanicRadius, sheepFlockRadius));

        this.activeDogs = this.dogs.filter(d => levelConfig.availableDogs.includes(d.key));
        this.activeDogs.forEach((dog, i) => {
            dog.pos = new Vector(50, 50 + i * 100);
            dog.vel = new Vector();
            dog.destination = null;
        });
    }

    private setupInput(): void {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            if (e.key === 'Escape') {
                if (this.configOpen) {
                    this.closeConfig();
                } else {
                    this.openConfig();
                }
                return;
            }

            if (key === 'm') {
                this.toggleMusic();
                return;
            }

            this.keysPressed[key] = true;
            this.updateSelection();
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = false;
            this.updateSelection();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.configOpen) return;

            if (this.levelComplete) {
                if (this.currentLevelIndex < LEVELS.length - 1) {
                    this.loadLevel(this.currentLevelIndex + 1);
                } else {
                    this.loadLevel(0);
                }
                return;
            }

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            for (const dog of this.activeDogs) {
                if (dog.selected) {
                    const hadDest = dog.destination !== null;
                    dog.setDestination(mouseX, mouseY);
                    if (!hadDest && dog.destination) {
                        this.sound.dogAck(dog.id);
                    }
                }
            }
        });
    }

    private setupConfigUI(): void {
        const btn = document.getElementById('config-btn');
        const overlay = document.getElementById('config-overlay');
        const applyBtn = document.getElementById('config-apply');
        const resetBtn = document.getElementById('config-reset');

        btn?.addEventListener('click', () => this.openConfig());
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeConfig();
        });
        applyBtn?.addEventListener('click', () => this.applyConfig());
        resetBtn?.addEventListener('click', () => this.resetConfig());

        // Wire up live slider value displays
        const sliders = document.querySelectorAll<HTMLInputElement>('#config-modal input[type="range"]');
        for (const slider of sliders) {
            slider.addEventListener('input', () => {
                const display = slider.parentElement?.querySelector('.slider-value');
                if (display) display.textContent = slider.value;
            });
        }
    }

    private setupMusicUI(): void {
        document.getElementById('music-btn')?.addEventListener('click', () => this.toggleMusic());
    }

    private toggleMusic(): void {
        this.music.toggle();
        document.getElementById('music-btn')?.classList.toggle('muted', !this.music.isPlaying);
    }

    private openConfig(): void {
        this.configOpen = true;
        this.populateConfigUI();
        document.getElementById('config-overlay')?.classList.remove('hidden');
    }

    private closeConfig(): void {
        this.configOpen = false;
        document.getElementById('config-overlay')?.classList.add('hidden');
    }

    private populateConfigUI(): void {
        for (const dc of this.config.dogs) {
            const setSlider = (trait: string, value: number) => {
                const el = document.getElementById(`${dc.id}-${trait}`) as HTMLInputElement | null;
                if (el) {
                    el.value = String(value);
                    const display = el.parentElement?.querySelector('.slider-value');
                    if (display) display.textContent = String(value);
                }
            };
            setSlider('speed', dc.personality.speed);
            setSlider('obedience', dc.personality.obedience);
            setSlider('distractibility', dc.personality.distractibility);
        }

        const s = this.config.settings;
        const setGameSlider = (id: string, value: number) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el) {
                el.value = String(value);
                const display = el.parentElement?.querySelector('.slider-value');
                if (display) display.textContent = String(value);
            }
        };
        setGameSlider('cfg-sheep-count', s.sheepCount);
        setGameSlider('cfg-panic-radius', s.sheepPanicRadius);
        setGameSlider('cfg-flock-radius', s.sheepFlockRadius);
        setGameSlider('cfg-obstacle-count', s.obstacleCount);
        setGameSlider('cfg-pen-size', s.penSize);
    }

    private readConfigFromUI(): void {
        for (const dc of this.config.dogs) {
            const readSlider = (trait: string): number | null => {
                const el = document.getElementById(`${dc.id}-${trait}`) as HTMLInputElement | null;
                return el ? parseFloat(el.value) : null;
            };
            dc.personality.speed = readSlider('speed') ?? dc.personality.speed;
            dc.personality.obedience = readSlider('obedience') ?? dc.personality.obedience;
            dc.personality.distractibility = readSlider('distractibility') ?? dc.personality.distractibility;
        }

        const readGameSlider = (id: string): number | null => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            return el ? parseFloat(el.value) : null;
        };
        this.config.settings.sheepCount = readGameSlider('cfg-sheep-count') ?? this.config.settings.sheepCount;
        this.config.settings.sheepPanicRadius = readGameSlider('cfg-panic-radius') ?? this.config.settings.sheepPanicRadius;
        this.config.settings.sheepFlockRadius = readGameSlider('cfg-flock-radius') ?? this.config.settings.sheepFlockRadius;
        this.config.settings.obstacleCount = readGameSlider('cfg-obstacle-count') ?? this.config.settings.obstacleCount;
        this.config.settings.penSize = readGameSlider('cfg-pen-size') ?? this.config.settings.penSize;
    }

    private applyConfig(): void {
        this.readConfigFromUI();
        saveConfig(this.config);
        this.renderer.resetObstacleCache();
        this.initGame();
        this.loadLevel(this.currentLevelIndex);
        this.closeConfig();
    }

    private resetConfig(): void {
        this.config = structuredClone(DEFAULT_CONFIG);
        this.populateConfigUI();
    }

    private resize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.pen) this.loadLevel(this.currentLevelIndex);
    }

    private updateSelection(): void {
        for (const dog of this.activeDogs) {
            dog.selected = !!this.keysPressed[dog.key];
        }
    }

    private update(dt: number): void {
        if (this.levelComplete) return;

        // Track dog destinations before update (for arrival barks)
        const dogHadDest = this.activeDogs.map(d => d.destination !== null);

        for (const dog of this.activeDogs) {
            dog.updateDog(dt, this.obstacles, this.canvas.width, this.canvas.height);
        }

        // Dog arrival barks
        this.activeDogs.forEach((dog, i) => {
            if (dogHadDest[i] && dog.destination === null) {
                this.sound.dogDone(dog.id);
            }
        });

        // Track sheep states before update (for scream triggers)
        const sheepWasSpooked = this.sheep.map(s => s.state === SheepState.SPOOKED);

        let newPennedCount = 0;
        for (const s of this.sheep) {
            s.updateSheep(dt, this.activeDogs, this.sheep, this.obstacles, this.pen, this.canvas.width, this.canvas.height);
            if (this.pen.contains(s)) {
                newPennedCount++;
            }
        }
        this.pennedCount = newPennedCount;

        // Sheep sounds
        this.sheep.forEach((s, i) => {
            if (s.state === SheepState.SPOOKED && !sheepWasSpooked[i]) {
                this.sound.scream();
            } else if (s.state === SheepState.FLOCKING && Math.random() < 0.003) {
                this.sound.bleat();
            }
        });

        if (this.pennedCount === this.numSheep) {
            this.levelComplete = true;
        }
    }

    private loop(time: number): void {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (dt > 0 && dt < 0.1 && !this.configOpen) {
            this.update(dt);
        }

        this.renderer.draw(this.activeDogs, this.sheep, this.obstacles, this.pen, this.pennedCount, this.numSheep, this.currentLevelName, this.levelComplete);
        requestAnimationFrame((t) => this.loop(t));
    }
}

new Game();
