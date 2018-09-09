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
        let ctxClass = (window.AudioContext || window.webkitAudioContext);
        if (ctxClass) {
            this.ctx = new ctxClass();
        } else {
            this.disabled = true;
            return;
        }

        // Create a gain node for each sound type we'll be playing.
        this._sounds = {};
        [
            ['click',  0.1],
            ['bloop',  0.5],
            ['siren',  0.1],
            ['tri',    0.5],
            ['music',  0.4],
            ['m1',     1, 'music'],
            ['m2',     1, 'music'],
            ['m3',     1, 'music']
        ].forEach(data => {
            this._sounds[data[0]] = this.ctx.createGain();
            this._sounds[data[0]].gain.value = data[1];
            this._sounds[data[0]].connect(data[2] ? this._sounds[data[2]] : this.ctx.destination);
        });

        // We rotate musical notes between 3 separate gain nodes, so we can control gain on
        // each note without breaking other notes. Note that m1, m2, and m3 are
        // our "0-1" individual note nodes, which are hooked up to the overall "music" node
        // at 0.4 gain, which is then hooked up to the destination node.
        this._musicNodes = [this._sounds.m1, this._sounds.m2, this._sounds.m3];
        this._musicIndex = 0;

        // Used to track the most recent play of a sound.
        this._last = {
            click: 0
        };

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
        this._tracks = {
            game: [
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
            ],
            death: [
                [22, 16],
                [21, 15],
                [22, 16],
                [21, 15],

                [22, 16],
                [19],
                [23, 17],
                [20],

                [24, 18],
                [21],
                [25, 19],
                [22],

                [26, 20],
                [23],
                [27, 21],
                [24],

                [28, 22],
                [25],
                [29, 23],
                [26],

                [30, 24],
                [27],
                [31, 25],
                [28],

                [],
                [],
                [],
                [],

                [],
                [],
                [],
                [],

                // Gain fade out finished here

                [],
                [],
                [],
                []
            ]
        };

        // Track 2 is Track 1 plus major 3rd (+4 notes), this transition sounds "normal", but
        // makes the next transition a little more jarring.
        let track2 = this._tracks.game.map(x => {
            return x.map(y => y - 4);
        });
        // tweak: maj3rd -> min3rd sounds muddled unless we move the last couple notes a few higher
        track2[30] = [16];
        track2[31] = [15];

        // Track 3 is Track 1 plus minor 3rd (+3 notes), a simple sinister transition.
        let track3 = this._tracks.game.map((x, i) => {
            return x.map(y => y - 3);
        });

        // Full 4 = our sequence in key of [C, C, E, Eb], repeat.
        this._tracks.game = this._tracks.game.concat(this._tracks.game).concat(track2).concat(track3);

        this._tracks.game.repeat = true;
        this._tracks.death.repeat = false;

        this._tickLength = 1/5;
        this._nextTick = this._tickLength;
    }

    update(delta) {
        if (this.disabled) return;

        if (game.player && game.player.dead) {
            this._sounds.music.gain.value = Math.max(0, 0.4 - game.deathFrame / 1000);
            if (this._track !== this._tracks.death) {
                this._track = this._tracks.death;
                this._tick = 0;
            }
        } else {
            this._sounds.music.gain.value = 0.4;
            if (this._track !== this._tracks.game) {
                this._track = this._tracks.game;
                this._tick = 0;
            }
        }

        // Each frame, schedule some notes if we're close to where the note should be played.
        // The longer the time comparison here, the more "buffer" you have, but the longer
        // it takes to react e.g. to play death music.
        if (this._nextTick - this.ctx.currentTime < 0.2) {
            this._musicIndex = (this._musicIndex + 1) % this._musicNodes.length;
            let node = this._musicNodes[this._musicIndex];
            this._scheduleForTick(this._track, this._tick, this._nextTick, this._tickLength, node);
            this._tick++;

            // If we go into the background, the Audio Context's currentTime will keep increasing,
            // but Audio.update will stop running (because we only run when the next animation
            // frame is received). This "automatically" stops our bg music when switching tabs,
            // which I think is a feature-not-a-bug. However, when we come back, we need to
            // make sure we don't spend a bunch of frames slowly catching back up to the
            // current time.
            if (this._nextTick < this.ctx.currentTime) this._nextTick = this.ctx.currentTime;

            this._nextTick += this._tickLength;
        }
    }

    _scheduleForTick(track, tick, nextTick, tickLength, dest) {
        let notes = track.repeat ? track[tick % track.length] : track[tick];
        let noteLength = tickLength * 1.39;

        if (!notes) return;

        // Oscillator creation taken from the generator at https://xem.github.io/miniMusic/advanced.html,
        // although I ended up moving the note creation out of the loop below, just so it is easier for
        // me to reason about.
        for (let i = 0; i < notes.length; i++) {
            let o = this.ctx.createOscillator();
            let freq = 988/1.06**notes[i];
            o.frequency.value = freq;
            o.type = 'triangle';
            o.connect(dest);
            o.start(nextTick);

            // Safari as a browser is exceptionally "clicky", so it's a good truth test. Here we create
            // an envelope where 5% of the note length is linear 0-1 ramp, then we play 90% of the note
            // at volume 1, and then the last 5% of the note length is linear 1-0 ramp. You could also
            // use exponential ramp and 0.01 or 0.001 as volume, but I couldn't get Safari to stop clicking,
            // so a linear ramp it is.
            dest.gain.setValueAtTime(0,          nextTick);
            dest.gain.linearRampToValueAtTime(1, nextTick + noteLength * 0.05);
            dest.gain.setValueAtTime(1,          nextTick + noteLength * 0.95);
            dest.gain.linearRampToValueAtTime(0, nextTick + noteLength);

            o.stop(nextTick + noteLength);
        }
    }

    _playOscillatorSound(channel, type, freq, rampFreq, rampTime, length, timeSinceLast, timeOffset) {
        if (this.disabled) return;

        let time = timeOffset || this.ctx.currentTime;
        if (timeSinceLast && time - this._last[channel] < timeSinceLast) return;
        this._last[channel] = time;

        // Important: on any browser but Chrome, setting ".value" and using ramps are NOT
        // COMPATIBLE! For any AudioParam, if you want to use exponential/linear ramp
        // functions, make sure you set your value using setValueAtTime, and not explicitly
        // setting value.

        let o = this.ctx.createOscillator();
        o.frequency.setValueAtTime(freq, time);
        if (rampFreq) {
            o.frequency.exponentialRampToValueAtTime(rampFreq, time + rampTime);
        }
        o.type = type;
        o.connect(this._sounds[channel]);
        o.start(time);
        o.stop(time + length);
    }

    // "Clicks" are a very short, smooth sound, and used for menu item movement and
    // the sound of keys being pressed during intro/outro/level music.
    playClick() {
        let freq = 988/1.06**1;
        this._playOscillatorSound('click', 'sine', freq, freq * 0.6, 0.1, 0.01, 0.05);
    }

    // A "bloop" is an arcade-sounding slide whistley sound, used for player interactions
    // like toggling a terminal, selecting a menu item, skipping level text, etc.
    playBloop() {
        let freq = 988/1.06**28;
        this._playOscillatorSound('bloop', 'square', freq, freq * 1.6, 0.2, 0.09);
    }

    // The "siren" is a short, harsh, slide sound like the beginning of a siren/airhorn.
    // It's not perfect, but it is unmistakably "not good" (used for enemy targeting).
    playSiren() {
        let freq = 988/1.06**11;
        this._playOscillatorSound('siren', 'sawtooth', freq, freq * 2, 1.1, 0.65, 0.5);
    }

    // A "tri" is a short series of TRIUMPHANT NOTES played when you get in the chopper.
    // Er... elevator.
    playTri() {
        let time = this.ctx.currentTime;
        let freq1 = 988/1.06**10;
        let freq2 = 988/1.06**8;
        let freq3 = 988/1.06**2;
        this._playOscillatorSound('tri', 'square', freq1, 0, 0, 0.1, false, time);
        this._playOscillatorSound('tri', 'square', freq2, 0, 0, 0.1, false, time + 0.08);
        this._playOscillatorSound('tri', 'square', freq3, 0, 0, 0.2, false, time + 0.16);
    }
}
