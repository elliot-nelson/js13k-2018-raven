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

        this.level = undefined;
        this.intro = undefined;
        this.player = undefined;

        this.framems = 0;
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
                        this.pendingLevelIndex = 2;
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
            this.menu.update(delta);
        } else if (this.intro) {
            this.intro.update(delta);
            if (this.intro.state === 'dead') {
                this.intro = undefined;
            }
            this.levelms = performance.now();
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

            this.vision = [];
            if (!this.player.dead) {
                this.vision = this.vision.concat(this.calculateVisibility(this.player, this.facing, this.fov, 4, 5));
            }
            this.cameras.forEach(camera => {
                if (camera.enabled) {
                    this.vision = this.vision.concat(this.calculateVisibility(camera, camera.facing, camera.fov, 12, 0));
                }
            });

            //this.updatePathRoutes();

            this.enemies.forEach(enemy => enemy.update(delta));
            this.enemies.forEach(enemy => Util.boundEntityWall(enemy));

            this.particles.forEach(particle => particle.update(delta));
            this.particles = this.particles.filter(particle => particle.state !== 'dead');

            this.buildAttackGraph2();

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

        this.handleCheatCodes();
    }

    render() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.level && this.renderPrep && !this.intro) {
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

            // Next, we "render" the LOS canvas
            this.losCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.losCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.losCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.vision.forEach((polygon, idx) => {
                this.losCtx.fillStyle = 'white';
                this.losCtx.beginPath();
                this.losCtx.moveTo(this.offset.x + polygon[0].x, this.offset.y + polygon[0].y);
                for (let i = 1; i < polygon.length; i++) {
                    this.losCtx.lineTo(this.offset.x + polygon[i].x, this.offset.y + polygon[i].y);
                }
                this.losCtx.closePath();
                this.losCtx.fill();
            });
            //this.losData = this.losCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);

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
                    Util.renderTogglePrompt(this.offset.x + this.player.x - 18, this.offset.y + this.player.y + 18);
                }
            }

            // Post-visibility rendering
            this.enemies.forEach(enemy => enemy.renderPost());

            // Reset all global transforms. Note: do not render anything except "HUD UI"
            // after this point, as it won't line up with the rest of the map in case of,
            // e.g., the death spin animation.
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);

            Enemy.renderAttackWarning();

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

            this.buildAttackGraph();
            this.showAttackGraph2();
        }

        if (this.intro && !this.menu) {
            this.intro.render();
        }

        if (this.menu) {
            this.menu.render();
        }
    }

    renderLevelText() {
        let chars = Math.floor((this.framems - this.levelms) / 19);
        let nameChars = Math.min(this.level.name.length, chars);
        let hintChars = Math.max(0, chars - nameChars - 3);

        let delayStart = (this.level.hint.length + 3 + this.level.name.length) * 19;

        if (this.framems - this.levelms - delayStart < 3000) {
            this.ctx.font = Asset.getFontString(22);
            this.ctx.fillStyle = 'rgba(204, 255, 204, 0.9)';
            this.ctx.fillText(this.level.name.substring(0, nameChars), 18, 36);

            if (this.level.hint) {
                this.ctx.font = Asset.getFontString(18);
                this.ctx.fillStyle = 'rgba(204, 204, 204, 0.8)';
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
        } else if (this.intro) {
            this.intro.toggle();
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

        if (this.level.intro) {
            this.intro = new Intro(this.level.intro);
        } else {
            this.levelms = performance.now();
        }

        this.renderPrep = false;
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
                if (rand() > 172) {
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
            let ax = 0, bx = 0, ay = 0, by = 0, flip = false;
            let cut = this.tileVisibilityInset;

            if (k.endsWith('left')) {
                ax = bx = -cut;
                ay = -cut;
                by = cut;
                flip = true;
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
                flip = true;
                if (!Util.wallAtXY(edges[k][0] + ax, edges[k][1] + ay)) ax = -ax;
                if (!Util.wallAtXY(edges[k][2] + bx, edges[k][3] + by)) bx = -bx;
            }

            let result = {
                p1: {
                    x: edges[k][0] + ax,
                    y: edges[k][1] + ay
                },
                p2: {
                    x: edges[k][2] + bx,
                    y: edges[k][3] + by
                }
            };

            // Definitely room for improvement here (and in this whole function). I've managed
            // to scrape together something that works, but making it work in the general case
            // (and correctly) is beyond me in 30 days :).
            //
            // This "flips" the appropriate edges so that ALL edges produced by this function
            // are clockwise (that is: following the edge from p1->p2 should always have floor
            // on the LEFT side and wall on the RIGHT side). This allows us to make a lot of
            // time-saving assumptions in the pathing phase.
            if (flip) [result.p1, result.p2] = [result.p2, result.p1];

            return result;
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

        let startAngle = dw(facing - coneAngle / 2);
        let endAngle = dw(facing + coneAngle / 2);

        if (endAngle < startAngle) endAngle += 360;

        // How much space between the "origin point" and the arc of vision? Imagine
        // for example, a security camera (the arc of vision starts at the lens,
        // not the base of the camera).
        offset = offset || 0;

        // Backwalk - how many pixels to walk "backwards" before casting rays. Sometimes
        // you need some pixels of backwalk to prevent the arc of vision from being
        // too far in front of the subject (mostly it just doesn't look good).
        backwalk = backwalk || 0;

        // Calculate a new temporary origin point, with backwalk taken into account.
        origin = {
            x: origin.x - Math.cos(Util.d2r(facing)) * backwalk,
            y: origin.y - Math.sin(Util.d2r(facing)) * backwalk
        };

        // Gap between rays cast. More of an art than a science... a higher gap is faster,
        // but potentially introduces artifacts at corners.
        let sweep = 0.8;

        // Shadows actually seem a little unnatural if they are super crisp. Introduce
        // just enough jitter that the user won't see a sharp unmoving line for more
        // than ~1sec.
        let jitter = (game.framems % 1000) / 1000;

        let frontSweep = [];
        let backSweep = [];

        let angle = startAngle + jitter;
        while (angle < endAngle) {
            // Calculate a source, taking the offset into account
            let source = {
                x: origin.x + Math.cos(Util.d2r(angle)) * offset,
                y: origin.y + Math.sin(Util.d2r(angle)) * offset
            };

            // Calculate the ray endpoint
            let ray = {
                x: origin.x + Math.cos(Util.d2r(angle)) * 1000,
                y: origin.y + Math.sin(Util.d2r(angle)) * 1000
            };

            // Loop through all known LOS edges, and when we intersect one, shorten
            // the current ray. TODO: This is a potential area of improvement (edge
            // culling, early exits, etc.).
            for (let j = 0; j < edges.length; j++) {
                let inter = this.intersection({ p1: source, p2: ray }, edges[j]);
                if (inter) {
                    ray = inter;
                }
            }

            // In theory, this is where we would keep an array of vision polygons,
            // each one being:
            //
            //     [lastSource, source, ray, lastRay]
            //
            // (If offset=0, then we could further optimize and just save the vision
            // polygons as triangles, but using triangles when source changes for each
            // ray results in ugly lines near the player.)
            //
            // Rather than keep polygons at all, though, we can just "sweep" forwards
            // for each point far from the player (the ray) and "sweep" backwards for
            // each point near the player (the source). Concatenating all these points
            // together then produces a single polygon representing the entire field of
            // vision, which we can draw in a single fill call.
            //
            // Note order is important: we need the final polygons to be stored with
            // edges "clockwise" (in this case, we are optimizing for enemy pathing, which
            // means we want NON-VISIBLE on the left and VISIBLE on the right).
            frontSweep.unshift(ray);
            backSweep.push(source);

            angle += sweep;
        }

        let polygon = backSweep.concat(frontSweep);
        return [polygon];
    }


    handleCheatCodes() {
        // GOTOnn (nn = 01-99, number of a valid level)
        if (this.input.queue[0] >= '0' && this.input.queue[0] <= '9' &&
            this.input.queue[1] >= '0' && this.input.queue[1] <= '9' &&
            this.input.queue[2] === 'o' &&
            this.input.queue[3] === 't' &&
            this.input.queue[4] === 'o' &&
            this.input.queue[5] === 'g') {
            this.pendingLevelIndex = parseInt(this.input.queue[1] + this.input.queue[0], 10) - 1;
            if (this.pendingLevelIndex >= LevelCache.length || this.pendingLevelIndex < 0) {
                this.pendingLevelIndex = undefined;
            }
            this.input.queue = [];
        }
    }

    buildAttackGraph() {
        return;

        for (let en = 0; en < game.enemies.length; en++) {
        let enemy = game.enemies[en];

        // Get pre-calculated visibility edges
        let edges = this.losEdges.slice(0);

        // Add in dynamic visibility edges
        this.doors.forEach(door => edges = edges.concat(door.getLosEdges()));

        // Add in LOS edges
        for (let i = 0; i < game.vision.length; i++) {
            let polygon = game.vision[i];
            for (let j = 0; j < polygon.length; j++) {
                edges.push({ p1: polygon[j], p2: polygon[(j + 1) % polygon.length] });
            }
        }

        let queue = [[{ p1: enemy, p2: game.player }]];
        let paths = [];
        let badpaths = [];

        while (queue.length > 0) {
            let path = queue.shift().slice(0);
            let edge = path[path.length - 1];
            let cuttingEdge = edge;
            let closestEdge;

            for (let i = 0; i < edges.length; i++) {
                let sect = this.intersection(cuttingEdge, edges[i]);
                if (sect) {
                    closestEdge = edges[i];
                    cuttingEdge = { p1: cuttingEdge.p1, p2: sect };
                }
            }

            if (Util.pointSpottedXY((cuttingEdge.p2.x + cuttingEdge.p1.x) / 2, (cuttingEdge.p2.y + cuttingEdge.p1.y) / 2)) {
                badpaths.push(path);
                continue;
            }

            //if (distfast(cuttingEdge.p1, edge.p2) < distfast(cuttingEdge.p1, cuttingEdge.p2) ||
            if (distance(cuttingEdge.p2, edge.p2) <= enemy.killRadius) {
                cuttingEdge = edge;
                closestEdge = undefined;
            }

            if (closestEdge) {
                let normalAngle = Util.normalAngle(closestEdge);
                let dx = Util.cos(normalAngle) * 6;
                let dy = Util.sin(normalAngle) * 6;

                cuttingEdge = {
                    p1: cuttingEdge.p1,
                    p2: {
                        x: cuttingEdge.p2.x + dx,
                        y: cuttingEdge.p2.y + dy
                    }
                };
                path[path.length - 1] = cuttingEdge;
                if (path.length > 12) {
                    badpaths.push(path);
                } else {
                    let edgeAngle = Util.atanEdge(closestEdge);
                    let ex = Util.cos(edgeAngle) * 6;
                    let ey = Util.sin(edgeAngle) * 6;

                    let p1 = closestEdge.p1;
                    let p2 = closestEdge.p2;

                    //dx = 0;
                    //dy = 0;
                    ex = ex;
                    ey = ey;
                    p1 = { x: p1.x + dx - ex, y: p1.y + dy - ey };
                    p2 = { x: p2.x + dx + ex, y: p2.y + dy + ey };

                    queue.push(path.concat([
                        { p1: cuttingEdge.p2, p2: p1 },
                        { p1: p1, p2: edge.p2 }
                    ]));
                    queue.push(path.concat([
                        { p1: cuttingEdge.p2, p2: p2 },
                        { p1: p2, p2: edge.p2 }
                    ]));
                    /*
                    queue.push(path.concat([
                        { p1: cuttingEdge.p2, p2: closestEdge.p1 },
                        { p1: closestEdge.p1, p2: edge.p2 }
                    ]));
                    queue.push(path.concat([
                        { p1: cuttingEdge.p2, p2: closestEdge.p2 },
                        { p1: closestEdge.p2, p2: edge.p2 }
                    ]));
                    */
                }
            } else {
                paths.push(path);
            }

            //console.log(paths);
        }

        // Determine the SHORTEST path. We should add up all the edge lengths, but for now,
        // just number of segments is probably close enough.
        paths = paths.sort((a, b) => {
            return b.length - a.length;
        });
        badpaths = badpaths.sort((a, b) => {
            return b.length - a.length;
        });
        paths = paths.slice(0, 1);
        badpaths = badpaths.slice(0, 1);

        for (let i = 0; i < badpaths.length; i++) {
            let path = badpaths[i];

            game.ctx.strokeStyle = 'blue';
            game.ctx.beginPath();
            for(let j = 0; j < path.length; j++) {
                game.ctx.moveTo(game.offset.x + path[j].p1.x, game.offset.y + path[j].p1.y);
                game.ctx.lineTo(game.offset.x + path[j].p2.x, game.offset.y + path[j].p2.y);
            }
            game.ctx.stroke();
        }

        for (let i = 0; i < paths.length; i++) {
            let path = paths[i];

            game.ctx.strokeStyle = 'red';
            game.ctx.beginPath();
            for(let j = 0; j < path.length; j++) {
                game.ctx.moveTo(game.offset.x + path[j].p1.x, game.offset.y + path[j].p1.y);
                game.ctx.lineTo(game.offset.x + path[j].p2.x, game.offset.y + path[j].p2.y);
            }
            game.ctx.stroke();
        }

        enemy.attackPath = paths[0];
        }
        /*let grid = {};
        let queue = [];
        let density = 8;

        function attemptToVisit(gx, gy, c) {
            let x = game.player.x + gx * density;
            let y = game.player.y + gy * density;

           if (Util.wallAtXY(x, y) || Util.pointSpottedXY(x, y)) {
            //if (Util.wallAtXY(x, y)) {
                c = 100000;
                grid[gx + ',' + gy] = { x, y, c };
            } else if (!grid[gx + ',' + gy] || c < grid[gx + ',' + gy]) {
                grid[gx + ',' + gy] = { x, y, c };
                queue.push([gx, gy, c]);
            }
        };

        grid["0,0"] = 0;
        queue.push([0, 0, density]);

        while (queue.length > 0) {
            let entry = queue.shift();

            attemptToVisit(entry[0] + 1, entry[1], entry[2] + density);
            attemptToVisit(entry[0] - 1, entry[1], entry[2] + density);
            attemptToVisit(entry[0], entry[1] + 1, entry[2] + density);
            attemptToVisit(entry[0], entry[1] - 1, entry[2] + density);

            if (Object.keys(grid).length > 1900) break;
        }

        let keys = Object.keys(grid);
        let maxValue = 0;
        for (let i = 0; i < keys.length; i++) {
            let v = grid[keys[i]];
            if (v.c === 100000) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 255)';
            } else {
                maxValue = Math.max(maxValue, v.c);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 255)';
            }
            this.ctx.fillRect(game.offset.x + v.x, game.offset.y + v.y, 1, 1);
        }
        console.log([keys.length, maxValue]);*/
    }

    buildAttackGraph2() {
        let target = {
            x: game.player.x - Util.cos(game.facing) * 34,
            y: game.player.y - Util.sin(game.facing) * 34,
        };

        let pu = Math.floor(target.x / 32);
        let pv = Math.floor(target.y / 32);
        var open = [[pu, pv, 2]];
        var grid = [];

        const examine = (u, v, c) => {
            if (Util.wallAtUV(u, v)) {
                grid[v * this.level.width + u] = 50000;
                return;
            }

            var priorCost = grid[v * this.level.width + u];

            if (!(u === pu && v === pv) && Util.pointSpottedXY(u * 32 + 16, v * 32 + 16)) {
                c += 10000;
            }

            if (!priorCost || c < priorCost) {
                grid[v * this.level.width + u] = c;
                open.push([u - 1, v, c + 32]);
                open.push([u + 1, v, c + 32]);
                open.push([u, v - 1, c + 32]);
                open.push([u, v + 1, c + 32]);
            }
        }

        while(open.length > 0) {
            var tile = open.shift();
            examine(tile[0], tile[1], tile[2]);
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
        this.attackGrid = grid;
    }

    showAttackGraph2() {
        return;
        for (let i = 0; i < this.level.height; i++) {
            for (let j = 0; j < this.level.width; j++) {
                let cost = this.attackGrid[i * this.level.width + j];
                let x = game.offset.x + j * 32;
                let y = game.offset.y + i * 32;

                if (cost >= 10000) {
                    game.ctx.fillStyle = 'rgba(255, 0, 0, 30)';
                    game.ctx.fillRect(x + 16 - 8, y + 16 - 8, 8, 8);
                } else {
                    game.ctx.fillStyle = 'rgba(0, 255, 0, 30)';
                    game.ctx.font = '8px serif';
                    game.ctx.fillText("" + cost, x + 2, y + 2);
                }

            }
        }
    }
};
