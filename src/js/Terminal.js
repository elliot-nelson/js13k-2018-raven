class Terminal {
    constructor(terminalData) {
        this.u = terminalData.u;
        this.v = terminalData.v;

        this.x = this.u * 32 + 16;
        this.y = this.v * 32 + 16;

        // 26x19

        this.determinePlacement();

        this.toggleRadius = 16;

        this.control = terminalData.control;
        this.cameras = [];

        this.enabled = false;
        this.toggled = undefined;
    }

    update(delta) {
        if (this.toggled) {
            this.enabled = !this.enabled;
            this.cameras.forEach(camera => camera.toggle());
        }

        this.toggled = undefined;
    }

    render() {
        game.ctx.save();
        game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        game.ctx.rotate(Util.d2r(this.facing));
        game.ctx.drawImage(Asset.img.terminal, -13, -16);
        game.ctx.fillStyle = this.enabled ? 'rgba(36, 204, 36, 0.8)' : 'rgba(204, 36, 36, 0.8)';
        game.ctx.fillRect(18 - 13, 10 - 16, 3, 3);
        game.ctx.restore();
    }

    toggle() {
        this.toggled = true;
    }

    determinePlacement() {
        if (Util.wallAtUV(this.u, this.v - 1)) {
            this.facing = 0;
        } else if (Util.wallAtUV(this.u - 1, this.v)) {
            this.facing = 270;
        } else if (Util.wallAtUV(this.u, this.v + 1)) {
            this.facing = 180;
        } else {
            this.facing = 90;
        }
    }
}
