/**
 * NeonRunner - 星际疾跑
 * Gameplay Logic Module
 * Manages the player character, lane movement, jumping, ducking, and world progression.
 * Implements the core 3-lane runner mechanics.
 */

/**
 * @module gameplay/logic
 */

(function () {
    "use strict";

    /**
     * Gameplay Manager singleton.
     * Handles the active game session and player entity.
     */
    var Gameplay = {
        /** @type {Object} Player state and properties */
        player: {
            lane: 0, // -1: Left, 0: Center, 1: Right
            targetLane: 0,
            x: 0,
            y: 0,
            z: 0,
            width: 60,
            height: 100,
            
            // Movement physics
            laneWidth: 600,
            laneSwitchSpeed: 15,
            
            // Jumping & Gravity
            isJumping: false,
            jumpVelocity: 0,
            jumpPower: 25,
            gravity: 1.2,
            groundY: 0,
            
            // Ducking
            isDucking: false,
            duckDuration: 600,
            duckTimer: 0,
            
            // Visual/State
            state: "running", // running, jumping, ducking, crashing
            shielded: false,
            scoreMultiplier: 1.0,
            magnetActive: false,
        },

        /** @type {number} Distance traveled in world units */
        distance: 0,

        /** @type {number} Current running speed */
        speed: 400,

        /** @type {number} Maximum speed cap */
        maxSpeed: 1200,

        /** @type {number} Speed acceleration per frame */
        acceleration: 0.1,

        /** @type {number} Current score */
        score: 0,

        /** @type {Array} Active entities in the world */
        entities: [],

        /** @type {boolean} Game session active flag */
        active: false,

        /** @type {number} Difficulty level [1-10] */
        difficulty: 1,

        /** @type {Object} Configuration for lane positions */
        lanes: {
            left: -600,
            center: 0,
            right: 600
        },

        /**
         * Initialize gameplay systems.
         */
        init: function () {
            this._log("Gameplay logic initialized");
            this.reset();
            this._bindInputs();
        },

        /**
         * Bind input actions to gameplay commands.
         * @private
         */
        _bindInputs: function () {
            var self = this;
            var Input = window.NeonRunner.InputHandler;
            var Actions = window.NeonRunner.InputAction;

            if (!Input) return;

            Input.on(Actions.LANE_LEFT, function () {
                self.moveLane(-1);
            });

            Input.on(Actions.LANE_RIGHT, function () {
                self.moveLane(1);
            });

            Input.on(Actions.JUMP, function () {
                self.jump();
            });

            Input.on(Actions.DUCK, function () {
                self.duck();
            });
        },

        /**
         * Reset the game session to start state.
         */
        reset: function () {
            this.player.lane = 0;
            this.player.targetLane = 0;
            this.player.x = 0;
            this.player.y = 0;
            this.player.z = 0;
            this.player.isJumping = false;
            this.player.isDucking = false;
            this.player.state = "running";
            
            this.distance = 0;
            this.speed = 400;
            this.score = 0;
            this.entities = [];
            this.active = true;
            this.difficulty = 1;

            // Add player as an entity for the renderer
            this.entities.push({
                type: "player",
                id: "p1",
                x: 0, y: 0, z: 0
            });
            
            this._log("Game session reset");
        },

        /**
         * Move the player to a different lane.
         * @param {number} dir - Direction (-1 for left, 1 for right).
         */
        moveLane: function (dir) {
            if (!this.active || this.player.state === "crashing") return;
            
            var newLane = this.player.targetLane + dir;
            if (newLane >= -1 && newLane <= 1) {
                this.player.targetLane = newLane;
                this._log("Switching to lane: " + newLane);
            }
        },

        /**
         * Trigger player jump.
         */
        jump: function () {
            if (!this.active || this.player.isJumping || this.player.isDucking) return;
            
            this.player.isJumping = true;
            this.player.jumpVelocity = this.player.jumpPower;
            this.player.state = "jumping";
        },

        /**
         * Trigger player duck/roll.
         */
        duck: function () {
            if (!this.active || this.player.isDucking) return;
            
            // Fast fall if jumping
            if (this.player.isJumping) {
                this.player.jumpVelocity = -this.player.jumpPower;
            }

            this.player.isDucking = true;
            this.player.duckTimer = this.player.duckDuration;
            this.player.state = "ducking";
        },

        /**
         * Main update loop for gameplay logic.
         * @param {Object} state - Engine state data.
         */
        update: function (state) {
            if (!this.active || state.state !== "playing") return;

            var dt = state.dtNormalized;

            // Update movement
            this._updatePlayerPhysics(dt);
            this._updateWorld(dt);
            this._updateDifficulty();
            
            // Sync player entity for renderer
            var pEntity = this.entities.find(e => e.type === "player");
            if (pEntity) {
                pEntity.x = this.player.x;
                pEntity.y = this.player.y;
                pEntity.z = this.player.z + 500; // Offset forward for camera view
            }
        },

        /**
         * Handle player movement and physics calculations.
         * @private
         */
        _updatePlayerPhysics: function (dt) {
            var p = this.player;

            // Lane interpolation
            var targetX = p.targetLane * p.laneWidth;
            if (p.x !== targetX) {
                var dx = targetX - p.x;
                var step = p.laneSwitchSpeed * dt * 10;
                if (Math.abs(dx) < step) {
                    p.x = targetX;
                    p.lane = p.targetLane;
                } else {
                    p.x += Math.sign(dx) * step;
                }
            }

            // Jump physics
            if (p.isJumping) {
                p.y += p.jumpVelocity * dt;
                p.jumpVelocity -= p.gravity * dt;
                
                if (p.y <= p.groundY) {
                    p.y = p.groundY;
                    p.isJumping = false;
                    p.jumpVelocity = 0;
                    if (!p.isDucking) p.state = "running";
                }
            }

            // Duck timer
            if (p.isDucking) {
                p.duckTimer -= dt * 16.66;
                if (p.duckTimer <= 0) {
                    p.isDucking = false;
                    if (!p.isJumping) p.state = "running";
                }
            }
        },

        /**
         * Update world progression and scoring.
         * @private
         */
        _updateWorld: function (dt) {
            var frameSpeed = this.speed * (dt / 60);
            this.distance += frameSpeed;
            this.score += frameSpeed * this.player.scoreMultiplier * 0.1;
            
            // Gradually increase speed
            if (this.speed < this.maxSpeed) {
                this.speed += this.acceleration * dt;
            }

            // Remove far behind entities
            for (var i = this.entities.length - 1; i >= 0; i--) {
                var e = this.entities[i];
                if (e.type !== "player" && e.z < this.distance - 1000) {
                    this.entities.splice(i, 1);
                }
            }
        },

        /**
         * Dynamically adjust game difficulty.
         * @private
         */
        _updateDifficulty: function () {
            this.difficulty = Math.min(10, 1 + Math.floor(this.distance / 5000));
        },

        /**
         * Handle collision with an object.
         * @param {Object} entity - The entity collided with.
         */
        onCollision: function (entity) {
            if (entity.type === "obstacle") {
                if (this.player.shielded) {
                    this.player.shielded = false;
                    // Trigger effect
                    this._log("Shield absorbed collision");
                } else {
                    this.gameOver();
                }
            } else if (entity.type === "coin") {
                this.score += 100;
                // Play sound, etc.
            }
        },

        /**
         * End the game session.
         */
        gameOver: function () {
            this.active = false;
            this.player.state = "crashing";
            this._log("Game Over! Score: " + Math.floor(this.score));
            
            if (window.NeonRunner.Engine) {
                window.NeonRunner.Engine.setState("gameover");
            }
        },

        /**
         * Log gameplay events.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner/Gameplay] " + msg);
        },

        /**
         * Get current session data.
         * @returns {Object}
         */
        getData: function () {
            return {
                distance: Math.floor(this.distance),
                score: Math.floor(this.score),
                speed: Math.floor(this.speed),
                entities: this.entities,
                playerState: this.player.state,
                difficulty: this.difficulty
            };
        }
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.Gameplay = Gameplay;

    // Register with engine if available
    if (window.NeonRunner.Engine) {
        window.NeonRunner.Engine.onUpdate(function (state) {
            Gameplay.update(state);
        });
        
        // Initial setup
        Gameplay.init();
    }
})();
