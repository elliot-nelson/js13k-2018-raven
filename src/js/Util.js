const Util = {
    //
    // Various math helpers
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

    // cos (degrees)
    cos(d) {
        return Math.cos(Util.d2r(d));
    },

    // sin (degrees)
    sin(d) {
        return Math.sin(Util.d2r(d));
    },

    // radians to degrees
    r2d(r) {
        return Math.floor(r * 3600 / Math.PI / 2) / 10;
    },

    // degrees 2 radians
    d2r(d) {
        return d * Math.PI * 2 / 360;
    },

    // Return true if given angle is "between" (clockwise) two other angles
    angleWithin(angle, b1, b2) {
        return dw(angle - b1) < dw(b2 - b1);
    },

    // rand floor
    rf(x) {
        return Math.floor(Math.random() * x);
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

    pointInBounds(p, bounds, fudge) {
        fudge = fudge || 0;
        let a = bounds.p1.x, b = bounds.p2.x, c = bounds.p1.y, d = bounds.p2.y;
        if (a > b) [a, b] = [b, a];
        if (c > d) [c, d] = [d, c];
        return p.x >= a - fudge && p.x <= b + fudge && p.y >= c - fudge && p.y <= d + fudge;
    },

    // Calculating visibility


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

            if (Util.pointInBounds(p, line1, 1) && Util.pointInBounds(p, line2, 1)) {
                return p;
            }
        }
    },

    getVisCone(origin, facing, coneAngle, offset, backwalk) {
        // Get pre-calculated visibility edges
        let edges = game.losEdges;

        // Add in dynamic visibility edges
        game.doors.forEach(door => edges = edges.concat(door.getLosEdges()));

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

        let polygon = [];

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
            polygon.unshift(ray);
            polygon.push(source);

            angle += sweep;
        }

        return [polygon];
    },

    getVisBounds(bounds) {
        return [
            { x: bounds.p1.x, y: bounds.p1.y },
            { x: bounds.p2.x, y: bounds.p1.y },
            { x: bounds.p2.x, y: bounds.p2.y },
            { x: bounds.p1.x, y: bounds.p2.y }
        ];
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
