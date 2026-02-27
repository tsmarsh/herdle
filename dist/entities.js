import Vector from './vector.js';
export class Entity {
    pos;
    vel;
    acc;
    radius;
    color;
    maxSpeed;
    maxForce;
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
    pos;
    radius;
    color = '#333';
    constructor(x, y, radius) {
        this.pos = new Vector(x, y);
        this.radius = radius;
    }
}
export class Pen {
    x;
    y;
    width;
    height;
    center;
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.center = new Vector(x + width / 2, y + height / 2);
    }
    contains(entity) {
        return (entity.pos.x > this.x &&
            entity.pos.x < this.x + this.width &&
            entity.pos.y > this.y &&
            entity.pos.y < this.y + this.height);
    }
}
export class Dog extends Entity {
    id;
    name;
    key;
    destination = null;
    selected = false;
    constructor(id, name, key, color, x, y) {
        super(x, y, 12, color);
        this.id = id;
        this.name = name;
        this.key = key;
        this.maxSpeed = 150;
    }
    setDestination(x, y) {
        if (this.destination) {
            this.destination = null;
        }
        else {
            this.destination = new Vector(x, y);
        }
    }
    updateDog(dt, obstacles, canvasWidth, canvasHeight) {
        if (this.destination) {
            const desired = this.destination.sub(this.pos);
            const d = desired.mag();
            if (d < 5) {
                this.destination = null;
                this.vel = new Vector(0, 0);
            }
            else {
                const speed = Math.min(this.maxSpeed, d * 5);
                this.vel = desired.normalize().mul(speed);
                this.pos = this.pos.add(this.vel.mul(dt));
            }
        }
        for (const obs of obstacles) {
            const dist = this.pos.dist(obs.pos);
            const combinedRadius = this.radius + obs.radius;
            if (dist < combinedRadius) {
                const diff = this.pos.sub(obs.pos).normalize().mul(combinedRadius);
                this.pos = obs.pos.add(diff);
            }
        }
        this.pos.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.pos.x));
        this.pos.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.pos.y));
    }
}
export var SheepState;
(function (SheepState) {
    SheepState["GRAZING"] = "grazing";
    SheepState["FLOCKING"] = "flocking";
    SheepState["SPOOKED"] = "spooked";
    SheepState["PENNED"] = "penned";
})(SheepState || (SheepState = {}));
export class Sheep extends Entity {
    state = SheepState.GRAZING;
    stateTimer = 0;
    panicRadius = 60;
    warnRadius = 150;
    wanderAngle = Math.random() * Math.PI * 2;
    constructor(x, y) {
        super(x, y, 8, 'white');
        this.maxSpeed = 80;
        this.maxForce = 5;
    }
    updateSheep(dt, dogs, others, obstacles, pen, canvasWidth, canvasHeight) {
        this.updateState(dogs, pen);
        let weights = { flee: 0, cohesion: 0, separation: 1.5, alignment: 0, wander: 0, pen: 0.1, speed: 40 };
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
                weights.separation = 3.0;
                weights.cohesion = 0.5;
                weights.speed = 140;
                break;
            case SheepState.PENNED:
                weights = { flee: 0, cohesion: 0.5, separation: 1.0, alignment: 0, wander: 0, pen: 0, speed: 10 };
                break;
        }
        const forces = [
            this.flee(dogs).mul(weights.flee),
            this.cohesion(others).mul(weights.cohesion),
            this.separation(others).mul(weights.separation),
            this.alignment(others).mul(weights.alignment),
            this.wander().mul(weights.wander),
            pen && this.state !== SheepState.PENNED && this.pos.dist(pen.center) < 400 ? this.seek(pen.center).mul(weights.pen) : new Vector()
        ];
        forces.forEach(f => this.applyForce(f));
        for (const obs of obstacles) {
            this.applyForce(this.avoidObstacle(obs).mul(5.0));
        }
        this.vel = this.vel.add(this.acc.mul(dt)).limit(weights.speed);
        this.pos = this.pos.add(this.vel.mul(dt));
        this.acc = this.acc.mul(0);
        this.boundaries(canvasWidth, canvasHeight);
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
            if (d < closestDogDist)
                closestDogDist = d;
        }
        if (closestDogDist < this.panicRadius) {
            this.state = SheepState.SPOOKED;
            this.stateTimer = 120;
        }
        else if (closestDogDist < this.warnRadius) {
            this.state = SheepState.FLOCKING;
            this.stateTimer = 60;
        }
        else {
            if (this.stateTimer > 0) {
                this.stateTimer--;
            }
            else {
                this.state = SheepState.GRAZING;
            }
        }
    }
    boundaries(width, height) {
        const margin = 40;
        const force = 5;
        if (this.pos.x < margin)
            this.applyForce(new Vector(force, 0));
        if (this.pos.x > width - margin)
            this.applyForce(new Vector(-force, 0));
        if (this.pos.y < margin)
            this.applyForce(new Vector(0, force));
        if (this.pos.y > height - margin)
            this.applyForce(new Vector(0, -force));
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
            return steer.normalize().mul(this.maxSpeed).sub(this.vel).limit(this.maxForce);
        }
        return new Vector();
    }
    avoidObstacle(obs) {
        const dist = this.pos.dist(obs.pos);
        const combinedRadius = this.radius + obs.radius + 20;
        if (dist < combinedRadius) {
            return this.pos.sub(obs.pos).normalize().mul(this.maxForce).div(dist * 0.01);
        }
        return new Vector();
    }
    flee(dogs) {
        let steer = new Vector(0, 0);
        let count = 0;
        const perception = 100;
        for (const dog of dogs) {
            const d = this.pos.dist(dog.pos);
            if (d < perception) {
                steer = steer.add(this.pos.sub(dog.pos).normalize().div(d));
                count++;
            }
        }
        if (count > 0) {
            return steer.div(count).normalize().mul(this.maxSpeed).sub(this.vel).limit(this.maxForce * 2);
        }
        return new Vector();
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
        if (count > 0)
            return this.seek(steer.div(count));
        return new Vector();
    }
    separation(others) {
        const perception = 30;
        let steer = new Vector(0, 0);
        let count = 0;
        for (const other of others) {
            const d = this.pos.dist(other.pos);
            if (other !== this && d < perception) {
                steer = steer.add(this.pos.sub(other.pos).normalize().div(d));
                count++;
            }
        }
        if (count > 0)
            return steer.div(count).normalize().mul(this.maxSpeed).sub(this.vel).limit(this.maxForce);
        return new Vector();
    }
    seek(target) {
        const desired = target.sub(this.pos);
        return desired.normalize().mul(this.maxSpeed).sub(this.vel).limit(this.maxForce);
    }
    wander() {
        this.wanderAngle += (Math.random() - 0.5) * 0.3;
        return new Vector(Math.cos(this.wanderAngle), Math.sin(this.wanderAngle)).mul(this.maxForce);
    }
}
