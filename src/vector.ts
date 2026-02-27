export default class Vector {
    constructor(public x: number = 0, public y: number = 0) {}

    add(v: Vector): Vector {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    sub(v: Vector): Vector {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    mul(s: number): Vector {
        return new Vector(this.x * s, this.y * s);
    }

    div(s: number): Vector {
        if (s === 0) return new Vector();
        return new Vector(this.x / s, this.y / s);
    }

    mag(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vector {
        const m = this.mag();
        if (m === 0) return new Vector();
        return this.div(m);
    }

    limit(max: number): Vector {
        if (this.mag() > max) {
            return this.normalize().mul(max);
        }
        return new Vector(this.x, this.y);
    }

    dist(v: Vector): number {
        return this.sub(v).mag();
    }

    static random(minX: number, minY: number, maxX: number, maxY: number): Vector {
        return new Vector(
            Math.random() * (maxX - minX) + minX,
            Math.random() * (maxY - minY) + minY
        );
    }

    static randomUnit(): Vector {
        const angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
}
