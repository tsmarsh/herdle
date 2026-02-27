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

export const SheepState = {
    GRAZING: 'grazing',
    FLOCKING: 'flocking',
    SPOOKED: 'spooked',
    PENNED: 'penned'
};

export class Sheep extends Entity {
    constructor(x, y) {
        super(x, y, 8, 'white');
        this.maxSpeed = 80;
        this.maxForce = 5;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.state = SheepState.GRAZING;
        this.stateTimer = 0;
        this.panicRadius = 60;
        this.warnRadius = 150;
    }

    update(dt, dogs, others, obstacles, pen, canvasWidth, canvasHeight) {
        this.updateState(dogs, pen);

        // Dynamic weights based on state
        let weights = {
            flee: 0,
            cohesion: 0,
            separation: 1.5,
            alignment: 0,
            wander: 0,
            pen: 0.1,
            speed: 40
        };

        switch (this.state) {
            case SheepState.GRAZING:
                weights.wander = 0.5;
                weights.separation = 2.0;
                weights.speed = 30;
                break;
            case SheepState.FLOCKING:
                weights.cohesion = 1.2;
                weights.alignment = 1.0;
                weights.separation = 1.5;
                weights.flee = 1.5;
                weights.speed = 70;
                break;
            case SheepState.SPOOKED:
                weights.flee = 4.0;
                weights.separation = 3.0; // Scatter more when panicked
                weights.cohesion = 0.5;
                weights.speed = 140;
                break;
            case SheepState.PENNED:
                weights = { flee: 0, cohesion: 0.5, separation: 1.0, alignment: 0, wander: 0, pen: 0, speed: 10 };
                break;
        }

        // Calculate Forces
        const fleeForce = this.flee(dogs).mul(weights.flee);
        const cohesionForce = this.cohesion(others).mul(weights.cohesion);
        const separationForce = this.separation(others).mul(weights.separation);
        const alignmentForce = this.alignment(others).mul(weights.alignment);
        const wanderForce = this.wander().mul(weights.wander);
        
        let penForce = new Vector(0, 0);
        if (pen && this.state !== SheepState.PENNED) {
            const distToPen = this.pos.dist(pen.center);
            if (distToPen < 400) {
                penForce = this.seek(pen.center).mul(weights.pen);
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
            this.applyForce(avoid.mul(5.0));
        }

        // Apply movement
        this.vel = this.vel.add(this.acc.mul(dt)).limit(weights.speed);
        this.pos = this.pos.add(this.vel.mul(dt));
        this.acc = this.acc.mul(0);

        // Boundary repulsion
        this.boundaries(canvasWidth, canvasHeight);
        
        // Natural friction
        this.vel = this.vel.mul(this.state === SheepState.PENNED ? 0.8 : 0.97);
    }

    updateState(dogs, pen) {
        if (pen.contains(this)) {
            this.state = SheepState.PENNED;
            return;
        }

        let closestDogDist = Infinity;
        for (const dog of dogs) {
            const d = this.pos.dist(dog.pos);
            if (d < closestDogDist) closestDogDist = d;
        }

        if (closestDogDist < this.panicRadius) {
            this.state = SheepState.SPOOKED;
            this.stateTimer = 120; // Panic lasts ~2 seconds
        } else if (closestDogDist < this.warnRadius) {
            this.state = SheepState.FLOCKING;
            this.stateTimer = 60;
        } else {
            if (this.stateTimer > 0) {
                this.stateTimer--;
            } else {
                this.state = SheepState.GRAZING;
            }
        }
    }

    boundaries(width, height) {
        const margin = 40;
        const force = 5;
        if (this.pos.x < margin) this.applyForce(new Vector(force, 0));
        if (this.pos.x > width - margin) this.applyForce(new Vector(-force, 0));
        if (this.pos.y < margin) this.applyForce(new Vector(0, force));
        if (this.pos.y > height - margin) this.applyForce(new Vector(0, -force));

        this.pos.x = Math.max(this.radius, Math.min(width - this.radius, this.pos.x));
        this.pos.y = Math.max(this.radius, Math.min(height - this.radius, this.pos.y));
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
