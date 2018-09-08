/**
 * The player class encapsulates the player's current state.
 *
 * ... sort of. A lot of things you'd think are player state, like where we
 * are facing and where our crosshair is, belong to Game today. This is
 * something I'd factor back out, maybe in the future...
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
        // TODO: yes, the player suffers from the classic "fast diagonal" problem.
        // This time around, I don't care enough to fix it :)

        if (this.dead) {
            return;
        }

        if (game.levelComplete) {
            let target = {
                x: (game.level.exit.p1.x + game.level.exit.p2.x) / 2,
                y: (game.level.exit.p1.y + game.level.exit.p2.y) / 2
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

        let oldX = this.x, oldY = this.y;

        this.x += this.vx * delta;
        this.y += this.vy * delta;
        Util.enforceEntityMovement(this);

        // Move the crosshair by the same amount we moved the player. Note we do this
        // after enforcing entity movement, so the crosshair doesn't slide when player
        // hits walls.
        if (!game.lockCrosshairToMap) {
            game.crosshair.x += (this.x - oldX);
            game.crosshair.y += (this.y - oldY);
        }
    }

    render() {
        // Walking animation frames would be great, but let's hack it.
        // Actual walking images would be nice, but a filled dark grey
        // rectangle will need to take the place of a shoe, this time.
        let walk = [-6,,3,][Math.floor((game.framems % 800) / 200)];
        if (this.vx === 0 && this.vy === 0) walk = false;

        game.ctx.save();
        game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        game.ctx.rotate(Util.d2r(game.facing + 90));
        if (walk) {
            game.ctx.fillStyle = 'rgba(32, 32, 48, 1)';
            game.ctx.fillRect(walk, -6, 3, 3);
        }
        Asset.drawSprite('player', game.ctx, -10, -7);
        game.ctx.restore();
    }

    renderPost() {
        game.ctx.save();
        game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        game.ctx.rotate(Util.d2r(game.facing + 90));
        game.ctx.globalAlpha = 0.8;
        game.ctx.drawImage(Asset._img._player, -16, -16);
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
        ].forEach(c => {
            game.ctx.moveTo(x + c[0] * 3, y + c[1]);
            game.ctx.lineTo(x + c[0], y + c[1]);
            game.ctx.lineTo(x + c[0], y + c[1] * 3);
        });
        game.ctx.stroke();
    }
}
