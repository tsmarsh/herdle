export default class Renderer {
    constructor(canvas, hudItems) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hudItems = hudItems;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(dogs, sheep) {
        this.clear();

        // Draw sheep first
        for (const s of sheep) {
            this.drawSheep(s);
        }

        // Draw dogs
        for (const dog of dogs) {
            this.drawDog(dog);
        }

        this.updateHUD(dogs);
    }

    drawSheep(sheep) {
        this.ctx.beginPath();
        this.ctx.arc(sheep.pos.x, sheep.pos.y, sheep.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = sheep.color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
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
