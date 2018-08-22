const Util = {
    // Return true if given angle is "between" (clockwise) two other angles
    angleWithin(angle, b1, b2) {
        return dw(angle - b1) < dw(b2 - b1);
    },

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

    pixelInWall(x, y) {
        return Util.tileInWall(Math.floor(x / 32), Math.floor(y / 32));
    },

    tileInWall(u, v) {
        return game.level.data[v * game.level.width + u] !== 2;
    },

    pixelInFloor(x, y) {
        var u = Math.floor(x / 32);
        var v = Math.floor(y / 32);
        return game.level.data[v * game.level.width + u] !== 2;
    },

    boundEntityWall(entity) {
        if (Util.pixelInWall(entity.x - entity.width / 2, entity.y)) {
            entity.x += 32 - ((entity.x - entity.width / 2) % 32);
        }

        if (Util.pixelInWall(entity.x + entity.width / 2, entity.y)) {
            entity.x -= ((entity.x + entity.width / 2) % 32);
        }

        if (Util.pixelInWall(entity.x, entity.y - entity.height / 2)) {
            entity.y += 32 - ((entity.y - entity.height / 2) % 32);
        }

        if (Util.pixelInWall(entity.x, entity.y + entity.height / 2)) {
            entity.y -= ((entity.y + entity.height / 2) % 32);
        }
    }
};
