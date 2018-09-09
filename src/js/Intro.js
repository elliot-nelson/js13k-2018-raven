class Intro {
    constructor(text) {
        this._text = text;
        this._duration = 0;
        this._charsPerSecond = 56;

        this.state = 'alive';
    }

    update(delta) {
        this._duration += delta;
        this._chars = Math.min(this._text.length, this._duration * this._charsPerSecond);

        if (this._chars !== this._text.length) {
            // Text "scroll" audio effect
            game.audio.playClick();
        }
    }

    render() {
        game.ctx.font = Asset.getFontString(18);
        game.ctx.fillStyle = 'rgba(204, 255, 204, 0.9)';

        let text = this._text.substring(0, this._chars);
        let lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let length;

            while ((length = game.ctx.measureText(line).width) > game.canvas.width - 30) {
                line = line.split(' ').slice(0, -1).join(' ');
            }

            // Trim off leading and trailing space while rendering (don't include in math)
            game.ctx.fillText(line.trim(), 15, 30 + i * 28);

            let leftover = lines[i].slice(line.length);
            if (leftover.length > 0) {
                lines = lines.slice(0, i + 1).concat([leftover]).concat(lines.slice(i + 1));
            }
        }

        // Interactivity indicator
        if (this._chars === this._text.length) {
            Util.renderTogglePrompt(game.canvas.width - 20, game.canvas.height - 20);
        }
    }

    toggle() {
        if (this._chars === this._text.length) {
            this.state = 'dead';
            game.audio.playBloop();
        } else {
            this._duration = 10000;
            game.audio.playBloop();
        }
    }
}
