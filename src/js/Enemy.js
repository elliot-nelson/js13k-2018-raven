class Enemy {
    constructor(initialX, initialY) {
        this.x = initialX;
        this.y = initialY;
        this.vx = 0;
        this.vy = 0;
        this.ax = 10;
        this.ay = 10;
        this.maxSpeed = 0;

        this.travelSeconds = 2;
        this.state = 'idle';
    }

    update(delta) {
        if (this.state === 'attack') {
            var angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
            this.vx += Math.cos(angle) * this.ax;
            this.vy += Math.sin(angle) * this.ay;

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

            this.x += this.vx;
            this.y += this.vy;

            var d = distance(game.player, this);
            if (d < 10) {
                this.state = 'idle';
            }
        } else if (this.state === 'idle') {
            this.vx = this.vx * 0.8;
            this.vy = this.vy * 0.8;
            if (this.vx > -1 && this.vx < 1) { this.vx = 0; }
            if (this.vy > -1 && this.vy < 1) { this.vy = 0; }

            var d = distance(game.player, this);

            if (d < 120) {
                this.state = 'attack';
                this.maxSpeed = Math.min(10, d / this.travelSeconds);
            }
        } else {
            // The enemy is dead?
        }
    }
}
