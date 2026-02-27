import { Dog, Sheep, Obstacle, Pen, SheepState } from './entities.js';

export default class Renderer {
    private ctx: CanvasRenderingContext2D;

    constructor(private canvas: HTMLCanvasElement, private hudItems: Record<string, HTMLElement | null>) {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        this.ctx = context;
    }

    clear(): void {
        this.ctx.fillStyle = '#44a044';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grass tufts
        this.ctx.strokeStyle = '#3e903e';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 200; i++) {
            const x = (i * 123456) % this.canvas.width;
            const y = (i * 654321) % this.canvas.height;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - 2, y + 3);
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + 2, y + 3);
            this.ctx.stroke();
        }
    }

    draw(dogs: Dog[], sheep: Sheep[], obstacles: Obstacle[], pen: Pen, score: number, total: number): void {
        this.clear();

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

        this.drawScore(score, total);
        this.updateHUD(dogs);
    }

    private drawPen(pen: Pen): void {
        this.ctx.fillStyle = '#6ab06a';
        this.ctx.fillRect(pen.x, pen.y, pen.width, pen.height);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 5]);
        this.ctx.strokeRect(pen.x, pen.y, pen.width, pen.height);
        this.ctx.setLineDash([]);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PEN', pen.x + pen.width / 2, pen.y + pen.height / 2 + 8);
    }

    private drawObstacle(obs: Obstacle): void {
        this.ctx.beginPath();
        this.ctx.arc(obs.pos.x, obs.pos.y, obs.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4a3b2b';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    private drawSheep(sheep: Sheep): void {
        this.ctx.save();
        this.ctx.translate(sheep.pos.x, sheep.pos.y);
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 6, sheep.radius * 1.2, sheep.radius * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.rotate(sheep.angle);

        // Animation values
        const isMoving = sheep.vel.mag() > 10;
        const breathe = Math.sin(Date.now() / 400) * 0.5;
        const runCycle = isMoving ? Math.sin(sheep.animTime * 3) : 0;
        const bounce = isMoving ? Math.abs(Math.sin(sheep.animTime * 3)) * 3 : breathe;

        // Legs
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        const lx = 4;
        const ly = 5;
        // Front legs
        this.ctx.beginPath();
        this.ctx.moveTo(lx, -ly); this.ctx.lineTo(lx + (isMoving ? runCycle * 3 : 0), -ly + 2);
        this.ctx.moveTo(lx, ly); this.ctx.lineTo(lx - (isMoving ? runCycle * 3 : 0), ly + 2);
        // Back legs
        this.ctx.moveTo(-lx, -ly); this.ctx.lineTo(-lx - (isMoving ? runCycle * 3 : 0), -ly + 2);
        this.ctx.moveTo(-lx, ly); this.ctx.lineTo(-lx + (isMoving ? runCycle * 3 : 0), ly + 2);
        this.ctx.stroke();

        // Wool "Cloud" Body
        let bodyColor = 'white';
        if (sheep.state === SheepState.FLOCKING) bodyColor = '#ffffcc';
        if (sheep.state === SheepState.SPOOKED) bodyColor = '#ffcccc';
        if (sheep.state === SheepState.PENNED) bodyColor = '#ccffcc';

        this.ctx.fillStyle = bodyColor;
        this.ctx.translate(0, -bounce); // Apply bounce to body only

        // Draw multiple overlapping circles for fluffiness
        const r = sheep.radius + 1;
        this.drawFluff(0, 0, r * 1.2, r * 0.9);
        this.drawFluff(-r*0.5, -r*0.3, r*0.6, r*0.6);
        this.drawFluff(-r*0.5, r*0.3, r*0.6, r*0.6);
        this.drawFluff(r*0.4, -r*0.3, r*0.6, r*0.6);
        this.drawFluff(r*0.4, r*0.3, r*0.6, r*0.6);

        // Head
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.ellipse(r * 0.9, 0, 6, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes (white dots)
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(r * 1.1, -2, 1.5, 0, Math.PI * 2);
        this.ctx.arc(r * 1.1, 2, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Ears
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.ellipse(r * 0.8, -4, 4, 1.5, Math.PI/4, 0, Math.PI * 2);
        this.ctx.ellipse(r * 0.8, 4, 4, 1.5, -Math.PI/4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        if (sheep.state === SheepState.SPOOKED) {
            this.ctx.save();
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillStyle = 'red';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowColor = 'black';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('!', sheep.pos.x, sheep.pos.y - 25);
            this.ctx.restore();
        }
    }

    private drawFluff(x: number, y: number, rw: number, rh: number): void {
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        this.ctx.stroke();
    }

    private drawDog(dog: Dog): void {
        this.ctx.save();
        this.ctx.translate(dog.pos.x, dog.pos.y);

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 10, dog.radius * 1.3, dog.radius * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.rotate(dog.angle);

        const isMoving = dog.vel.mag() > 10;
        const runCycle = isMoving ? Math.sin(dog.animTime * 4) : 0;
        const bounce = isMoving ? Math.abs(Math.sin(dog.animTime * 4)) * 4 : 0;

        // Legs (detailed)
        this.ctx.strokeStyle = dog.color;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        const lx = 8;
        const ly = 6;
        
        this.ctx.beginPath();
        // Dynamic leg positioning for run
        this.ctx.moveTo(lx, -ly); this.ctx.lineTo(lx + runCycle * 6, -ly);
        this.ctx.moveTo(lx, ly); this.ctx.lineTo(lx - runCycle * 6, ly);
        this.ctx.moveTo(-lx, -ly); this.ctx.lineTo(-lx - runCycle * 6, -ly);
        this.ctx.moveTo(-lx, ly); this.ctx.lineTo(-lx + runCycle * 6, ly);
        this.ctx.stroke();

        this.ctx.translate(0, -bounce);

        // Body
        this.ctx.fillStyle = dog.color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.stroke();

        // Tail
        this.ctx.beginPath();
        this.ctx.moveTo(-16, 0);
        this.ctx.quadraticCurveTo(-25, isMoving ? runCycle * 10 : 0, -20, isMoving ? runCycle * 5 : -5);
        this.ctx.strokeStyle = dog.color;
        this.ctx.lineWidth = 5;
        this.ctx.stroke();
        
        // Head
        this.ctx.beginPath();
        this.ctx.ellipse(15, 0, 8, 7, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Muzzle
        this.ctx.beginPath();
        this.ctx.ellipse(20, 0, 5, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(17, -3, 2, 0, Math.PI * 2);
        this.ctx.arc(17, 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(18, -3, 1, 0, Math.PI * 2);
        this.ctx.arc(18, 3, 1, 0, Math.PI * 2);
        this.ctx.fill();

        // Ears (floppy)
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(12, -6, 5, 3, Math.PI/3, 0, Math.PI * 2);
        this.ctx.ellipse(12, 6, 5, 3, -Math.PI/3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        // Selection
        if (dog.selected) {
            this.ctx.beginPath();
            this.ctx.arc(dog.pos.x, dog.pos.y, dog.radius + 12, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        this.ctx.font = 'bold 12px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(dog.name, dog.pos.x, dog.pos.y - 25);
    }

    private drawScore(score: number, total: number): void {
        this.ctx.font = 'bold 24px Segoe UI';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Herd Status: ${score}/${total}`, this.canvas.width - 20, 40);
        
        if (score === total) {
            this.ctx.font = 'bold 48px Segoe UI';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = 'gold';
            this.ctx.fillText('FLOCK HERDED!', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    private updateHUD(dogs: Dog[]): void {
        for (const dog of dogs) {
            const hudId = `dog-${dog.id}`;
            const element = this.hudItems[hudId];
            if (element) {
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
}
