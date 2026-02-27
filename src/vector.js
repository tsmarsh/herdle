export default class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    mul(s) {
        return new Vector(this.x * s, this.y * s);
    }

    div(s) {
        if (s === 0) return new Vector();
        return new Vector(this.x / s, this.y / s);
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const m = this.mag();
        if (m === 0) return new Vector();
        return this.div(m);
    }

    limit(max) {
        if (this.mag() > max) {
            return this.normalize().mul(max);
        }
        return new Vector(this.x, this.y);
    }

    dist(v) {
        return this.sub(v).mag();
    }

    static random(minX, minY, maxX, maxY) {
        return new Vector(
            Math.random() * (maxX - minX) + minX,
            Math.random() * (maxY - minY) + minY
        );
    }

    static randomUnit() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle));
    }
}
