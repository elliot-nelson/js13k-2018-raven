/**
 * The enemy. There is only one.
 */
class Enemy {
    constructor(enemyData) {
        this.x = enemyData.x;
        this.y = enemyData.y;
        this.vx = 0;
        this.vy = 0;
        this.ax = 10;
        this.ay = 10;
        this.maxSpeed = 0;

        this._idleWidth = 18;
        this._idleHeight = 30;
        this._attackWidth = 18;
        this._attackHeight = 6;

        this.width = this._idleWidth;
        this.height = this._idleHeight;

        this.wake = enemyData.wake || 'radius';
        this.wakeRadius = enemyData.wakeRadius || 384;
        this.killRadius = 14;
        this._eyeQueue = [,,,,,,,,,,,,];

        if (enemyData.patrolDX !== undefined && enemyData.patrolDY !== undefined) {
            this._patrol = [
                { x: this.x, y: this.y },
                { x: this.x + enemyData.patrolDX, y: this.y + enemyData.patrolDY }
            ];
            this._patrol.next = 1;
            this._patrol.after = game.framems + 1000 + (enemyData.patrolStart || 0);
        }

        this.state = 'asleep';
    }

    update(delta) {
        let spotted = Util.entitySpotted(this);
        let attackAngle;

        // TODO: For now, I've made the intentional decision to let statues ignore physics
        // (if they are running at the player and you spot them, they full-stop, no sliding
        // or deceleration involved). Might be interesting visually to change that.

        switch (this.state) {
            case 'asleep':
                if (spotted) {
                    // Being seen by anything immediately freezes the statue, and it
                    // begin idling after it is unfrozen.
                    this.state = 'frozen';
                } else if (this.wake === 'radius' && Util.distance(this, game.player) < this.wakeRadius) {
                    // Default - wake when player reaches a certain radius
                    this.state = 'idle';
                } else if (this.wake === 'los' && this._sprintToTargetAngle(0, true) !== undefined) {
                    // Wake when player is visible to the enemy
                    this.state = 'idle';
                } else {
                    // "Asleep" is turning out not to be a good name for this state!
                    if (this._patrol && game.framems > this._patrol.after) {
                        let target = this._patrol[this._patrol.next];
                        if (this.x === target.x && this.y === target.y) {
                            this._patrol.after = game.framems + 1000;
                            this._patrol.next = (this._patrol.next + 1) % this._patrol.length;
                        } else {
                            let angle = Util.atanPoints(this, target);
                            let dist = Util.distance(this, target);
                            if (50 * delta > dist) {
                                this.vx = 0;
                                this.vy = 0;
                                this.x = target.x;
                                this.y = target.y;
                            } else {
                                this.vx = Util.cos(angle) * 50;
                                this.vy = Util.sin(angle) * 50;
                                this.x += this.vx * delta;
                                this.y += this.vy * delta;
                            }
                        }
                    }
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

                attackAngle = this._bestAttackAngle();

                if (attackAngle !== undefined) {
                    this.state = 'attack';
                    this.attackAngle = attackAngle;
                    this.attackVel = 265;
                    this.attackAccel = 670; // currently ignored, no accel physics
                    game.audio.playSiren();
                }
                break;
            case 'attack':
                if (spotted) {
                    this.state = 'idle';
                    break;
                }

                // The player is moving too, so we still need to recalculate our
                // angles each frame.
                attackAngle = this._bestAttackAngle();

                if (attackAngle === undefined) {
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
            this.width = this._attackWidth;
            this.height = this._attackHeight;
        } else {
            this.width = this._idleWidth;
            this.height = this._idleHeight;
        }
    }

    render() {
        if (this.state !== 'attack' && (this.state !== 'asleep' || (this.vx === 0 && this.vy === 0))) {
            let jitter = game.framems - this.frozenms;
            let r1, r2, r3, r4, a1, a2, a3;

            // When you first spot a statue, it is immediately agitated, but
            // calms down (that is, becomes less conspicuous) over a couple seconds.
            // However, even after a long period, there should be a slight shakiness
            // to the statue.
            if (jitter < 300) {
                [r1, r2, r3, r4, a1, a2, a3] = [
                    Util.rf(11) - 5, Util.rf(11) - 5,
                    Util.rf(7) - 3, Util.rf(7) - 3,
                    0.4,
                    0.7,
                    1
                ];
            } else if (jitter < 600) {
                [r1, r2, r3, r4, a1, a2, a3] = [
                    Util.rf(7) - 3, Util.rf(7) - 3,
                    Util.rf(5) - 2, Util.rf(5) - 2,
                    0.3,
                    0.6,
                    1
                ];
            } else {
                [r1, r2, r3, r4, a1, a2, a3] = [
                    Util.rf(5) - 2, Util.rf(5) - 2,
                    Util.rf(3) - 1, Util.rf(3) - 1,
                    0.1,
                    0.2,
                    1
                ];
            }

            game.ctx.globalAlpha = a1;
            Asset.drawSprite('raven', game.ctx, game.offset.x + this.x + r1 - this.width / 2, game.offset.y + this.y + r2 - this.height / 2);
            game.ctx.globalAlpha = a2;
            Asset.drawSprite('raven', game.ctx, game.offset.x + this.x + r2 - this.width / 2, game.offset.y + this.y + r4 - this.height / 2);
            game.ctx.globalAlpha = a3;
            Asset.drawSprite('raven', game.ctx, game.offset.x + this.x - this.width / 2, game.offset.y + this.y - this.height / 2);
            game.ctx.globalAlpha = 1;
        } else if (this.state === 'asleep' && this._patrol) {
            // TODO: This is lazy. Ideally, instead of "showing" the statue 10% of the time while
            // moving on patrol, we would instead sync up a Math.sin on framems, so that the statue
            // fades in and out smoothly based on the movement of the eyes.
            if (Math.random() > 0.9) {
                game.ctx.globalAlpha = 0.4;
                Asset.drawSprite('raven', game.ctx, game.offset.x + this.x - this.width/2, game.offset.y + this.y - this.height / 2);
                game.ctx.globalAlpha = 1;
            }
        }
    }

    renderPost() {
        // Eyes are rendered in post, so they glow on top of the LOS blanket.

        // By adding in some sin/cos action, if you were to watch a statue's eyes while standing
        // still, they would "swing" like a pendulum from one side to another. Although it's subtle,
        // this gives the impression of a hulking, breathing creature in the room; when the eyes
        // are in motion, this gives just enough herky-jerk stutter to make the creature feel like
        // it is in some kind of running/walking animation.
        if (this.state === 'attack' || (this.state === 'asleep' && this._patrol && (this.vx !== 0 || this.vy !== 0))) {
            this._eyeQueue.push({
                x: this.x + Math.cos(game.framems / 300) * 8,
                y: this.y - 6 + Math.abs(Math.sin(game.framems / 300) * 5)
            });
        } else {
            this._eyeQueue.push(false);
        }
        this._eyeQueue.shift();

        for (let i = 0; i < this._eyeQueue.length; i++) {
            let ec = this._eyeQueue[i];
            if (ec) {
                //game.ctx.globalAlpha = 0.05 * i;
                game.ctx.fillStyle = 'rgba(165, 10, 16, ' + (0.05 * i) + ')';
                //game.ctx.fillStyle = 'rgba(165, 10, 16, ' + (0.05 * i1)';
                game.ctx.fillRect(game.offset.x + ec.x - 5 - 1, game.offset.y + ec.y - 1, 3, 3);
                game.ctx.fillRect(game.offset.x + ec.x + 5 - 1, game.offset.y + ec.y - 1, 3, 3);
                game.ctx.fillStyle = 'rgba(254, 20, 32, ' + (0.05*i) + ')';
                //game.ctx.fillStyle = 'rgba(254, 20, 32, 1)';
                game.ctx.fillRect(game.offset.x + ec.x - 5, game.offset.y + ec.y, 2, 2);
                game.ctx.fillRect(game.offset.x + ec.x + 5 - 1, game.offset.y + ec.y, 2, 2);
            }
        }
    }

    _bestAttackAngle() {
        // What is happening here?
        //
        // First, we try to draw a direct line from us to the player, without hitting an obstacle
        // or an LOS cone. If that doesn't work, we do the same thing again, but 24 pixels BEHIND
        // the player (based on current facing). If that doesn't work, once more, but 48 pixels
        // BEHIND the player.
        //
        // If none of that direct attack stuff worked, use the attack grid generated on each frame
        // (using standard flood fill, in Game.js) to pick the closest tile that would bring us
        // closest the player, and move to it. Note that the attack grid will only propogate
        // tiles it believes can reach the player without being seen, so lowestAttackCost will
        // return undefined if the player can see us or any tile in the way.
        //
        // This actually works pretty well and makes the enemy dangerous! There are some tweaks I'd
        // like to make, though.
        //
        // Biggest: "Behind" the player is too strict, it makes backing up to a wall too powerful of an
        // option. A lot of the time, if the enemy is (say) 90 degrees to my right, and I'm 40
        // pixels in front of a wall, the enemy could easily aim for a tile 48 degrees behind me
        // at a 30 degree angle, and then swoop in to get me; but it won't, because 24p
        // hits my LOS, and 48p is in a wall.
        //
        // Secondary: the attack grid isn't perfect, it basically checks the center of each tile,
        // which is why sometimes the enemy "attacks" and slams into a security camera. In an ideal
        // world, the enemy would never voluntarily place itself into a situation it can't get
        // back out of.
        //
        // If I could calculate the best angle between nearest player obstacle and LOS cone, the
        // enemy could make even more "surprise" attacks on the player when they make a mistake.

        let angle = this._sprintToTargetAngle(0);
        if (angle === undefined) {
            angle = this._sprintToTargetAngle(24);
        }
        if (angle === undefined) {
            angle = this._sprintToTargetAngle(48);
        }
        if (angle === undefined) {
            let attackChoice = this._lowestAttackCostUV(Math.floor(this.x / 32), Math.floor(this.y / 32));
            if (attackChoice) {
                angle = Util.atanPoints(this, {
                    x: attackChoice[0] * 32 + 16,
                    y: attackChoice[1] * 32 + 16
                });
            }
        }

        return angle;
    }

    _lowestAttackCostUV(u, v, iterations) {
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

    _sprintToTargetAngle(offset, ignoreVision) {
        let shadow = { x: this.x, y: this.y, width: this.width, height: this.height };
        let target = {
            x: game.player.x - Util.cos(game.facing) * offset,
            y: game.player.y - Util.sin(game.facing) * offset
        };
        let attackAngle = Util.atanPoints(this, target);
        let dx = Util.cos(attackAngle) * 4;
        let dy = Util.sin(attackAngle) * 4;

        while ((ignoreVision || !Util.entitySpotted(shadow)) && !Util.wallAtXY(shadow.x, shadow.y)) {
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
