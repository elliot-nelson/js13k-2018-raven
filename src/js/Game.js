
function line(ctx, color, p1, p2, offset) {
    var dx = 0, dy = 0;
    if (offset) {
        dx = line.offsetX;
        dy = line.offsetY;
    }
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(p1.x + dx, p1.y + dy);
    ctx.lineTo(p2.x + dx, p2.y + dy);
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
        this.canvasBounds = this.canvas.getBoundingClientRect();

        this.losCanvas = document.getElementById('los');
        this.losCanvas.width = this.canvas.width;
        this.losCanvas.height = this.canvas.height;
        this.losCtx = this.losCanvas.getContext('2d');

        this.tileCanvas = document.getElementById('tile');
        this.tileCtx = this.tileCanvas.getContext('2d');

        Asset.loadAllAssets();

        this.input = new Input({
            up: this.onUp.bind(this),
            down: this.onDown.bind(this),
            left: this.onLeft.bind(this),
            right: this.onRight.bind(this),
            toggle: this.onToggle.bind(this),
            escape: {
                // For the ESC key, wait until the user releases the key. This is simplistic
                // and slightly delays input, but is the easy to make sure that if we request
                // pointer lock, it won't be immediately released again by the browser.
                up: this.onEscape.bind(this)
            },
            mousemove: this.onMouseMove.bind(this),
            mouseclick: this.onMouseClick.bind(this),
            kill: () => {
                this.playerDied();
            }
        }).init();

        this.framems = 0;
        this.player = undefined;
        this.enemies = [];
        this.particles = [];
        this.framehistory = [];

        this.crosshair = { x: 0, y: 0 };
        this.mouse = { x: 0, y: 0 };

        // How "deep" a player's vision cone cuts into a wall tile. Very important
        // that this be a global respected value, without it, the corners we are cutting
        // will result in e.g. light shining through the corners of moving doors.
        this.tileVisibilityInset = 4;

        // When "lock crosshair to map" is true, leaving mouse at rest and moving
        // with WASD will "strafe" (for example, moving around a raven in a circle
        // stay looking at the raven). The default is false, which means leaving the
        // mouse at rest will keep the player's orientation steady as you move.
        this.lockCrosshairToMap = false;

        // Yes, technically, facing and fov are properties of the player. But because
        // we treat the crosshair as a separate entity, it's easier to just make it
        // part of game state.
        this.facing = 0;
        this.fov = 120;

        this.mouselocked = false;
        this.paused = true;
        this.renderPrep = true;
        document.addEventListener('pointerlockchange', this.onMouseLock.bind(this));
        document.addEventListener('mozpointerlockchange', this.onMouseLock.bind(this));
        document.addEventListener('webkitpointerlockchange', this.onMouseLock.bind(this));

        this.startMenu = new Menu(
            [
                {
                    text: 'START',
                    handler: () => {
                        this.pendingLevelIndex = 0;
                        console.log("set " + this.pendingLevelIndex);
                        this.unpause();
                    }
                }
            ],
            () => false
        );

        this.pauseMenu = new Menu(
            [
                {
                    text: 'RESUME',
                    handler: () => {
                        this.unpause();
                    }
                },
                {
                    text: 'RESTART LEVEL',
                    handler: () => {
                        this.pendingLevelIndex = this.levelIndex;
                        this.unpause();
                    }
                }
            ],
            () => this.unpause()
        );

        return this;
    }

    update(delta) {
        if (typeof this.pendingLevelIndex !== 'undefined') {
            this.load(this.pendingLevelIndex);
            this.pendingLevelIndex = undefined;
        }

        if (this.menu) {
            this.menu.update();
        } else {
            if (this.player.dead) {
                this.deathFrame++;
            }

            this.player.update(delta);
            Util.boundEntityWall(this.player);

            this.terminals.forEach(terminal => terminal.update(delta));
            this.cameras.forEach(camera => camera.update(delta));
            this.doors.forEach(door => door.update(delta));

            this.offset = {
                x: this.canvas.width / 2 - this.player.x,
                y: this.canvas.height / 2 - this.player.y,
                crosshairX: this.player.x - this.canvas.width / 2,
                crosshairY: this.player.y - this.canvas.height / 2
            };

            var cd = 4;
            var bound = {
                left: this.offset.crosshairX + cd,
                right: this.offset.crosshairX + this.canvas.width - cd,
                top: this.offset.crosshairY + cd,
                bottom: this.offset.crosshairY + this.canvas.height - cd
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

            this.friendlySight = [];
            if (!this.player.dead) {
                this.friendlySight = this.friendlySight.concat(this.calculateVisibility(this.player, this.facing, this.fov, 4, 5));
            }
            this.cameras.forEach(camera => {
                if (camera.enabled) {
                    this.friendlySight = this.friendlySight.concat(this.calculateVisibility(camera, camera.facing, camera.fov, 12, 0));
                }
            });

            // Next, we "render" the LOS canvas, which is actually part of updating.
            this.losCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.losCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.losCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.friendlySight.forEach((triangle, idx) => {
                this.losCtx.fillStyle = 'white';
                this.losCtx.beginPath();
                this.losCtx.moveTo(this.offset.x + triangle[0].x, this.offset.y + triangle[0].y);
                this.losCtx.lineTo(this.offset.x + triangle[1].x, this.offset.y + triangle[1].y);
                this.losCtx.lineTo(this.offset.x + triangle[2].x, this.offset.y + triangle[2].y);
                this.losCtx.closePath();
                this.losCtx.fill();
            });
            this.losData = this.losCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);

            this.updatePathRoutes();

            this.enemies.forEach(enemy => enemy.update(delta));
            this.enemies.forEach(enemy => Util.boundEntityWall(enemy));

            this.particles.forEach(particle => particle.update(delta));
            this.particles = this.particles.filter(particle => particle.state !== 'dead');

            if (!this.player.dead) {
                this.enemies.forEach(enemy => {
                    if (Util.pointNearPoint(enemy, this.player, enemy.killRadius)) {
                        this.playerDied();
                    }
                });

                let activeTerminal = undefined;
                this.terminals.forEach(terminal => {
                    if (Util.pointNearPoint(terminal, this.player, terminal.toggleRadius)) {
                        activeTerminal = terminal;
                    }
                });
                this.activeTerminal = activeTerminal;
            }

            this.renderPrep = true;
        }
    }

    render() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.level && this.renderPrep) {
            if (this.player.dead) {
                let scale = Math.min(3, 1 + this.deathFrame / 50);
                this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
                this.ctx.rotate(d2r(this.deathFrame / 5));
                this.ctx.scale(scale, scale);
                this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
            }

            this.ctx.drawImage(this.tileCanvas, this.offset.x, this.offset.y);

            /*for (var i = 0; i < this.level.height; i++) {
                for(var j = 0; j < this.level.width ; j++) {
                    var tile = this.level.data[i * this.level.width + j];
                    if (tile === 1) {
                        //this.ctx.drawImage(Asset.tile.wall, this.offset.x + j * 32, this.offset.y + i * 32);
                    } else if (tile === 2) {
                        //this.ctx.drawImage(Asset.tile.floor, this.offset.x + j * 32, this.offset.y + i * 32);
                    }

                    this.ctx.font = '12px serif';
                    this.ctx.fillStyle = 'white';
                    //this.ctx.fillText(this.routes[i * this.level.width + j], offsetX + j * 32 + 4, offsetY + i * 32 + 4);
                }
            }*/

            this.terminals.forEach(terminal => terminal.render());
            this.cameras.forEach(camera => camera.render());
            this.player.render();
            this.enemies.forEach(enemy => enemy.render());
            this.doors.forEach(door => door.render());
            this.particles.forEach(particle => particle.render());

            // Light cone
            /*var cone1 = xyd(this.player, dw(this.facing - 30), 50);
            var cone2 = xyd(this.player, dw(this.facing + 30), 50);
            this.ctx.save();
            this.ctx.strokeStyle = 'yellow';
            this.ctx.beginPath();
            this.ctx.moveTo(offsetX + this.player.x, offsetY + this.player.y);
            this.ctx.lineTo(offsetX + cone1.x, offsetY + cone1.y);
            this.ctx.lineTo(offsetX + cone2.x, offsetY + cone2.y);
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.restore();*/

            // los edges
            let losEdges = this.losEdges;
            this.doors.forEach(door => losEdges = losEdges.concat(door.getLosEdges()));
            losEdges.forEach(edge => {
                this.ctx.save();
                this.ctx.globalAlpha = 0.9;
                this.ctx.strokeStyle = 'yellow';
                this.ctx.setLineDash([4, 2]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.offset.x + edge.p1.x, this.offset.y + edge.p1.y);
                this.ctx.lineTo(this.offset.x + edge.p2.x, this.offset.y + edge.p2.y);
                this.ctx.stroke();
                this.ctx.restore();
            });

            if (this.player.dead) {
                this.losCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                let opacity = Math.max(0, 0.8 - this.deathFrame / 40);
                this.losCtx.fillStyle = 'rgba(0, 0, 0, ' + opacity + ')';
                this.losCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            // Blit visibility
            this.ctx.save();
            // attempted: lighten, multiply, darken, source-in (darken looks best for shadows so far)
            this.ctx.globalCompositeOperation = 'darken';
            this.ctx.drawImage(this.losCanvas, 0, 0);
            this.ctx.restore();

            if (!this.player.dead) {
                this.player.renderCrosshair();

                // Interactivity indicator
                if (this.activeTerminal) {
                    let radius = (this.framems % 1000 < 500 ? 4 : 6);
                    this.ctx.fillStyle = 'rgba(204, 204, 204, 168)';
                    this.ctx.strokeStyle = 'rgba(204, 204, 204, 168)';
                    this.ctx.beginPath();
                    this.ctx.arc(this.offset.x + this.player.x - 18, this.offset.y + this.player.y + 18, radius, 0, 2 * Math.PI);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.arc(this.offset.x + this.player.x - 18, this.offset.y + this.player.y + 18, radius + 2, 0, 2 * Math.PI);
                    this.ctx.stroke();
                }
            }

            // Post-visibility rendering
            this.enemies.forEach(enemy => enemy.renderPost());

            // Reset all global transforms. Note: do not render anything except "HUD UI"
            // after this point, as it won't line up with the rest of the map in case of,
            // e.g., the death spin animation.
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);

            if (this.player.dead) {
                /*this.losCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.losCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                let color = Math.min(240, this.deathFrame * 4 + 50);
                let opacity = Math.min(0.4, 0.4 + this.deathFrame / 40);
                this.losCtx.fillStyle = 'rgba(' + color + ', 0, 0, ' + opacity + ')';
                this.losCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);*/

                let opacity = Math.min(0.8, this.deathFrame / 40);
                this.ctx.fillStyle = 'rgba(204, 0, 0, ' + opacity + ')';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                let size = Math.min(80, 20 + this.deathFrame / 5);
                opacity = Math.min(0.5, this.deathFrame / 50);
                this.ctx.font = Asset.getFontString(size);
                let x = this.canvas.width / 2 - this.ctx.measureText('YOU ARE DEAD').width / 2;
                this.ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
                this.ctx.fillText('YOU ARE DEAD', x, this.canvas.height / 2);
            }

            if (!this.menu) {
                this.renderLevelText();
            }
        }

        if (this.menu) {
            this.menu.render();
        }
    }

    renderLevelText() {
        let chars = Math.floor((this.framems - this.levelms) / 33);
        let nameChars = Math.min(this.level.name.length, chars);
        let hintChars = Math.max(0, chars - nameChars - 3);

        let delayStart = ((this.level.hint.length || 0) + 3 + this.level.name.length) * 33;

        if (this.framems - this.levelms - delayStart < 3000) {
            this.ctx.font = Asset.getFontString(22);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            this.ctx.fillText(this.level.name.substring(0, nameChars), 18, 36);

            if (this.level.hint) {
                this.ctx.font = Asset.getFontString(18);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.fillText(this.level.hint.substring(0, hintChars), 18, this.canvas.height - 30);
            }
        }
    }

    frame(nextms) {
        let delta = nextms - this.framems;
        this.framems = nextms;

        this.framehistory.splice(10);
        this.framehistory.unshift(delta);

        var x = 0;
        for(let i = 0; i < this.framehistory.length; i++) {
            x += this.framehistory[i];
        }
        if (x > 0) {
            //console.log(1000 / (x / 10));
        }


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
        this.openMenu(this.startMenu);
        window.requestAnimationFrame(this.frame.bind(this));
    }

    openMenu(menu) {
        this.menu = menu;
        this.menu.open();
    }

    playerDied() {
        this.player.dead = true;
        this.deathFrame = 0;
    }

    //
    // Event Handlers
    //

    unpause() {
        console.log('reuqest it');
        this.canvas.requestPointerLock();
    }

    onUp() {
        if (this.menu) this.menu.onUp();
    }

    onDown() {
        if (this.menu) this.menu.onDown();
    }

    onLeft() {
    }

    onRight() {
    }

    onToggle() {
        if (this.menu) {
            this.menu.select();
        } else if (this.player.dead) {
            this.pendingLevelIndex = this.levelIndex;
        } else {
            let activeTerminal = this.activeTerminal;
            if (activeTerminal) {
                activeTerminal.toggle();
            }
        }
    }

    onEscape() {
        if (this.menu) this.menu.onEscape();
    }

    onMouseLock() {
        if (document.pointerLockElement === this.canvas) {
            console.log('mouselock on');
            this.mouselocked = true;
            this.paused = false;
            this.menu = undefined;
            this.framems = performance.now();
        } else {
            console.log('mouselock off');
            this.mouselocked = false;
            this.paused = true;
            this.openMenu(this.pauseMenu);
        }
    }

    onMouseMove(deltaX, deltaY, clientX, clientY) {
        if (!this.paused) {
            this.crosshair.x += deltaX;
            this.crosshair.y += deltaY;
        }

        this.mouse.x = clientX - this.canvasBounds.left;
        this.mouse.y = clientY - this.canvasBounds.top;

        if (this.menu) this.menu.onMouseMove(this.mouse.x, this.mouse.y);
    }

    onMouseClick() {
        if (this.menu) {
            this.menu.select();
        } else if (this.player.dead) {
            this.pendingLevelIndex = this.levelIndex;
        }
    }

    load(levelIndex) {
        this.levelIndex = levelIndex;
        this.level = Object.assign({}, LevelCache[levelIndex]);
        this.level.data = this.level.data.slice(0);

        let eb = this.level.enterBounds;

        this.player = new Player();
        this.player.x = (eb.right - eb.left) / 2 + eb.left;
        this.player.y = (eb.bottom - eb.top) / 2 + eb.top;
        this.crosshair.x = this.player.x;
        this.crosshair.y = this.player.y - 32;

        this.polygonize(this.level);

        this.enemies = [];
        this.level.enemies.forEach(enemyData => {
            let enemy = new Enemy(enemyData);
            this.enemies.push(enemy);
        });

        this.cameras = [];
        this.level.cameras.forEach(cameraData => {
            let camera = new Camera(cameraData);
            this.cameras.push(camera);
        });

        this.terminals = [];
        this.level.terminals.forEach(terminalData => {
            let terminal = new Terminal(terminalData);
            terminal.cameras = this.cameras.filter(camera => camera.control === terminal.control);
            this.terminals.push(terminal);
        });

        this.doors = [];
        this.level.doors.forEach(doorData => {
            let door = new Door(doorData);
            this.doors.push(door);
        });

        // Pre-render static level. Rendering the entire tiled map ahead of time
        // saves us hundreds-thousands of drawImage calls per frame, which according
        // to Chrome perf is the biggest CPU hit in this game.
        this.tileCanvas.width = this.level.width * 32;
        this.tileCanvas.height = this.level.height * 32;
        this.tileCtx.fillStyle = 'black';
        this.tileCtx.fillRect(0, 0, this.level.width * 32, this.level.height * 32);

        for (let i = 0; i < this.level.height; i++) {
            for(let j = 0; j < this.level.width; j++) {
                var tile = Util.tileAtUV(j, i);
                if (tile === 1) {
                    this.tileCtx.drawImage(Asset.tile.wall, j * 32, i * 32);
                    this.renderTileNoise(1, j * 32, i * 32);
                } else if (tile === 2) {
                    // Rotate floor pieces in a predictable pattern.
                    let rot = ((i * 3 + j * 7) % 4) * 90;

                    this.tileCtx.save();
                    // Totally cheating... mute the floor a little bit.
                    this.tileCtx.globalAlpha = 0.82;
                    this.tileCtx.translate(j * 32 + 16, i * 32 + 16);
                    this.tileCtx.rotate(Util.d2r(rot));
                    this.tileCtx.drawImage(Asset.tile.floor, -16, -16);
                    this.tileCtx.restore();
                    this.renderTileNoise(2, j * 32, i * 32);
                }
            }
        }

        this.renderPrep = false;
        this.levelms = performance.now();
    }

    renderTileNoise(seed, x, y) {
        // Adding some noise makes most tiles look much more natural (easier on
        // the eyes), but it also explodes PNG size by an order of magnitude. Cheat
        // by saving the PNGs as mostly-solid-color (also allows us to index colors,
        // saving even more space), and add the noise in when we render the level.
        let seeded = Util.Alea(seed);
        let rand = () => Math.floor(seeded() * 256);
        let r,g,b,a;
        for (let i = 1; i < 31; i++) {
            for(let j = 1; j < 31; j++) {
                if (rand() > 208) {
                    [r, g, b] = [rand(), rand(), rand()];
                    a = 0.09;
                    this.tileCtx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
                    this.tileCtx.fillRect(x + j, y + i, 1, 1);
                }
            }
        }
    }

    // Warning: brute force incoming...
    //
    // Given a tiled level, precalculate a set of wall-floor "edges". More generally,
    // an "edge" is a straight line that divides a non-vision-blocking area from a
    // vision-blocking area.
    //
    // (Doors are dynamic and are not included in this phase.)
    polygonize(level) {
        var edges = {};
        var addedge = (x1,y1,x2,y2,type) => {
            let key1 = `${x1},${y1}${type}`;
            let key2 = `${x2},${y2}${type}`;
            let existingEdge = edges[key1];
            if (existingEdge) {
                delete edges[key1];
                edges[key2] = [existingEdge[0], existingEdge[1], x2, y2];
            } else {
                edges[key2] = [x1, y1, x2, y2];
            }
        };

        // Loop through all floor tiles, checking for adjacent wall tiles, and
        // create or extend an LOS edge whenever we find one.
        for (var i = 0; i < level.height; i++) {
            for(var j = 0; j < level.width; j++) {
                var value = level.data[i * level.width + j];
                // value=2 is floor "non light obstructing"
                if (value !== 2) {
                    continue;
                }
                if (level.data[i * level.width + j - 1] !== 2) {
                    // left edge
                    addedge(j * 32, i * 32, j * 32, i * 32 + 32, 'left');
                }
                if (level.data[i * level.width + j + 1] !== 2) {
                    // right edge
                    addedge(j * 32 + 32, i * 32, j * 32 + 32, i * 32 + 32, 'right');
                }
                if (level.data[(i - 1) * level.width + j] !== 2) {
                    // top edge
                    addedge(j * 32, i * 32, j * 32 + 32, i * 32, 'top');
                }
                if (level.data[(i + 1) * level.width + j] !== 2) {
                    // bottom edge
                    addedge(j * 32, i * 32 + 32, j * 32 + 32, i * 32 + 32, 'bottom');
                }
            }
        }

        // More brute force (there should be something more elegant, surely?). We don't
        // always want our visibility to end _right_ at the edge of a tile, perhaps we'd
        // like to cut into the tile; but our simplistic algorithm above doesn't distinguish
        // between concave and convex corners. So we make up a bit of the legwork here.
        this.losEdges = Object.keys(edges).map(k => {
            let ax = 0, bx = 0, ay = 0, by = 0;
            let cut = this.tileVisibilityInset;

            if (k.endsWith('left')) {
                ax = bx = -cut;
                ay = -cut;
                by = cut;
                if (!Util.wallAtXY(edges[k][0] + ax, edges[k][1] + ay)) ay = -ay;
                if (!Util.wallAtXY(edges[k][2] + bx, edges[k][3] + by)) by = -by;
            } else if (k.endsWith('right')) {
                ax = bx = cut;
                ay = -cut;
                by = cut;
                if (!Util.wallAtXY(edges[k][0] + ax, edges[k][1] + ay)) ay = -ay;
                if (!Util.wallAtXY(edges[k][2] + bx, edges[k][3] + by)) by = -by;
            } else if (k.endsWith('top')) {
                ay = by = -cut;
                ax = -cut;
                bx = cut;
                if (!Util.wallAtXY(edges[k][0] + ax, edges[k][1] + ay)) ax = -ax;
                if (!Util.wallAtXY(edges[k][2] + bx, edges[k][3] + by)) bx = -bx;
            } else if (k.endsWith('bottom')) {
                ay = by = cut;
                ax = -cut;
                bx = cut;
                if (!Util.wallAtXY(edges[k][0] + ax, edges[k][1] + ay)) ax = -ax;
                if (!Util.wallAtXY(edges[k][2] + bx, edges[k][3] + by)) bx = -bx;
            }

            return {
                p1: {
                    x: edges[k][0] + ax,
                    y: edges[k][1] + ay
                },
                p2: {
                    x: edges[k][2] + bx,
                    y: edges[k][3] + by
                }
            };
        });
    }

    pointInBounds(p, bounds) {
        var fudge = 1;
        var a = bounds.p1.x,
            b = bounds.p2.x,
            c = bounds.p1.y,
            d = bounds.p2.y;
        if (a > b) [a, b] = [b, a];
        if (c > d) [c, d] = [d, c];
        return p.x >= a - fudge && p.x <= b + fudge && p.y >= c - fudge && p.y <= d + fudge;
    }

    // Math wizards everywhere, avert your eyes...
    // https://www.topcoder.com/community/data-science/data-science-tutorials/geometry-concepts-line-intersection-and-its-applications/
    // Intersecting lines...
    // First, given (x1,y1)->(x2,y2), Ax+By=C.
            // A = y2-y1
            // B = x1-x2
            // C = Ax1+By1
    intersection(line1, line2) {
        var A1 = line1.p2.y - line1.p1.y;
        var B1 = line1.p1.x - line1.p2.x;
        var C1 = A1 * line1.p1.x + B1 * line1.p1.y;

        var A2 = line2.p2.y - line2.p1.y;
        var B2 = line2.p1.x - line2.p2.x;
        var C2 = A2 * line2.p1.x + B2 * line2.p1.y;

        var det = A1*B2 - A2*B1;

        if (det !== 0) {
            var p = {
                x: (B2*C1 - B1*C2)/det,
                y: (A1*C2 - A2*C1)/det
            };

            if (this.pointInBounds(p, line1) && this.pointInBounds(p, line2)) {
                return p;
            }
        }
    }

    calculateVisibility(origin, facing, coneAngle, offset, backwalk) {
        // Get pre-calculated visibility edges
        let edges = this.losEdges;

        // Add in dynamic visibility edges
        this.doors.forEach(door => edges = edges.concat(door.getLosEdges()));
        console.log(this.doors[0].getLosEdges());

        let startAngle = dw(facing - coneAngle / 2);
        let endAngle = dw(facing + coneAngle / 2);

        if (endAngle < startAngle) endAngle += 360;

        // How much space between origin and ray start -- the larger the offset,
        // the less "sharp" the origin point is.
        offset = offset || 0;

        // Backwalk - how many pixels to walk "backwards" before casting rays.
        // Often a large offset needs a large backwalk.
        backwalk = backwalk || 0;

        origin = {
            x: origin.x - Math.cos(Util.d2r(facing)) * backwalk,
            y: origin.y - Math.sin(Util.d2r(facing)) * backwalk
        };

        let sweep = 0.8;

        let angles = [startAngle, endAngle];

        // This approach  blah

        /*for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            var angle = Util.r2d(Math.atan2(edge.p1.y - origin.y, edge.p1.x - origin.x));
            if (Util.angleWithin(angle, startAngle, endAngle)) {
                angles.push(angle);
                if (angle - 2 >= startAngle) {
                    angles.push(angle - 2);
                }
                if (angle + 2 <= endAngle) {
                    angles.push(angle + 2);
                }
            }
        }*/

        if (this.input.keys[71]) console.log([startAngle, endAngle]);
        if (this.input.keys[71]) console.log(angles);
        angles = angles.map(a => dw(a - startAngle));
        if (this.input.keys[71]) console.log(angles);
        angles.sort((a, b) => a - b);
        if (this.input.keys[71]) console.log(angles);
        angles = angles.map(a => dw(a + startAngle));
        if (this.input.keys[71]) console.log(angles);
        this.input.keys[71] = undefined;

        var triangles = [];
        var lastp;
        var lastAngle = undefined;

        // Shadows actually seem a little unnatural if they are super crisp. Introduce
        // just enough jitter that the user won't see a sharp unmoving line for more
        // than ~1sec.
        let jitter = (game.framems % 1000) / 1000;

        let angle = startAngle + jitter;
        while (angle < endAngle) {
        //for(i = 0; i < angles.length; i++) {
         //   angle = angles[i];

//            if (angles[i] === lastAngle) continue;
  //          lastAngle = angles[i];

            let source = {
                x: origin.x + Math.cos(Util.d2r(angle)) * offset,
                y: origin.y + Math.sin(Util.d2r(angle)) * offset
            };

            let ray = {
                x: origin.x + Math.cos(Util.d2r(angle)) * 1000,
                y: origin.y + Math.sin(Util.d2r(angle)) * 1000
            };

            for (let j = 0; j < edges.length; j++) {
                let inter = this.intersection({ p1: source, p2: ray }, edges[j]);
                if (inter) {
                    ray = inter;
                }
            }

            if (lastp) {
                triangles.push([source, lastp, ray]);
            }

            lastp = ray;

            angle += sweep;
        }

/*
        triangles.forEach((triangle, idx) => {
            this.ctx.save();
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = 'blue';
            this.ctx.beginPath();
            this.ctx.moveTo(line.offsetX + triangle[0].x, line.offsetY + triangle[0].y);
            this.ctx.lineTo(line.offsetX + triangle[1].x, line.offsetY + triangle[1].y);
            this.ctx.lineTo(line.offsetX + triangle[2].x, line.offsetY + triangle[2].y);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.font = '20px serif';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(idx, line.offsetX + triangle[1].x, line.offsetY + triangle[1].y + 15);
            this.ctx.restore();
        });
*/
        return triangles;
    }

    updatePathRoutes() {
        var open = [{ u: Math.floor(this.player.x / 32), v: Math.floor(this.player.y / 32), c: 0 }];
        var routes = [];

        var proc = (u, v, c) => {
            if (Util.tileInWall(u, v)) {
                return;
            }

            var priorCost = routes[v * this.level.width + u];

            if (this.pointInFriendlySight({ x: u * 32 + 16, y: v * 32 + 16})) {
                c += 100;
            } else {
                c += 2;
            }

            if (!priorCost || priorCost > c) {
                open.push({ u, v, c });
            }
        }

        /*while(open.length > 0) {
            var tile = open.shift();
            routes[tile.v * this.level.width + tile.u] = tile.c;

            proc(tile.u - 1, tile.v, tile.c);
            proc(tile.u + 1, tile.v, tile.c);
            proc(tile.u, tile.v - 1, tile.c);
            proc(tile.u, tile.v + 1, tile.c);
        }*/

        //console.log(routes);
        this.routes = routes;
    }

    pointInFriendlySight(p) {
        for(let i = 0; i < this.friendlySight.length; i++) {
            var triangle = this.friendlySight[i];
            if (Util.pointInTriangle(p, triangle[0], triangle[1], triangle[2])) {
                return true;
            }
        }
        return false;
    }
};
