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
            ['click', 0.1],
            ['bloop', 0.5],
            ['siren', 0.1],
            ['music', 0.4]
        ].forEach(data => {
            this._sounds[data[0]] = this.ctx.createGain();
            this._sounds[data[0]].gain.value = data[1];
            this._sounds[data[0]].connect(this.ctx.destination);
        });

        // Used to track the most recent play of a sound.
        this._last = {
            click: 0
        };

        this._tick = 0;
        this._tickLength = 1/5;
        this._nextTick = this._tickLength;
    }

    update(delta) {
        if (this.disabled) return;

        if (game.player && game.player.dead) {
            this._sounds.music.gain.value = Math.max(0, 0.4 - game.deathFrame / 1000);
        } else {
            this._sounds.music.gain.value = 0.4;
        }

        // Each frame, schedule some notes if we're less than a second away from when
        // the next note should be played.
        if (this._nextTick - this.ctx.currentTime < 0.2) {
            this._scheduleForTick(this._tick, this._nextTick, this._tickLength, this._sounds.music);
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

        // Do some basic gain manipulation
        /*if (game.menu || game.intro || game.player.dead || game.levelComplete) {
            if (this.gain > 0.4) {
                this.gain -= delta / 3.5;
            } else if (this.gain < 0.4) {
                this.gain += delta / 3.5;
            }
        } else {
            if (this.gain < 0.7) {
                this.gain += delta / 3.5;
            }
        }
        this.gainNode.gain.value = this.gain;*/
    }

    _scheduleForTick(tick, nextTick, tickLength, dest) {
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
        let noteLength = tickLength * 1.39;

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

            // When to "stop" this note turns out to be surprisingly important; the obvious value is just
            // (start + note length), but there's a lot of ugly clicking at the end of each note. See
            // http://alemangui.github.io/blog//2015/12/26/ramp-to-value.html for an explanation. Unlike
            // the author's solution, though, I don't want to mess around with gain ramping because
            // we have a whole bunch of other notes to play, so instead, we try to land the "end" of the
            // oscillation at a multiple of (1/freq), where we'll be at 0, for a clean note exit.
            //
            // TODO: This is frustrating because I'd like to play with, for example, detuning and frequency
            // modulation (gives a creepy jewelry box sound); however, changing +/-cents on my note
            // changes the frequency, and my note length calculation becomes invalid. I should be modulating
            // the gain instead at the end of the note, but it interferes with the next note. Needs more
            // research, I guess...
            //
            // If we DO use cents, take it into account (to find the real zero point).
            // let rfreq = freq * Math.pow(2, cents / 1200);

            // Basically "noteLength -= noteLength % rfreq", except it doesn't end up being zero.
            noteLength = Math.floor(noteLength * freq) / freq;

            o.stop(nextTick + noteLength);
        }
    }

    _playOscillatorSound(channel, type, freq, rampFreq, rampTime, length, timeSinceLast) {
        if (this.disabled) return;

        let time = this.ctx.currentTime;
        if (timeSinceLast && time - this._last[channel] < timeSinceLast) return;
        this._last[channel] = time;

        let o = this.ctx.createOscillator();
        o.frequency.value = freq;
        if (rampFreq) {
            o.frequency.exponentialRampToValueAtTime(rampFreq, time + rampTime);
        }
        o.type = type;
        o.connect(this._sounds[channel]);
        o.start(time);
        o.stop(time + length);
    }

    playClick() {
        let freq = 988/1.06**1;
        this._playOscillatorSound('click', 'sine', freq, freq * 0.6, 0.1, 0.01, 0.05);
    }

    playBloop() {
        let freq = 988/1.06**28;
        this._playOscillatorSound('bloop', 'square', freq, freq * 1.6, 0.2, 0.09);
    }

    playSiren() {
        let freq = 988/1.06**11;
        this._playOscillatorSound('siren', 'sawtooth', freq, freq * 2, 1.1, 0.65, 0.5);
    }
}
