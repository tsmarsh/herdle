export default class Renderer {
    constructor(canvas, hudItems) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hudItems = hudItems;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(dogs, sheep, obstacles, pen, score, total) {
        this.clear();

        // Draw pen/goal area
        this.drawPen(pen);

        // Draw obstacles
        for (const obs of obstacles) {
            this.drawObstacle(obs);
        }

        // Draw sheep
        for (const s of sheep) {
            this.drawSheep(s);
        }

        // Draw dogs
        for (const dog of dogs) {
            this.drawDog(dog);
        }

        this.drawScore(score, total);
        this.updateHUD(dogs);
    }

    drawPen(pen) {
        this.ctx.fillStyle = '#6ab06a'; // Lighter green for pen
        this.ctx.fillRect(pen.x, pen.y, pen.width, pen.height);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 5]);
        this.ctx.strokeRect(pen.x, pen.y, pen.width, pen.height);
        this.ctx.setLineDash([]);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Segoe UI';
        this.ctx.fillText('PEN', pen.x + pen.width / 2, pen.y + pen.height / 2 + 8);
    }

    drawObstacle(obs) {
        this.ctx.beginPath();
        this.ctx.arc(obs.pos.x, obs.pos.y, obs.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4a3b2b'; // Dark brown rock
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
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

    drawSheep(sheep) {
        this.ctx.beginPath();
        this.ctx.arc(sheep.pos.x, sheep.pos.y, sheep.radius, 0, Math.PI * 2);
        
        let color = 'white';
        if (sheep.state === 'flocking') color = '#ffffcc';
        if (sheep.state === 'spooked') color = '#ffcccc';
        if (sheep.state === 'penned') color = '#ccffcc';
        
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        if (sheep.state === 'spooked') {
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = 'red';
            this.ctx.fillText('!', sheep.pos.x, sheep.pos.y - 12);
        }
    }

    drawDog(dog) {
        // Destination line and marker
        if (dog.destination) {
            this.ctx.beginPath();
            this.ctx.moveTo(dog.pos.x, dog.pos.y);
            this.ctx.lineTo(dog.destination.x, dog.destination.y);
            this.ctx.strokeStyle = dog.color + '44'; // semi-transparent
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Marker (pulsing dot)
            const pulse = 2 + Math.sin(Date.now() / 200) * 2;
            this.ctx.beginPath();
            this.ctx.arc(dog.destination.x, dog.destination.y, 4 + pulse, 0, Math.PI * 2);
            this.ctx.fillStyle = dog.color + '66';
            this.ctx.fill();

            // Destination "X"
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

        // Dog circle
        this.ctx.beginPath();
        this.ctx.arc(dog.pos.x, dog.pos.y, dog.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = dog.color;
        this.ctx.fill();
        
        // Selection outline
        if (dog.selected) {
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        // Label
        this.ctx.font = 'bold 12px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(dog.name, dog.pos.x, dog.pos.y - dog.radius - 5);
        
        // State label
        this.ctx.font = '10px Segoe UI';
        const stateStr = dog.destination ? 'MOVING' : 'IDLE';
        this.ctx.fillText(stateStr, dog.pos.x, dog.pos.y + dog.radius + 15);
    }

    updateHUD(dogs) {
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
