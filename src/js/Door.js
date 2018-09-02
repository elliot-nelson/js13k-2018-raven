class Door {
    constructor(doorData) {
        this.u = doorData.u;
        this.v = doorData.v;
        this.type = doorData.type;

        //if (this.type === 'h') {
            this.x = this.u * 32 + 32;
            this.y = this.v * 32 + 16;
        //} else {
        //    this.x = this.u * 32 + 16;
        //    this.y = this.v * 32 + 32;
        //}

        // Select a radius just big enough to include our traditional
        // "elevator start position" (we want the effect of the doors
        // sliding open as each level starts).
        this.toggleRadius = 58;

        this.control = doorData.control;

        this.slide = 0;

        this.enabled = false;
        this.toggled = undefined;
    }

    update(delta) {
        let playerNear = Util.pointNearPoint(this, game.player, this.toggleRadius);

        if (playerNear && !game.levelComplete) {
            if (this.slide < 30) {
                this.slide = Math.min(30, this.slide + 32 * delta);
            }
        } else {
            if (this.slide > 0) {
                this.slide = Math.max(0, this.slide - 32 * delta);
            }
        }

        this.toggled = undefined;
    }

    render() {
        let slide = Math.floor(this.slide);

        // TODO: For now, "vertical" doors are not implemented, because I needed to cut
        // a couple hundred extra bytes :(.

        //if (this.type === 'h') {
            game.ctx.save();
            game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
            game.ctx.drawImage(Asset.tile.door, slide, 0, 32 - slide, 32, -32, -16, 32 - slide, 32);
            game.ctx.rotate(Util.d2r(180));
            game.ctx.drawImage(Asset.tile.door, slide, 0, 32 - slide, 32, -32, -16, 32 - slide, 32);
            game.ctx.restore();
        //} else {
        //    game.ctx.save();
        //    game.ctx.translate(game.offset.x + this.x, game.offset.y + this.y);
        //    game.ctx.rotate(Util.d2r(90));
        //    game.ctx.drawImage(Asset.tile.door, slide, 0, 32 - slide, 32, -32, -16, 32 - slide, 32);
        //    game.ctx.rotate(Util.d2r(270));
        //    game.ctx.drawImage(Asset.tile.door, slide, 0, 32 - slide, 32, -32, -16, 32 - slide, 32);
        //    game.ctx.restore();
        //}
    }

    toggle() {
        this.toggled = true;
    }

    getLosEdges() {
        let cut = game.tileVisibilityInset;

        // TODO: Edges implemented for horizontal doors only; to add vertical doors,
        // need to add an extra check and rotate these coordinates around.

        if (this.slide < 3) {
            return [
                // top edge
                {
                    p1: {
                        x: this.x - 32 - cut,
                        y: this.y - 12 + cut
                    },
                    p2: {
                        x: this.x + 32 + cut,
                        y: this.y - 12 + cut
                    }
                },
                // bottom edge
                {
                    p1: {
                        x: this.x - 32 - cut,
                        y: this.y + 12 - cut,
                    },
                    p2: {
                        x: this.x + 32 + cut,
                        y: this.y + 12 - cut
                    }
                }
            ];
        } else {
            return [
                // left top edge
                {
                    p1: {
                        x: this.x - 32 - cut,
                        y: this.y - 12 + cut
                    },
                    p2: {
                        x: this.x - this.slide - cut,
                        y: this.y - 12 + cut
                    }
                },
                // left frame
                {
                    p1: {
                        x: this.x - this.slide - cut,
                        y: this.y - 12 + cut
                    },
                    p2: {
                        x: this.x - this.slide - cut,
                        y: this.y + 12 - cut
                    }
                },
                // left bottom edge
                {
                    p1: {
                        x: this.x - 32 - cut,
                        y: this.y + 12 - cut
                    },
                    p2: {
                        x: this.x - this.slide - cut,
                        y: this.y + 12 - cut
                    }
                },
                // right top edge
                {
                    p1: {
                        x: this.x + this.slide + cut,
                        y: this.y - 12 + cut
                    },
                    p2: {
                        x: this.x + 32 + cut,
                        y: this.y - 12 + cut
                    }
                },
                // right frame
                {
                    p1: {
                        x: this.x + this.slide + cut,
                        y: this.y - 12 + cut
                    },
                    p2: {
                        x: this.x + this.slide + cut,
                        y: this.y + 12 - cut
                    }
                },
                // right bottom edge
                {
                    p1: {
                        x: this.x + this.slide + cut,
                        y: this.y + 12 - cut
                    },
                    p2: {
                        x: this.x + 32 + cut,
                        y: this.y + 12 - cut
                    }
                }
            ];
        }
    }
}
