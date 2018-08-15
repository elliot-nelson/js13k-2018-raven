
function line(ctx, color, p1, p2) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}
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

        this.input = new Input({
            mouselock: this.toggleMouseLock.bind(this),
            mousemove: this.onMouseMove.bind(this)
        }).init();

        this.framems = 0;

        this.player = new Player();
        this.player.input = this.input;

        this.crosshair = {
            x: 0,
            y: 0
        };

        this.mouselocked = false;
        document.addEventListener('pointerlockchange', this.onMouseLock.bind(this));
        document.addEventListener('mozpointerlockchange', this.onMouseLock.bind(this));
        document.addEventListener('webkitpointerlockchange', this.onMouseLock.bind(this));

        return this;
    }

    update(delta) {
        this.player.update(delta);

        var cxd = 4;
        if (this.crosshair.x < cxd) {
            this.crosshair.x = cxd;
        } else if (this.crosshair.x > this.canvas.width - cxd) {
            this.crosshair.x = this.canvas.width - cxd;
        }
        if (this.crosshair.y < cxd) {
            this.crosshair.y = cxd;
        } else if (this.crosshair.y > this.canvas.height - cxd) {
            this.crosshair.y = this.canvas.height - cxd;
        }

        this.facing = r2d(Math.atan2(this.crosshair.y - this.player.y, this.crosshair.x - this.player.x));
        console.log([this.crosshair.x,this.crosshair.y,this.facing]);
    }

    render() {
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.images.player, this.player.x, this.player.y);

        var kx = this.player.x + Math.cos(d2r(this.facing)) * 30;
        var ky = this.player.y + Math.sin(d2r(this.facing)) * 30;

        line(this.ctx, 'red', { x: this.crosshair.x, y: this.crosshair.y }, { x: this.crosshair.x + 2, y: this.crosshair.y +2 });
        line(this.ctx, 'yellow', { x: this.player.x, y: this.player.y }, { x: kx, y: ky });
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

    toggleMouseLock() {
        if (this.mouselocked) {
            document.exitPointerLock();
        } else {
            this.canvas.requestPointerLock();
        }
    }

    onMouseLock() {
        if (document.pointerLockElement === this.canvas) {
            this.mouselocked = true;
        } else {
            this.mouselocked = false;
        }
        console.log(["mouselocked", this.mouselocked]);
    }

    onMouseMove(deltaX, deltaY) {
        this.crosshair.x += deltaX;
        this.crosshair.y += deltaY;
    }
};
