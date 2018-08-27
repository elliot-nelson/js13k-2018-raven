/**
 * Level metadata. The level packer will merge this into the JSON output from Tiled.
 */
const LevelMetadata = {
    level01: {
        name: 'Annex 01A',
        hint: '! Look around with the mouse. Move with W/A/S/D.',
        intro:
            '[Comm REF 672.A]\n\n' +
            'Site R-7 has suffered a containment breach. Contained units, codenamed "Ravens", are considered active ' +
            'and extremely dangerous. All off-site monitoring is currently offline.\n\n' +
            'Your mission is simple: enter the facility, bring our security cameras back online, and ' +
            'contain all active Ravens. Be careful in there.'
    },
    level02: {
        name: 'Annex 01B',
        hint: '! Once spotted, do not look away from a Raven.'
    },
    level09: {
        name: 'Badofjfoeof',
        hint: ''
    }
};

module.exports = LevelMetadata;
