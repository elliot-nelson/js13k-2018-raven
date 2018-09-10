const glob = require('glob');
const util = require('util');
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
        //const string = JSON.stringify(levels, undefined, 2);
        const string = util.inspect(levels, { depth: null });

        return "const LevelCache = " + string + ";\n" +
            "LevelCache.outro = " + JSON.stringify(LevelMetadata.outro) + ";\n";
    },

    pack: function (filename) {
        const raw = require("./" + filename);
        let terrainLayer, metaLayer, objectsLayer;

        // We expect each level to have layers with these exact names
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

        // The first thing we want to do is calculate the minimum width and height of the level
        // data in the Tiled map (for ease of editing, I create all the levels in the middle of a
        // 100x100 map, but we don't need all that cruft in the game!)

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

        // After determining the new width and height, we need to translate all layers to new coords
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

        // Process the objects in the objects layer, inserting them into the appropriate
        // collections as we go.
        for (let i = 0; i < objectsLayer.objects.length; i++) {
            let object = objectsLayer.objects[i];
            if (object.type === "enemy") {
                let enemy = {
                    x: object.x,
                    y: object.y
                };
                if (object.properties) {
                    if (object.properties.Wake) enemy.wake = object.properties.Wake;
                    if (object.properties.WakeRadius) enemy.wakeRadius = parseInt(object.properties.WakeRadius, 10);
                    if (object.properties.PatrolDX) enemy.patrolDX = parseInt(object.properties.PatrolDX, 10);
                    if (object.properties.PatrolDY) enemy.patrolDY = parseInt(object.properties.PatrolDY, 10);
                    if (object.properties.PatrolStart) enemy.patrolStart = parseInt(object.properties.PatrolStart, 10);
                }
                level.enemies.push(enemy);
            }
            if (object.type === "camera") {
                level.cameras.push({
                    u: Math.floor(object.x / 32),
                    v: Math.floor(object.y / 32),
                    control: object.properties.Control,
                    facing: parseFloat(object.properties.Facing),
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

        // Process the tiles in the "meta" layer (currently, meta tiles are doors, enter, or
        // exit markers). Technically, I designed the enter and exit areas to allow any size (like 2x3
        // or 4x2) and the game will respect it, but the doors are hard-coded to be 2x1 tiles, so
        // there's not much use for that flexibility atm.
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
                    let door;
                    if (metaLayer.data[i * width + j + 1] === 7) {
                        door = {
                            u: j,
                            v: i,
                            type: 'h'
                        };
                    } else if (metaLayer.data[(i + 1) * width + j] === 7) {
                        door = {
                            u: j,
                            v: i,
                            type: 'v'
                        };
                    }
                    if (door) {
                        // Kind of backed myself into this one... I ended up wanting to know
                        // what "type" of door I'm interacting with. Figure it out based on
                        // what tiles are near.
                        if (metaLayer.data[i * width + j + 1] === 4 ||
                            metaLayer.data[i * width + j - 1] === 4 ||
                            metaLayer.data[(i + 1) * width + j] === 4 ||
                            metaLayer.data[(i - 1) * width + j] === 4) {
                            door.exitDoor = true;
                        } else {
                            door.entranceDoor = true;
                        }
                        level.doors.push(door);
                    }
                }
            }
        }

        level.enter = {
            p1: { x: enterBounds.left, y: enterBounds.top },
            p2: { x: enterBounds.right, y: enterBounds.bottom }
        };
        level.exit = {
            p1: { x: exitBounds.left, y: exitBounds.top },
            p2: { x: exitBounds.right, y: exitBounds.bottom }
        };

        // The "clean up step". Level data is repeated quite a few times, so
        // maybe we'll save ourselves a few measly bytes by shortening the
        // names of our level cache properties...

        level.d = level.doors;
        delete level.doors;
        // Hack: door.type isn't implemented right now (it's always "h"), so
        // let's just cut it.
        level.d.forEach(door => { delete door.type; });

        level.e = level.enemies;
        delete level.enemies;

        level.t = level.terminals;
        delete level.terminals;

        level.c = level.cameras;
        delete level.cameras;

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
     *
     * Basically I'm being super weird in this function, as it's kinda-sorta just base64,
     * but I'm optimizing for the level domain. I want to print only characters with zero
     * side effects, which means:
     *     35-91 (avoiding 34=" and 92=\)
     *     93-123 (avoiding 92=\, 123 is just the highest multiple)
     *
     * I give myself 0-7 for the tile value, and add (8 * number of tiles), subtracting
     * 1 because I don't need a 0 length run. That lets me pack up to 11 tiles into 1 byte,
     * with no "double-byte" processing nonsense, and no binary-to-ascii back and forth.
     *
     * Having it be totally custom kind of sucks, but this seems to be the best bang for my
     * buck with the smallest possible unpacking code (every LOC you need to unpack on the
     * other side eats into your packing savings...).
     *
     * NOTE: Obviously, any edits to this function must also be reflected in Game._unpackData()!
     */
    packData(data) {
        let result = [];

        let a = data[0], l = 1, byte;
        for (let i = 1; i < data.length; i++) {
            b = data[i];

            if (a > 7) throw new Error("cannot pack level: tile value>7");

            if (b === a && l < 11) {
                l++;
                continue;
            }

            // Yes, this is kind of unorthodox, it would make the most sense to pack into
            // bits, like `((l<<3)+a)`, and then perhaps convert the binary string into
            // a Base64 string and read it. In this case I'm optimizing for simplicity/least
            // code in the level reading logic.
            byte = 35 + (l - 1) * 8 + a;
            if (byte >= 92) byte++;
            result.push(String.fromCharCode(byte));
            a = b;
            l = 1;
        }
        byte = 35 + (l - 1) * 8 + a;
        if (byte >= 92) byte++;
        result.push(String.fromCharCode(byte));

        return result.join('');
    }
};

module.exports = levelPacker;
