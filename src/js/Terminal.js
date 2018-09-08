/**
 * Terminals are togglable by the player, and typically activate one or more
 * security cameras. All terminals must be toggled on by the player in order to
 * exit a level.
 */
class Terminal {
    constructor(terminalData) {
        Object.assign(this, terminalData);
        this.x = this.u * 32 + 16;
        this.y = this.v * 32 + 16;

        // 26x19

        this._determinePlacement();

        this.toggleRadius = 19;

        this.cameras = [];

        this.enabled = false;
        this._toggled = undefined;
    }

    update(delta) {
        if (this._toggled) {
            this.enabled = !this.enabled;
            this.cameras.forEach(camera => camera.toggle());
            game.audio.playBloop();
        }

        this._toggled = undefined;
    }

    render() {
        game.ctx.save();
        game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        game.ctx.rotate(Util.d2r(this.facing));
        Asset.drawSprite('terminal', game.ctx, -16, -16);
        game.ctx.fillStyle = this.enabled ? 'rgba(36, 204, 36, 0.8)' : 'rgba(204, 36, 36, 0.8)';
        game.ctx.fillRect(18 - 13, 10 - 16, 3, 3);
        game.ctx.restore();
    }

    toggle() {
        this._toggled = true;
    }

    _determinePlacement() {
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
