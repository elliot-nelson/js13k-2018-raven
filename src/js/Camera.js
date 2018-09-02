class Camera {
    constructor(cameraData) {
        this.u = cameraData.u;
        this.v = cameraData.v;

        this.control = cameraData.control;
        this.facing = parseFloat(cameraData.facing);
        this.enabled = !!cameraData.enabled;
        this.fov = 60;

        // camera head = 21x12

        this.determineArmPlacement();

        this.toggled = undefined;
    }

    update(delta) {
        if (this.toggled) {
            this.enabled = !this.enabled;
        }

        //this.facing = dw(this.facing + 1);

        this.toggled = undefined;
    }

    render() {
        // Arm
        game.ctx.save();
        game.ctx.translate(game.offset.x + this.u * 32 + 16, game.offset.y + this.v * 32 + 16);
        game.ctx.rotate(Util.d2r(this.armFacing));
        game.ctx.drawImage(Asset.img.camera_arm, -16, -16);
        game.ctx.restore();

        // Head
        game.ctx.save();
        game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        game.ctx.rotate(Util.d2r(this.facing));
        game.ctx.drawImage(Asset.img.camera_head, -6, -5);
        game.ctx.fillStyle = this.enabled ? 'rgba(36, 204, 36, 0.8)' : 'rgba(204, 36, 36, 0.8)';
        game.ctx.fillRect(0, -1, 3, 3);
        game.ctx.restore();
    }

    toggle() {
        this.toggled = true;
    }

    determineArmPlacement() {
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
