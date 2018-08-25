class Player {
    constructor() {
        this.x = 105;
        this.y = 40;
        this.vx = 0;
        this.vy = 0;
        this.facing = 0;

        this.accel = 400;     // per second
        this.decel = 400;     // per second
        this.maxSpeed = 100;   // per second

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

        if (!game.lockCrosshairToMap) {
            game.crosshair.x += this.vx * delta;
            game.crosshair.y += this.vy * delta;
        }
    }

    render() {
        game.ctx.drawImage(Asset.img.player, game.offset.x + this.x - 3, game.offset.y + this.y - 2);
    }

    renderCrosshair() {
        let x = game.offset.x + game.crosshair.x;
        let y = game.offset.y + game.crosshair.y;

        game.ctx.strokeStyle = 'rgba(255, 24, 24, 0.9)';
        game.ctx.beginPath();
        [
            [-2, -2],
            [-2, 2],
            [2, -2],
            [2, 2]
        ].forEach(([dx, dy]) => {
            game.ctx.moveTo(x + dx * 3, y + dy);
            game.ctx.lineTo(x + dx, y + dy);
            game.ctx.lineTo(x + dx, y + dy * 3);
        });
        game.ctx.stroke();
    }
}
