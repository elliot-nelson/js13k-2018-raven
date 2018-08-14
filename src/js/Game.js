class Game {
    init() {
        // Prep canvas
        this.canvas = document.getElementById('canvas');
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.ctx = this.canvas.getContext('2d');

        // Load
        this.images = {
            player: this.loadAsset('assets/player.png')
        };
        this.images.player.onload = () => {
            this.pReady = true;
            console.log("loaded it");
        };

        this.input = new Input().init();
        this.framems = 0;

        this.x = 105;
        this.y = 40;
        this.dx = 0;
        this.dy = 0;

        return this;
    }

    update(delta) {
        let speed = 40;

        if (this.input.up) {
            this.dy -= 4;
            if (this.dy < 0-speed) {
                this.dy = 0-speed;
            }
        } else if (this.input.down) {
            this.dy += 4;
            if (this.dy > speed) {
                this.dy = speed;
            }
        } else {
            this.dy = this.dy * 0.8;
            if (this.dy > -1 && this.dy < 1) {
                this.dy = 0;
            }
        }

        if (this.input.left) {
            this.dx -= 4;
            if (this.dx < 0-speed) {
                this.dx = 0-speed;
            }
        } else if (this.input.right) {
            this.dx += 4;
            if (this.dx > speed) {
                this.dx = speed;
            }
            console.log([this.dx, speed]);
        } else {
            this.dx = this.dx * 0.8;
            if (this.dx > -1 && this.dx < 1) {
                this.dx = 0;
            }
        }

        this.x += this.dx * delta;
        this.y += this.dy * delta;
    }

    render() {
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.images.player, this.x, this.y);
    }

    frame(nextms) {
        let delta = nextms - this.framems;
        this.framems = nextms;

        // Gut check - absorb random lag spike / frame jumps
        // (The expected delta is 1000/60 = ~16.67ms.)
        if (delta > 500) {
            delta = 500;
        }

        this.update(delta / 1000);
        this.render();

        window.requestAnimationFrame(this.frame.bind(this));
    }

    start() {
        this.framems = performance.now();
        window.requestAnimationFrame(this.frame.bind(this));
    }

    loadAsset(src) {
        const img = new Image(8, 5);
        img.src = src;
        return img;
    }
};