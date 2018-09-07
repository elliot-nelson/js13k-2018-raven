class Menu {
    constructor(options, escapeHandler) {
        this.options = options.slice(0);
        this.escapeHandler = escapeHandler;

        this.selected = 0;
    }

    open() {
        this.rotate = 0;
        this.scale = 5;
    }

    update() {
        if (this.rotate > 0) this.rotate -= 20;
        if (this.scale > 0) this.scale -= 1;
    }

    render() {
        let entryHeight = 36;

        game.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

        let menuTop = game.canvas.height / 2 - this.options.length * (entryHeight * 0.75);

        game.ctx.save();
        game.ctx.translate(game.canvas.width / 2, game.canvas.height / 2);
        game.ctx.scale(1 + this.scale, 1 + this.scale);
        game.ctx.rotate(Util.d2r(this.rotate));
        game.ctx.translate(-game.canvas.width / 2, -game.canvas.height / 2);

        this.options.forEach((entry, idx) => {
            game.ctx.font = Asset.getFontString(18);

            entry.w = game.ctx.measureText(entry.text).width;
            entry.x = game.canvas.width / 2 - entry.w / 2;
            entry.y = menuTop + idx * entryHeight;

            if (idx === this.selected && this.scale === 0) {
                game.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            } else {
                game.ctx.fillStyle = 'rgba(204, 204, 204, 1)';
            }
            game.ctx.fillText(entry.text, entry.x, entry.y);
        });

        game.ctx.restore();
    }

    onUp() {
        this.selected = (this.selected - 1 + this.options.length) % this.options.length;
    }

    onDown() {
        this.selected = (this.selected + 1) % this.options.length;
    }

    onEscape() {
        console.log("Menu - onEscape", game.framems);
        this.escapeHandler();
    }

    onMouseMove(x, y) {
        this.options.forEach((entry, idx) => {
            if (x >= entry.x && x <= entry.x + entry.w &&
                y >= entry.y - 30 && y <= entry.y) {
                this.selected = idx;
            }
        });
    }

    select() {
        this.options[this.selected].handler();
    }
}
