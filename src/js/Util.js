const Util = {
    //
    // Angles
    //

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

    pointNearPoint(p1, p2, range) {
        return (distance(p1, p2) <= range);
    },

    // Return true if point is inside given triangle.
    // This is the barycentric coordinate check.
    pointInTriangle(p, t1, t2, t3) {
        var d = (t2.y - t3.y) * (t1.x - t3.x) + (t3.x - t2.x) * (t1.y - t3.y);
        var a = ((t2.y - t3.y) * (p.x - t3.x) + (t3.x - t2.x) * (p.y - t3.y)) / d;
        var b = ((t3.y - t1.y) * (p.x - t3.x) + (t1.x - t3.x) * (p.y - t3.y)) / d;
        var c = 1 - a - b;

        return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
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
    }
}
