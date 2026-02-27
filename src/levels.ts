import { Obstacle, Pen } from './entities.js';
import Vector from './vector.js';

export interface LevelConfig {
    name: string;
    numSheep: number;
    availableDogs: string[]; // keys like 'a', 's', 'd', 'f'
    setupEnvironment: (width: number, height: number) => {
        pen: Pen;
        obstacles: Obstacle[];
        sheepSpawns: Vector[];
    };
}

export const LEVELS: LevelConfig[] = [
    {
        name: "Level 1: The Basics",
        numSheep: 5,
        availableDogs: ['a'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w - 250, h - 250, 200, 200),
            obstacles: [],
            sheepSpawns: Array.from({length: 5}, () => new Vector(w * 0.2, h * 0.5 + (Math.random() - 0.5) * 100))
        })
    },
    {
        name: "Level 2: A Helper Arrives",
        numSheep: 10,
        availableDogs: ['a', 's'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w - 250, h - 250, 200, 200),
            obstacles: [new Obstacle(w / 2, h / 2, 80)], // Big rock in the middle
            sheepSpawns: Array.from({length: 10}, () => new Vector(w * 0.2, h * 0.2 + Math.random() * 200))
        })
    },
    {
        name: "Level 3: The Choke Point",
        numSheep: 15,
        availableDogs: ['a', 's'],
        setupEnvironment: (w, h) => {
            const obs = [];
            // Wall with a gap
            for(let i = 0; i < h; i+= 60) {
                if (i < h/2 - 80 || i > h/2 + 80) {
                    obs.push(new Obstacle(w * 0.6, i, 40));
                }
            }
            return {
                pen: new Pen(w - 250, h / 2 - 100, 200, 200),
                obstacles: obs,
                sheepSpawns: Array.from({length: 15}, () => new Vector(w * 0.2, h * 0.5 + (Math.random() - 0.5) * 200))
            };
        }
    },
    {
        name: "Level 4: Scattered Flock",
        numSheep: 16,
        availableDogs: ['a', 's', 'd'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w / 2 - 100, h / 2 - 100, 200, 200),
            obstacles: [
                new Obstacle(w*0.3, h*0.3, 50), new Obstacle(w*0.7, h*0.3, 50),
                new Obstacle(w*0.3, h*0.7, 50), new Obstacle(w*0.7, h*0.7, 50)
            ],
            // Sheep in 4 corners
            sheepSpawns: Array.from({length: 16}, (_, i) => {
                const corner = i % 4;
                const base = [new Vector(100, 100), new Vector(w-100, 100), new Vector(100, h-100), new Vector(w-100, h-100)][corner];
                return new Vector(base.x + Math.random()*50, base.y + Math.random()*50);
            })
        })
    },
    {
        name: "Level 5: The U-Turn",
        numSheep: 20,
        availableDogs: ['a', 's', 'd'],
        setupEnvironment: (w, h) => {
            const obs = [];
            for(let i=w*0.2; i<w*0.8; i+=60) obs.push(new Obstacle(i, h*0.4, 35));
            for(let i=h*0.4; i<h*0.8; i+=60) obs.push(new Obstacle(w*0.8, i, 35));
            for(let i=w*0.4; i<w*0.8; i+=60) obs.push(new Obstacle(i, h*0.8, 35));
            return {
                pen: new Pen(w * 0.5, h * 0.5, 150, 150),
                obstacles: obs,
                sheepSpawns: Array.from({length: 20}, () => new Vector(w * 0.2, h * 0.8 + (Math.random()-0.5)*50))
            };
        }
    },
    {
        name: "Level 6: Full Squad",
        numSheep: 25,
        availableDogs: ['a', 's', 'd', 'f'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w - 200, h - 200, 150, 150),
            obstacles: Array.from({length: 10}, () => new Obstacle(w*0.2 + Math.random()*w*0.6, h*0.2 + Math.random()*h*0.6, 20 + Math.random()*30)),
            sheepSpawns: Array.from({length: 25}, () => new Vector(150 + Math.random()*100, 150 + Math.random()*100))
        })
    },
    {
        name: "Level 7: The Zig Zag",
        numSheep: 20,
        availableDogs: ['a', 's', 'd', 'f'],
        setupEnvironment: (w, h) => {
            const obs = [];
            for(let i=0; i<h*0.7; i+=50) obs.push(new Obstacle(w*0.33, i, 30));
            for(let i=h; i>h*0.3; i-=50) obs.push(new Obstacle(w*0.66, i, 30));
            return {
                pen: new Pen(w - 200, 50, 150, 150),
                obstacles: obs,
                sheepSpawns: Array.from({length: 20}, () => new Vector(100, h - 100 + (Math.random()-0.5)*50))
            };
        }
    },
    {
        name: "Level 8: The Maze",
        numSheep: 25,
        availableDogs: ['a', 's', 'd', 'f'],
        setupEnvironment: (w, h) => {
            const obs = [];
            // Outer box with opening
            for(let i=100; i<w-100; i+=60) { obs.push(new Obstacle(i, 100, 35)); obs.push(new Obstacle(i, h-100, 35)); }
            for(let i=100; i<h-100; i+=60) {
                obs.push(new Obstacle(100, i, 35));
                if (i < h/2 - 100 || i > h/2 + 100) obs.push(new Obstacle(w-100, i, 35));
            }
            // Inner barrier
            for(let i=250; i<h-250; i+=60) obs.push(new Obstacle(w/2, i, 40));
            return {
                pen: new Pen(200, h/2 - 75, 150, 150),
                obstacles: obs,
                sheepSpawns: Array.from({length: 25}, () => new Vector(w - 250, h/2 + (Math.random()-0.5)*100))
            };
        }
    },
    {
        name: "Level 9: Chaos",
        numSheep: 35,
        availableDogs: ['a', 's', 'd', 'f'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w/2 - 100, h/2 - 100, 200, 200),
            obstacles: Array.from({length: 20}, () => new Obstacle(w*0.1 + Math.random()*w*0.8, h*0.1 + Math.random()*h*0.8, 25)),
            sheepSpawns: Array.from({length: 35}, () => new Vector(Math.random()*w, Math.random()*h)) // Everywhere
        })
    },
    {
        name: "Level 10: The Master Herder",
        numSheep: 40,
        availableDogs: ['a', 's', 'd', 'f'],
        setupEnvironment: (w, h) => {
            const obs = [];
            // Diagonal funnel
            for(let i=0; i<Math.min(w,h)*0.8; i+=50) {
                obs.push(new Obstacle(i, i, 30));
                obs.push(new Obstacle(w-i, i, 30));
            }
            return {
                pen: new Pen(w/2 - 75, h - 200, 150, 150),
                obstacles: obs,
                // Sheep start at top
                sheepSpawns: Array.from({length: 40}, () => new Vector(w/2 + (Math.random()-0.5)*w*0.8, 100 + Math.random()*100))
            };
        }
    }
];
