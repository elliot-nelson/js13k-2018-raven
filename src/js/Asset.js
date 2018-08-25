const Asset = {
    img: {
    },
    tile: {
    },

    loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    },

    loadAllAssets() {
        Asset.img.player      = Asset.loadImage('assets/player.png');
        Asset.img.raven       = Asset.loadImage('assets/raven.png');
        Asset.img.unraven     = Asset.loadImage('assets/unraven.png');
        Asset.img.camera_arm  = Asset.loadImage('assets/camera_arm.png');
        Asset.img.camera_head = Asset.loadImage('assets/camera_head.png');
        Asset.img.terminal    = Asset.loadImage('assets/terminal.png');
        Asset.tile.floor      = Asset.loadImage('assets/floor.png');
        Asset.tile.wall       = Asset.loadImage('assets/wall.png');
    }
};
