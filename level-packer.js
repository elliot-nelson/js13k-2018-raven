const glob = require('glob');
const LevelMetadata = require('./level-metadata');

/**
 * The level packer takes JSON levels, exported by Tiled, and converts them into
 * our game-specific level format. I suppose this insulates the game code a little
 * bit from our reliance on a third-party tool, but mostly it's just to get our
 * level data as small as possible.
 */
const levelPacker = {
    packAll: function (levelGlob) {
        const levels = glob.sync(levelGlob).map(filename => levelPacker.pack(filename));
        return "const LevelCache = " + JSON.stringify(levels, undefined, 2) + ";\n";
    },
    pack: function (filename) {
        const raw = require("./" + filename);
        let terrainLayer, metaLayer, objectsLayer;

        for (let i = 0;  i < raw.layers.length; i++) {
            if (raw.layers[i].name === 'Terrain') {
                terrainLayer = raw.layers[i];
            } else if (raw.layers[i].name === 'Meta') {
                metaLayer = raw.layers[i];
            } else if (raw.layers[i].name === 'Objects') {
                objectsLayer = raw.layers[i];
            } else {
                throw new Error('Invalid layer name ' + raw.layers[i].name);
            }
        }
        if (!terrainLayer || !metaLayer || !objectsLayer) {
            throw new Error('Missing required layer');
        }

        let width = terrainLayer.width;
        let height = terrainLayer.height;

        const tileBounds = {
            top: terrainLayer.height,
            bottom: 0,
            left: terrainLayer.width,
            right: 0
        };

        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (terrainLayer.data[i * width + j] > 0) {
                    tileBounds.top = Math.min(tileBounds.top, i);
                    tileBounds.bottom = Math.max(tileBounds.bottom, i);
                    tileBounds.left = Math.min(tileBounds.left, j);
                    tileBounds.right = Math.max(tileBounds.right, j);
                }
            }
        }

        width = tileBounds.right - tileBounds.left + 1;
        height = tileBounds.bottom - tileBounds.top + 1;

        terrainLayer = levelPacker.cropLayer(terrainLayer, tileBounds.left, tileBounds.top, width, height);
        metaLayer = levelPacker.cropLayer(metaLayer, tileBounds.left, tileBounds.top, width, height);
        objectsLayer = levelPacker.cropLayer(objectsLayer, tileBounds.left, tileBounds.top, width, height);

        const level = {
            enemies: [],
            cameras: [],
            terminals: [],
            doors: [],
            width: width,
            height: height,
            data: levelPacker.packData(terrainLayer.data)
        };
        let short = filename.match(/\/([^/]*)\.json/)[1];
        Object.assign(level, LevelMetadata[short]);

        const enterBounds = {
            top: terrainLayer.height * 32,
            bottom: 0,
            left: terrainLayer.width * 32,
            right: 0
        };

        const exitBounds = {
            top: terrainLayer.height * 32,
            bottom: 0,
            left: terrainLayer.width * 32,
            right: 0
        };

        for (let i = 0; i < objectsLayer.objects.length; i++) {
            let object = objectsLayer.objects[i];
            if (object.type === "enemy") {
                level.enemies.push({
                    x: object.x,
                    y: object.y
                });
            }
            if (object.type === "camera") {
                level.cameras.push({
                    u: Math.floor(object.x / 32),
                    v: Math.floor(object.y / 32),
                    control: object.properties.Control,
                    facing: object.properties.Facing,
                    enabled: object.properties.Enabled === 'true'
                });
            }
            if (object.type === "terminal") {
                level.terminals.push({
                    u: Math.floor(object.x / 32),
                    v: Math.floor(object.y / 32),
                    control: object.properties.Control
                });
            }
        }

        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (metaLayer.data[i * width + j] === 3) {
                    enterBounds.top = Math.min(enterBounds.top, i * 32);
                    enterBounds.bottom = Math.max(enterBounds.bottom, i * 32 + 32);
                    enterBounds.left = Math.min(enterBounds.left, j * 32);
                    enterBounds.right = Math.max(enterBounds.right, j * 32 + 32);
                } else if (metaLayer.data[i * width + j] === 4) {
                    exitBounds.top = Math.min(exitBounds.top, i * 32);
                    exitBounds.bottom = Math.max(exitBounds.bottom, i * 32 + 32);
                    exitBounds.left = Math.min(exitBounds.left, j * 32);
                    exitBounds.right = Math.max(exitBounds.right, j * 32 + 32);
                } else if (metaLayer.data[i * width + j] === 7) {
                    if (metaLayer.data[i * width + j + 1] === 7) {
                        level.doors.push({
                            u: j,
                            v: i,
                            type: 'h'
                        });
                    } else if (metaLayer.data[(i + 1) * width + j] === 7) {
                        level.doors.push({
                            u: j,
                            v: i,
                            type: 'v'
                        });
                    }
                }
            }
        }

        level.enterBounds = {
            p1: { x: enterBounds.left, y: enterBounds.top },
            p2: { x: enterBounds.right, y: enterBounds.bottom }
        };
        level.exitBounds = {
            p1: { x: exitBounds.left, y: exitBounds.top },
            p2: { x: exitBounds.right, y: exitBounds.bottom }
        };

        return level;
    },
    /**
     * Return a new copy of the provided layer, where all tiles and objects
     * are repositioned to reflect a "cropped" level based on the provided
     * tile offset, width, and height.
     */
    cropLayer: function (layer, u, v, width, height) {
        let data;
        let objects;

        if (layer.data) {
            data = [];
            for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                    data[i * width + j] = layer.data[(i + v) * layer.width + j + u];
                }
            }
        }

        if (layer.objects) {
            objects = layer.objects.map(object => {
                return Object.assign({}, object, {
                    x: object.x - u * 32,
                    y: object.y - v * 32
                });
            });
        }

        return Object.assign({}, layer, {
            data: data,
            objects: objects
        });
    },
    /**
     * Smash up data as small as possible. Assumes that we have a max of EIGHT possible
     * tiles, freeing up remaining bits for length vars.
     */
    packData(data) {
        let result = [];

        let a = data[0], l = 1;
        for (let i = 1; i < data.length; i++) {
            b = data[i];

            if (a > 7) throw new Error("cannot pack level: byte>7");

            if (b === a && l < 7) {
                l++;
                continue;
            }

            // Yes, this is kind of unorthodox, it would make the most sense to pack into
            // bits, like `((l<<3)+a)`, and then perhaps convert the binary string into
            // a Base64 string and read it. In this case I'm optimizing for simplicity/least
            // code in the level reading logic.
            result.push(String.fromCharCode(35 + (l - 1) * 8 + a));
            a = b;
            l = 1;
        }
        result.push(String.fromCharCode(35 + (l - 1) * 8 + a));

        return result.join('');
    }
};

module.exports = levelPacker;
