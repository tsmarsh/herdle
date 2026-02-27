import { Dog, Sheep, Obstacle, Pen, Cliff, SheepState } from './entities.js';
import Renderer from './renderer.js';
import { LEVELS } from './levels.js';
import Vector from './vector.js';
import { GameConfig, loadConfig, saveConfig, DEFAULT_CONFIG } from './config.js';

import SoundEngine from './sound.js';

const MIN_WORLD_WIDTH = 1200;
const MIN_WORLD_HEIGHT = 900;
const DRAG_THRESHOLD = 10;

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private renderer: Renderer;
    private dogs: Dog[] = [];
    private activeDogs: Dog[] = [];
    private sheep: Sheep[] = [];
    private numSheep: number = 0;
    private obstacles: Obstacle[] = [];
    private cliffs: Cliff[] = [];
    private pen!: Pen;
    private pennedCount: number = 0;
    private fallenCount: number = 0;
    private keysPressed: Record<string, boolean> = {};
    private lastTime: number = 0;
    private currentLevelIndex: number = 0;
    private levelComplete: boolean = false;
    private currentLevelName: string = '';
    private config: GameConfig;
    private configOpen: boolean = false;
    private levelSelectOpen: boolean = true;
    private completedLevels: Set<number>;

    private sound: SoundEngine = new SoundEngine();
    private isTouchDevice = 'ontouchstart' in window;

    // Virtual camera
    private worldWidth: number = MIN_WORLD_WIDTH;
    private worldHeight: number = MIN_WORLD_HEIGHT;
    private cameraX: number = 0;
    private cameraY: number = 0;
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchStartCameraX: number = 0;
    private touchStartCameraY: number = 0;
    private isDragging: boolean = false;
    private safeAreaTop: number = 0;

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

        // Load completed levels from localStorage
        const saved = localStorage.getItem('herdle-completed');
        this.completedLevels = saved ? new Set(JSON.parse(saved) as number[]) : new Set();

        this.initGame();
        this.setupInput();
        this.setupTouchInput();
        this.setupConfigUI();
        this.setupLevelSelect();
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.showLevelSelect();
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
        this.fallenCount = 0;

        const env = levelConfig.setupEnvironment(this.worldWidth, this.worldHeight);
        this.pen = env.pen;
        this.obstacles = env.obstacles;
        this.cliffs = env.cliffs ?? [];

        const { sheepPanicRadius, sheepFlockRadius } = this.config.settings;
        this.sheep = env.sheepSpawns.map(pos => new Sheep(pos.x, pos.y, sheepPanicRadius, sheepFlockRadius));

        this.activeDogs = this.dogs.filter(d => levelConfig.availableDogs.includes(d.key));
        const startX = this.worldWidth * 0.15;
        const spacing = 80;
        const startY = (this.worldHeight - (this.activeDogs.length - 1) * spacing) / 2;
        this.activeDogs.forEach((dog, i) => {
            dog.pos = new Vector(startX, startY + i * spacing);
            dog.vel = new Vector();
            dog.destination = null;
        });

        // Center camera on dogs
        if (this.needsCamera) {
            this.cameraX = startX - this.canvas.width / 2;
            this.cameraY = startY - this.canvas.height / 2;
            this.clampCamera();
        } else {
            this.cameraX = 0;
            this.cameraY = 0;
        }
    }

    private setupInput(): void {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            if (e.key === 'Escape') {
                if (this.levelSelectOpen) {
                    // Don't close level select with Escape at game start
                    return;
                }
                if (this.configOpen) {
                    this.closeConfig();
                } else {
                    this.openConfig();
                }
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
            if (this.configOpen || this.levelSelectOpen) return;

            if (this.levelComplete) {
                this.showLevelSelect();
                return;
            }

            const rect = this.canvas.getBoundingClientRect();
            const { x: mouseX, y: mouseY } = this.screenToWorld(
                e.clientX - rect.left,
                e.clientY - rect.top
            );

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

    private setupTouchInput(): void {
        // HUD items are tappable on all devices
        for (const dog of this.dogs) {
            const hudEl = document.getElementById(`dog-${dog.id}`);
            hudEl?.addEventListener('click', () => {
                if (!this.activeDogs.includes(dog)) return;
                dog.selected = !dog.selected;
            });
        }

        if (!this.isTouchDevice) return;

        // Update controls hint for touch
        const hint = document.getElementById('controls-hint');
        if (hint) hint.textContent = 'Tap dogs to select. Tap to set destination. Drag to pan.';

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartCameraX = this.cameraX;
            this.touchStartCameraY = this.cameraY;
            this.isDragging = false;
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.needsCamera) return;
            const touch = e.touches[0];
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;
            if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
                this.isDragging = true;
            }
            if (this.isDragging) {
                this.cameraX = this.touchStartCameraX - dx;
                this.cameraY = this.touchStartCameraY - dy;
                this.clampCamera();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();

            // Level complete always works
            if (this.levelComplete) {
                this.showLevelSelect();
                return;
            }

            if (this.configOpen || this.levelSelectOpen) return;

            // If was dragging, consume the gesture
            if (this.isDragging) return;

            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const { x: tx, y: ty } = this.screenToWorld(
                touch.clientX - rect.left,
                touch.clientY - rect.top
            );

            // Check if tapped on a dog (30px hitbox)
            let tappedDog = false;
            for (const dog of this.activeDogs) {
                if (dog.pos.dist(new Vector(tx, ty)) < 30) {
                    dog.selected = !dog.selected;
                    tappedDog = true;
                    break;
                }
            }

            // If didn't tap a dog, set destination for selected dogs
            if (!tappedDog) {
                for (const dog of this.activeDogs) {
                    if (dog.selected) {
                        const hadDest = dog.destination !== null;
                        dog.setDestination(tx, ty);
                        if (!hadDest && dog.destination) {
                            this.sound.dogAck(dog.id);
                        }
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

    private setupLevelSelect(): void {
        const overlay = document.getElementById('level-select-overlay');
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) return; // don't close on background click
        });
    }

    private showLevelSelect(): void {
        this.levelSelectOpen = true;
        const overlay = document.getElementById('level-select-overlay');
        const grid = document.getElementById('level-grid');
        if (!overlay || !grid) return;

        overlay.classList.remove('hidden');
        grid.innerHTML = '';

        for (let i = 0; i < LEVELS.length; i++) {
            const level = LEVELS[i];
            const card = document.createElement('div');
            card.className = 'level-card';
            const env = level.setupEnvironment(MIN_WORLD_WIDTH, MIN_WORLD_HEIGHT); // probe for cliffs
            const hasCliffs = env.cliffs && env.cliffs.length > 0;
            if (hasCliffs) card.classList.add('has-cliffs');
            if (this.completedLevels.has(i)) card.classList.add('completed');

            const shortName = level.name.replace(/^Level \d+:\s*/, '');
            card.innerHTML = `
                <div class="level-number">Level ${i + 1}</div>
                <div class="level-name">${shortName}</div>
                <div class="level-info">${level.numSheep} sheep &middot; ${level.availableDogs.length} dog${level.availableDogs.length > 1 ? 's' : ''}${hasCliffs ? ' &middot; cliffs' : ''}</div>
                ${this.completedLevels.has(i) ? '<div class="level-badge">&#10003;</div>' : ''}
            `;
            card.addEventListener('click', () => {
                this.hideLevelSelect();
                this.renderer.resetObstacleCache();
                this.loadLevel(i);
            });
            grid.appendChild(card);
        }
    }

    private hideLevelSelect(): void {
        this.levelSelectOpen = false;
        document.getElementById('level-select-overlay')?.classList.add('hidden');
    }

    private saveCompleted(): void {
        localStorage.setItem('herdle-completed', JSON.stringify([...this.completedLevels]));
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
        if (this.pen) this.loadLevel(this.currentLevelIndex);
        this.closeConfig();
    }

    private resetConfig(): void {
        this.config = structuredClone(DEFAULT_CONFIG);
        this.populateConfigUI();
    }

    private resize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.worldWidth = Math.max(window.innerWidth, MIN_WORLD_WIDTH);
        this.worldHeight = Math.max(window.innerHeight, MIN_WORLD_HEIGHT);
        this.safeAreaTop = document.getElementById('safe-area-probe')?.offsetHeight ?? 0;
        this.clampCamera();
        if (this.pen && !this.levelSelectOpen) this.loadLevel(this.currentLevelIndex);
    }

    private clampCamera(): void {
        const maxX = this.worldWidth - this.canvas.width;
        const maxY = this.worldHeight - this.canvas.height;
        this.cameraX = Math.max(0, Math.min(this.cameraX, maxX));
        this.cameraY = Math.max(0, Math.min(this.cameraY, maxY));
    }

    private screenToWorld(sx: number, sy: number): { x: number; y: number } {
        return { x: sx + this.cameraX, y: sy + this.cameraY };
    }

    private get needsCamera(): boolean {
        return this.worldWidth > this.canvas.width || this.worldHeight > this.canvas.height;
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
            dog.updateDog(dt, this.obstacles, this.worldWidth, this.worldHeight, this.cliffs);
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
        let newFallenCount = 0;
        for (const s of this.sheep) {
            if (s.state === SheepState.FALLEN) {
                s.updateSheep(dt, this.activeDogs, this.sheep, this.obstacles, this.pen, this.worldWidth, this.worldHeight, this.cliffs);
                newFallenCount++;
                continue;
            }
            s.updateSheep(dt, this.activeDogs, this.sheep, this.obstacles, this.pen, this.worldWidth, this.worldHeight, this.cliffs);
            if ((s.state as SheepState) === SheepState.FALLEN) {
                newFallenCount++;
            } else if (this.pen.contains(s)) {
                newPennedCount++;
            }
        }
        this.pennedCount = newPennedCount;
        this.fallenCount = newFallenCount;

        // Sheep sounds
        this.sheep.forEach((s, i) => {
            if (s.state === SheepState.SPOOKED && !sheepWasSpooked[i]) {
                this.sound.scream();
            } else if (s.state === SheepState.FLOCKING && Math.random() < 0.003) {
                this.sound.bleat();
            }
        });

        // Win: all non-fallen sheep are penned
        if (this.pennedCount === this.numSheep - this.fallenCount) {
            this.levelComplete = true;
            this.completedLevels.add(this.currentLevelIndex);
            this.saveCompleted();
        }
    }

    private loop(time: number): void {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.pen) {
            if (dt > 0 && dt < 0.1 && !this.configOpen && !this.levelSelectOpen) {
                this.update(dt);
            }

            this.renderer.draw(this.activeDogs, this.sheep, this.obstacles, this.pen, this.pennedCount, this.numSheep, this.currentLevelName, this.levelComplete, this.cliffs, this.fallenCount, this.cameraX, this.cameraY, this.worldWidth, this.worldHeight, this.safeAreaTop);
        }
        requestAnimationFrame((t) => this.loop(t));
    }
}

new Game();
