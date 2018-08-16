const glob = require("glob");

const levelPacker = {
    packAll: function (levelGlob) {
        const levels = glob.sync(levelGlob).map(filename => levelPacker.pack(filename));
        return "const LevelCache = " + JSON.stringify(levels, undefined, 2) + ";\n";
    },
    pack: function (filename) {
        const raw = require("./" + filename);
        const level = {
            name: raw.properties.LevelName,
            player: { x: 0, y: 0 },
            enemies: [],
            width: raw.layers[0].width,
            height: raw.layers[0].height,
            data: raw.layers[0].data
        };

        for (let i = 0; i < raw.layers[1].objects.length; i++) {
            let object = raw.layers[1].objects[i];
            if (object.type === "player") {
                level.player = {
                    x: object.x,
                    y: object.y
                };
            }
            if (object.type === "enemy") {
                level.enemies.push({
                    x: object.x,
                    y: object.y
                });
            }
        }

        return level;
    }
};

module.exports = levelPacker;
