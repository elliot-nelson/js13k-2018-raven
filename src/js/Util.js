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

    // Return true if point is inside given triangle. This particular version
    // is an implementation of the barycentric coordinate check.
    pointInTriangle(p, t1, t2, t3) {
        var d = (t2.y - t3.y) * (t1.x - t3.x) + (t3.x - t2.x) * (t1.y - t3.y);
        var a = ((t2.y - t3.y) * (p.x - t3.x) + (t3.x - t2.x) * (p.y - t3.y)) / d;
        var b = ((t3.y - t1.y) * (p.x - t3.x) + (t1.x - t3.x) * (p.y - t3.y)) / d;
        var c = 1 - a - b;

        return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
    },

    entitySpotted(entity) {
        // 5-point check
        let offsets = [
            [0, 0],
            [-entity.width / 2, -entity.height / 2],
            [entity.width / 2, -entity.height / 2],
            [-entity.width / 2, entity.height / 2],
            [entity.width / 2, entity.height / 2]
        ];

        for (let i = 0; i < offsets.length; i++) {
            let ptr = Math.floor(entity.y + game.offset.y + offsets[i][1]) * game.canvas.width +
                      Math.floor(entity.x + game.offset.x + offsets[i][0]);
            // If the green channel in the los canvas is non-zero, this entity is
            // visible to the player. (Technically any channel will do, but alpha
            // is not reliable and red is used during death animations, so we'll go
            // with green).
            if (game.losData.data[ptr * 4 + 1] > 0) {
                return true;
            }
        }

        return false;

        /*for(let i = 0; i < game.friendlySight.length; i++) {
            if (Util.pointInTriangle(entity, ...game.friendlySight[i])) {
                return true;
            }
        }*/
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
