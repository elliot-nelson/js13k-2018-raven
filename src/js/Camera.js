/**
 * Security cameras provide LOS, which locks enemies down if they are in the cone,
 * and provides the player with safe passage. Usually turned on by terminals.
 */
class Camera {
    constructor(cameraData) {
        Object.assign(this, cameraData);
        this.fov = 60;

        // camera head = 21x12

        this._determineArmPlacement();

        this._toggled = undefined;
    }

    update(delta) {
        if (this._toggled) {
            this.enabled = !this.enabled;
        }

        this._toggled = undefined;
    }

    render() {
        // Arm
        game.ctx.save();
        game.ctx.translate(game.offset.x + this.u * 32 + 16, game.offset.y + this.v * 32 + 16);
        game.ctx.rotate(Util.d2r(this.armFacing));
        Asset.drawSprite('camera_arm', game.ctx, -16, -16);
        game.ctx.restore();

        // Head
        game.ctx.save();
        game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        game.ctx.rotate(Util.d2r(this.facing));
        Asset.drawSprite('camera_head', game.ctx, -6, -5);
        game.ctx.fillStyle = this.enabled ? 'rgba(36,204,36,0.8)' : 'rgba(204,36,36,0.8)';
        game.ctx.fillRect(0, -1, 3, 3);
        game.ctx.restore();
    }

    toggle() {
        this._toggled = true;
    }

    _determineArmPlacement() {
        if (Util.wallAtUV(this.u, this.v - 1)) {
            this.armFacing = 0;
            this.x = this.u * 32 + 15;
            this.y = this.v * 32 + 11;
        } else if (Util.wallAtUV(this.u - 1, this.v)) {
            this.armFacing = 270;
            this.x = this.u * 32 + 11;
            this.y = this.v * 32 + 16;
        } else if (Util.wallAtUV(this.u, this.v + 1)) {
            this.armFacing = 180;
            this.x = this.u * 32 + 15;
            this.y = this.v * 32 + 20;
        } else {
            this.armFacing = 90;
            this.x = this.u * 32 + 20;
            this.y = this.v * 32 + 16;
        }
    }
}
