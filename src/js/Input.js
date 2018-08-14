class Input {
    constructor() {
        // Raw key code state
        this.keys = [];

        // Map keys to in-game inputs
        this.map = [];
        this.map[87] = 'up';       // W
        this.map[83] = 'down';     // A
        this.map[65] = 'left';     // S
        this.map[68] = 'right';    // D
        this.map[38] = 'up';       // UpArrow
        this.map[40] = 'down';     // DownArrow
        this.map[37] = 'left';     // LeftArrow
        this.map[39] = 'right';    // RightArrow
    }

    init() {
        addEventListener('keydown', event => {
            console.log(event.keyCode);
            this.keys[event.keyCode] = true;
            this[this.map[event.keyCode]] = true;
        });

        addEventListener('keyup', event => {
            this.keys[event.keyCode] = undefined;
            this[this.map[event.keyCode]] = undefined;
        });

        return this;
    }
}
