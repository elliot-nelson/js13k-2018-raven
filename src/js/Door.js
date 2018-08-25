class Door {
    constructor(doorData) {
        this.u = doorData.u;
        this.v = doorData.v;
        this.type = doorData.type;

        if (this.type === 'h') {
            this.x = this.u * 32 + 32;
            this.y = this.v * 32 + 16;
        } else {
            this.x = this.u * 32 + 16;
            this.y = this.v * 32 + 32;
        }

        this.determinePlacement();

        this.toggleRadius = 20;

        this.control = doorData.control;

        this.slide = 0;

        this.enabled = false;
        this.toggled = undefined;
    }

    update(delta) {

        this.slide += 10 * delta;
        if (this.slide > 30) {
            this.slide = 0;
        }

        this.toggled = undefined;
    }

    render() {
        let slide = Math.floor(this.slide);

        if (this.type === 'h') {
            // Left half
            game.ctx.save();
            game.ctx.translate(game.offset.x + this.x - 16, game.offset.y + this.y);
            game.ctx.rotate(Util.d2r(0));
            game.ctx.drawImage(Asset.tile.door, slide, 0, 32 - slide, 32, -16, -16, 32 - slide, 32);
            game.ctx.restore();

            // Right half
            game.ctx.save();
            game.ctx.translate(game.offset.x + this.x + 16, game.offset.y + this.y);
            game.ctx.rotate(Util.d2r(180));
            game.ctx.drawImage(Asset.tile.door, slide, 0, 32 - slide, 32, -16, -16, 32 - slide, 32);
            game.ctx.restore();
        }
    }

    toggle() {
        this.toggled = true;
    }

    getLosEdges() {
        let cut = game.tileVisibilityInset;

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

    determinePlacement() {
        /*if (Util.wallAtUV(this.u, this.v - 1)) {
            this.facing = 0;
        } else if (Util.wallAtUV(this.u - 1, this.v)) {
            this.facing = 90;
        } else if (Util.wallAtUV(this.u, this.v + 1)) {
            this.facing = 180;
        } else {
            this.facing = 270;
        }*/
    }
}
