/**
 * Level metadata. The level packer will merge this into the JSON output from Tiled.
 *
 * Anything in this file could probably be saved within Tiled levels as properties, from
 * the looks of it, but I'd rather edit code when I have the choice (and for the longer
 * text, like the intro text, the Tiled input forms aren't ideal).
 */
const LevelMetadata = {
    level01: {
        name: '01 Rear Security Annex',
        hint: '! Look around with the mouse, move with W/A/S/D.',
        intro:
            '[SEC REF 672.A]\n\n' +
            'Thank you for arriving quickly. As you can see, the facility has been breached, and our ' +
            'security monitoring is offline. Containment and establishment of vision are our top priorities.\n\n' +
            'All occupants, codenamed \'Raven\', will manifest as stationary statues when visible. Do ' +
            'not let your guard down, as they are active and extremely dangerous.\n\n' +
            'Your mission is simple: enter the facility, bring our security cameras back online, and ' +
            'contain all active Raven. Ni pukha, ni pyera, comrade.'
    },
    level02xx: {
        name: 'Security Annex 209A',
        hint: '! Once spotted, do not look away from a Raven.',
        chx: 0,
        chy: 32
    },
    level03xx: {
        name: 'Corridor 1106',
        hint: '! Find an exit elevator to continue.'
    },
    level04: {
        name: '02 Rear Annex Corridor',
        hint: '! Turn on all cameras using nearby terminals to proceed.',
    },
    level05: {
        name: '03 Rear Hallway SW',
        hint: '! Raven are immobilized if spotted by security cameras.',
        chx: 0,
        chy: 32
    },
    level06: {
        name: '04 Lobby SW',
        hint: '! Plan a route that exposes you as little as possible.'
    },
    level07: {
        name: '05 Guest Plaza',
        hint: ''
    },
    level08: {
        name: '06 West Lab Storage',
        hint: '! Although dangerous, looking away can be useful.',
        chx: 0,
        chy: 32
    },
    level09: {
        name: 'Badofjfoeof',
        hint: ''
    },
    outro:
        '[SEC REF 672.C]\n\n' +
        'Site R-7 is now a code yellow, thanks to your efforts. With all security cameras ' +
        'back online, secondary cleanup crews will finish the job with little danger. No ' +
        'Raven have escaped the facility during this operation.\n\n' +
        'You are cleared to leave. Do svidaniya, comrade...'
};

module.exports = LevelMetadata;
