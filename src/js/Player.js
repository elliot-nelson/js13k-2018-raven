/**
 * The player class encapsulates the player's current state.
 */
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

        if (game.levelComplete) {
            let target = {
                x: (game.level.exitBounds.p1.x + game.level.exitBounds.p2.x) / 2,
                y: (game.level.exitBounds.p1.y + game.level.exitBounds.p2.y) / 2
            };
            let angle = Util.atanPoints(this, target);
            this.vx = Util.cos(angle) * this.maxSpeed / 2;
            this.vy = Util.sin(angle) * this.maxSpeed / 2;
            this.x += this.vx * delta;
            this.y += this.vy * delta;
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
        // By relying on global frame, we're definitely cheating - a more
        // reliable and visually consistent method is to have real "animation frames",
        // a walking state and an idle state, etc. All of that is easily doable,
        // but I'm shaving a few hundred bytes with this approximation.
        let walkImage = [
            'player_l',
            ,
            'player_r',
            ,
        ][Math.floor((game.framems % 800) / 200)];
        if (this.vx === 0 && this.vy === 0) walkImage = undefined;

        game.ctx.save();
        game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        game.ctx.rotate(Util.d2r(game.facing + 90));
        if (walkImage) game.ctx.drawImage(Asset.img[walkImage], -16, -16);
        game.ctx.drawImage(Asset.img.player, -16, -16);
        game.ctx.restore();
    }

    renderPost() {
        game.ctx.save();
        game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        game.ctx.rotate(Util.d2r(game.facing + 90));
        game.ctx.globalAlpha = 0.8;
        game.ctx.drawImage(Asset.img.player, -16, -16);
        game.ctx.restore();
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
