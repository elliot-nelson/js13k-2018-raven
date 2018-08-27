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

        this.attackRadius = 192;
        this.killRadius = 10;

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

        console.log(this.state);
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
            let attack = this.chartAttackPath();

            if (attack) {
                console.log(attack);
                this.attackVel = 260;
                this.attackAccel = 670;
                this.state = 'attack';
            }

            /*this.vx = this.vx * 0.8;
            this.vy = this.vy * 0.8;
            if (this.vx > -1 && this.vx < 1) { this.vx = 0; }
            if (this.vy > -1 && this.vy < 1) { this.vy = 0; }

            var d = distance(game.player, this);

            if (d < 120) {
                this.state = 'attack';
                this.maxSpeed = Math.min(10, d / this.travelSeconds);
            }*/

        } else if (this.state === 'attack') {
            return;
            // here, we can use the route map
            let angle = Util.r2d(Math.atan2(game.player.y - this.y, game.player.x - this.x));
            let angleDiff = Math.abs(angle - game.facing);
            let dist = distance(this, game.player);

            console.log([dist, angleDiff]);
            if (dist > 40) {
                // This is a very simple way to get "behind" the player -- for every 3 degrees
                // off from the player's facing, move our target 1 pixel back. So, if we're
                // directly behind the player, just lunge at them; if we're 45 degrees to the side,
                // aim 15 pixels behind them.
                let target = {
                    x: game.player.x - (angleDiff / 3) * Math.cos(Util.d2r(game.facing)),
                    y: game.player.y - (angleDiff / 3) * Math.sin(Util.d2r(game.facing))
                };
                angle = Util.r2d(Math.atan2(target.y - this.y, target.x - this.x));
            }

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

            this.vx = Math.cos(Util.d2r(angle)) * this.attackVel;
            this.vy = Math.sin(Util.d2r(angle)) * this.attackVel;

            this.x += this.vx * delta;
            this.y += this.vy * delta;
            //console.log([this.x, this.y]);

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

    // Determine whether we are totally clear from current point to player
    chartAttackPath() {
        let dist = distance(this, game.player);

        if (dist > this.attackRadius) {
            return;
        }

        let angle = Util.r2d(Math.atan2(game.player.y - this.y, game.player.x - this.x));
        let shadow = {
            x: this.x,
            y: this.y,
            width: 4,
            height: 4
        };

        for (let i = 0; i < dist; i += 2) {
            shadow.x = this.x + Math.cos(Util.d2r(angle)) * i;
            shadow.y = this.y + Math.sin(Util.d2r(angle)) * i;

            if (distance(shadow, game.player) <= this.killRadius) break;

            if (Util.entitySpotted(shadow)) {
                console.log("SPOTTED at " + distance(shadow, game.player) + " away");
                return;
            }
        }

        console.log("chartAttackPath success");
        return [angle, dist];
    }
}
