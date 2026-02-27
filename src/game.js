import { Dog, Sheep } from './entities.js';
import Vector from './vector.js';
import Renderer from './renderer.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.hudItems = {
            'dog-ace': document.getElementById('dog-ace'),
            'dog-shep': document.getElementById('dog-shep'),
            'dog-duke': document.getElementById('dog-duke'),
            'dog-fido': document.getElementById('dog-fido')
        };

        this.renderer = new Renderer(this.canvas, this.hudItems);
        
        this.dogs = [
            new Dog('ace', 'Ace', 'a', '#ff4d4d', 50, 50),
            new Dog('shep', 'Shep', 's', '#4d79ff', 150, 50),
            new Dog('duke', 'Duke', 'd', '#ffdb4d', 50, 150),
            new Dog('fido', 'Fido', 'f', '#b34dff', 150, 150)
        ];

        this.sheep = [];
        this.numSheep = 18;
        
        this.keysPressed = {};
        this.mousePos = new Vector(0, 0);

        this.lastTime = 0;
        this.setup();
    }

    setup() {
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // Initial sheep placement
        for (let i = 0; i < this.numSheep; i++) {
            const margin = 100;
            this.sheep.push(new Sheep(
                margin + Math.random() * (this.canvas.width - 2 * margin),
                margin + Math.random() * (this.canvas.height - 2 * margin)
            ));
        }

        // Input handling
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

            // Apply to selected dogs
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
            dog.selected = this.keysPressed[dog.key];
        }
    }

    update(dt) {
        for (const dog of this.dogs) {
            dog.update(dt, this.canvas.width, this.canvas.height);
        }

        for (const s of this.sheep) {
            s.update(dt, this.dogs, this.sheep, this.canvas.width, this.canvas.height);
        }
    }

    loop(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (dt > 0 && dt < 0.1) { // Avoid huge jumps if frame drops
            this.update(dt);
        }

        this.renderer.draw(this.dogs, this.sheep);
        requestAnimationFrame((t) => this.loop(t));
    }
}

new Game();
