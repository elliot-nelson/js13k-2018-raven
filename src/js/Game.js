
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
            player: this.loadAsset('assets/player.png'),
            enemy: this.loadAsset('assets/enemy.png'),
            tiles: {
                floor: this.loadAsset('assets/floor.png'),
                wall: this.loadAsset('assets/wall.png')
            }
        };

        this.input = new Input({
            mouselock: this.toggleMouseLock.bind(this),
            mousemove: this.onMouseMove.bind(this)
        }).init();

        this.framems = 0;
        this.player = new Player();
        this.player.input = this.input;
        this.enemies = [];

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
        this.enemies.forEach(enemy => enemy.update(delta));

        var crosshairOffsetX = this.player.x - this.canvas.width / 2;
        var crosshairOffsetY = this.player.y - this.canvas.height / 2;
        var cd = 4;
        var bound = {
            left: crosshairOffsetX + cd,
            right: crosshairOffsetX + this.canvas.width - cd,
            top: crosshairOffsetY + cd,
            bottom: crosshairOffsetY + this.canvas.height - cd
        };

        if (this.crosshair.x < bound.left) {
            this.crosshair.x = bound.left;
        } else if (this.crosshair.x > bound.right) {
            this.crosshair.x = bound.right;
        }
        if (this.crosshair.y < bound.top) {
            this.crosshair.y = bound.top;
        } else if (this.crosshair.y > bound.bottom) {
            this.crosshair.y = bound.bottom;
        }

        this.facing = r2d(Math.atan2(this.crosshair.y - this.player.y, this.crosshair.x - this.player.x));
        //console.log([this.crosshair.x,this.crosshair.y,this.facing]);
    }

    render() {
        var offsetX = this.canvas.width / 2 - this.player.x;
        var offsetY = this.canvas.height / 2 - this.player.y;

        console.log([offsetX, offsetY]);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (var i = 0; i < this.fieldHeight; i++) {
            for(var j = 0; j < this.fieldWidth; j++) {
                var tile = this.field[i * this.fieldWidth + j];
                if (tile === 1) {
                    this.ctx.drawImage(this.images.tiles.wall, offsetX + j * 32, offsetY + i * 32);
                } else if (tile === 2) {
                    this.ctx.drawImage(this.images.tiles.floor, offsetX + j * 32, offsetY + i * 32);
                }
            }
        }

        this.ctx.drawImage(this.images.player, offsetX + this.player.x, offsetY + this.player.y);

        this.enemies.forEach(enemy => {
            this.ctx.drawImage(this.images.enemy, enemy.x, enemy.y);
        });

        // Light cone
        var cone1 = xyd(this.player, dw(this.facing - 30), 50);
        var cone2 = xyd(this.player, dw(this.facing + 30), 50);
        this.ctx.save();
        this.ctx.strokeStyle = 'yellow';
        this.ctx.beginPath();
        this.ctx.moveTo(offsetX + this.player.x, offsetY + this.player.y);
        this.ctx.lineTo(offsetX + cone1.x, offsetY + cone1.y);
        this.ctx.lineTo(offsetX + cone2.x, offsetY + cone2.y);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();

        console.log([this.player.x, this.player.y, this.crosshair.x, this.crosshair.y]);
        // crosshair
        line(this.ctx, 'red',
            { x: offsetX + this.crosshair.x, y: offsetY + this.crosshair.y },
            { x: offsetX + this.crosshair.x + 2, y: offsetY + this.crosshair.y +2 });
        line(this.ctx, 'red',
            { x: offsetX + this.crosshair.x + 1, y: offsetY + this.crosshair.y },
            { x: offsetX + this.crosshair.x + 3, y: offsetY + this.crosshair.y +2 });

        //line(this.ctx, 'yellow', { x: this.player.x, y: this.player.y }, { x: kx, y: ky });
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
        this.load(LevelCache[0]);
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

    load(level) {
        this.field = level.data;
        this.fieldWidth = level.width;
        this.fieldHeight = level.height;

        this.player.x = level.player.x;
        this.player.y = level.player.y;
        this.crosshair.x = this.player.x;
        this.crosshair.y = this.player.y;

        this.enemies = [];
    }
};
