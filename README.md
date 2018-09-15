# js13k-2018-raven

My 2018 entry for the js13kgames competition, "Raven".

Play the game online at [js13kgames.com](http://js13kgames.com/entries/raven).

## Description

In this 2D top-down action-puzzle game, the security cameras for a secret facility have been taken offline, and it is YOUR job to fix the problem. Take on a series of floors overrun by mysterious enemies known only as "Raven" -- although harmless as long as you can see them, they are deadly if you turn your back.

Playable on the desktop in Chrome, Firefox, and Safari. Use your mouse or touchpad to look around, and W/A/S/D or the arrow keys to move.

Good luck!

## Building the game

- `/src` contains the game source files and assets
- `/raven` would contain the built game (not checked in)
- `/zip` contains the built game bundled into a zip file

To rebuild, `npm install && gulp build` from the project folder.

Build the zip file with `gulp zip`, or to get the smallest possible size, `gulp zip:pre && gulp zip && gulp zip:post`. Using the `pre` and `post` steps requires additional tools (`advpng` and `advzip`, from http://www.advancemame.it/download).

## Postmortem

### Inspiration

This year was the first year I had heard about the competition, and I knew almost immediately that I wanted to build something based heavily on line-of-sight, as I had been doing a lot of reading on visibility algorithms (see the References section at the bottom for links). From there it was pretty easy to shoehorn in the theme (by adding security cameras that had gone offline).

As implemented in the game, the Raven are very similar to the infamous [Weeping Angels](http://tardis.wikia.com/wiki/Weeping_Angel), although my original idea was actually based on the similar [SCP-173](http://www.scp-wiki.net/scp-173). Either way, I knew that I wanted my game to be heavily based on what you were looking at, with your line of sight being your only "weapon" against creatures that were very dangerous when you weren't looking at them.

Overall I'm pretty pleased with how it turned out! The enemy behavior in certain corner cases could use some love, and you can imagine some extra stuff that would spice the levels up (security cameras that move, terminals that open doors instead of turning on cameras, enemies that patrol even after spotting you, better "pack attacks" - intentionally splitting up to cover more attack angles, etc.). Of course, if the enemy evolved, the player would need to evolve too -- maybe by having a mobile "partner" they could toss onto the ground that can look around a corner for a few seconds, or adding a sprint button...

### Build process

Early on, to save time, I decided that I would opt out of any of the existing "module" systems (closure, webpack, bundler, etc). The code for my game is organized into separate javascript files (one per class), and they all _assume_ that you will build by concatenating them all first, producing one large javascript file. This, to me, is actually the simplest and most straightforward way to approach building; the downside is that you do some lose some options - for example, I can't write unit tests for any of my math functions, I can't use linting tools unless I turn off a lot of global var checking, etc.

Before next year, I'll do some further research on this topic, and see if I can find a module system I like that would give me the flexibility back (valid javascript files when required by node.js) without adding extra cruft to the output file.

### Cramming it into 13k

By far the biggest limit on this game was the size limit. I spent a _lot_ of my code budget on math and algorithms (for line-of-sight and pathfinding). Here's a rough list of the stuff I ended up doing, over time, to continue to squash the game as small as possible:

- Sprite sheet (this is a big savings, getting all assets into one PNG).
- Even with the sprite sheet, my floor/wall tiles were too much. I ended up simplifying them down to just a couple colors, and removing all "noise". I add that noise back in at the start of the game by rendering it on top of the wall/floor tiles, so that everything isn't one solid color.
- I used Tiled to create my levels, but I ended up creating a post-processing setup in my build to squash those levels into a tiny game-specific format. There is a balancing act here; at a certain point, the extra bytes saved in your level specification are lost in the code to unpack it into something useable. I think in this game, I have just about the smallest possible level + unpacking code combination that I could get.
- I do a bunch of property mangling with `terser` (generic private properties using a `_` prefix, plus a bunch of specifically named utility functions that I know are safe to mangle), to eliminate more bytes in the output file.
- A big space sink is ES5 shims. Although I started the project using babel+uglify, I ended up _not_ going to ES5 and using terser by the end of the project, in order to eliminate those shims. This gives you room for significantly more of your own code (but you do need to make sure not to use any javascript constructs not supported by your target browsers).
- Last, you end up just making feature cuts. An example in this game is that although I started with both horizontal and vertical doors, I ended up cutting the code for updating and rendering vertical doors (and not using them in any levels). This last cut was necessary to squeeze in a tenth level, which was the nice round number I was shooting for.

### Lessons learned / moving forward

As I said, I really like this first foray into the competition. Currently, I have no idea what I would do next year, but I know there are some things that I would like to get much, much better at:

1. Pathfinding/AI. If given more time and another 2K of code to work with, my enemies could be even more scary, just because I could brute-force in more checks and logic. I think there's probably an art here that I'm just not that good at yet, and that with some more research, I could figure out ways to get smarter, deadlier enemies in _less_ code.

2. Sound effects! I managed to whip up some very simple, oscillator-based sound effects in this game, and they work in a retro kind of way. I'd like to really focus on sound and music design for the 2019 competition, so deciding whether to bite the bullet and eat the 2K cost of jsfxr, or dig into custom `createPeriodicWave` functions, figure out how to make even better sounding Web Audio music, it's all up for grabs at this point.

3. Particle effects. I had some rudimentary partiles in this game and I totally cut them out for space. I'd like to work on some basic particle effects so things like footsteps/movement, things opening/closing, maybe attacks (depending on the type of game I do next), they all feel more real.

## References

I couldn't have made this game without the following stellar resources. They may be of help to you on your own games:

* [How to make a simple HTML5 Canvas game](http://www.lostdecadegames.com/how-to-make-a-simple-html5-canvas-game/)

I knew I needed to knock some rust off when I started, and this tutorial was an excellent way to do so. My first couple hours was spent working off these notes.

* [Pointer Lock and First Person Shooter Controls](https://www.html5rocks.com/en/tutorials/pointerlock/intro/)

Useful and very thorough introduction to the Pointer Lock API. (Some of the notes on compatibility are now outdated, but otherwise still aces.)

* [2d Visibility](https://www.redblobgames.com/articles/visibility/)

Like every other tutorial on Red Blob, this one is super cool, and in some ways his little demos are the inspiration for this game. Actually, almost everything in this game can be traced back one of Amit's articles (ray casting, path finding, etc.).

* [Grid pathfinding optimizations](https://www.redblobgames.com/pathfinding/grids/algorithms.html)

Speaking of Amit's articles... To be honest, very little of the the advice in this article is implemented in this game, as time and space (ie lines of code) were not on my side. But I did reference this article frequently while working on the enemy AI, and if I ever work on the game post-competition, the enemies could probably get much smarter.

* [Line intersection and its applications](https://www.topcoder.com/community/data-science/data-science-tutorials/geometry-concepts-line-intersection-and-its-applications/)

Math resource (does a line intersect with another line?).

* [Accurate point in triangle test](http://totologic.blogspot.com/2014/01/accurate-point-in-triangle-test.html)

Math resource (is a point within a known triangle?).

* [Even-odd rule](https://en.wikipedia.org/wiki/Even%E2%80%93odd_rule)
* [How to check if a given point lies inside a polygon](https://www.geeksforgeeks.org/how-to-check-if-a-given-point-lies-inside-a-polygon/)

More math resources; two different explanations of the same algorithm for determining if a point lies within a polygon. (I find that this comes up a lot, and not just in games either, so it's a nice tool to have at your fingertips).

* [Tiled Map Editor](https://www.mapeditor.org/)

I used Tiled to create all of the levels for this game, and overall I was pretty pleased. I have to say it wasn't a perfect match, some of the things I wanted to do regarding enemies and cameras and terminals felt kind of difficult to do, but I think that was my experience level more than the tool itself.

I ended up implementing a relatively serious post-processing step for the Tiled levels, to get them compact enough to include in the final app bundle, and this is where I merge in the rest of my level metadata as well.

* [miniMusic](https://xem.github.io/miniMusic/)

A small and simple music generator for the Web Audio API. The music for this game was composed on the "advanced" miniMusic composer. I ended up making a lot of changes to the generated javascript, but the original audio snippet came right from Maxime's generator.

* [Web Audio, the ugly click and the human ear](http://alemangui.github.io/blog//2015/12/26/ramp-to-value.html)

Excellent article that gives a couple ways to prevent oscillator "clicks". Your ears will thank you.

* [AdvanceCOMP](http://www.advancemame.it/download)

Additional compression tools that are quite nice for a competition like this (it's linked to on the js13kgames resources page as well). My experience is that the imagemin tool is already quite good, so `advpng` will likely only save you a handful of bytes, if any. However, `advzip` is great at squeezing those last 100 bytes out of your zip file, when you've already squeezed everything else you can.

