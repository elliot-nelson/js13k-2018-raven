class Intro {
    constructor(text) {
        this.text = text;
        this.duration = 0;
        this.charsPerSecond = 56;

        this.state = 'alive';
    }

    update(delta) {
        this.duration += delta;
        this.chars = Math.min(this.text.length, this.duration * this.charsPerSecond);

        if (this.chars !== this.text.length) {
            // Text "scroll" audio effect
            game.audio.playClick();
        }
    }

    render() {
        game.ctx.font = Asset.getFontString(18);
        game.ctx.fillStyle = 'rgba(204, 255, 204, 0.9)';

        let text = this.text.substring(0, this.chars);
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
        if (this.chars === this.text.length) {
            Util.renderTogglePrompt(game.canvas.width - 20, game.canvas.height - 20);
        }
    }

    toggle() {
        if (this.chars === this.text.length) {
            this.state = 'dead';
            game.audio.playBloop();
        } else {
            this.duration = 10000;
            game.audio.playBloop();
        }
    }
}
