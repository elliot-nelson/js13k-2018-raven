const glob = require("glob");

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
            name: raw.properties.LevelName,
            enemies: [],
            cameras: [],
            terminals: [],
            width: width,
            height: height,
            data: terrainLayer.data
        };

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
                    facing: object.properties.Facing
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
                }
            }
        }

        level.enterBounds = enterBounds;
        level.exitBounds = exitBounds;

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
    }
};

module.exports = levelPacker;
