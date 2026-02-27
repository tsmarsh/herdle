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
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 5, sheep.radius, sheep.radius * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.rotate(sheep.angle);

        // Body (wobbly when moving)
        const wobble = Math.sin(sheep.animTime * 2) * 2;
        this.ctx.beginPath();
        
        let bodyColor = 'white';
        if (sheep.state === SheepState.FLOCKING) bodyColor = '#ffffcc';
        if (sheep.state === SheepState.SPOOKED) bodyColor = '#ffcccc';
        if (sheep.state === SheepState.PENNED) bodyColor = '#ccffcc';

        // Fluffy wool circles
        this.ctx.fillStyle = bodyColor;
        const bodyRadius = sheep.radius + wobble;
        this.ctx.ellipse(0, 0, bodyRadius * 1.2, bodyRadius * 0.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Head
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.ellipse(bodyRadius * 0.8, 0, 5, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Ears
        this.ctx.beginPath();
        this.ctx.ellipse(bodyRadius * 0.8, -3, 3, 1, Math.PI/4, 0, Math.PI * 2);
        this.ctx.ellipse(bodyRadius * 0.8, 3, 3, 1, -Math.PI/4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        if (sheep.state === SheepState.SPOOKED) {
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillStyle = 'red';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('!', sheep.pos.x, sheep.pos.y - 15);
        }
    }

    private drawDog(dog: Dog): void {
        if (dog.destination) {
            this.ctx.beginPath();
            this.ctx.moveTo(dog.pos.x, dog.pos.y);
            this.ctx.lineTo(dog.destination.x, dog.destination.y);
            this.ctx.strokeStyle = dog.color + '33';
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        this.ctx.save();
        this.ctx.translate(dog.pos.x, dog.pos.y);

        // Shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 8, dog.radius, dog.radius * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.rotate(dog.angle);

        // Legs (animated)
        const legOsc = Math.sin(dog.animTime * 3) * 5;
        this.ctx.strokeStyle = dog.color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-5, -5 + legOsc); this.ctx.lineTo(5, -5 - legOsc);
        this.ctx.moveTo(-5, 5 - legOsc); this.ctx.lineTo(5, 5 + legOsc);
        this.ctx.stroke();

        // Body
        this.ctx.fillStyle = dog.color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Head
        this.ctx.beginPath();
        this.ctx.arc(12, 0, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Ears
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.ellipse(10, -5, 4, 2, -Math.PI/6, 0, Math.PI * 2);
        this.ctx.ellipse(10, 5, 4, 2, Math.PI/6, 0, Math.PI * 2);
        this.ctx.fill();

        // Selection indicator
        if (dog.selected) {
            this.ctx.restore();
            this.ctx.beginPath();
            this.ctx.arc(dog.pos.x, dog.pos.y, dog.radius + 8, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([4, 4]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.save();
            this.ctx.translate(dog.pos.x, dog.pos.y);
        }

        this.ctx.restore();

        this.ctx.font = 'bold 12px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(dog.name, dog.pos.x, dog.pos.y - 20);
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
