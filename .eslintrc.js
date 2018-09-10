module.exports = {
    "extends": "airbnb-base",
    "rules": {
        // This stuff is turned off because in this context, I don't care to fix it.
        // (This is "post-competition" stuff.)
        "indent": "off",
        "no-underscore-dangle": "off",
        "max-len": "off",
        "prefer-const": "off",
        "no-multi-spaces": "off",

        // Personal preferences (love ++, hate dangling commas, love single quotes)
        "quotes": ["error", "single"],
        "no-plusplus": "off",
        "comma-dangle": ["error", "never"]
    },
    "globals": {
        "game": true,
        "window": true
    }
};
