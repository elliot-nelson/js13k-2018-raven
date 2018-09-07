# js13k-2018-raven

My 2018 entry for the js13kgames compo, "Raven".

## Description

In this 2D top-down action-puzzle game, the security cameras for a top-secret facility have been taken offline, and it is YOUR job to fix the problem. Take on a series of floors overrun by mysterious enemies known only as "Raven" -- although harmless as long as you can see them, they are deadly if you turn your back.

Playable on the desktop in Chrome, Firefox, and Safari (although the experience in Safari is not quite as nice). Use your mouse to look around, and W/A/S/D or the arrow keys to move.

Good luck!

## Building the game

- `/src` contains the game source files and assets
- `/raven` contains the build output (playable game w/index.html)
- `/zip` contains the built game bundled into a zip file

To rebuild, `npm install && gulp build` from the project folder.

Build the zip file with `gulp zip`, or to get the smallest possible size, `gulp zip:pre && gulp zip && gulp zip:post`. Using the `pre` and `post` steps requires additional tools (`advpng` and `advzip`, from http://www.advancemame.it/download).

## Implementation notes

Coming soon...

