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
    }

    update(delta) {
        var spotted = false;

        for(let i = 0; i < game.friendlySight.length; i++) {
            if (Util.pointInTriangle(this, ...game.friendlySight[i])) {
                spotted = true;
                break;
            }
        }

        if (spotted && this.state !== 'frozen') {
            this.state = 'frozen';
        } else if (!spotted && this.state === 'frozen') {
            this.state = 'idle';
        }

        if (this.state === 'frozen') {
            this.vx = 0;
            this.vy = 0;
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
        game.ctx.drawImage(Asset.img.enemy, game.offset.x + this.x, game.offset.y + this.y);
    }
}
