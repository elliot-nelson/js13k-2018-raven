const Asset = {
    img: {
    },

    tile: {
    },

    // Obviously, the ideal would be to bundle in an OTT or pixel art font and give every user
    // the same experience.
    //
    // However, I've tested all of these and they all "work", so this should cover us.
    fontFamily: "Monaco,'Lucida Sans Typewriter','Andale Mono','Lucida Console','Courier New',Courier,monospace",

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    },

    loadAllAssets() {
        Asset.img.player      = Asset.loadImage('assets/player.png');
        Asset.img.player_l    = Asset.loadImage('assets/player_shoe_left.png');
        Asset.img.player_r    = Asset.loadImage('assets/player_shoe_right.png');
        Asset.img.raven       = Asset.loadImage('assets/raven.png');
        Asset.img.unraven     = Asset.loadImage('assets/unraven.png');
        Asset.img.camera_arm  = Asset.loadImage('assets/camera_arm.png');
        Asset.img.camera_head = Asset.loadImage('assets/camera_head.png');
        Asset.img.terminal    = Asset.loadImage('assets/terminal.png');
        Asset.tile.floor      = Asset.loadImage('assets/floor.png');
        Asset.tile.wall       = Asset.loadImage('assets/wall.png');
        Asset.tile.door       = Asset.loadImage('assets/door.png');
    },

    getFontString(pixels) {
        return '' + pixels + 'px ' + Asset.fontFamily;
    }
};
