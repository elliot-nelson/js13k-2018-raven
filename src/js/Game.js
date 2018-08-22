
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

        // Load
        this.images = {
            player: this.loadAsset('assets/player.png'),
            enemy: this.loadAsset('assets/enemy.png'),
            camera: this.loadAsset('assets/camera.png'),
            terminal: this.loadAsset('assets/terminal.png'),
            tiles: {
                floor: this.loadAsset('assets/floor.png'),
                wall: this.loadAsset('assets/wall.png')
            }
        };

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

        this.crosshair = { x: 0, y: 0 };
        this.mouse = { x: 0, y: 0 };

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

            this.friendlySight = this.calculateVisibility(this.player, this.facing, this.fov);

            this.updatePathRoutes();

            this.enemies.forEach(enemy => enemy.update(delta));
            this.enemies.forEach(enemy => Util.boundEntityWall(enemy));

            if (!this.player.dead) {
                this.enemies.forEach(enemy => {
                    if (Util.pointNearPoint(enemy, this.player, enemy.killRadius)) {
                        this.playerDied();
                    }
                });
            }

            this.renderPrep = true;
        }
    }

    render() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.level && this.renderPrep) {
            var offsetX = this.canvas.width / 2 - this.player.x;
            var offsetY = this.canvas.height / 2 - this.player.y;
            line.offsetX = offsetX;
            line.offsetY = offsetY;

            if (this.player.dead) {
                let scale = Math.min(3, 1 + this.deathFrame / 50);
                this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
                this.ctx.rotate(d2r(this.deathFrame / 5));
                this.ctx.scale(scale, scale);
                this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
            }

            //console.log([offsetX, offsetY]);

            for (var i = 0; i < this.level.height; i++) {
                for(var j = 0; j < this.level.width ; j++) {
                    var tile = this.level.data[i * this.level.width + j];
                    if (tile === 1) {
                        this.ctx.drawImage(this.images.tiles.wall, offsetX + j * 32, offsetY + i * 32);
                    } else if (tile === 2) {
                        this.ctx.drawImage(this.images.tiles.floor, offsetX + j * 32, offsetY + i * 32);
                    }

                    this.ctx.font = '12px serif';
                    this.ctx.fillStyle = 'white';
                    //this.ctx.fillText(this.routes[i * this.level.width + j], offsetX + j * 32 + 4, offsetY + i * 32 + 4);
                }
            }

            this.ctx.drawImage(this.images.player, offsetX + this.player.x - 3, offsetY + this.player.y - 2);

            this.enemies.forEach(enemy => {
                this.ctx.drawImage(this.images.enemy, offsetX + enemy.x, offsetY + enemy.y);
            });

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
            this.losEdges.forEach(edge => {
                this.ctx.save();
                this.ctx.globalAlpha = 0.5;
                this.ctx.strokeStyle = 'yellow';
                this.ctx.setLineDash([4, 2]);
                this.ctx.beginPath();
                this.ctx.moveTo(offsetX + edge.p1.x, offsetY + edge.p1.y);
                this.ctx.lineTo(offsetX + edge.p2.x, offsetY + edge.p2.y);
                this.ctx.stroke();
                this.ctx.restore();
            });

            this.losCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (this.player.dead) {
                let opacity = Math.max(0, 0.8 - this.deathFrame / 40);
                this.losCtx.fillStyle = 'rgba(0, 0, 0, ' + opacity + ')';
                this.losCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else {
                this.losCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.losCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                this.friendlySight.forEach((triangle, idx) => {
                    this.losCtx.save();
                    this.losCtx.fillStyle = 'white';
                    this.losCtx.beginPath();
                    this.losCtx.moveTo(line.offsetX + triangle[0].x, line.offsetY + triangle[0].y);
                    this.losCtx.lineTo(line.offsetX + triangle[1].x, line.offsetY + triangle[1].y);
                    this.losCtx.lineTo(line.offsetX + triangle[2].x, line.offsetY + triangle[2].y);
                    this.losCtx.closePath();
                    this.losCtx.fill();
                    this.losCtx.font = '20px serif';
                    this.losCtx.fillStyle = 'white';
                    this.losCtx.fillText(idx, line.offsetX + triangle[1].x, line.offsetY + triangle[1].y + 15);
                    this.losCtx.restore();
                });

                this.losCtx.save();
                var px = line.offsetX + this.player.x;
                var py = line.offsetY + this.player.y;
                var gradient = this.losCtx.createRadialGradient(px, py, 1, px, py, 32+16);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.losCtx.arc(px, py, 32+16, 0, 2 * Math.PI);
                this.losCtx.fillStyle = gradient;
                this.losCtx.fill();
                this.losCtx.restore();
            }

            // Blit visibility
            this.ctx.save();
            // lighten, multiply, darken, source-in
            this.ctx.globalCompositeOperation = 'darken';
            this.ctx.drawImage(this.losCanvas, 0, 0);
            this.ctx.restore();

            if (!this.player.dead) {
                //console.log([this.player.x, this.player.y, this.crosshair.x, this.crosshair.y]);
                // crosshair
                line(this.ctx, 'red',
                    { x: offsetX + this.crosshair.x, y: offsetY + this.crosshair.y },
                    { x: offsetX + this.crosshair.x + 2, y: offsetY + this.crosshair.y +2 });
                line(this.ctx, 'red',
                    { x: offsetX + this.crosshair.x + 1, y: offsetY + this.crosshair.y },
                    { x: offsetX + this.crosshair.x + 3, y: offsetY + this.crosshair.y +2 });

                //line(this.ctx, 'yellow', { x: this.player.x, y: this.player.y }, { x: kx, y: ky });
            }

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
                this.ctx.font = '' + size + 'px serif';
                let x = this.canvas.width / 2 - this.ctx.measureText('YOU ARE DEAD').width / 2;
                this.ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
                this.ctx.fillText('YOU ARE DEAD', x, this.canvas.height / 2);
            }
        }

        if (this.menu) {
            this.menu.render();
        }
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
        this.openMenu(this.startMenu);
        window.requestAnimationFrame(this.frame.bind(this));
    }

    loadAsset(src) {
        const img = new Image(8, 5);
        img.src = src;
        return img;
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
            let enemy = new Enemy();
            enemy.x = enemyData.x;
            enemy.y = enemyData.y;
            this.enemies.push(enemy);
        });

        console.log("loaded " + this.levelIndex);
        this.renderPrep = false;
    }

    // Warning: brute force incoming...
    //
    // Given a tiled level, precalculate a set of wall-floor "edges". More generally,
    // an "edge" is a straight line that divides a non-vision-blocking area from a
    // vision-blocking area.
    //
    // Approach: loop through every single tile, looking for "floors" (non-vision-blocking
    // areas). For every floor tile, check all 4 directions for walls - any wall
    // is added as an edge.
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

        /*Object.keys(edges).forEach(junct => {
            if (edges[junct].length === 2) {
                var a = edges[junct][0];
                var b = edges[junct][1];
                if (a[0] === b[2] && a[1] === b[3]) {
                    edges[junct] = [b[0],
                if (a.type === b.type) {
                    if (a[0] ===
                }
            }
        });*/

        // let's print em
        console.log(edges);
        this.losEdges = Object.keys(edges).map(k => ({ p1: { x: edges[k][0], y: edges[k][1] }, p2: { x: edges[k][2], y: edges[k][3] } }));
        console.log(this.losEdges);
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

    calculateVisibility(origin, facing, coneAngle) {
        let edges = this.losEdges;
        let startAngle = dw(facing - coneAngle / 2);
        let endAngle = dw(facing + coneAngle / 2);

        // This "fudge factor" moves the LOS origin slightly behind the player.
        /*origin = {
            x: origin.x - Math.cos(r2d(facing)) * 2,
            y: origin.y - Math.sin(r2d(facing)) * 2
        };*/

        let angles = [startAngle, endAngle];
        for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            var angle = r2d(Math.atan2(edge.p1.y - origin.y, edge.p1.x - origin.x));
            if (Util.angleWithin(angle, startAngle, endAngle)) {
                angles.push(angle);
                if (angle - 2 >= startAngle) {
                    angles.push(angle - 2);
                }
                if (angle + 2 <= endAngle) {
                    angles.push(angle + 2);
                }
            }
        }

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

        for(i = 0; i < angles.length; i++) {
            if (angles[i] === lastAngle) continue;
            lastAngle = angles[i];

            let ray = {
                x: origin.x + Math.cos(d2r(angles[i])) * 1000,
                y: origin.y + Math.sin(d2r(angles[i])) * 1000
            }

            for (let j = 0; j < edges.length; j++) {
                let inter = this.intersection({ p1: origin, p2: ray }, edges[j]);
                if (inter) {
                    ray = inter;
                    line(this.ctx, 'green', { x: inter.x - 6, y: inter.y - 6 }, { x: inter.x + 6, y: inter.y + 6 }, true);
                    line(this.ctx, 'green', { x: inter.x - 6, y: inter.y + 6 }, { x: inter.x + 6, y: inter.y - 6 }, true);
                }
            }

            line(this.ctx, 'blue', origin, ray, true);

            if (lastp) {
                triangles.push([origin, lastp, ray]);
            }

            lastp = ray;
        }

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

                if (this.input.keys[71]) {
                    this.input.keys[71] = undefined;
                    console.log(angles);
                    console.log(angles.sort());
                    console.log(triangles);
                }

        /*
        for (var i = 0; i < coneAngle; i++) {
            let angle = startAngle + i;

            let ray = {
                x: origin.x + Math.cos(d2r(angle)) * 150,
                y: origin.y + Math.sin(d2r(angle)) * 150
            };

            for (let j = 0; j < edges.length; j++) {
                let inter = this.intersection({ p1: origin, p2: ray }, edges[j]);
                if (inter) {
                    ray = inter;
                    line(this.ctx, 'green', { x: inter.x - 2, y: inter.y - 2 }, { x: inter.x + 2, y: inter.y + 2 }, true);
                    line(this.ctx, 'green', { x: inter.x - 2, y: inter.y + 2 }, { x: inter.x + 2, y: inter.y - 2 }, true);
                }
            }

            line(this.ctx, 'blue', origin, ray, true);
        }*/

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
                c += 50;
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
