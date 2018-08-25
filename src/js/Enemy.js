class Enemy {
    constructor(enemyData) {
        this.x = enemyData.x;
        this.y = enemyData.y;
        this.vx = 0;
        this.vy = 0;
        this.ax = 10;
        this.ay = 10;
        this.maxSpeed = 0;

        this.width = 8;
        this.height = 6;

        this.killRadius = 6;

        this.travelSeconds = 2;
        this.state = 'idle';

        this.nextFrozenParticle = 0;
    }

    update(delta) {
        var spotted = Util.entitySpotted(this);

        if (spotted && this.state !== 'frozen') {
            this.state = 'frozen';
            this.frozenms = game.framems;
        } else if (!spotted && this.state === 'frozen') {
            this.state = 'idle';
        }

        if (this.state === 'frozen') {
            this.vx = 0;
            this.vy = 0;
/*
            if (this.nextFrozenParticle <= game.framems) {
                let angle = Math.random() * 360;
                game.particles.push(new Particle({
                    x: this.x,
                    y: this.y,
                    startAngle: angle,
                    endAngle: angle + 50 + Math.random() * 25,
                    radius: 6 + Math.random() * 3,
                    radius2: 10 + Math.random() * 3,
                    opacity: 90 + Math.random() * 90,
                    opacity2: 30,
                    strokeStyle: '0, 0, 0',
                    duration: 400 + Math.random() * 200
                }));
                this.nextFrozenParticle = game.framems + 250;
            }
*/
        } else if (this.state === 'idle') {
            /*this.vx = this.vx * 0.8;
            this.vy = this.vy * 0.8;
            if (this.vx > -1 && this.vx < 1) { this.vx = 0; }
            if (this.vy > -1 && this.vy < 1) { this.vy = 0; }

            var d = distance(game.player, this);

            if (d < 120) {
                this.state = 'attack';
                this.maxSpeed = Math.min(10, d / this.travelSeconds);
            }*/

            this.maxSpeed = 60;
            this.state = 'attack';
        } else if (this.state === 'attack') {
            // here, we can use the route map
            var angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
            this.vx += Math.cos(angle) * this.ax * delta;
            this.vy += Math.sin(angle) * this.ay * delta;

            if (this.vx > this.maxSpeed) {
                this.vx = this.maxSpeed;
            } else if (this.vx < -this.maxSpeed) {
                this.vx = -this.maxSpeed;
            }
            if (this.vy > this.maxSpeed) {
                this.vy = this.maxSpeed;
            } else if (this.vy < -this.maxSpeed) {
                this.vy = -this.maxSpeed;
            }

            this.x += this.vx * delta;
            this.y += this.vy * delta;

            /*var d = distance(game.player, this);
            if (d < 10) {
                this.state = 'idle';
            }*/
        } else {
            // The enemy is dead?
        }
    }

    render() {
        if (this.state === 'frozen') {
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
            game.ctx.drawImage(Asset.img.raven, game.offset.x + this.x + r1 - 16, game.offset.y + this.y + r2 - 16);
            game.ctx.globalAlpha = a2;
            game.ctx.drawImage(Asset.img.raven, game.offset.x + this.x + r2 - 16, game.offset.y + this.y + r4 - 16);
            game.ctx.globalAlpha = 1;
            game.ctx.drawImage(Asset.img.raven, game.offset.x + this.x - 16, game.offset.y + this.y - 16);
        }
    }

    renderPost() {
        if (this.state !== 'frozen') {
            game.ctx.globalAlpha = 0.7;
            for (let i = 0; i < 3; i++) {
                let dx = Math.floor(Math.random() * 5) - 2;
                let dy = Math.floor(Math.random() * 5) - 2;
                game.ctx.drawImage(Asset.img.unraven, game.offset.x + this.x - 16 + dx, game.offset.y + this.y - 16 + dy);
            }
            game.ctx.globalAlpha = 1;
        }
    }
}
