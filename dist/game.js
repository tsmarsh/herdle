import { Dog, Sheep, Obstacle, Pen } from './entities.js';
import Renderer from './renderer.js';
class Game {
    canvas;
    ctx;
    renderer;
    dogs;
    sheep = [];
    numSheep = 20;
    obstacles = [];
    pen;
    pennedCount = 0;
    keysPressed = {};
    lastTime = 0;
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
        this.dogs = [
            new Dog('ace', 'Ace', 'a', '#FF8A8A', 50, 50),
            new Dog('shep', 'Shep', 's', '#8AA4FF', 150, 50),
            new Dog('duke', 'Duke', 'd', '#FFD88A', 50, 150),
            new Dog('fido', 'Fido', 'f', '#C98AFF', 150, 150)
        ];
        this.setup();
    }
    setup() {
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.pen = new Pen(this.canvas.width - 250, this.canvas.height - 250, 200, 200);
        for (let i = 0; i < 5; i++) {
            const x = 200 + Math.random() * (this.canvas.width - 400);
            const y = 200 + Math.random() * (this.canvas.height - 400);
            this.obstacles.push(new Obstacle(x, y, 30 + Math.random() * 40));
        }
        for (let i = 0; i < this.numSheep; i++) {
            this.sheep.push(new Sheep(100 + Math.random() * 300, 200 + Math.random() * (this.canvas.height - 400)));
        }
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = true;
            this.updateSelection();
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = false;
            this.updateSelection();
        });
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            for (const dog of this.dogs) {
                if (dog.selected) {
                    dog.setDestination(mouseX, mouseY);
                }
            }
        });
        requestAnimationFrame((t) => this.loop(t));
    }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    updateSelection() {
        for (const dog of this.dogs) {
            dog.selected = !!this.keysPressed[dog.key];
        }
    }
    update(dt) {
        for (const dog of this.dogs) {
            dog.updateDog(dt, this.obstacles, this.canvas.width, this.canvas.height);
        }
        let newPennedCount = 0;
        for (const s of this.sheep) {
            s.updateSheep(dt, this.dogs, this.sheep, this.obstacles, this.pen, this.canvas.width, this.canvas.height);
            if (this.pen.contains(s)) {
                newPennedCount++;
            }
        }
        this.pennedCount = newPennedCount;
    }
    loop(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (dt > 0 && dt < 0.1) {
            this.update(dt);
        }
        this.renderer.draw(this.dogs, this.sheep, this.obstacles, this.pen, this.pennedCount, this.numSheep);
        requestAnimationFrame((t) => this.loop(t));
    }
}
new Game();
