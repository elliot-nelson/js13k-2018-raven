const glob = require("glob");

if (typeof btoa === 'undefined') {
  global.btoa = function (str) {
    return new Buffer(str, 'binary').toString('base64');
  };
}

if (typeof atob === 'undefined') {
  global.atob = function (b64Encoded) {
    return new Buffer(b64Encoded, 'base64').toString('binary');
  };
}

var level01 = require("./src/levels/level01.json");

function pack(tiledLevel) {
    var result = {
        n: tiledLevel.properties.LevelName,
        p: [0, 0],
        e: [],
        w: tiledLevel.layers[0].width,
        h: tiledLevel.layers[0].height
    };

    for (i = 0; i < tiledLevel.layers[1].objects.length; i++) {
        var object = tiledLevel.layers[1].objects[i];
        if (object.type === "player") {
            result.p = [object.x, object.y];
        }
        if (object.type === "enemy") {
            result.e.push([object.x, object.y]);
        }
    }

    var data = "";
    var a = tiledLevel.layers[0].data[0];
    var b;
    var l = 1;
    var c = String.fromCharCode;
    for (var i = 1; i < tiledLevel.layers[0].data.length; i++) {
        b = tiledLevel.layers[0].data[i];

        if (a > 127) throw new Error("invalid level: byte>127");

        if (b === a && l < 8191) {
            l++;
            continue;
        }

        if (l === 1) {
            data += c(a);
        } else if (l === 2) {
            data += c(a) + c(a);
        } else if (l < 64) {
            data += c(128 | l);
            data += c(a);
        } else {
            data += c(128 | 64 | (l >> 8));
            data += c(l & 255);
            data += c(a);
        }

        a = b;
        l = 1;
    }

    console.log(data);
    console.log(new Buffer(data, "binary").toString("base64"));
    result.data = btoa(data);

    return result;
}

function unpack(level) {
    var result = {
        name: level.n,
        width: level.w,
        height: level.h,
        player: { x: level.p[0], y: level.p[1] },
        enemies: level.enemies.map(e => { x: e[0], y: e[1] })
    };
    var source = atob(result.data);
    var data = [];
    var value;

    for (var i = 0; i < source.length; i++) {
        value = source.charCodeAt(i);
        if (value < 128) {
            data.push(value);
        } else if (
        if (source[i]
    }

    result.data = data;

    return result;
}

function packFromTilemap(level) {
}

const levelPacker = {
    pack: function (filename) {

        return {
    var result = {
        n: tiledLevel.properties.LevelName,
        p: [0, 0],
        e: [],
        w: tiledLevel.layers[0].width,
        h: tiledLevel.layers[0].height
    };
            
    }
};

module.exports = levelPacker;

