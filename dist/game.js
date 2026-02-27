import { Dog, Sheep, SheepState } from './entities.js';
import Renderer from './renderer.js';
import { LEVELS } from './levels.js';
import Vector from './vector.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from './config.js';
import MusicPlayer from './music.js';
import SoundEngine from './sound.js';
class Game {
    canvas;
    ctx;
    renderer;
    dogs = [];
    activeDogs = [];
    sheep = [];
    numSheep = 0;
    obstacles = [];
    cliffs = [];
    pen;
    pennedCount = 0;
    fallenCount = 0;
    keysPressed = {};
    lastTime = 0;
    currentLevelIndex = 0;
    levelComplete = false;
    currentLevelName = '';
    config;
    configOpen = false;
    levelSelectOpen = true;
    completedLevels;
    music;
    sound = new SoundEngine();
    isTouchDevice = 'ontouchstart' in window;
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        const context = this.canvas.getContext('2d');
        if (!context)
            throw new Error('Could not get canvas context');
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
        // Load completed levels from localStorage
        const saved = localStorage.getItem('herdle-completed');
        this.completedLevels = saved ? new Set(JSON.parse(saved)) : new Set();
        this.initGame();
        this.setupInput();
        this.setupTouchInput();
        this.setupConfigUI();
        this.setupMusicUI();
        this.setupLevelSelect();
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.showLevelSelect();
        requestAnimationFrame((t) => this.loop(t));
    }
    initGame() {
        this.dogs = this.config.dogs.map(dc => new Dog(dc.id, dc.name, dc.key, dc.color, 50, 50, dc.personality));
    }
    loadLevel(index) {
        this.currentLevelIndex = index;
        const levelConfig = LEVELS[this.currentLevelIndex];
        this.currentLevelName = levelConfig.name;
        this.numSheep = levelConfig.numSheep;
        this.levelComplete = false;
        this.pennedCount = 0;
        this.fallenCount = 0;
        const env = levelConfig.setupEnvironment(this.canvas.width, this.canvas.height);
        this.pen = env.pen;
        this.obstacles = env.obstacles;
        this.cliffs = env.cliffs ?? [];
        const { sheepPanicRadius, sheepFlockRadius } = this.config.settings;
        this.sheep = env.sheepSpawns.map(pos => new Sheep(pos.x, pos.y, sheepPanicRadius, sheepFlockRadius));
        this.activeDogs = this.dogs.filter(d => levelConfig.availableDogs.includes(d.key));
        this.activeDogs.forEach((dog, i) => {
            dog.pos = new Vector(50, 50 + i * 100);
            dog.vel = new Vector();
            dog.destination = null;
        });
    }
    setupInput() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (e.key === 'Escape') {
                if (this.levelSelectOpen) {
                    // Don't close level select with Escape at game start
                    return;
                }
                if (this.configOpen) {
                    this.closeConfig();
                }
                else {
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
            if (this.configOpen || this.levelSelectOpen)
                return;
            if (this.levelComplete) {
                this.showLevelSelect();
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
    setupTouchInput() {
        // HUD items are tappable on all devices
        for (const dog of this.dogs) {
            const hudEl = document.getElementById(`dog-${dog.id}`);
            hudEl?.addEventListener('click', () => {
                if (!this.activeDogs.includes(dog))
                    return;
                dog.selected = !dog.selected;
            });
        }
        if (!this.isTouchDevice)
            return;
        // Update controls hint for touch
        const hint = document.getElementById('controls-hint');
        if (hint)
            hint.textContent = 'Tap dogs to select. Tap to set destination. Tap name badges to select too.';
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.configOpen || this.levelSelectOpen)
                return;
            if (this.levelComplete) {
                this.showLevelSelect();
                return;
            }
            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;
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
        // Prevent scroll/zoom on canvas
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }
    setupConfigUI() {
        const btn = document.getElementById('config-btn');
        const overlay = document.getElementById('config-overlay');
        const applyBtn = document.getElementById('config-apply');
        const resetBtn = document.getElementById('config-reset');
        btn?.addEventListener('click', () => this.openConfig());
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay)
                this.closeConfig();
        });
        applyBtn?.addEventListener('click', () => this.applyConfig());
        resetBtn?.addEventListener('click', () => this.resetConfig());
        // Wire up live slider value displays
        const sliders = document.querySelectorAll('#config-modal input[type="range"]');
        for (const slider of sliders) {
            slider.addEventListener('input', () => {
                const display = slider.parentElement?.querySelector('.slider-value');
                if (display)
                    display.textContent = slider.value;
            });
        }
    }
    setupMusicUI() {
        document.getElementById('music-btn')?.addEventListener('click', () => this.toggleMusic());
    }
    setupLevelSelect() {
        const overlay = document.getElementById('level-select-overlay');
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay)
                return; // don't close on background click
        });
    }
    showLevelSelect() {
        this.levelSelectOpen = true;
        const overlay = document.getElementById('level-select-overlay');
        const grid = document.getElementById('level-grid');
        if (!overlay || !grid)
            return;
        overlay.classList.remove('hidden');
        grid.innerHTML = '';
        for (let i = 0; i < LEVELS.length; i++) {
            const level = LEVELS[i];
            const card = document.createElement('div');
            card.className = 'level-card';
            const env = level.setupEnvironment(800, 600); // probe for cliffs
            const hasCliffs = env.cliffs && env.cliffs.length > 0;
            if (hasCliffs)
                card.classList.add('has-cliffs');
            if (this.completedLevels.has(i))
                card.classList.add('completed');
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
    hideLevelSelect() {
        this.levelSelectOpen = false;
        document.getElementById('level-select-overlay')?.classList.add('hidden');
    }
    saveCompleted() {
        localStorage.setItem('herdle-completed', JSON.stringify([...this.completedLevels]));
    }
    toggleMusic() {
        this.music.toggle();
        document.getElementById('music-btn')?.classList.toggle('muted', !this.music.isPlaying);
    }
    openConfig() {
        this.configOpen = true;
        this.populateConfigUI();
        document.getElementById('config-overlay')?.classList.remove('hidden');
    }
    closeConfig() {
        this.configOpen = false;
        document.getElementById('config-overlay')?.classList.add('hidden');
    }
    populateConfigUI() {
        for (const dc of this.config.dogs) {
            const setSlider = (trait, value) => {
                const el = document.getElementById(`${dc.id}-${trait}`);
                if (el) {
                    el.value = String(value);
                    const display = el.parentElement?.querySelector('.slider-value');
                    if (display)
                        display.textContent = String(value);
                }
            };
            setSlider('speed', dc.personality.speed);
            setSlider('obedience', dc.personality.obedience);
            setSlider('distractibility', dc.personality.distractibility);
        }
        const s = this.config.settings;
        const setGameSlider = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = String(value);
                const display = el.parentElement?.querySelector('.slider-value');
                if (display)
                    display.textContent = String(value);
            }
        };
        setGameSlider('cfg-sheep-count', s.sheepCount);
        setGameSlider('cfg-panic-radius', s.sheepPanicRadius);
        setGameSlider('cfg-flock-radius', s.sheepFlockRadius);
        setGameSlider('cfg-obstacle-count', s.obstacleCount);
        setGameSlider('cfg-pen-size', s.penSize);
    }
    readConfigFromUI() {
        for (const dc of this.config.dogs) {
            const readSlider = (trait) => {
                const el = document.getElementById(`${dc.id}-${trait}`);
                return el ? parseFloat(el.value) : null;
            };
            dc.personality.speed = readSlider('speed') ?? dc.personality.speed;
            dc.personality.obedience = readSlider('obedience') ?? dc.personality.obedience;
            dc.personality.distractibility = readSlider('distractibility') ?? dc.personality.distractibility;
        }
        const readGameSlider = (id) => {
            const el = document.getElementById(id);
            return el ? parseFloat(el.value) : null;
        };
        this.config.settings.sheepCount = readGameSlider('cfg-sheep-count') ?? this.config.settings.sheepCount;
        this.config.settings.sheepPanicRadius = readGameSlider('cfg-panic-radius') ?? this.config.settings.sheepPanicRadius;
        this.config.settings.sheepFlockRadius = readGameSlider('cfg-flock-radius') ?? this.config.settings.sheepFlockRadius;
        this.config.settings.obstacleCount = readGameSlider('cfg-obstacle-count') ?? this.config.settings.obstacleCount;
        this.config.settings.penSize = readGameSlider('cfg-pen-size') ?? this.config.settings.penSize;
    }
    applyConfig() {
        this.readConfigFromUI();
        saveConfig(this.config);
        this.renderer.resetObstacleCache();
        this.initGame();
        if (this.pen)
            this.loadLevel(this.currentLevelIndex);
        this.closeConfig();
    }
    resetConfig() {
        this.config = structuredClone(DEFAULT_CONFIG);
        this.populateConfigUI();
    }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.pen && !this.levelSelectOpen)
            this.loadLevel(this.currentLevelIndex);
    }
    updateSelection() {
        for (const dog of this.activeDogs) {
            dog.selected = !!this.keysPressed[dog.key];
        }
    }
    update(dt) {
        if (this.levelComplete)
            return;
        // Track dog destinations before update (for arrival barks)
        const dogHadDest = this.activeDogs.map(d => d.destination !== null);
        for (const dog of this.activeDogs) {
            dog.updateDog(dt, this.obstacles, this.canvas.width, this.canvas.height, this.cliffs);
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
                s.updateSheep(dt, this.activeDogs, this.sheep, this.obstacles, this.pen, this.canvas.width, this.canvas.height, this.cliffs);
                newFallenCount++;
                continue;
            }
            s.updateSheep(dt, this.activeDogs, this.sheep, this.obstacles, this.pen, this.canvas.width, this.canvas.height, this.cliffs);
            if (s.state === SheepState.FALLEN) {
                newFallenCount++;
            }
            else if (this.pen.contains(s)) {
                newPennedCount++;
            }
        }
        this.pennedCount = newPennedCount;
        this.fallenCount = newFallenCount;
        // Sheep sounds
        this.sheep.forEach((s, i) => {
            if (s.state === SheepState.SPOOKED && !sheepWasSpooked[i]) {
                this.sound.scream();
            }
            else if (s.state === SheepState.FLOCKING && Math.random() < 0.003) {
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
    loop(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (this.pen) {
            if (dt > 0 && dt < 0.1 && !this.configOpen && !this.levelSelectOpen) {
                this.update(dt);
            }
            this.renderer.draw(this.activeDogs, this.sheep, this.obstacles, this.pen, this.pennedCount, this.numSheep, this.currentLevelName, this.levelComplete, this.cliffs, this.fallenCount);
        }
        requestAnimationFrame((t) => this.loop(t));
    }
}
new Game();
