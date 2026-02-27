import { SheepState } from './entities.js';
export default class Renderer {
    canvas;
    hudItems;
    ctx;
    constructor(canvas, hudItems) {
        this.canvas = canvas;
        this.hudItems = hudItems;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('Could not get canvas context');
        this.ctx = context;
    }
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    draw(dogs, sheep, obstacles, pen, score, total) {
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
    drawPen(pen) {
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
    drawObstacle(obs) {
        this.ctx.beginPath();
        this.ctx.arc(obs.pos.x, obs.pos.y, obs.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4a3b2b';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    drawSheep(sheep) {
        this.ctx.beginPath();
        this.ctx.arc(sheep.pos.x, sheep.pos.y, sheep.radius, 0, Math.PI * 2);
        let color = 'white';
        if (sheep.state === SheepState.FLOCKING)
            color = '#ffffcc';
        if (sheep.state === SheepState.SPOOKED)
            color = '#ffcccc';
        if (sheep.state === SheepState.PENNED)
            color = '#ccffcc';
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        if (sheep.state === SheepState.SPOOKED) {
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = 'red';
            this.ctx.fillText('!', sheep.pos.x, sheep.pos.y - 12);
        }
    }
    drawDog(dog) {
        if (dog.destination) {
            this.ctx.beginPath();
            this.ctx.moveTo(dog.pos.x, dog.pos.y);
            this.ctx.lineTo(dog.destination.x, dog.destination.y);
            this.ctx.strokeStyle = dog.color + '44';
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            const pulse = 2 + Math.sin(Date.now() / 200) * 2;
            this.ctx.beginPath();
            this.ctx.arc(dog.destination.x, dog.destination.y, 4 + pulse, 0, Math.PI * 2);
            this.ctx.fillStyle = dog.color + '66';
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.strokeStyle = dog.color;
            this.ctx.lineWidth = 2;
            const s = 6;
            this.ctx.moveTo(dog.destination.x - s, dog.destination.y - s);
            this.ctx.lineTo(dog.destination.x + s, dog.destination.y + s);
            this.ctx.moveTo(dog.destination.x + s, dog.destination.y - s);
            this.ctx.lineTo(dog.destination.x - s, dog.destination.y + s);
            this.ctx.stroke();
        }
        this.ctx.beginPath();
        this.ctx.arc(dog.pos.x, dog.pos.y, dog.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = dog.color;
        this.ctx.fill();
        if (dog.selected) {
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
        this.ctx.font = 'bold 12px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(dog.name, dog.pos.x, dog.pos.y - dog.radius - 5);
        this.ctx.font = '10px Segoe UI';
        const stateStr = dog.destination ? 'MOVING' : 'IDLE';
        this.ctx.fillText(stateStr, dog.pos.x, dog.pos.y + dog.radius + 15);
    }
    drawScore(score, total) {
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
    updateHUD(dogs) {
        for (const dog of dogs) {
            const hudId = `dog-${dog.id}`;
            const element = this.hudItems[hudId];
            if (element) {
                if (dog.selected) {
                    element.classList.add('selected');
                }
                else {
                    element.classList.remove('selected');
                }
                const state = dog.destination ? 'Moving' : 'Idle';
                element.innerHTML = `${dog.name} (${dog.key.toUpperCase()}) <br/> <small>${state}</small>`;
                element.style.color = dog.color;
            }
        }
    }
}
