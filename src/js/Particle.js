class Particle {
    constructor(options) {
        this.state = 'alive';

        Object.assign(this, options);

        if (this.x2 === undefined) this.x2 = this.x;
        if (this.y2 === undefined) this.y2 = this.y;
        if (this.radius2 === undefined) this.radius2 = this.radius;
        if (this.startAngle2 === undefined) this.startAngle2 = this.startAngle;
        if (this.endAngle2 === undefined) this.endAngle2 = this.endAngle;
        if (this.opacity2 === undefined) this.opacity2 = this.opacity;

        this.dx = (this.x2 - this.x) * 1000 / this.duration;
        this.dy = (this.y2 - this.y) * 1000 / this.duration;
        this.dradius = (this.radius2 - this.radius) * 1000 / this.duration;
        this.dstartAngle = (this.startAngle2 - this.startAngle) * 1000 / this.duration;
        this.dendAngle = (this.endAngle2 - this.endAngle) * 1000 / this.duration;
        this.dopacity = (this.opacity2 - this.opacity) * 1000 / this.duration;

        this.endms = game.framems + this.duration;
    }

    update(delta) {
        console.log(this.x);
        this.x += this.dx * delta;
        this.y += this.dy * delta;
        this.radius += this.dradius * delta;
        this.startAngle += this.dstartAngle * delta;
        this.endAngle += this.dendAngle * delta;
        this.opacity += this.dopacity * delta;

        if (game.framems > this.endms) {
            this.state = 'dead';
        }
    }

    render() {
        game.ctx.strokeStyle = 'rgba(' + this.strokeStyle + ', ' + this.opacity + ')';
        game.ctx.beginPath();
        game.ctx.arc(game.offset.x + this.x, game.offset.y + this.y, this.radius, Util.d2r(this.startAngle), Util.d2r(this.endAngle));
        game.ctx.stroke();
    }
}
