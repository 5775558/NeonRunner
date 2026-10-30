/**
 * NeonRunner - 星际疾跑
 * Input Handler Module
 * Manages keyboard, touch, and mouse input for game controls.
 * Supports lane switching, jumping, ducking, and action buttons.
 */

/**
 * @module gameplay/input
 */

(function () {
    "use strict";

    /**
     * Input action constants for event-driven game logic.
     * @readonly
     * @enum {string}
     */
    var InputAction = {
        LANE_LEFT: "lane_left",
        LANE_RIGHT: "lane_right",
        JUMP: "jump",
        DUCK: "duck",
        START: "start",
        PAUSE: "pause",
        RESTART: "restart",
        MENU_UP: "menu_up",
        MENU_DOWN: "menu_down",
        MENU_SELECT: "menu_select",
        MENU_BACK: "menu_back",
        AUDIO_TOGGLE: "audio_toggle",
        SWIPE_LEFT: "swipe_left",
        SWIPE_RIGHT: "swipe_right",
        SWIPE_UP: "swipe_up",
        SWIPE_DOWN: "swipe_down",
    };

    /**
     * Input handler singleton.
     * Collects all input sources and dispatches normalized actions.
     */
    var InputHandler = {
        /** @type {boolean} Whether touch input is available */
        touchEnabled: false,

        /** @type {boolean} Whether keyboard input is available */
        keyboardEnabled: true,

        /** @type {Object} Map of key codes to action names */
        keyMap: {
            ArrowLeft: InputAction.LANE_LEFT,
            KeyA: InputAction.LANE_LEFT,
            KeyZ: InputAction.LANE_LEFT,
            ArrowRight: InputAction.LANE_RIGHT,
            KeyD: InputAction.LANE_RIGHT,
            KeyE: InputAction.LANE_RIGHT,
            ArrowUp: InputAction.JUMP,
            KeyW: InputAction.JUMP,
            KeyX: InputAction.JUMP,
            Space: InputAction.JUMP,
            ArrowDown: InputAction.DUCK,
            KeyS: InputAction.DUCK,
            KeyC: InputAction.DUCK,
            Enter: InputAction.START,
            Escape: InputAction.PAUSE,
            KeyR: InputAction.RESTART,
            KeyM: InputAction.MENU_SELECT,
            KeyU: InputAction.MENU_UP,
            KeyK: InputAction.MENU_DOWN,
            KeyN: InputAction.MENU_BACK,
            KeyH: InputAction.MENU_BACK,
            KeyV: InputAction.AUDIO_TOGGLE,
            Digit1: InputAction.JUMP,
            Digit2: InputAction.LANE_RIGHT,
            Digit3: InputAction.LANE_LEFT,
        },

        /** @type {Array} Callbacks registered for specific actions */
        actionListeners: {},

        /** @type {Object} Current keyboard state */
        keyState: {},

        /** @type {number|null} Timestamp of last touch start */
        touchStartX: null,

        /** @type {number|null} Timestamp of last touch start Y */
        touchStartY: null,

        /** @type {number|null} Touch start timestamp */
        touchStartTime: null,

        /** @type {Object} Multi-touch tracking */
        touches: {},

        /** @type {boolean} Whether a swipe gesture is in progress */
        swipeInProgress: false,

        /** @type {number} Minimum swipe distance threshold in pixels */
        swipeThreshold: 50,

        /** @type {number} Maximum swipe duration in milliseconds */
        swipeMaxDuration: 300,

        /** @type {boolean} Whether the input system has been initialized */
        initialized: false,

        /** @type {string} Device type: 'desktop', 'tablet', or 'mobile' */
        deviceType: "desktop",

        /**
         * Initialize the input handler.
         * Sets up keyboard and touch event listeners.
         */
        init: function () {
            if (this.initialized) return;
            this._detectDevice();
            this._setupKeyboard();
            this._setupTouch();
            this.initialized = true;
            this._log("Input handler initialized for " + this.deviceType);
        },

        /**
         * Detect the device type based on screen size and touch capability.
         * @private
         */
        _detectDevice: function () {
            if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
                this.touchEnabled = true;
            }
            if (window.innerWidth &lt; 768) {
                this.deviceType = "mobile";
            } else if (window.innerWidth &lt; 1024) {
                this.deviceType = "tablet";
            } else {
                this.deviceType = "desktop";
            }
        },

        /**
         * Set up keyboard event listeners.
         * @private
         */
        _setupKeyboard: function () {
            var self = this;
            window.addEventListener("keydown", function (e) {
                self._onKeyDown(e);
            });
            window.addEventListener("keyup", function (e) {
                self._onKeyUp(e);
            });
        },

        /**
         * Set up touch event listeners for swipe gestures and tap actions.
         * @private
         */
        _setupTouch: function () {
            var self = this;
            var canvas = document.getElementById("game");
            if (!canvas) return;

            canvas.addEventListener("touchstart", function (e) {
                self._onTouchStart(e);
            }, { passive: false });

            canvas.addEventListener("touchmove", function (e) {
                self._onTouchMove(e);
            }, { passive: false });

            canvas.addEventListener("touchend", function (e) {
                self._onTouchEnd(e);
            }, { passive: false });

            canvas.addEventListener("touchcancel", function (e) {
                self._onTouchCancel(e);
            }, { passive: false });

            window.addEventListener("orientationchange", function () {
                setTimeout(function () {
                    self._handleResize();
                }, 200);
            });
        },

        /**
         * Handle keyboard key down events.
         * @param {KeyboardEvent} e - The keyboard event.
         * @private
         */
        _onKeyDown: function (e) {
            var action = this.keyMap[e.code];
            if (action) {
                e.preventDefault();
                e.stopPropagation();
                this.keyState[e.code] = true;
                this._dispatchAction(action, "keydown", e);
            }
            this.keyState[e.code] = true;
        },

        /**
         * Handle keyboard key up events.
         * @param {KeyboardEvent} e - The keyboard event.
         * @private
         */
        _onKeyUp: function (e) {
            this.keyState[e.code] = false;
            this._dispatchAction(action, "keyup", e);
        },

        /**
         * Handle touch start events.
         * @param {TouchEvent} e - The touch event.
         * @private
         */
        _onTouchStart: function (e) {
            e.preventDefault();
            var touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
            this.swipeInProgress = true;
        },

        /**
         * Handle touch move events for swipe detection.
         * @param {TouchEvent} e - The touch event.
         * @private
         */
        _onTouchMove: function (e) {
            e.preventDefault();
            if (!this.swipeInProgress) return;
            var touch = e.touches[0];
            var dx = touch.clientX - this.touchStartX;
            var dy = touch.clientY - this.touchStartY;
            var dt = Date.now() - this.touchStartTime;
            if (dt &gt; this.swipeMaxDuration) {
                this.swipeInProgress = false;
            }
        },

        /**
         * Handle touch end events and dispatch swipe actions.
         * @param {TouchEvent} e - The touch event.
         * @private
         */
        _onTouchEnd: function (e) {
            e.preventDefault();
            if (!this.swipeInProgress) return;
            var touch = e.changedTouches[0];
            var dx = touch.clientX - this.touchStartX;
            var dy = touch.clientY - this.touchStartY;
            var dt = Date.now() - this.touchStartTime;
            var absDx = Math.abs(dx);
            var absDy = Math.abs(dy);
            if (dt &lt; this.swipeMaxDuration) {
                if (absDx &gt; this.swipeThreshold &amp;&amp; absDx &gt; absDy) {
                    if (dx &gt; 0) {
                        this._dispatchAction(InputAction.LANE_RIGHT, "swipe");
                    } else {
                        this._dispatchAction(InputAction.LANE_LEFT, "swipe");
                    }
                } else if (absDy &gt; this.swipeThreshold &amp;&amp; absDy &gt; absDx) {
                    if (dy &lt; 0) {
                        this._dispatchAction(InputAction.JUMP, "swipe");
                    } else {
                        this._dispatchAction(InputAction.DUCK, "swipe");
                    }
                } else {
                    this._dispatchAction(InputAction.START, "tap");
                }
            }
            this.swipeInProgress = false;
            this.touchStartX = null;
            this.touchStartY = null;
            this.touchStartTime = null;
        },

        /**
         * Handle touch cancel events.
         * @param {TouchEvent} e - The touch event.
         * @private
         */
        _onTouchCancel: function (e) {
            this.swipeInProgress = false;
            this.touchStartX = null;
            this.touchStartY = null;
            this.touchStartTime = null;
        },

        /**
         * Handle window resize events.
         * @private
         */
        _handleResize: function () {
            this._detectDevice();
        },

        /**
         * Register a callback for a specific input action.
         * @param {string} action - The action name to listen for.
         * @param {Function} callback - The callback function.
         * @param {boolean} once - Whether to only call the callback once.
         */
        on: function (action, callback, once) {
            if (!this.actionListeners[action]) {
                this.actionListeners[action] = [];
            }
            this.actionListeners[action].push({
                callback: callback,
                once: once || false,
            });
        },

        /**
         * Unregister a callback for a specific input action.
         * @param {string} action - The action name.
         * @param {Function} callback - The callback function to remove.
         */
        off: function (action, callback) {
            if (!this.actionListeners[action]) return;
            this.actionListeners[action] = this.actionListeners[action].filter(
                function (listener) {
                    return listener.callback !== callback;
                }
            );
        },

        /**
         * Dispatch an action to all registered listeners.
         * @param {string} action - The action to dispatch.
         * @param {string} source - The input source (keydown, touch, etc.).
         * @param {Event} originalEvent - The original DOM event, if any.
         * @private
         */
        _dispatchAction: function (action, source, originalEvent) {
            if (!this.actionListeners[action]) return;
            var listeners = this.actionListeners[action];
            var toRemove = [];
            for (var i = 0; i &lt; listeners.length; i++) {
                try {
                    listeners[i].callback({
                        action: action,
                        source: source,
                        timestamp: Date.now(),
                        event: originalEvent,
                    });
                } catch (e) {
                    this._log("Action listener error: " + e.message);
                }
                if (listeners[i].once) {
                    toRemove.push(i);
                }
            }
            for (var j = toRemove.length - 1; j &gt;= 0; j--) {
                listeners.splice(toRemove[j], 1);
            }
        },

        /**
         * Check if a specific key is currently pressed.
         * @param {string} keyCode - The key code to check.
         * @returns {boolean} Whether the key is pressed.
         */
        isKeyPressed: function (keyCode) {
            return !!this.keyState[keyCode];
        },

        /**
         * Get all currently pressed keys.
         * @returns {Array} List of pressed key codes.
         */
        getPressedKeys: function () {
            var pressed = [];
            for (var key in this.keyState) {
                if (this.keyState[key]) {
                    pressed.push(key);
                }
            }
            return pressed;
        },

        /**
         * Reset the input state.
         */
        reset: function () {
            this.keyState = {};
            this.touchStartX = null;
            this.touchStartY = null;
            this.touchStartTime = null;
            this.swipeInProgress = false;
            this.actionListeners = {};
        },

        /**
         * Log a message prefixed with the module name.
         * @param {string} msg - The message to log.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner/Input] " + msg);
        },

        /**
         * Get a snapshot of the current input state.
         * @returns {Object} Current input state snapshot.
         */
        getState: function () {
            return {
                deviceType: this.deviceType,
                touchEnabled: this.touchEnabled,
                keyboardEnabled: this.keyboardEnabled,
                keyState: Object.assign({}, this.keyState),
                swipeInProgress: this.swipeInProgress,
            };
        },
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.InputHandler = InputHandler;
    window.NeonRunner.InputAction = InputAction;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            InputHandler.init();
        });
    } else {
        InputHandler.init();
    }
})();
