/**
 * A door is an entity drawn on top of a floor tile, and can slide open and closed.
 *
 * A locked door doesn't open when the player is near. Today there are only two
 * types of doors, "entrance" and "exit" - entrance doors lock after the player leaves
 * the elevator, exit doors are locked until there are no security terminals remaining
 * on the level.
 *
 * On the map, a door takes up two spaces; the left/uppermost space is the u/v coordinates
 * of the door. TODO: Horizontal (left-right) doors are the only doors implemented right now,
 * to save space for js13k.
 */
class Door {
    constructor(doorData) {
        this.u = doorData.u;
        this.v = doorData.v;
        this.type = doorData.type;
        this.exitDoor = doorData.exitDoor;
        this.entranceDoor = doorData.entranceDoor;

        if (this.exitDoor) this.locked = true;

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

        this.toggled = undefined;
    }

    update(delta) {
        let playerNear = Util.pointNearPoint(this, game.player, this.toggleRadius);

        if (playerNear && !game.levelComplete && !this.locked) {
            if (this.slide < 30) {
                this.slide = Math.min(30, this.slide + 32 * delta);
            }
        } else {
            if (this.slide > 0) {
                this.slide = Math.max(0, this.slide - 32 * delta);
            }
        }

        if (this.entranceDoor && this.slide === 0 && !Util.pointInBounds(game.player, game.level.enter)) {
            this.locked = true;
        }

        let terminalsLeft = 0;
        game.terminals.forEach(terminal => {
            if (!terminal.enabled) terminalsLeft++;
        });

        if (this.exitDoor && terminalsLeft === 0) {
            this.locked = false;
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

            if (this.locked) {
                game.ctx.fillStyle = 'rgba(204, 36, 36, 0.8)';
                game.ctx.fillRect(10, 8, 14, 2);
                game.ctx.fillRect(-24, 8, 14, 2);
                game.ctx.fillRect(10, -10, 14, 2);
                game.ctx.fillRect(-24, -10, 14, 2);
            }

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
