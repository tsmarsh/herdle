import { Obstacle, Pen } from './entities.js';
import Vector from './vector.js';
export const LEVELS = [
    // Level 1: Stackelberg — leader-follower, sheep react to where dog IS
    {
        name: "Level 1: The Stackelberg Shepherd",
        numSheep: 5,
        availableDogs: ['a'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w - 250, h - 250, 200, 200),
            obstacles: [],
            sheepSpawns: Array.from({ length: 5 }, () => new Vector(w * 0.3 + (Math.random() - 0.5) * 60, h * 0.5 + (Math.random() - 0.5) * 60))
        })
    },
    // Level 2: Best Response — only one approach angle pushes sheep toward pen
    {
        name: "Level 2: Best Response",
        numSheep: 7,
        availableDogs: ['a'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w * 0.75 - 100, h * 0.75 - 100, 200, 200),
            obstacles: [
                new Obstacle(w * 0.5, h * 0.45, 70),
                new Obstacle(w * 0.35, h * 0.6, 45)
            ],
            sheepSpawns: Array.from({ length: 7 }, () => new Vector(w * 0.45 + (Math.random() - 0.5) * 80, h * 0.2 + (Math.random() - 0.5) * 80))
        })
    },
    // Level 3: Coordination Game — flanking from two sides dominates one-side pushing
    {
        name: "Level 3: The Coordination Game",
        numSheep: 10,
        availableDogs: ['a', 'd'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w - 250, h / 2 - 100, 200, 200),
            obstacles: [
                new Obstacle(w * 0.25, h * 0.2, 55),
                new Obstacle(w * 0.25, h * 0.8, 55)
            ],
            sheepSpawns: Array.from({ length: 10 }, () => new Vector(w * 0.3 + (Math.random() - 0.5) * 80, h * 0.5 + (Math.random() - 0.5) * 160))
        })
    },
    // Level 4: Subgame Perfect — two separated groups, backward induction for order
    {
        name: "Level 4: Subgame Perfect",
        numSheep: 13,
        availableDogs: ['a', 's'],
        setupEnvironment: (w, h) => {
            const obs = [];
            // Vertical wall at x=w*0.45 with gap at center
            for (let y = 0; y < h; y += 55) {
                if (Math.abs(y - h / 2) >= 75) {
                    obs.push(new Obstacle(w * 0.45, y, 25));
                }
            }
            return {
                pen: new Pen(w - 250, h / 2 - 100, 200, 200),
                obstacles: obs,
                sheepSpawns: Array.from({ length: 13 }, (_, i) => i < 8
                    ? new Vector(w * 0.15 + (Math.random() - 0.5) * 100, h * 0.5 + (Math.random() - 0.5) * 100)
                    : new Vector(w * 0.65 + (Math.random() - 0.5) * 80, h * 0.5 + (Math.random() - 0.5) * 80))
            };
        }
    },
    // Level 5: Prisoner's Dilemma — herding one group disrupts the other; cooperate by containing
    {
        name: "Level 5: Prisoner's Dilemma",
        numSheep: 14,
        availableDogs: ['a', 's', 'd'],
        setupEnvironment: (w, h) => {
            const obs = [];
            // Upper horizontal wall at y=h*0.35 with gap at x≈w*0.3
            for (let x = w * 0.15; x <= w * 0.75; x += 55) {
                if (Math.abs(x - w * 0.3) >= 40) {
                    obs.push(new Obstacle(x, h * 0.35, 28));
                }
            }
            // Lower horizontal wall at y=h*0.65 with gap at x≈w*0.3
            for (let x = w * 0.15; x <= w * 0.75; x += 55) {
                if (Math.abs(x - w * 0.3) >= 40) {
                    obs.push(new Obstacle(x, h * 0.65, 28));
                }
            }
            return {
                pen: new Pen(w - 250, h / 2 - 100, 200, 200),
                obstacles: obs,
                sheepSpawns: Array.from({ length: 14 }, (_, i) => i < 7
                    ? new Vector(w * 0.2 + (Math.random() - 0.5) * 80, h * 0.2 + (Math.random() - 0.5) * 80)
                    : new Vector(w * 0.2 + (Math.random() - 0.5) * 80, h * 0.8 + (Math.random() - 0.5) * 80))
            };
        }
    },
    // Level 6: Dominant Strategy — three corridors, only the middle one works
    {
        name: "Level 6: Dominant Strategy",
        numSheep: 12,
        availableDogs: ['a', 'd'],
        setupEnvironment: (w, h) => {
            const obs = [];
            // Four horizontal walls creating 3 corridors
            const wallYs = [h * 0.15, h * 0.35, h * 0.55, h * 0.75];
            for (const wy of wallYs) {
                for (let x = w * 0.1; x <= w * 0.85; x += 55) {
                    obs.push(new Obstacle(x, wy, 25));
                }
            }
            // Dead-end wall in top corridor at x=w*0.65
            for (let y = h * 0.15; y <= h * 0.35; y += 55) {
                obs.push(new Obstacle(w * 0.65, y, 25));
            }
            // Curve obstacles in bottom corridor
            obs.push(new Obstacle(w * 0.75, h * 0.62, 30));
            obs.push(new Obstacle(w * 0.8, h * 0.65, 30));
            obs.push(new Obstacle(w * 0.85, h * 0.68, 30));
            obs.push(new Obstacle(w * 0.78, h * 0.7, 30));
            return {
                pen: new Pen(w - 250, h * 0.4 - 75, 200, 150),
                obstacles: obs,
                sheepSpawns: Array.from({ length: 12 }, () => new Vector(w * 0.15 + (Math.random() - 0.5) * 60, h * 0.45 + (Math.random() - 0.5) * 60))
            };
        }
    },
    // Level 7: Mechanism Design — V-funnel with gaps, dogs plug the gaps
    {
        name: "Level 7: Mechanism Design",
        numSheep: 15,
        availableDogs: ['a', 's', 'd'],
        setupEnvironment: (w, h) => {
            const obs = [];
            const steps = 12;
            // Upper funnel line: (w*0.15, h*0.15) → (w*0.7, h*0.4)
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                // Gap at ~40% along the line
                if (Math.abs(t - 0.4) < 0.08)
                    continue;
                const x = w * 0.15 + t * (w * 0.7 - w * 0.15);
                const y = h * 0.15 + t * (h * 0.4 - h * 0.15);
                obs.push(new Obstacle(x, y, 28));
            }
            // Lower funnel line: (w*0.15, h*0.85) → (w*0.7, h*0.6)
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                if (Math.abs(t - 0.4) < 0.08)
                    continue;
                const x = w * 0.15 + t * (w * 0.7 - w * 0.15);
                const y = h * 0.85 + t * (h * 0.6 - h * 0.85);
                obs.push(new Obstacle(x, y, 28));
            }
            return {
                pen: new Pen(w * 0.8 - 100, h / 2 - 75, 200, 150),
                obstacles: obs,
                sheepSpawns: Array.from({ length: 15 }, () => new Vector(w * 0.15 + Math.random() * (w * 0.2), h * 0.3 + Math.random() * (h * 0.4)))
            };
        }
    },
    // Level 8: Information Cascade — nudge critical mass, cohesion cascades through flock
    {
        name: "Level 8: Information Cascade",
        numSheep: 25,
        availableDogs: ['a', 's'],
        setupEnvironment: (w, h) => ({
            pen: new Pen(w - 280, h - 250, 230, 200),
            obstacles: [
                new Obstacle(w * 0.2, h * 0.2, 50),
                new Obstacle(w * 0.8, h * 0.2, 50)
            ],
            sheepSpawns: Array.from({ length: 25 }, () => new Vector(w * 0.35 + Math.random() * (w * 0.3), h * 0.3 + Math.random() * (h * 0.3)))
        })
    },
    // Level 9: Minimax — tight maze, block worst-case escapes then push
    {
        name: "Level 9: Minimax",
        numSheep: 15,
        availableDogs: ['a', 'd', 'f'],
        setupEnvironment: (w, h) => {
            const obs = [];
            // Horizontal wall at y=h*0.35, from left to x=w*0.55, gap at x≈w*0.3
            for (let x = w * 0.1; x <= w * 0.55; x += 50) {
                if (Math.abs(x - w * 0.3) >= 35) {
                    obs.push(new Obstacle(x, h * 0.35, 25));
                }
            }
            // Horizontal wall at y=h*0.65, from left to x=w*0.55, gap at x≈w*0.3
            for (let x = w * 0.1; x <= w * 0.55; x += 50) {
                if (Math.abs(x - w * 0.3) >= 35) {
                    obs.push(new Obstacle(x, h * 0.65, 25));
                }
            }
            // Vertical wall at x=w*0.3, gap at y≈h*0.5
            for (let y = h * 0.1; y <= h * 0.9; y += 50) {
                if (Math.abs(y - h * 0.5) >= 40) {
                    obs.push(new Obstacle(w * 0.3, y, 25));
                }
            }
            // Vertical wall at x=w*0.55, gap at y≈h*0.5
            for (let y = h * 0.1; y <= h * 0.9; y += 50) {
                if (Math.abs(y - h * 0.5) >= 40) {
                    obs.push(new Obstacle(w * 0.55, y, 25));
                }
            }
            // Funnel walls at x=w*0.7 funneling toward pen, gap at center
            for (let y = h * 0.2; y <= h * 0.8; y += 50) {
                if (Math.abs(y - h * 0.5) >= 60) {
                    obs.push(new Obstacle(w * 0.7, y, 25));
                }
            }
            return {
                pen: new Pen(w - 220, h / 2 - 100, 170, 200),
                obstacles: obs,
                sheepSpawns: Array.from({ length: 15 }, () => new Vector(w * 0.35 + Math.random() * (w * 0.15), h * 0.4 + Math.random() * (h * 0.2)))
            };
        }
    },
    // Level 10: Nash Equilibrium — 4 dogs must hold stable positions at gaps
    {
        name: "Level 10: Nash Equilibrium",
        numSheep: 20,
        availableDogs: ['a', 's', 'd', 'f'],
        setupEnvironment: (w, h) => {
            const obs = [];
            // Arc of rocks forming partial semicircle (left side corral)
            // Upper arc
            for (let angle = -Math.PI * 0.6; angle <= -Math.PI * 0.1; angle += 0.18) {
                const cx = w * 0.35;
                const cy = h * 0.5;
                const r = Math.min(w, h) * 0.35;
                obs.push(new Obstacle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 28));
            }
            // Lower arc
            for (let angle = Math.PI * 0.1; angle <= Math.PI * 0.6; angle += 0.18) {
                const cx = w * 0.35;
                const cy = h * 0.5;
                const r = Math.min(w, h) * 0.35;
                obs.push(new Obstacle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 28));
            }
            // Diagonal wall upper-right with gap
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                if (Math.abs(t - 0.5) < 0.1)
                    continue; // gap
                const x = w * 0.5 + t * (w * 0.75 - w * 0.5);
                const y = h * 0.2 + t * (h * 0.4 - h * 0.2);
                obs.push(new Obstacle(x, y, 26));
            }
            // Diagonal wall lower-right with gap
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                if (Math.abs(t - 0.5) < 0.1)
                    continue; // gap
                const x = w * 0.5 + t * (w * 0.75 - w * 0.5);
                const y = h * 0.8 - t * (h * 0.8 - h * 0.6);
                obs.push(new Obstacle(x, y, 26));
            }
            // Funnel obstacles near pen with gaps
            for (let y = h * 0.25; y <= h * 0.75; y += 50) {
                if (Math.abs(y - h * 0.4) < 30 || Math.abs(y - h * 0.6) < 30)
                    continue; // two gaps
                obs.push(new Obstacle(w * 0.75, y, 25));
            }
            return {
                pen: new Pen(w * 0.8 - 100, h / 2 - 100, 200, 200),
                obstacles: obs,
                sheepSpawns: Array.from({ length: 20 }, () => new Vector(w * 0.2 + Math.random() * (w * 0.3), h * 0.3 + Math.random() * (h * 0.4)))
            };
        }
    }
];
