const Asset = {
    _img: {
    },

    _tile: {
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

    loadAllAssets() {
        Asset._img._player      = Asset._loadImage('assets/player.png');
        Asset._img._raven       = Asset._loadImage('assets/raven.png');
        Asset._img._camera_arm  = Asset._loadImage('assets/camera_arm.png');
        Asset._img._camera_head = Asset._loadImage('assets/camera_head.png');
        Asset._img._terminal    = Asset._loadImage('assets/terminal.png');
        Asset._tile._floor      = Asset._loadImage('assets/floor.png');
        Asset._tile._wall       = Asset._loadImage('assets/wall.png');
        Asset._tile._door       = Asset._loadImage('assets/door.png');
    },

    getFontString(pixels) {
        return '' + pixels + 'px ' + Asset.fontFamily;
    }
};
