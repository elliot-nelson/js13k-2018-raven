class Player {
    constructor() {
        this.x = 105;
        this.y = 40;
        this.vx = 0;
        this.vy = 0;
        this.ax = 10;
        this.ay = 10;
        this.facing = 0;

        this.accel = 200;     // per second
        this.decel = 160;     // per second
        this.maxSpeed = 40;   // per second

        this.width = 8;
        this.height = 6;

        this.dead = false;
    }

    update(delta) {
        // TODO
        // Classic "fast diagonal" problem below; will fix later if I care enough.

        if (this.dead) {
            return;
        }

        if (game.input.up) {
            this.vy -= this.accel * delta;
            if (this.vy < -this.maxSpeed) {
                this.vy = -this.maxSpeed;
            }
        } else if (game.input.down) {
            this.vy += this.accel * delta;
            if (this.vy > this.maxSpeed) {
                this.vy = this.maxSpeed;
            }
        } else {
            var dir = this.vy > 0 ? -1 : 1;
            this.vy += this.decel * dir * delta;
            if (this.vy < 0 && dir === -1 || this.vy > 0 && dir === 1) {
                this.vy = 0;
            }
        }
        if (game.input.left) {
            this.vx -= this.accel * delta;
            if (this.vx < -this.maxSpeed) {
                this.vx = -this.maxSpeed;
            }
        } else if (game.input.right) {
            this.vx += this.accel * delta;
            if (this.vx > this.maxSpeed) {
                this.vx = this.maxSpeed;
            }
        } else {
            var dir = this.vx > 0 ? -1 : 1;
            this.vx += this.decel * dir * delta;
            if (this.vx < 0 && dir === -1 || this.vx > 0 && dir === 1) {
                this.vx = 0;
            }
        }

        this.x += this.vx * delta;
        this.y += this.vy * delta;

//        console.log([this.x,this.y,this.vx,this.vy,this.ax,this.ay]);
    }
}
