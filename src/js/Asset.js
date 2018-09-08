const Asset = {
    _sprites: {
        camera_arm: {
            x: 32,
            y: 32,
            w: 32,
            h: 32
        },
        camera_head: {
            x: 0,
            y: 32,
            w: 21,
            h: 12
        },
        door: {
            x: 64,
            y: 0,
            w: 32,
            h: 32
        },
        floor: {
            x: 32,
            y: 0,
            w: 32,
            h: 32
        },
        player: {
            x: 64,
            y: 32,
            w: 21,
            h: 15
        },
        raven: {
            x: 96,
            y: 32,
            w: 18,
            h: 30
        },
        terminal: {
            x: 96,
            y: 0,
            w: 32,
            h: 32
        },
        wall: {
            x: 0,
            y: 0,
            w: 32,
            h: 32
        }
    },
    _img: {
    },

    // Obviously, the ideal would be to bundle in an OTT or pixel art font and give every user
    // the same experience.
    //
    // However, I've tested all of these and they all "work", so this should cover us.
    fontFamily: "Monaco,'Lucida Sans Typewriter','Andale Mono','Lucida Console','Courier New',Courier,monospace",

    _loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    },

    drawSprite(name, ctx, x, y) {
        let sprite = this._sprites[name];
        ctx.drawImage(this._img._sprites, sprite.x, sprite.y, sprite.w, sprite.h, x, y, sprite.w, sprite.h);
    },

    drawSprite2(name, ctx, sx, sy, sw, sh, dx, dy, dw, dh) {
        let sprite = this._sprites[name];
        ctx.drawImage(this._img._sprites, sprite.x + sx, sprite.y + sy, sw, sh, dx, dy, dw, dh);
    },

    loadAllAssets() {
        // Originally, I loaded a bunch of PNGs here; no matter how much you compress them,
        // though, you cannot beat a sprite sheet for space. (I think if space were not an
        // issue, it's debatable whether sprite sheets are still the best route for a game
        // overall, but if space is your only concern...)
        Asset._img._sprites = Asset._loadImage('assets/sprites.png');
    },

    getFontString(pixels) {
        return '' + pixels + 'px ' + Asset.fontFamily;
    }
};
