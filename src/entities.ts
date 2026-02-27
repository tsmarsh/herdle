import Vector from './vector.js';
import { DogPersonality } from './config.js';

export class Entity {
    public pos: Vector;
    public vel: Vector;
    public acc: Vector;
    public radius: number;
    public color: string;
    public maxSpeed: number;
    public maxForce: number;
    public angle: number = 0;
    public animTime: number = 0;

    constructor(x: number, y: number, radius: number, color: string) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.acc = new Vector(0, 0);
        this.radius = radius;
        this.color = color;
        this.maxSpeed = 2;
        this.maxForce = 0.1;
    }

    applyForce(force: Vector): void {
        this.acc = this.acc.add(force);
    }

    update(dt: number): void {
        this.vel = this.vel.add(this.acc).limit(this.maxSpeed);
        this.pos = this.pos.add(this.vel.mul(dt));
        this.acc = this.acc.mul(0);
        
        if (this.vel.mag() > 5) {
            this.angle = Math.atan2(this.vel.y, this.vel.x);
            this.animTime += dt * (this.vel.mag() / 20);
        } else {
            this.animTime = 0;
        }
    }
}

export class Obstacle {
    public pos: Vector;
    public radius: number;
    public color: string = '#333';

    constructor(x: number, y: number, radius: number) {
        this.pos = new Vector(x, y);
        this.radius = radius;
    }
}

export class Cliff {
    public pos: Vector;   // center of the cliff edge
    public width: number;
    public height: number;

    constructor(x: number, y: number, width: number, height: number) {
        this.pos = new Vector(x, y);
        this.width = width;
        this.height = height;
    }

    /** Closest point on the cliff rectangle to a given point */
    closestPoint(p: Vector): Vector {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const cx = Math.max(this.pos.x - halfW, Math.min(this.pos.x + halfW, p.x));
        const cy = Math.max(this.pos.y - halfH, Math.min(this.pos.y + halfH, p.y));
        return new Vector(cx, cy);
    }

    /** Check if a point is inside the cliff rectangle */
    contains(p: Vector): boolean {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        return p.x >= this.pos.x - halfW && p.x <= this.pos.x + halfW &&
               p.y >= this.pos.y - halfH && p.y <= this.pos.y + halfH;
    }
}

export class Pen {
    public center: Vector;
    constructor(public x: number, public y: number, public width: number, public height: number) {
        this.center = new Vector(x + width / 2, y + height / 2);
    }

    contains(entity: Entity): boolean {
        return (
            entity.pos.x > this.x &&
            entity.pos.x < this.x + this.width &&
            entity.pos.y > this.y &&
            entity.pos.y < this.y + this.height
        );
    }
}

export class Dog extends Entity {
    public destination: Vector | null = null;
    public selected: boolean = false;
    public personality: DogPersonality;
    public heading: number = 0;

    constructor(public id: string, public name: string, public key: string, color: string, x: number, y: number, personality: DogPersonality) {
        super(x, y, 12, color);
        this.personality = personality;
        this.maxSpeed = 200 * personality.speed;
    }

    setDestination(x: number, y: number): void {
        if (this.destination) {
            this.destination = null;
        } else {
            this.destination = new Vector(x, y);
        }
    }

    updateDog(dt: number, obstacles: Obstacle[], canvasWidth: number, canvasHeight: number, cliffs: Cliff[] = []): void {
        if (this.destination) {
            const toTarget = this.destination.sub(this.pos);
            const dist = toTarget.mag();

            if (dist < 8) {
                // Arrive
                this.destination = null;
                this.vel = new Vector();
            } else {
                // Turn toward destination
                const targetAngle = Math.atan2(toTarget.y, toTarget.x);
                let diff = targetAngle - this.heading;
                // Normalize to [-PI, PI]
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                // Turn rate: obedient dogs turn faster
                const turnRate = (3 + this.personality.obedience * 5) * dt;
                // Distractibility adds wobble to heading
                const wobble = (Math.random() - 0.5) * this.personality.distractibility * 1.5 * dt;

                if (Math.abs(diff) < turnRate) {
                    this.heading = targetAngle;
                } else {
                    this.heading += Math.sign(diff) * turnRate;
                }
                this.heading += wobble;

                // Move forward along heading at constant speed, slow near target
                const speed = dist < 30 ? this.maxSpeed * (dist / 30) : this.maxSpeed;
                this.vel = new Vector(Math.cos(this.heading), Math.sin(this.heading)).mul(speed);
                this.pos = this.pos.add(this.vel.mul(dt));
            }
        } else {
            this.vel = this.vel.mul(0.85); // Friction when idle
            this.pos = this.pos.add(this.vel.mul(dt));
        }

        // Update angle and animation from velocity
        if (this.vel.mag() > 5) {
            this.angle = Math.atan2(this.vel.y, this.vel.x);
            this.animTime += dt * (this.vel.mag() / 20);
        } else {
            this.animTime = 0;
        }

        // Slide around obstacles
        for (const obs of obstacles) {
            const dist = this.pos.dist(obs.pos);
            const combinedRadius = this.radius + obs.radius;
            if (dist < combinedRadius) {
                const push = this.pos.sub(obs.pos).normalize().mul(combinedRadius);
                this.pos = obs.pos.add(push);
            }
        }

        // Avoid cliffs (dogs are smart, always avoid)
        for (const cliff of cliffs) {
            const closest = cliff.closestPoint(this.pos);
            const dist = this.pos.dist(closest);
            const avoidDist = 40;
            if (dist < avoidDist && dist > 0) {
                const push = this.pos.sub(closest).normalize().mul((avoidDist - dist) * 0.5);
                this.pos = this.pos.add(push);
            } else if (dist === 0) {
                // On top of cliff, push out along velocity reverse or arbitrary direction
                const escape = this.vel.mag() > 0 ? this.vel.normalize().mul(-20) : new Vector(20, 0);
                this.pos = this.pos.add(escape);
            }
        }

        // Canvas bounds
        this.pos.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.pos.x));
        this.pos.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.pos.y));
    }
}

export enum SheepState {
    GRAZING = 'grazing',
    FLOCKING = 'flocking',
    SPOOKED = 'spooked',
    PENNED = 'penned',
    FALLEN = 'fallen'
}

export class Sheep extends Entity {
    public state: SheepState = SheepState.GRAZING;
    public stateTimer: number = 0;
    public panicRadius: number = 60;
    public warnRadius: number = 150;
    private wanderAngle: number = Math.random() * Math.PI * 2;

    constructor(x: number, y: number, panicRadius: number = 60, warnRadius: number = 150) {
        super(x, y, 8, 'white');
        this.maxSpeed = 300;
        this.maxForce = 8;
        this.panicRadius = panicRadius;
        this.warnRadius = warnRadius;
    }

    public fallenTimer: number = 0;

    updateSheep(dt: number, dogs: Dog[], others: Sheep[], obstacles: Obstacle[], pen: Pen, canvasWidth: number, canvasHeight: number, cliffs: Cliff[] = []): void {
        if (this.state === SheepState.FALLEN) {
            this.fallenTimer -= dt;
            return;
        }

        this.updateState(dogs, pen);
        super.update(dt);

        let weights = { flee: 0, cohesion: 0, separation: 1.5, alignment: 0, wander: 0, pen: 0.1, speed: 60 };

        switch (this.state) {
            case SheepState.GRAZING:
                weights.wander = 0.5; weights.separation = 2.0; weights.speed = 60;
                break;
            case SheepState.FLOCKING:
                weights.cohesion = 1.2; weights.alignment = 1.0; weights.separation = 1.5; weights.flee = 2.0; weights.speed = 140;
                break;
            case SheepState.SPOOKED:
                weights.flee = 4.5; weights.separation = 3.5; weights.cohesion = 0.5; weights.speed = 240;
                break;
            case SheepState.PENNED:
                weights = { flee: 0, cohesion: 0.5, separation: 1.0, alignment: 0, wander: 0, pen: 0, speed: 15 };
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

        // Cliff interaction
        for (const cliff of cliffs) {
            if (this.state === SheepState.SPOOKED) {
                // Spooked sheep don't avoid cliffs — check if they've fallen
                if (cliff.contains(this.pos)) {
                    this.state = SheepState.FALLEN;
                    this.fallenTimer = 1.5; // seconds for dust cloud animation
                    this.vel = new Vector();
                    return;
                }
            } else {
                // Calm/flocking sheep avoid cliffs like strong obstacles
                const closest = cliff.closestPoint(this.pos);
                const dist = this.pos.dist(closest);
                const avoidDist = 40;
                if (dist < avoidDist && dist > 0) {
                    const repel = this.pos.sub(closest).normalize().mul(this.maxForce * 3 * (1 - dist / avoidDist));
                    this.applyForce(repel);
                }
            }
        }

        this.boundaries(canvasWidth, canvasHeight);
        this.vel = this.vel.mul(this.state === SheepState.PENNED ? 0.8 : 0.97);
    }

    private updateState(dogs: Dog[], pen: Pen): void {
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
            this.stateTimer = 120;
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

    private boundaries(width: number, height: number): void {
        const margin = 40;
        const force = 5;
        if (this.pos.x < margin) this.applyForce(new Vector(force, 0));
        if (this.pos.x > width - margin) this.applyForce(new Vector(-force, 0));
        if (this.pos.y < margin) this.applyForce(new Vector(0, force));
        if (this.pos.y > height - margin) this.applyForce(new Vector(0, -force));

        this.pos.x = Math.max(this.radius, Math.min(width - this.radius, this.pos.x));
        this.pos.y = Math.max(this.radius, Math.min(height - this.radius, this.pos.y));
    }

    private alignment(others: Sheep[]): Vector {
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

    private avoidObstacle(obs: Obstacle): Vector {
        const dist = this.pos.dist(obs.pos);
        const combinedRadius = this.radius + obs.radius + 20;
        if (dist < combinedRadius) {
            return this.pos.sub(obs.pos).normalize().mul(this.maxForce).div(dist * 0.01);
        }
        return new Vector();
    }

    private flee(dogs: Dog[]): Vector {
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

    private cohesion(others: Sheep[]): Vector {
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
        if (count > 0) return this.seek(steer.div(count));
        return new Vector();
    }

    private separation(others: Sheep[]): Vector {
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
        if (count > 0) return steer.div(count).normalize().mul(this.maxSpeed).sub(this.vel).limit(this.maxForce);
        return new Vector();
    }

    private seek(target: Vector): Vector {
        const desired = target.sub(this.pos);
        return desired.normalize().mul(this.maxSpeed).sub(this.vel).limit(this.maxForce);
    }

    private wander(): Vector {
        this.wanderAngle += (Math.random() - 0.5) * 0.3;
        return new Vector(Math.cos(this.wanderAngle), Math.sin(this.wanderAngle)).mul(this.maxForce);
    }
}
