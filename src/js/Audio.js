/**
 * My attempt at an audio controller.
 *
 * The gist here is, we'll create some metadata for 3 "tracks" of music (each
 * track is just a sequence of oscillator nodes). Create 3 individual gain nodes,
 * for volume control, and attach everything up.
 *
 * Updating the audio controller involves checking whether we're near the end of
 * a track (if we are, schedule another loop of it), plus updating any volume
 * knobs as appropriate.
 */
class Audio {
    constructor() {
        this.ctx = new AudioContext();

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 1;
        this.gainNode.connect(this.ctx.destination);

        this.tick = 0;
        this.startOffset = this.ctx.currentTime;
        this.tickLength = 1/5;
        this.dangerLevel = 0;
        this.gain = 0.3;
    }

    update(delta) {
        if (this.ctx.currentTime < time) {
            // Let's "teleport forward" to the current time. This can happen if we're in
            // a background tab for a while.
            this.startOffset = time - this.ctx.currentTime;
        }

        // Each frame, schedule some notes if we're less than a second away from when
        // those notes need to be played.
        let time = this.startOffset + this.tickLength * this.tick;
        if (time - this.ctx.currentTime < 1) {
            this.scheduleForTick(this.tick, this.tickLength, this.startOffset, this.gainNode);
            this.tick++;
        }

        // Do some basic gain manipulation
        if (game.menu || game.intro || game.player.dead || game.levelComplete) {
            if (this.gain > 0.4) {
                this.gain -= delta;
            } else if (this.gain < 0.4) {
                this.gain += delta;
            }
        } else {
            if (this.gain < 0.8) {
                this.gain += delta;
            }
        }
        this.gainNode.gain.value = this.gain;
    }

    scheduleForTick(tick, tickLength, startOffset, dest) {
        // I am not a music expert, so please assume that any statements I make about
        // keys, chords, and other music theory in these comments may be 100% wrong.

        // I experimented with more complicated 3- and 4-note chords, which
        // sound good on the piano, but my experiments seemed to show that less-is-more
        // when dealing with simple oscillators (you'd need a more complicated instrument,
        // I think, for big min7 type chords to sound good).

        // Overall, this is just a C minor chord, alternating fingers 1+3 and 1+5, with
        // scattered dissonant (but not too dissonant) notes in between. Where I could, I
        // tried to give it this odd start/stop feeling (like carnival music?) by alternating
        // where the interstitial notes ended up (beat 3 vs beat 2/4).
        let track = [
            // Measure 1
            [22, 19], // C Eb
            [],
            [],
            [],
            [22, 15], // C G
            [21],     // C#
            [],
            [],
            [22, 19], // C Eb
            [],
            [16],     // F#
            [],
            [22, 15], // C G
            [],
            [14],     // Ab
            [],

            // Measure 2
            [22, 19], // C Eb
            [],
            [],
            [16],     // F#
            [22, 15], // C G
            [],
            [20],     // D
            [],
            [22, 19], // C Eb
            [14],     // Ab
            [],
            [16],     // F#
            [22, 15], // C G
            [],
            [21],     // C#
            [20]      // D
        ];

        // Track 2 is Track 1 plus major 3rd (+4 notes), this transition sounds "normal", but
        // makes the next transition a little more jarring.
        let track2 = track.map(x => {
            return x.map(y => y - 4);
        });
        // tweak: maj3rd -> min3rd sounds muddled unless we move the last couple notes a few higher
        track2[30] = [16];
        track2[31] = [15];

        // Track 3 is Track 1 plus minor 3rd (+3 notes), a simple sinister transition.
        let track3 = track.map((x, i) => {
            return x.map(y => y - 3);
        });

        // Full 4 = our sequence in key of [C, C, E, Eb], repeat.
        track = track.concat(track).concat(track2).concat(track3);

        let notes = track[tick % track.length];

        // Oscillator creation taken from the generator at https://xem.github.io/miniMusic/advanced.html,
        // although I ended up moving the note creation out of the loop below, just so it is easier for
        // me to reason about.
        for (let i = 0; i < notes.length; i++) {
            let o = this.ctx.createOscillator();
            o.frequency.value = 988/1.06**notes[i];
            o.type = 'triangle';
            o.connect(dest);
            o.start(startOffset + tickLength * tick);
            o.stop(startOffset + tickLength * tick + tickLength * 1.4);
        }
    }
}
