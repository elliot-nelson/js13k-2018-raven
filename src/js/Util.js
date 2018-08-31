const Util = {
    //
    // Angles
    //

    atan(y, x) {
        return Util.r2d(Math.atan2(y, x));
    },

    atanPoints(p1, p2) {
        return Util.atan(p2.y - p1.y, p2.x - p1.x);
    },

    atanEdge(edge) {
        return Util.atanPoints(edge.p1, edge.p2);
    },

    normalAngle(edge) {
        // This function works only for edges that are clockwise (floor on left). We
        // take pains throughout to make sure we save edges this way so we can make
        // this assumption.
        return (Util.atanEdge(edge) + 90) % 360;
    },

    cos(d) {
        return Math.cos(Util.d2r(d));
    },

    sin(d) {
        return Math.sin(Util.d2r(d));
    },

    r2d(r) {
        return Math.floor(r * 3600 / Math.PI / 2) / 10;
    },

    d2r(d) {
        return d * Math.PI * 2 / 360;
    },

    // Return true if given angle is "between" (clockwise) two other angles
    angleWithin(angle, b1, b2) {
        return dw(angle - b1) < dw(b2 - b1);
    },

    //
    // Points
    //

    distance(p1, p2) {
        return Math.sqrt(Util.distfast(p1, p2));
    },

    distfast(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return dx * dx + dy * dy;
    },

    pointNearPoint(p1, p2, range) {
        return (Util.distance(p1, p2) <= range);
    },

    // Return true if point is inside given triangle. This particular version
    // is an implementation of the barycentric coordinate check.
    pointInTriangle(p, t1, t2, t3) {
        var d = (t2.y - t3.y) * (t1.x - t3.x) + (t3.x - t2.x) * (t1.y - t3.y);
        var a = ((t2.y - t3.y) * (p.x - t3.x) + (t3.x - t2.x) * (p.y - t3.y)) / d;
        var b = ((t3.y - t1.y) * (p.x - t3.x) + (t1.x - t3.x) * (p.y - t3.y)) / d;
        var c = 1 - a - b;

        return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
    },

    pointSpottedXY(x, y) {
        for (let i = 0; i < game.vision.length; i++) {
            if (Util.pointInPolygon({ x: x, y: y }, game.vision[i])) return true;
        }
        return false;

        // ---

        let ptr = Math.floor(y + game.offset.y) * game.canvas.width +
                  Math.floor(x + game.offset.x);

        // If the green channel in the los canvas is non-zero, this entity is
        // visible to the player. (Technically any channel will do, but alpha
        // is not reliable and red is used during death animations, so we'll go
        // with green).
        return game.losData.data[ptr * 4 + 1] > 0;
    },

    entitySpotted(entity) {
        let dx = entity.width / 2;
        let dy = entity.height / 2;

        // 5 point check (center, each corner)
        return Util.pointSpottedXY(entity.x, entity.y) ||
            Util.pointSpottedXY(entity.x - dx, entity.y - dy) ||
            Util.pointSpottedXY(entity.x + dx, entity.y + dy) ||
            Util.pointSpottedXY(entity.x - dx, entity.y + dy) ||
            Util.pointSpottedXY(entity.x + dx, entity.y - dy);

        /*for(let i = 0; i < game.friendlySight.length; i++) {
            if (Util.pointInTriangle(entity, ...game.friendlySight[i])) {
                return true;
            }
        }*/
    },

    // Return true if the given point is within the specified polygon. This algorithm
    // is a simple even-odd check.
    //
    // See:
    //   https://en.wikipedia.org/wiki/Even%E2%80%93odd_rule
    //   https://www.geeksforgeeks.org/how-to-check-if-a-given-point-lies-inside-a-polygon/
    //
    pointInPolygon(p, polygon) {
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i++) {
            if ((polygon[i].y > p.y) != (polygon[j].y > p.y) &&
                p.x < polygon[i].x + (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y))
                inside = !inside;
        }

        return inside;
    },

    pointInBounds(p, bounds) {
        return (p.x >= bounds.left && p.x <= bounds.right && p.y >= bounds.top && p.y <= bounds.bottom);
    },

    //
    // Map-related
    //

    tileAtUV(u, v) {
        return game.level.data[v * game.level.width + u];
    },

    tileAtXY(x, y) {
        return Util.tileAtUV(Math.floor(x / 32), Math.floor(y / 32));
    },

    wallAtUV(u, v) {
        return Util.tileAtUV(u, v) !== 2;
    },

    wallAtXY(x, y) {
        return Util.wallAtUV(Math.floor(x / 32), Math.floor(y / 32));
    },

    boundEntityWall(entity) {
        if (Util.wallAtXY(entity.x - entity.width / 2, entity.y)) {
            entity.x += 32 - ((entity.x - entity.width / 2) % 32);
        }

        if (Util.wallAtXY(entity.x + entity.width / 2, entity.y)) {
            entity.x -= ((entity.x + entity.width / 2) % 32);
        }

        if (Util.wallAtXY(entity.x, entity.y - entity.height / 2)) {
            entity.y += 32 - ((entity.y - entity.height / 2) % 32);
        }

        if (Util.wallAtXY(entity.x, entity.y + entity.height / 2)) {
            entity.y -= ((entity.y + entity.height / 2) % 32);
        }
    },

/*
    // Random number generator.
    // https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
    Alea(seed) {
        if(seed === undefined) {seed = +new Date() + Math.random();}
        function Mash() {
            var n = 4022871197;
            return function(r) {
                let f;
                for(var t, s, u = 0, e = 0.02519603282416938; u < r.length; u++)
                s = r.charCodeAt(u), f = (e * (n += s) - (n*e|0)),
                n = 4294967296 * ((t = f * (e*n|0)) - (t|0)) + (t|0);
                return (n|0) * 2.3283064365386963e-10;
            }
        }
        return function() {
            var m = Mash(), a = m(" "), b = m(" "), c = m(" "), x = 1, y;
            seed = seed.toString(), a -= m(seed), b -= m(seed), c -= m(seed);
            a < 0 && a++, b < 0 && b++, c < 0 && c++;
            return function() {
                var y = x * 2.3283064365386963e-10 + a * 2091639; a = b, b = c;
                return c = y - (x = y|0);
            };
        }();
    },
*/
    renderTogglePrompt(x, y) {
        let radius = (game.framems % 1000 < 500 ? 4 : 6);
        game.ctx.fillStyle = 'rgba(204, 204, 204, 168)';
        game.ctx.strokeStyle = 'rgba(204, 204, 204, 168)';
        game.ctx.beginPath();
        game.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        game.ctx.fill();
        game.ctx.beginPath();
        game.ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
        game.ctx.stroke();
    }
}
