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

            if (this.vx > maxSpeed) {
                this.vx = maxSpeed;
            } else if (this.vx < -maxSpeed) {
                this.vx = -maxSpeed;
            }
            if (this.vy > maxSpeed) {
                this.vy = maxSpeed;
            } else if (this.vy < -maxSpeed) {
                this.vy = -maxSpeed;
            }

            this.x += this.vx;
            this.y += this.vy;

            var distance = distance(game.player, this);
            if (distance < 10) {
                state = 'idle';
            }
        } else if (this.state === 'idle') {
            this.vx = this.vx * 0.8;
            this.vy = this.vy * 0.8;
            if (this.vx > -1 && this.vx < 1) { this.vx = 0; }
            if (this.vy > -1 && this.vy < 1) { this.vy = 0; }

            var distance = distance(game.player, this);

            if (distance < 120) {
                this.state = 'attack';
                this.maxSpeed = Math.min(10, distance / this.travelSeconds);
            }
        } else {
            // The enemy is dead?
        }
    }
}
