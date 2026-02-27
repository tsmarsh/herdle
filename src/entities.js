import Vector from './vector.js';

export class Entity {
    constructor(x, y, radius, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.acc = new Vector(0, 0);
        this.radius = radius;
        this.color = color;
        this.maxSpeed = 2;
        this.maxForce = 0.1;
    }

    applyForce(force) {
        this.acc = this.acc.add(force);
    }

    update(dt) {
        this.vel = this.vel.add(this.acc).limit(this.maxSpeed);
        this.pos = this.pos.add(this.vel.mul(dt));
        this.acc = this.acc.mul(0);
    }
}

export class Dog extends Entity {
    constructor(id, name, key, color, x, y) {
        super(x, y, 12, color);
        this.id = id;
        this.name = name;
        this.key = key;
        this.destination = null;
        this.maxSpeed = 150; // pixels per second
        this.selected = false;
    }

    setDestination(x, y) {
        if (this.destination) {
            this.destination = null;
        } else {
            this.destination = new Vector(x, y);
        }
    }

    update(dt, canvasWidth, canvasHeight) {
        if (this.destination) {
            const desired = this.destination.sub(this.pos);
            const d = desired.mag();
            
            if (d < 5) {
                this.destination = null;
                this.vel = new Vector(0, 0);
            } else {
                const speed = Math.min(this.maxSpeed, d * 5); // slow down as it arrives
                this.vel = desired.normalize().mul(speed);
                this.pos = this.pos.add(this.vel.mul(dt));
            }
        }
        
        // Keep in bounds
        this.pos.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.pos.x));
        this.pos.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.pos.y));
    }
}

export class Sheep extends Entity {
    constructor(x, y) {
        super(x, y, 8, 'white');
        this.maxSpeed = 80;
        this.maxForce = 5;
        this.wanderAngle = Math.random() * Math.PI * 2;
    }

    update(dt, dogs, others, canvasWidth, canvasHeight) {
        // Behaviors
        const fleeForce = this.flee(dogs).mul(2.5);
        const cohesionForce = this.cohesion(others).mul(1.0);
        const separationForce = this.separation(others).mul(1.5);
        const wanderForce = this.wander().mul(0.5);

        this.applyForce(fleeForce);
        this.applyForce(cohesionForce);
        this.applyForce(separationForce);
        this.applyForce(wanderForce);

        // Standard update
        this.vel = this.vel.add(this.acc.mul(dt)).limit(this.maxSpeed);
        this.pos = this.pos.add(this.vel.mul(dt));
        this.acc = this.acc.mul(0);

        // Boundary repulsion
        const margin = 50;
        if (this.pos.x < margin) this.applyForce(new Vector(this.maxForce, 0));
        if (this.pos.x > canvasWidth - margin) this.applyForce(new Vector(-this.maxForce, 0));
        if (this.pos.y < margin) this.applyForce(new Vector(0, this.maxForce));
        if (this.pos.y > canvasHeight - margin) this.applyForce(new Vector(0, -this.maxForce));

        // Hard boundary
        this.pos.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.pos.x));
        this.pos.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.pos.y));
        
        // Friction when no forces
        if (fleeForce.mag() === 0 && wanderForce.mag() < 0.1) {
            this.vel = this.vel.mul(0.95);
        }
    }

    flee(dogs) {
        let steer = new Vector(0, 0);
        let count = 0;
        const perception = 100;

        for (const dog of dogs) {
            const d = this.pos.dist(dog.pos);
            if (d < perception) {
                let diff = this.pos.sub(dog.pos);
                diff = diff.normalize().div(d); // Weight by distance
                steer = steer.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steer = steer.div(count);
            steer = steer.normalize().mul(this.maxSpeed).sub(this.vel);
            steer = steer.limit(this.maxForce * 2);
        }
        return steer;
    }

    cohesion(others) {
        const perception = 50;
        let steer = new Vector(0, 0);
        let count = 0;

        for (const other of others) {
            const d = this.pos.dist(other.pos);
            if (other !== this && d < perception) {
                steer = steer.add(other.pos);
                count++;
            }
        }

        if (count > 0) {
            steer = steer.div(count);
            return this.seek(steer);
        }
        return new Vector(0, 0);
    }

    separation(others) {
        const perception = 30;
        let steer = new Vector(0, 0);
        let count = 0;

        for (const other of others) {
            const d = this.pos.dist(other.pos);
            if (other !== this && d < perception) {
                let diff = this.pos.sub(other.pos);
                diff = diff.normalize().div(d);
                steer = steer.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steer = steer.div(count);
            steer = steer.normalize().mul(this.maxSpeed).sub(this.vel);
            steer = steer.limit(this.maxForce);
        }
        return steer;
    }

    seek(target) {
        const desired = target.sub(this.pos);
        return desired.normalize().mul(this.maxSpeed).sub(this.vel).limit(this.maxForce);
    }

    wander() {
        this.wanderAngle += (Math.random() - 0.5) * 0.3;
        const wanderVec = new Vector(Math.cos(this.wanderAngle), Math.sin(this.wanderAngle));
        return wanderVec.mul(this.maxForce);
    }
}
