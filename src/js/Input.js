/**
 * Input handles game input (keyboard presses and mouse movement), allowing the routing
 * of these events to the appropriate place via event handlers.
 */
class Input {
    constructor(handlers) {
        // Input queue (used only for cheat codes)
        this.queue = [];

        // Map keys to in-game inputs
        this.map = [];
        this.map[87] = 'up';       // W
        this.map[83] = 'down';     // A
        this.map[65] = 'left';     // S
        this.map[68] = 'right';    // D
        this.map[38] = 'up';       // UpArrow
        this.map[40] = 'down';     // DownArrow
        this.map[37] = 'left';     // LeftArrow
        this.map[39] = 'right';    // RightArrow
        this.map[32] = 'toggle';   // Space
        this.map[13] = 'toggle';   // Enter
        this.map[27] = 'escape';   // Escape

        // TODO: A nice extension would be to have key remapping, which isn't that
        // hard - make the above settings configurable, add in a Keys menu, etc. etc.
        // Not going to bother for submission, though.

        // Key press handlers
        this.handlers = handlers;

        // Mouse location
        this.virtualMove = [];
        this.virtualX = 0;
        this.virtualY = 0;
        this.mouseAngle = 0;
    }

    init() {
        document.addEventListener('keydown', event => {
            let k = this.map[event.keyCode];

            // Uncomment to see key codes in console (an easy way to gather potential keys)
            // console.log(event.keyCode);

            if (k) {
                // Some keys are "stateful" (we evaluate each frame whether they are still
                // held down), other keys are more like events (we want to do something
                // specific one time on key press). Provide an API for both.
                //
                // Note: this is not only useful, it's also required in some cases -- for
                // example, the requestPointerLock() API call is ignored unless it is
                // triggered by a user input event.
                this[k] = true;

                if (this.handlers[k] && typeof this.handlers[k] === 'function') {
                    this.handlers[k]();
                } else if (this.handlers[k] && typeof this.handlers[k].down === 'function') {
                    this.handlers[k].down();
                }
            }
        });

        document.addEventListener('keyup', event => {
            let k = this.map[event.keyCode];

            this.queue.unshift(event.key);
            this.queue.splice(10);

            if (k) {
                this[k] = undefined;

                if (this.handlers[k] && typeof this.handlers[k].up === 'function') {
                    this.handlers[k].up();
                }
            }
        });

        document.addEventListener('mousemove', event => {
            this.handlers['mousemove'](event.movementX, event.movementY, event.clientX, event.clientY);
        });

        document.addEventListener('click', event => {
            // TODO: Today, we just treat a click as a click (like pressing spacebar).
            // This can be a little weird if the user clicks without ever moving the mouse.
            this.handlers['mouseclick']();
        });

        return this;
    }
}
