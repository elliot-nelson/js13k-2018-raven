/**
 * Level metadata. The level packer will merge this into the JSON output from Tiled.
 *
 * Anything in this file could probably be saved within Tiled levels as properties, from
 * the looks of it, but I'd rather edit code when I have the choice (and for the longer
 * text, like the intro text, the Tiled input forms aren't ideal).
 */
const LevelMetadata = {
    level01: {
        name: 'Security Annex 109A',
        hint: '! Look around with the mouse. Move with W/A/S/D.',
        intro:
            '[Comm REF 672.A]\n\n' +
            'Site R-7 has suffered a containment breach. Contained units, codenamed "Raven", are considered active ' +
            'and extremely dangerous. All off-site monitoring is currently offline.\n\n' +
            'Your mission is simple: enter the facility, bring our security cameras back online, and ' +
            'contain all active Raven. Be careful in there.'
    },
    level02: {
        name: 'Security Annex 209A',
        hint: '! Once spotted, do not look away from a Raven.'
    },
    level03: {
        name: 'Corridor 1106',
        hint: '! Find an exit elevator to continue.'
    },
    level04: {
        name: 'Corridor 1207',
        hint: '! Turn on security cameras using nearby terminals.',
        chx: 0,
        chy: 32
    },
    level09: {
        name: 'Badofjfoeof',
        hint: ''
    }
};

module.exports = LevelMetadata;
