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
        this.tracks = {
            intro: {
                gain: 0,
                gainNode: this.ctx.createGain(),
                nextLoop: 0,
                length: (29 + 3) / 5,
                schedule: time => this.scheduleIntroTrack(this.tracks.intro.gainNode, time)
            },
            play: {
                gain: 0,
                gainNode: this.ctx.createGain(),
                nextLoop: 0,
                length: (29 + 3) / 5,
                schedule: time => this.schedulePlayTrack(this.tracks.play.gainNode, time)
            },
            danger: {
                gain: 0,
                gainNode: this.ctx.createGain(),
                nextLoop: 0,
                length: (29 + 3) / 5,
                schedule: time => this.scheduleDangerTrack(this.tracks.danger.gainNode, time)
            },
        };

        this.tracks.intro.gainNode.connect(this.ctx.destination);
        this.tracks.play.gainNode.connect(this.ctx.destination);
        this.tracks.danger.gainNode.connect(this.ctx.destination);
    }

    update() {
        //this.tracks.intro.gain = Math.min(1, this.tracks.intro.gain + 0.01);
        //this.tracks.play.gain = Math.min(0.1, this.tracks.play.gain + 0.005);
        this.tracks.danger.gain = Math.min(0.8, this.tracks.danger.gain + 0.1);

        this.updateTrack(this.tracks.intro);
        this.updateTrack(this.tracks.play);
        this.updateTrack(this.tracks.danger);
    }

    updateTrack(track) {
        track.gainNode.gain.value = track.gain;
        if (track.nextLoop - this.ctx.currentTime < 1) {
            track.schedule(track.nextLoop);
            track.nextLoop = Math.max(track.nextLoop, this.ctx.currentTime) + track.length;
        }
    }

    scheduleIntroTrack(dest, time) {
        [10,10,10,10,16,16,19,19,22,22,22,22,22,22,22,22].map((v,i)=>{
            let o = this.ctx.createOscillator();
            let e = [1,9,17,25,13,29,5,21,1,5,9,13,17,21,25,29][i]/5;
            o.frequency.value = 988/1.06**v;
            o.connect(dest);
            o.start(time + e);
            o.stop(time + e + .2);
        });
    }

    schedulePlayTrack(dest, time) {
        [4,8,9,9,14,14,16,16,19,19,20,21,21,21,21,21,21,21,21,24,24].map((v,i) => {
            let o = this.ctx.createOscillator();
            let e = [27,7,6,23,3,11,3,27,11,19,22,2,4,10,12,15,18,20,23,15,26][i]/5;
            o.frequency.value = 988/1.06**v;
            o.type = 'triangle';
            o.connect(dest);
            o.start(time + e);
            o.stop(time + e + .2);
        });
    }

    scheduleDangerTrack(dest, time) {
        [10,12,12,14,15,15,15,15,15,16,16,16,16,16,16,16,16,17,18,18,18,19,19,19,19,19,19,19,19,20,21,21,21,21,21,22,22,22,22,22,22,24,24].map((v,i) => {
            let o = this.ctx.createOscillator();
            let e = [21,20,22,5,1,11,15,19,21,3,5,6,9,12,16,20,22,23,3,20,22,1,6,7,14,18,19,21,23,24,2,4,7,8,25,1,3,17,18,19,20,8,24][i]/5;
            o.frequency.value = 988/1.06**v;
            o.type = 'triangle';
            o.connect(dest);
            o.start(time + e);
            o.stop(time + e + .2);
        });
    }
}

/*

//base song
with(new AudioContext)[10,10,10,10,16,16,19,19,22,22,22,22,22,22,22,22].map((v,i)=>{with(createOscillator())v&&start(e=[1,9,17,25,13,29,5,21,1,5,9,13,17,21,25,29][i]/5,connect(destination),frequency.value=988/1.06**v)+stop(e+.2)})

// base song with embellishments, triangle
with(new AudioContext)[4,8,9,9,10,10,10,10,14,14,16,16,16,16,19,19,19,19,20,21,21,21,21,21,21,21,21,22,22,22,22,22,22,22,22,24,24].map((v,i)=>{with(createOscillator())v&&start(e=[27,7,6,23,1,9,17,25,3,11,3,13,27,29,5,11,19,21,22,2,4,10,12,15,18,20,23,1,5,9,13,17,21,25,29,15,26][i]/5,connect(destination),frequency.value=988/1.06**v,type='triangle',)+stop(e+.2)})

// embellishments, triangle, no chords
with(new AudioContext)[4,8,9,9,14,14,16,16,19,19,20,21,21,21,21,21,21,21,21,24,24].map((v,i)=>{with(createOscillator())v&&start(e=[27,7,6,23,3,11,3,27,11,19,22,2,4,10,12,15,18,20,23,15,26][i]/5,connect(destination),frequency.value=988/1.06**v,type='square',)+stop(e+.2)})

// creepier? or dumber?
with(new AudioContext)[10,12,12,14,15,15,15,15,15,16,16,16,16,16,16,16,16,17,18,18,18,19,19,19,19,19,19,19,19,20,21,21,21,21,21,22,22,22,22,22,22,24,24].map((v,i)=>{with(createOscillator())v&&start(e=[21,20,22,5,1,11,15,19,21,3,5,6,9,12,16,20,22,23,3,20,22,1,6,7,14,18,19,21,23,24,2,4,7,8,25,1,3,17,18,19,20,8,24][i]/5,connect(destination),frequency.value=988/1.06**v,type='triangle',)+stop(e+.2)})

}
*/
