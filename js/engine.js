/**
 * NeonRunner - 星际疾跑
 * Core Game Engine Module
 * Provides the foundational game loop, state management, and timing system.
 * All game subsystems (rendering, physics, audio, input, UI) hook into this engine.
 */

/**
 * @module core/engine
 */

(function () {
    "use strict";

    /**
     * Game engine singleton.
     * Manages the main loop, time step, frame rate, and overall game state transitions.
     */
    var Engine = {
        /** @type {HTMLCanvasElement} */
        canvas: null,

        /** @type {CanvasRenderingContext2D} */
        ctx: null,

        /** @type {number} Current delta time in milliseconds */
        deltaTime: 0,

        /** @type {number} Current timestamp from requestAnimationFrame */
        now: 0,

        /** @type {number} Timestamp of the previous frame */
        lastTime: 0,

        /** @type {number} Target frames per second */
        targetFPS: 60,

        /** @type {number} Frame interval in ms */
        frameInterval: 1000 / 60,

        /** @type {string} Current game state machine state */
        state: "menu",

        /** @type {Array} List of registered update callbacks */
        onUpdate: [],

        /** @type {Array} List of registered render callbacks */
        onRender: [],

        /** @type {Array} List of registered post-render callbacks */
        onPostRender: [],

        /** @type {boolean} Whether the engine is running */
        running: false,

        /** @type {boolean} Whether the game is paused */
        paused: false,

        /** @type {number} Total frames rendered */
        frameCount: 0,

        /** @type {number} Real-time accumulation counter for adaptive tick */
        accumulator: 0,

        /** @type {number} Current measured FPS */
        currentFPS: 60,

        /** @type {number} Frames accumulated for FPS counter update */
        fpsCounter: 0,

        /** @type {number} Timestamp for FPS measurement */
        fpsLastTime: 0,

        /** @type {number} Master speed multiplier (can be modified by powerups) */
        speedMultiplier: 1.0,

        /** @type {number} Fixed time step in ms for deterministic physics */
        fixedDelta: 16.666,

        /**
         * Initialize the game engine.
         * @param {HTMLCanvasElement} canvas - The canvas element to render to.
         * @param {Object} options - Configuration options for the engine.
         */
        init: function (canvas, options) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d", {
                alpha: false,
                antialias: false,
            });
            this.targetFPS = (options && options.fps) || 60;
            this.frameInterval = 1000 / this.targetFPS;
            this.fixedDelta = 1000 / this.targetFPS;
            this.running = true;
            this.lastTime = performance.now();
            this.now = this.lastTime;
            this.paused = false;
            this.frameCount = 0;
            this.accumulator = 0;
            this.speedMultiplier = 1.0;
            this.fpsCounter = 0;
            this.fpsLastTime = this.lastTime;
            window.addEventListener("resize", this._onResize.bind(this));
            this._log("Engine initialized at " + this.targetFPS + " FPS");
        },

        /**
         * Start the main game loop.
         */
        start: function () {
            if (this.running) return;
            this.running = true;
            this.lastTime = performance.now();
            this._loop();
        },

        /**
         * Stop the main game loop.
         */
        stop: function () {
            this.running = false;
        },

        /**
         * Pause the game.
         */
        pause: function () {
            this.paused = true;
        },

        /**
         * Resume the game from pause.
         */
        resume: function () {
            this.paused = false;
            this.lastTime = performance.now();
        },

        /**
         * Set the game state (menu, playing, paused, gameover, settings).
         * @param {string} newState - The new state to transition to.
         */
        setState: function (newState) {
            if (this.state === newState) return;
            this._log("State transition: " + this.state + " -> " + newState);
            this.state = newState;
            if (newState === "playing") {
                this.paused = false;
                this.speedMultiplier = 1.0;
            }
        },

        /**
         * Register a callback to be called every update frame.
         * @param {Function} callback - The update function.
         */
        onUpdate: function (callback) {
            if (typeof callback === "function") {
                this.onUpdate.push(callback);
            }
        },

        /**
         * Register a callback to be called every render frame.
         * @param {Function} callback - The render function.
         */
        onRender: function (callback) {
            if (typeof callback === "function") {
                this.onRender.push(callback);
            }
        },

        /**
         * Register a callback to be called after rendering.
         * @param {Function} callback - The post-render function.
         */
        onPostRender: function (callback) {
            if (typeof callback === "function") {
                this.onPostRender.push(callback);
            }
        },

        /**
         * Main game loop using fixed time step with accumulator.
         * @private
         */
        _loop: function () {
            var self = this;
            if (!this.running) return;

            requestAnimationFrame(function () {
                self._loop();
            });

            this.now = performance.now();
            this.deltaTime = this.now - this.lastTime;
            if (this.deltaTime > 100) {
                this.deltaTime = 100;
            }
            this.lastTime = this.now;

            if (this.paused) {
                return;
            }

            this.accumulator += this.deltaTime;

            while (this.accumulator >= this.fixedDelta) {
                this._update(this.fixedDelta);
                this.accumulator -= this.fixedDelta;
            }

            this._render(this.accumulator / this.fixedDelta);

            this.frameCount++;
            this.fpsCounter++;
            if (this.now - this.fpsLastTime >= 1000) {
                this.currentFPS = this.fpsCounter;
                this.fpsCounter = 0;
                this.fpsLastTime = this.now;
            }
        },

        /**
         * Run all update callbacks.
         * @param {number} dt - The fixed delta time in ms.
         * @private
         */
        _update: function (dt) {
            var scale = dt / this.fixedDelta;
            var stateData = {
                dt: dt * scale,
                dtNormalized: scale,
                state: this.state,
                frameCount: this.frameCount,
                fps: this.currentFPS,
                speedMultiplier: this.speedMultiplier,
            };

            for (var i = 0; i &lt; this.onUpdate.length; i++) {
                try {
                    this.onUpdate[i](stateData);
                } catch (e) {
                    this._log("Update error: " + e.message);
                }
            }
        },

        /**
         * Run all render callbacks.
         * @param {number} alpha - Interpolation factor [0,1].
         * @private
         */
        _render: function (alpha) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this._clearBackground();

            for (var i = 0; i &lt; this.onRender.length; i++) {
                try {
                    this.onRender[i](this.ctx, alpha);
                } catch (e) {
                    this._log("Render error: " + e.message);
                }
            }

            for (var j = 0; j &lt; this.onPostRender.length; j++) {
                try {
                    this.onPostRender[j](this.ctx);
                } catch (e) {
                    this._log("Post-render error: " + e.message);
                }
            }
        },

        /**
         * Draw the default background gradient.
         * @private
         */
        _clearBackground: function () {
            var w = this.canvas.width;
            var h = this.canvas.height;
            var grad = this.ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, "#0a0a2e");
            grad.addColorStop(0.5, "#1a0a3e");
            grad.addColorStop(1, "#0a1a2e");
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, w, h);
        },

        /**
         * Handle window resize events.
         * @private
         */
        _onResize: function () {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this._log("Canvas resized to " + this.canvas.width + "x" + this.canvas.height);
        },

        /**
         * Log a message to the console with a timestamp prefix.
         * @param {string} msg - The message to log.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner] " + msg);
        },

        /**
         * Get a snapshot of engine stats.
         * @returns {Object} Current engine statistics.
         */
        getStats: function () {
            return {
                state: this.state,
                fps: this.currentFPS,
                frameCount: this.frameCount,
                deltaTime: this.deltaTime,
                speedMultiplier: this.speedMultiplier,
                paused: this.paused,
            };
        },

        /**
         * Reset the engine to initial state.
         */
        reset: function () {
            this.running = false;
            this.paused = false;
            this.state = "menu";
            this.speedMultiplier = 1.0;
            this.frameCount = 0;
            this.accumulator = 0;
            this.onUpdate.length = 0;
            this.onRender.length = 0;
            this.onPostRender.length = 0;
        },
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.Engine = Engine;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            var canvas = document.getElementById("game");
            if (canvas) {
                Engine.init(canvas);
                Engine.start();
            }
        });
    } else {
        var canvas = document.getElementById("game");
        if (canvas) {
            Engine.init(canvas);
            Engine.start();
        }
    }
})();
