class Enemy {
    constructor(enemyData) {
        this.x = enemyData.x;
        this.y = enemyData.y;
        this.vx = 0;
        this.vy = 0;
        this.ax = 10;
        this.ay = 10;
        this.maxSpeed = 0;

        this.idleWidth = 18;
        this.idleHeight = 30;
        this.attackWidth = 18;
        this.attackHeight = 6;

        this.width = this.idleWidth;
        this.height = this.idleHeight;

        this.wakeRadius = 384;
        this.attackRadius = 192;
        this.killRadius = 14;

        this.state = 'asleep';

        this.nextFrozenParticle = 0;
    }

    update(delta) {
        let spotted = Util.entitySpotted(this);
        let attackAngle;

        // TODO: For now, I've made the intentional decision to let statues ignore physics
        // (if they are running at the player and you spot them, they full-stop, no sliding
        // or deceleration involved). Might be interesting visually to change that.

        switch (this.state) {
            case 'asleep':
                if (Util.distance(this, game.player) < this.wakeRadius) {
                    this.state = 'idle';
                }
                break;
            case 'idle':
                // TODO: It would be cool if enemies would strategically move around
                // slowly, to reposition themselves for a better attack, even if they
                // knew they couldn't reach the player.
                //
                // For now, an idle statue stays perfectly still UNLESS it thinks it could
                // reach the player, then it enters attack mode.
                if (spotted) {
                    this.state = 'frozen';
                    break;
                }

                attackAngle = this.bestAttackAngle();

                if (attackAngle !== undefined) {
                    console.log(["idle->attack", attackAngle]);
                    this.state = 'attack';
                    this.attackAngle = attackAngle;
                    this.attackVel = 265;
                    this.attackAccel = 670; // currently ignored, no accel physics
                }
                break;
            case 'attack':
                if (spotted) {
                    this.state = 'idle';
                    break;
                }

                // The player is moving too, so we still need to recalculate our
                // angles each frame.
                attackAngle = this.bestAttackAngle();

                if (attackAngle === undefined) {
                    console.log(["attack->idle"]);
                    this.state = 'idle';
                } else {
                    this.vx = Util.cos(attackAngle) * this.attackVel;
                    this.vy = Util.sin(attackAngle) * this.attackVel;

                    this.x += this.vx * delta;
                    this.y += this.vy * delta;
                }
                break;
            case 'frozen':
                if (!spotted) {
                    this.state = 'idle';
                }
                break;
        }

        if (this.state === 'attack') {
            this.width = this.attackWidth;
            this.height = this.attackHeight;
        } else {
            this.width = this.idleWidth;
            this.height = this.idleHeight;
        }

/*            if (dist > 40) {
                // This is a very simple way to get "behind" the player -- for every 3 degrees
                // off from the player's facing, move our target 1 pixel back. So, if we're
                // directly behind the player, just lunge at them; if we're 45 degrees to the side,
                // aim 15 pixels behind them.
                let target = {
                    x: game.player.x - (angleDiff / 3) * Math.cos(Util.d2r(game.facing)),
                    y: game.player.y - (angleDiff / 3) * Math.sin(Util.d2r(game.facing))
                };
                angle = Util.r2d(Math.atan2(target.y - this.y, target.x - this.x));
            }*/

            /*this.vx += Math.cos(Util.d2r(angle)) * this.attackAccel * delta;
            this.vy += Math.sin(Util.d2r(angle)) * this.attackAccel * delta;

            console.log([angle, this.vx, this.vy]);
            let vel = distance({ x: 0, y: 0 }, { x: this.vx, y: this.vy });
            if (vel > this.attackVel) {
                vel = this.attackVel;
            }
            angle = Math.atan2(this.vy, this.vx);
            this.vx = Math.cos(angle) * vel;
            this.vy = Math.sin(angle) * vel;
            console.log([angle, this.vx, this.vy]);*/

            /*this.vx = Math.cos(Util.d2r(attackAngle)) * this.attackVel;
            this.vy = Math.sin(Util.d2r(attackAngle)) * this.attackVel;

            this.x += this.vx * delta;
            this.y += this.vy * delta;*/
            //console.log([this.x, this.y]);

            /*var d = distance(game.player, this);
            if (d < 10) {
                this.state = 'idle';
            }*/
    }

    render() {
        if (this.state !== 'attack') {
            let jitter = game.framems - this.frozenms;
            let r1, r2, r3, r4, a1, a2;

            // When you first spot a statue, it is immediately agitated, but
            // calms down (that is, becomes less conspicuous) over a couple seconds.
            // However, even after a long period, there should be a slight shakiness
            // to the statue.
            if (jitter < 300) {
                [r1, r2, r3, r4, a1, a2] = [
                    Math.floor(Math.random() * 11) - 5,
                    Math.floor(Math.random() * 11) - 5,
                    Math.floor(Math.random() * 7) - 3,
                    Math.floor(Math.random() * 7) - 3,
                    0.4,
                    0.7
                ];
            } else if (jitter < 600) {
                [r1, r2, r3, r4, a1, a2] = [
                    Math.floor(Math.random() * 7) - 3,
                    Math.floor(Math.random() * 7) - 3,
                    Math.floor(Math.random() * 5) - 2,
                    Math.floor(Math.random() * 5) - 2,
                    0.3,
                    0.6
                ];
            } else {
                [r1, r2, r3, r4, a1, a2] = [
                    Math.floor(Math.random() * 5) - 2,
                    Math.floor(Math.random() * 5) - 2,
                    Math.floor(Math.random() * 3) - 1,
                    Math.floor(Math.random() * 3) - 1,
                    0.1,
                    0.2
                ];
            }

            game.ctx.globalAlpha = a1;
            game.ctx.drawImage(Asset.img.raven, game.offset.x + this.x + r1 - this.width / 2, game.offset.y + this.y + r2 - this.height / 2);
            game.ctx.globalAlpha = a2;
            game.ctx.drawImage(Asset.img.raven, game.offset.x + this.x + r2 - this.width / 2, game.offset.y + this.y + r4 - this.height / 2);
            game.ctx.globalAlpha = 1;
            game.ctx.drawImage(Asset.img.raven, game.offset.x + this.x - this.width / 2, game.offset.y + this.y - this.height / 2);
        }
    }

    renderPost() {
        if (this.state === 'attack') {
            game.ctx.globalAlpha = 0.6;
            for (let i = 0; i < 3; i++) {
                let dx = Math.floor(Math.random() * 7) - 3;
                let dy = Math.floor(Math.random() * 7) - 3;
                game.ctx.drawImage(Asset.img.unraven, game.offset.x + this.x - this.width / 2 + dx, game.offset.y + this.y - this.height / 2 + dy);
            }
            game.ctx.globalAlpha = 1;
        }
    }

    bestAttackAngle() {
        let angle = this.sprintToTargetAngle(0);
        if (angle === undefined) {
            angle = this.sprintToTargetAngle(24);
        }
        if (angle === undefined) {
            angle = this.sprintToTargetAngle(48);
        }
        if (angle === undefined) {
            let attackChoice = this.lowestAttackCostUV(Math.floor(this.x / 32), Math.floor(this.y / 32));
            if (attackChoice) {
                angle = Util.atanPoints(this, {
                    x: attackChoice[0] * 32 + 16,
                    y: attackChoice[1] * 32 + 16
                });
            }
        }

        return angle;
    }

    lowestAttackCostUV(u, v, iterations) {
        let options = [
            [u, v],
            [u - 1, v],
            [u + 1, v],
            [u, v - 1],
            [u, v + 1]
        ];

        // If the game isn't ready to generate an attack grid, then don't attempt to use it.
        if (!game.attackGrid) return;

        for (let i = 0; i < options.length; i++) {
            options[i][2] = game.attackGrid[options[i][1] * game.level.width + options[i][0]];
        }

        // Allow diagonal movement through grid if both sides of that corner are clear (hopefully,
        // prevents "stuck in corner" shenanigans).
        if (options[0] < 10000 && options[1] < 10000 && options[3] < 10000) {
            options.push([u - 1, v - 1, game.attackGrid[(v - 1) * game.level.width + u - 1]]);
        }
        if (options[0] < 10000 && options[2] < 10000 && options[4] < 10000) {
            options.push([u + 1, v + 1, game.attackGrid[(v + 1) * game.level.width + u + 1]]);
        }
        if (options[0] < 10000 && options[1] < 10000 && options[4] < 10000) {
            options.push([u - 1, v + 1, game.attackGrid[(v + 1) * game.level.width + u - 1]]);
        }
        if (options[0] < 10000 && options[2] < 10000 && options[3] < 10000) {
            options.push([u + 1, v - 1, game.attackGrid[(v - 1) * game.level.width + u + 1]]);
        }

        let choice = options.sort((a, b) => a[2] - b[2])[0];
        if (choice[2] < 10000) {
            return choice;
        }
    }

    sprintToTargetAngle(offset) {
        let shadow = { x: this.x, y: this.y, width: this.width, height: this.height };
        let target = {
            x: game.player.x - Util.cos(game.facing) * offset,
            y: game.player.y - Util.sin(game.facing) * offset
        };
        let attackAngle = Util.atanPoints(this, target);
        let dx = Util.cos(attackAngle) * 4;
        let dy = Util.sin(attackAngle) * 4;

        while (!Util.entitySpotted(shadow) && !Util.wallAtXY(shadow.x, shadow.y)) {
            if (Util.distance(shadow, game.player) <= this.killRadius) {
                return attackAngle;
            }

            shadow.x += dx;
            shadow.y += dy;
        }
    }

    static renderAttackWarning() {
        if (game.player.state === 'dead') return;

        let attacked = false;
        for (let i = 0; i < game.enemies.length; i++) {
            if (game.enemies[i].state === 'attack') {
                attacked = true;
                break;
            }
        }

        if (attacked) {
            if (!Enemy.attackWarningMs) {
                Enemy.attackWarningMs = game.framems;
            }

            let alpha = ((game.framems - Enemy.attackWarningMs) % 500) / 1800 + 0.1;

            let w = game.canvas.width;
            let h = game.canvas.height;

            game.ctx.save();
            game.ctx.fillStyle = 'rgba(255, 0, 0, ' + alpha + ')';
            game.ctx.beginPath();
            game.ctx.moveTo(0, h * 0.25);
            game.ctx.lineTo(w * 0.1, h * 0.5);
            game.ctx.lineTo(0, h * 0.75);
            game.ctx.closePath();
            game.ctx.fill();
            game.ctx.beginPath();
            game.ctx.moveTo(w, h * 0.25);
            game.ctx.lineTo(w * 0.9, h * 0.5);
            game.ctx.lineTo(w, h * 0.75);
            game.ctx.closePath();
            game.ctx.fill();
            game.ctx.restore();
        } else {
            Enemy.attackWarningMs = undefined;
        }
    }
}
