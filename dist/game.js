import { Dog, Sheep, SheepState } from './entities.js';
import Renderer from './renderer.js';
import { LEVELS } from './levels.js';
import Vector from './vector.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from './config.js';
import SoundEngine from './sound.js';
const MIN_WORLD_WIDTH = 1200;
const MIN_WORLD_HEIGHT = 900;
const DRAG_THRESHOLD = 10;
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
    sound = new SoundEngine();
    isTouchDevice = 'ontouchstart' in window;
    // Virtual camera
    worldWidth = MIN_WORLD_WIDTH;
    worldHeight = MIN_WORLD_HEIGHT;
    cameraX = 0;
    cameraY = 0;
    touchStartX = 0;
    touchStartY = 0;
    touchStartCameraX = 0;
    touchStartCameraY = 0;
    isDragging = false;
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
        // Load completed levels from localStorage
        const saved = localStorage.getItem('herdle-completed');
        this.completedLevels = saved ? new Set(JSON.parse(saved)) : new Set();
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
        }
        else {
            this.cameraX = 0;
            this.cameraY = 0;
        }
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
            const { x: mouseX, y: mouseY } = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
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
            hint.textContent = 'Tap dogs to select. Tap to set destination. Drag to pan.';
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
            if (!this.needsCamera)
                return;
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
            if (this.configOpen || this.levelSelectOpen)
                return;
            // If was dragging, consume the gesture
            if (this.isDragging)
                return;
            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const { x: tx, y: ty } = this.screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top);
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
            const env = level.setupEnvironment(MIN_WORLD_WIDTH, MIN_WORLD_HEIGHT); // probe for cliffs
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
        this.worldWidth = Math.max(window.innerWidth, MIN_WORLD_WIDTH);
        this.worldHeight = Math.max(window.innerHeight, MIN_WORLD_HEIGHT);
        this.clampCamera();
        if (this.pen && !this.levelSelectOpen)
            this.loadLevel(this.currentLevelIndex);
    }
    clampCamera() {
        const maxX = this.worldWidth - this.canvas.width;
        const maxY = this.worldHeight - this.canvas.height;
        this.cameraX = Math.max(0, Math.min(this.cameraX, maxX));
        this.cameraY = Math.max(0, Math.min(this.cameraY, maxY));
    }
    screenToWorld(sx, sy) {
        return { x: sx + this.cameraX, y: sy + this.cameraY };
    }
    get needsCamera() {
        return this.worldWidth > this.canvas.width || this.worldHeight > this.canvas.height;
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
            this.renderer.draw(this.activeDogs, this.sheep, this.obstacles, this.pen, this.pennedCount, this.numSheep, this.currentLevelName, this.levelComplete, this.cliffs, this.fallenCount, this.cameraX, this.cameraY, this.worldWidth, this.worldHeight);
        }
        requestAnimationFrame((t) => this.loop(t));
    }
}
new Game();
