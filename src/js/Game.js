
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

        // Load
        this.images = {
            player: this.loadAsset('assets/player.png'),
            enemy: this.loadAsset('assets/enemy.png'),
            tiles: {
                floor: this.loadAsset('assets/floor.png'),
                wall: this.loadAsset('assets/wall.png')
            }
        };

        this.input = new Input({
            mouselock: this.toggleMouseLock.bind(this),
            mousemove: this.onMouseMove.bind(this)
        }).init();

        this.framems = 0;
        this.player = new Player();
        this.player.input = this.input;
        this.enemies = [
        ];

        this.crosshair = {
            x: 0,
            y: 0
        };

        this.mouselocked = false;
        document.addEventListener('pointerlockchange', this.onMouseLock.bind(this));
        document.addEventListener('mozpointerlockchange', this.onMouseLock.bind(this));
        document.addEventListener('webkitpointerlockchange', this.onMouseLock.bind(this));

        return this;
    }

    update(delta) {
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

        this.friendlySight = this.calculateVisibility(this.player, this.facing, 60);

        this.updatePathRoutes();

        this.enemies.forEach(enemy => enemy.update(delta));
        this.enemies.forEach(enemy => Util.boundEntityWall(enemy));

        //console.log([this.crosshair.x,this.crosshair.y,this.facing]);
    }

    render() {
        var offsetX = this.canvas.width / 2 - this.player.x;
        var offsetY = this.canvas.height / 2 - this.player.y;
        line.offsetX = offsetX;
        line.offsetY = offsetY;

        //console.log([offsetX, offsetY]);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (var i = 0; i < this.level.width; i++) {
            for(var j = 0; j < this.level.height; j++) {
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

        this.friendlySight.forEach((triangle, idx) => {
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
        this.load(LevelCache[0]);
        this.framems = performance.now();
        window.requestAnimationFrame(this.frame.bind(this));
    }

    loadAsset(src) {
        const img = new Image(8, 5);
        img.src = src;
        return img;
    }

    toggleMouseLock() {
        if (this.mouselocked) {
            document.exitPointerLock();
        } else {
            this.canvas.requestPointerLock();
        }
    }

    onMouseLock() {
        if (document.pointerLockElement === this.canvas) {
            this.mouselocked = true;
        } else {
            this.mouselocked = false;
        }
        console.log(["mouselocked", this.mouselocked]);
    }

    onMouseMove(deltaX, deltaY) {
        this.crosshair.x += deltaX;
        this.crosshair.y += deltaY;
    }

    load(level) {
        this.level = Object.assign({}, level);
        this.level.data = this.level.data.slice(0);

        let eb = this.level.enterBounds;
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
