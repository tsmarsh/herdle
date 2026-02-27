import { Dog, Sheep, Obstacle, Pen, SheepState } from './entities.js';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    size: number;
    fadeSpeed: number;
}

interface GrassTriangle {
    x: number;
    y: number;
    size: number;
    shade: string;
    rotation: number;
}

interface ObstacleFace {
    vertices: number[];
    shade: string;
}

export default class Renderer {
    private ctx: CanvasRenderingContext2D;
    private particles: Particle[] = [];
    private grassTriangles: GrassTriangle[] = [];
    private obstacleShapes: Map<Obstacle, ObstacleFace[]> = new Map();
    private initialized = false;

    constructor(private canvas: HTMLCanvasElement, private hudItems: Record<string, HTMLElement | null>) {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        this.ctx = context;
    }

    private init(): void {
        if (this.initialized) return;
        this.initialized = true;

        // Initialize particles
        for (let i = 0; i < 40; i++) {
            this.particles.push(this.createParticle());
        }

        // Initialize grass triangles
        this.grassTriangles = [];
        const greens = ['#7EC8A0', '#A8D8B8', '#C2E6CC', '#8FD4A8', '#B5DFC2'];
        for (let i = 0; i < 300; i++) {
            this.grassTriangles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 3 + Math.random() * 8,
                shade: greens[Math.floor(Math.random() * greens.length)],
                rotation: Math.random() * Math.PI * 2
            });
        }
    }

    private createParticle(): Particle {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.2 - Math.random() * 0.3,
            alpha: 0.2 + Math.random() * 0.4,
            size: 1.5 + Math.random() * 2.5,
            fadeSpeed: 0.001 + Math.random() * 0.002
        };
    }

    resetObstacleCache(): void {
        this.obstacleShapes.clear();
        this.initialized = false;
    }

    private getObstacleFaces(obs: Obstacle): ObstacleFace[] {
        let faces = this.obstacleShapes.get(obs);
        if (faces) return faces;

        const sides = 6 + Math.floor(Math.random() * 3);
        const shades = ['#8899AA', '#7788A0', '#99AABB', '#8090A8', '#95A5B5'];
        const vertices: number[] = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const jitter = 0.7 + Math.random() * 0.3;
            vertices.push(
                Math.cos(angle) * obs.radius * jitter,
                Math.sin(angle) * obs.radius * jitter
            );
        }

        faces = [];
        // Each face is a triangle from center to two adjacent vertices
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            faces.push({
                vertices: [
                    0, 0,
                    vertices[i * 2], vertices[i * 2 + 1],
                    vertices[next * 2], vertices[next * 2 + 1]
                ],
                shade: shades[i % shades.length]
            });
        }

        this.obstacleShapes.set(obs, faces);
        return faces;
    }

    clear(): void {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Gradient base
        const grad = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
        grad.addColorStop(0, '#A8D8B8');
        grad.addColorStop(0.5, '#8CC8A0');
        grad.addColorStop(1, '#6BAE88');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, w, h);

        // Geometric grass triangles
        for (const tri of this.grassTriangles) {
            this.ctx.save();
            this.ctx.translate(tri.x, tri.y);
            this.ctx.rotate(tri.rotation);
            this.ctx.beginPath();
            this.ctx.moveTo(0, -tri.size);
            this.ctx.lineTo(-tri.size * 0.5, tri.size * 0.4);
            this.ctx.lineTo(tri.size * 0.5, tri.size * 0.4);
            this.ctx.closePath();
            this.ctx.fillStyle = tri.shade;
            this.ctx.globalAlpha = 0.4;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
            this.ctx.restore();
        }

        // Soft vignette overlay
        const vignette = this.ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
        vignette.addColorStop(0, 'rgba(216, 204, 232, 0)');
        vignette.addColorStop(1, 'rgba(216, 204, 232, 0.35)');
        this.ctx.fillStyle = vignette;
        this.ctx.fillRect(0, 0, w, h);
    }

    private updateParticles(): void {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.fadeSpeed;

            if (p.alpha <= 0 || p.y < -10 || p.x < -10 || p.x > this.canvas.width + 10) {
                Object.assign(p, this.createParticle());
                p.y = this.canvas.height + 10;
            }
        }
    }

    private drawParticles(): void {
        this.ctx.save();
        for (const p of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 248, 220, ${p.alpha})`;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = 'rgba(255, 230, 150, 0.5)';
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }

    draw(dogs: Dog[], sheep: Sheep[], obstacles: Obstacle[], pen: Pen, score: number, total: number, levelName: string, levelComplete: boolean): void {
        this.init();
        this.clear();

        this.updateParticles();
        this.drawParticles();

        this.drawPen(pen);

        for (const obs of obstacles) {
            this.drawObstacle(obs);
        }

        for (const s of sheep) {
            this.drawSheep(s);
        }

        for (const dog of dogs) {
            this.drawDog(dog);
        }

        this.drawScore(score, total, levelName);
        
        if (levelComplete) {
            this.drawLevelComplete();
        }

        this.updateHUD(dogs);
    }

    private drawLevelComplete(): void {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.font = 'bold 52px Quicksand, Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'rgba(255, 230, 150, 0.9)';
        this.ctx.fillStyle = '#FFF5D0';
        this.ctx.fillText('LEVEL COMPLETE!', this.canvas.width / 2, this.canvas.height / 2 - 20);

        this.ctx.font = '24px Quicksand, Segoe UI';
        this.ctx.fillStyle = 'white';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText('Click anywhere to proceed to the next level', this.canvas.width / 2, this.canvas.height / 2 + 30);
        this.ctx.restore();
    }

    private drawScore(score: number, total: number, levelName: string): void {
        this.ctx.save();
        this.ctx.font = 'bold 22px Quicksand, Segoe UI';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillText(`Herd Status: ${score}/${total}`, this.canvas.width - 20, 40);
        
        this.ctx.textAlign = 'center';
        this.ctx.fillText(levelName, this.canvas.width / 2, 40);
        this.ctx.restore();
    }

    private updateHUD(activeDogs: Dog[]): void {
        Object.values(this.hudItems).forEach(el => {
            if (el) el.style.display = 'none';
        });

        for (const dog of activeDogs) {
            const hudId = `dog-${dog.id}`;
            const element = this.hudItems[hudId];
            if (element) {
                element.style.display = 'block';
                if (dog.selected) {
                    element.classList.add('selected');
                } else {
                    element.classList.remove('selected');
                }

                const state = dog.destination ? 'Moving' : 'Idle';
                element.innerHTML = `${dog.name} (${dog.key.toUpperCase()}) <br/> <small>${state}</small>`;
                element.style.color = dog.color;
            }
        }
    }

    private drawPen(pen: Pen): void {
        // Soft inner glow
        const innerGlow = this.ctx.createRadialGradient(
            pen.x + pen.width / 2, pen.y + pen.height / 2, 0,
            pen.x + pen.width / 2, pen.y + pen.height / 2, pen.width * 0.6
        );
        innerGlow.addColorStop(0, 'rgba(255, 255, 240, 0.12)');
        innerGlow.addColorStop(1, 'rgba(255, 255, 240, 0)');
        this.ctx.fillStyle = innerGlow;
        this.ctx.fillRect(pen.x - 20, pen.y - 20, pen.width + 40, pen.height + 40);

        // Ground inside pen
        this.ctx.fillStyle = 'rgba(194, 230, 204, 0.3)';
        this.ctx.fillRect(pen.x, pen.y, pen.width, pen.height);

        const postWidth = 8;
        const postHeight = 20;
        const woodDark = '#A07850';
        const woodLight = '#C4956A';
        const woodMid = '#B48860';

        // Draw fence rails along 3 sides (open left side = entrance)
        // Top rail
        this.ctx.fillStyle = woodMid;
        this.ctx.fillRect(pen.x, pen.y - 3, pen.width, 6);
        this.ctx.fillStyle = woodLight;
        this.ctx.fillRect(pen.x, pen.y - 3, pen.width, 3);

        // Bottom rail
        this.ctx.fillStyle = woodMid;
        this.ctx.fillRect(pen.x, pen.y + pen.height - 3, pen.width, 6);
        this.ctx.fillStyle = woodLight;
        this.ctx.fillRect(pen.x, pen.y + pen.height - 3, pen.width, 3);

        // Right rail
        this.ctx.fillStyle = woodMid;
        this.ctx.fillRect(pen.x + pen.width - 3, pen.y, 6, pen.height);
        this.ctx.fillStyle = woodLight;
        this.ctx.fillRect(pen.x + pen.width - 3, pen.y, 3, pen.height);

        // Fence posts (trapezoids) along 3 sides
        const postPositions: [number, number][] = [];
        // Top edge posts
        for (let t = 0; t <= 1; t += 0.25) {
            postPositions.push([pen.x + pen.width * t, pen.y]);
        }
        // Bottom edge posts
        for (let t = 0; t <= 1; t += 0.25) {
            postPositions.push([pen.x + pen.width * t, pen.y + pen.height]);
        }
        // Right edge posts
        for (let t = 0.25; t < 1; t += 0.25) {
            postPositions.push([pen.x + pen.width, pen.y + pen.height * t]);
        }

        for (const [px, py] of postPositions) {
            // Trapezoid post
            this.ctx.beginPath();
            this.ctx.moveTo(px - postWidth / 2, py + postHeight / 4);
            this.ctx.lineTo(px - postWidth / 3, py - postHeight / 2);
            this.ctx.lineTo(px + postWidth / 3, py - postHeight / 2);
            this.ctx.lineTo(px + postWidth / 2, py + postHeight / 4);
            this.ctx.closePath();
            this.ctx.fillStyle = woodDark;
            this.ctx.fill();

            // Light face on left side
            this.ctx.beginPath();
            this.ctx.moveTo(px - postWidth / 2, py + postHeight / 4);
            this.ctx.lineTo(px - postWidth / 3, py - postHeight / 2);
            this.ctx.lineTo(px, py - postHeight / 2);
            this.ctx.lineTo(px, py + postHeight / 4);
            this.ctx.closePath();
            this.ctx.fillStyle = woodLight;
            this.ctx.fill();
        }

        // Flag/pennant on the top-right corner post
        const flagX = pen.x + pen.width;
        const flagY = pen.y;
        // Flag pole
        this.ctx.strokeStyle = woodDark;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY - postHeight / 2);
        this.ctx.lineTo(flagX, flagY - postHeight / 2 - 18);
        this.ctx.stroke();
        // Pennant triangle
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY - postHeight / 2 - 18);
        this.ctx.lineTo(flagX - 12, flagY - postHeight / 2 - 12);
        this.ctx.lineTo(flagX, flagY - postHeight / 2 - 8);
        this.ctx.closePath();
        this.ctx.fillStyle = '#FFB88A';
        this.ctx.fill();
    }

    private drawObstacle(obs: Obstacle): void {
        const faces = this.getObstacleFaces(obs);

        // Soft shadow underneath
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(obs.pos.x, obs.pos.y + obs.radius * 0.3, obs.radius * 1.1, obs.radius * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.translate(obs.pos.x, obs.pos.y);

        for (const face of faces) {
            const v = face.vertices;
            this.ctx.beginPath();
            this.ctx.moveTo(v[0], v[1]);
            this.ctx.lineTo(v[2], v[3]);
            this.ctx.lineTo(v[4], v[5]);
            this.ctx.closePath();
            this.ctx.fillStyle = face.shade;
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    private drawPolygon(cx: number, cy: number, radius: number, sides: number, rotation: number = 0): void {
        this.ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (i / sides) * Math.PI * 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
    }

    private drawSheep(sheep: Sheep): void {
        this.ctx.save();
        this.ctx.translate(sheep.pos.x, sheep.pos.y);

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 7, sheep.radius * 1.3, sheep.radius * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.rotate(sheep.angle);

        // Animation values
        const isMoving = sheep.vel.mag() > 10;
        const breathe = Math.sin(Date.now() / 400) * 0.5;
        const runCycle = isMoving ? Math.sin(sheep.animTime * 3) : 0;
        const bounce = isMoving ? Math.abs(Math.sin(sheep.animTime * 3)) * 3 : breathe;

        // Legs (geometric stubs)
        this.ctx.fillStyle = '#555';
        const lx = 4;
        const ly = 5;
        const legOffset = isMoving ? runCycle * 3 : 0;
        // Front legs
        this.ctx.fillRect(lx + legOffset - 1.5, -ly - 1, 3, 5);
        this.ctx.fillRect(lx - legOffset - 1.5, ly - 1, 3, 5);
        // Back legs
        this.ctx.fillRect(-lx - legOffset - 1.5, -ly - 1, 3, 5);
        this.ctx.fillRect(-lx + legOffset - 1.5, ly - 1, 3, 5);

        // State colors (pastel)
        let bodyColor = '#F5F0E8';
        if (sheep.state === SheepState.FLOCKING) bodyColor = '#FFF3CC';
        if (sheep.state === SheepState.SPOOKED) bodyColor = '#FFB8B8';
        if (sheep.state === SheepState.PENNED) bodyColor = '#B8F0CC';

        this.ctx.translate(0, -bounce);

        // Penned glow
        if (sheep.state === SheepState.PENNED) {
            this.ctx.save();
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = 'rgba(184, 240, 204, 0.6)';
            this.drawPolygon(0, 0, sheep.radius + 3, 8);
            this.ctx.fillStyle = 'rgba(184, 240, 204, 0.15)';
            this.ctx.fill();
            this.ctx.restore();
        }

        // Wool body: overlapping hexagons
        const r = sheep.radius + 1;
        this.ctx.fillStyle = bodyColor;
        // Central hexagon
        this.drawPolygon(0, 0, r * 1.0, 6, Math.PI / 6);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();

        // Surrounding wool puffs (pentagons)
        const puffPositions = [
            [-r * 0.5, -r * 0.35], [-r * 0.5, r * 0.35],
            [r * 0.35, -r * 0.35], [r * 0.35, r * 0.35],
            [-r * 0.6, 0]
        ];
        for (const [px, py] of puffPositions) {
            this.drawPolygon(px, py, r * 0.55, 5, Math.PI / 5);
            this.ctx.fill();
            this.ctx.stroke();
        }

        // Head (pentagon)
        this.ctx.fillStyle = '#444';
        this.drawPolygon(r * 0.9, 0, 5.5, 5);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(r * 1.1, -2, 1.5, 0, Math.PI * 2);
        this.ctx.arc(r * 1.1, 2, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Ears (small triangles)
        this.ctx.fillStyle = '#444';
        this.ctx.beginPath();
        this.ctx.moveTo(r * 0.7, -5);
        this.ctx.lineTo(r * 0.5, -9);
        this.ctx.lineTo(r * 0.9, -6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(r * 0.7, 5);
        this.ctx.lineTo(r * 0.5, 9);
        this.ctx.lineTo(r * 0.9, 6);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();

        // Spooked indicator
        if (sheep.state === SheepState.SPOOKED) {
            this.ctx.save();
            this.ctx.font = 'bold 14px Quicksand, Segoe UI';
            this.ctx.fillStyle = '#FF8888';
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = 'rgba(255, 136, 136, 0.6)';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('!', sheep.pos.x, sheep.pos.y - 22);
            this.ctx.restore();
        }
    }

    private drawDog(dog: Dog): void {
        this.ctx.save();
        this.ctx.translate(dog.pos.x, dog.pos.y);

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 10, dog.radius * 1.3, dog.radius * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.rotate(dog.angle);

        const isMoving = dog.vel.mag() > 10;
        const runCycle = isMoving ? Math.sin(dog.animTime * 4) : 0;
        const bounce = isMoving ? Math.abs(Math.sin(dog.animTime * 4)) * 4 : 0;

        // Legs (geometric stubs)
        this.ctx.fillStyle = dog.color;
        const lx = 8;
        const ly = 6;
        const legSwing = isMoving ? runCycle * 5 : 0;
        this.ctx.fillRect(lx + legSwing - 2, -ly - 1.5, 4, 5);
        this.ctx.fillRect(lx - legSwing - 2, ly - 1.5, 4, 5);
        this.ctx.fillRect(-lx - legSwing - 2, -ly - 1.5, 4, 5);
        this.ctx.fillRect(-lx + legSwing - 2, ly - 1.5, 4, 5);

        this.ctx.translate(0, -bounce);

        // Body (faceted elongated hexagon)
        this.ctx.fillStyle = dog.color;
        this.ctx.beginPath();
        this.ctx.moveTo(-16, 0);
        this.ctx.lineTo(-12, -8);
        this.ctx.lineTo(6, -9);
        this.ctx.lineTo(16, -4);
        this.ctx.lineTo(16, 4);
        this.ctx.lineTo(6, 9);
        this.ctx.lineTo(-12, 8);
        this.ctx.closePath();
        this.ctx.fill();
        // Subtle top highlight face
        this.ctx.fillStyle = 'rgba(255,255,255,0.12)';
        this.ctx.beginPath();
        this.ctx.moveTo(-16, 0);
        this.ctx.lineTo(-12, -8);
        this.ctx.lineTo(6, -9);
        this.ctx.lineTo(16, -4);
        this.ctx.lineTo(16, 0);
        this.ctx.lineTo(-16, 0);
        this.ctx.closePath();
        this.ctx.fill();

        // Tail
        this.ctx.beginPath();
        this.ctx.moveTo(-16, 0);
        this.ctx.lineTo(-22, isMoving ? runCycle * 8 : -4);
        this.ctx.lineTo(-19, isMoving ? runCycle * 4 : -6);
        this.ctx.strokeStyle = dog.color;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

        // Head (hexagon)
        this.ctx.fillStyle = dog.color;
        this.drawPolygon(16, 0, 8, 6);
        this.ctx.fill();
        // Head highlight
        this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.drawPolygon(16, 0, 8, 6);
        this.ctx.fill();

        // Muzzle (small pentagon)
        this.ctx.fillStyle = dog.color;
        this.drawPolygon(22, 0, 4, 5);
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
        this.drawPolygon(22, 0, 4, 5);
        this.ctx.fill();

        // Nose
        this.ctx.fillStyle = '#555';
        this.ctx.beginPath();
        this.ctx.arc(25, 0, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(18, -3, 2, 0, Math.PI * 2);
        this.ctx.arc(18, 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(19, -3, 1, 0, Math.PI * 2);
        this.ctx.arc(19, 3, 1, 0, Math.PI * 2);
        this.ctx.fill();

        // Ears (triangles)
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.beginPath();
        this.ctx.moveTo(13, -6);
        this.ctx.lineTo(9, -12);
        this.ctx.lineTo(16, -8);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(13, 6);
        this.ctx.lineTo(9, 12);
        this.ctx.lineTo(16, 8);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();

        // Selection glow
        if (dog.selected) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(dog.pos.x, dog.pos.y, dog.radius + 12, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Name label with soft glow
        this.ctx.save();
        this.ctx.font = 'bold 12px Quicksand, Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillText(dog.name, dog.pos.x, dog.pos.y - 25);
        this.ctx.restore();

        // Destination marker
        if (dog.destination) {
            const dx = dog.destination.x;
            const dy = dog.destination.y;
            const pulse = 4 + Math.sin(Date.now() / 200) * 1.5;

            this.ctx.save();
            this.ctx.translate(dx, dy);
            this.ctx.rotate(Math.PI / 4);
            this.ctx.fillStyle = dog.color;
            this.ctx.globalAlpha = 0.7;
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = dog.color;
            this.ctx.fillRect(-pulse, -pulse, pulse * 2, pulse * 2);
            this.ctx.restore();
        }
    }
}
