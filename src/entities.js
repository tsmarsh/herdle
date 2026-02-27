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

export class Obstacle {
    constructor(x, y, radius) {
        this.pos = new Vector(x, y);
        this.radius = radius;
        this.color = '#333';
    }
}

export class Pen {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.center = new Vector(x + width / 2, y + height / 2);
    }

    contains(entity) {
        return (
            entity.pos.x > this.x &&
            entity.pos.x < this.x + this.width &&
            entity.pos.y > this.y &&
            entity.pos.y < this.y + this.height
        );
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

    update(dt, obstacles, canvasWidth, canvasHeight) {
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
        
        // Obstacle avoidance/collision
        for (const obs of obstacles) {
            const dist = this.pos.dist(obs.pos);
            const combinedRadius = this.radius + obs.radius;
            if (dist < combinedRadius) {
                const diff = this.pos.sub(obs.pos).normalize().mul(combinedRadius);
                this.pos = obs.pos.add(diff);
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

    update(dt, dogs, others, obstacles, pen, canvasWidth, canvasHeight) {
        // Behaviors
        const fleeForce = this.flee(dogs).mul(3.0);
        const cohesionForce = this.cohesion(others).mul(1.2);
        const separationForce = this.separation(others).mul(1.8);
        const alignmentForce = this.alignment(others).mul(1.0);
        const wanderForce = this.wander().mul(0.3);
        
        // Gentle drive towards the pen if they are somewhat near it
        let penForce = new Vector(0, 0);
        if (pen) {
            const distToPen = this.pos.dist(pen.center);
            if (distToPen < 300) {
                penForce = this.seek(pen.center).mul(0.2);
            }
        }

        this.applyForce(fleeForce);
        this.applyForce(cohesionForce);
        this.applyForce(separationForce);
        this.applyForce(alignmentForce);
        this.applyForce(wanderForce);
        this.applyForce(penForce);

        // Obstacle avoidance
        for (const obs of obstacles) {
            const avoid = this.avoidObstacle(obs);
            this.applyForce(avoid.mul(4.0));
        }

        // Standard update
        const speedMult = fleeForce.mag() > 0.1 ? 1.5 : 1.0;
        this.vel = this.vel.add(this.acc.mul(dt)).limit(this.maxSpeed * speedMult);
        this.pos = this.pos.add(this.vel.mul(dt));
        this.acc = this.acc.mul(0);

        // Boundary repulsion
        const margin = 40;
        if (this.pos.x < margin) this.applyForce(new Vector(this.maxForce, 0));
        if (this.pos.x > canvasWidth - margin) this.applyForce(new Vector(-this.maxForce, 0));
        if (this.pos.y < margin) this.applyForce(new Vector(0, this.maxForce));
        if (this.pos.y > canvasHeight - margin) this.applyForce(new Vector(0, -this.maxForce));

        // Hard boundary
        this.pos.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.pos.x));
        this.pos.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.pos.y));
        
        // Natural friction/damping
        this.vel = this.vel.mul(0.98);
    }

    alignment(others) {
        const perception = 60;
        let steer = new Vector(0, 0);
        let count = 0;

        for (const other of others) {
            const d = this.pos.dist(other.pos);
            if (other !== this && d < perception) {
                steer = steer.add(other.vel);
                count++;
            }
        }

        if (count > 0) {
            steer = steer.div(count);
            steer = steer.normalize().mul(this.maxSpeed).sub(this.vel);
            return steer.limit(this.maxForce);
        }
        return new Vector(0, 0);
    }

    avoidObstacle(obs) {
        const dist = this.pos.dist(obs.pos);
        const combinedRadius = this.radius + obs.radius + 20;
        if (dist < combinedRadius) {
            let diff = this.pos.sub(obs.pos);
            return diff.normalize().mul(this.maxForce).div(dist * 0.01);
        }
        return new Vector(0, 0);
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
