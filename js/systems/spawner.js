/**
 * NeonRunner - 星际疾跑
 * Procedural Spawner System
 * Responsible for generating obstacles, coins, and power-ups in the game world.
 * Uses a difficulty-based algorithm to balance challenge and reward.
 */

/**
 * @module systems/spawner
 */

(function () {
    "use strict";

    /**
     * Spawner System singleton.
     * Manages object pools and procedural generation logic.
     */
    var Spawner = {
        /** @type {number} Distance of the last spawned row */
        lastSpawnZ: 0,

        /** @type {number} Minimum distance between spawned rows */
        spawnInterval: 800,

        /** @type {number} Range ahead of the player to spawn objects */
        spawnAhead: 5000,

        /** @type {number} Probabilities for different row types */
        rowTypes: {
            EMPTY: 0,
            OBSTACLE_SINGLE: 1,
            OBSTACLE_DOUBLE: 2,
            OBSTACLE_TRIPLE: 3, // Rare/Difficult
            COINS_ONLY: 4,
            POWERUP: 5,
        },

        /** @type {Object} Obstacle definitions */
        obstacleTemplates: [
            { type: "barrier", height: 100, width: 200, canJump: true, canDuck: false },
            { type: "laser", height: 50, width: 600, canJump: false, canDuck: true, y: 150 },
            { type: "pillar", height: 500, width: 100, canJump: false, canDuck: false }
        ],

        /** @type {boolean} Whether the spawner is active */
        enabled: true,

        /** @type {number} Random seed for reproducible levels */
        seed: 12345,

        /**
         * Initialize the spawner system.
         */
        init: function () {
            this._log("Spawner system initialized");
            this.reset();
        },

        /**
         * Reset the spawner state for a new game.
         * @param {number} [seed] - Optional seed for randomization.
         */
        reset: function (seed) {
            this.lastSpawnZ = 0;
            this.seed = seed || Math.floor(Math.random() * 1000000);
            this.enabled = true;
            this._log("Spawner reset with seed: " + this.seed);
        },

        /**
         * Deterministic pseudo-random number generator.
         * @returns {number} A value between 0 and 1.
         * @private
         */
        _random: function () {
            var x = Math.sin(this.seed++) * 10000;
            return x - Math.floor(x);
        },

        /**
         * Update loop for the spawner.
         * @param {Object} state - Current gameplay state.
         */
        update: function (state) {
            if (!this.enabled || !state.active) return;

            var currentZ = state.distance;
            
            // Check if it's time to spawn a new row of entities
            if (currentZ + this.spawnAhead > this.lastSpawnZ + this.spawnInterval) {
                this.lastSpawnZ += this.spawnInterval;
                this._spawnRow(this.lastSpawnZ, state.difficulty);
            }
        },

        /**
         * Generate a row of entities across the 3 lanes.
         * @param {number} z - The Z-coordinate for the row.
         * @param {number} difficulty - Current difficulty level.
         * @private
         */
        _spawnRow: function (z, difficulty) {
            var rng = this._random();
            var gameplay = window.NeonRunner.Gameplay;
            if (!gameplay) return;

            // Determine what to spawn based on RNG and difficulty
            if (rng < 0.1) {
                // Empty space
            } else if (rng < 0.4) {
                this._spawnObstacles(z, 1, difficulty);
            } else if (rng < 0.6) {
                this._spawnObstacles(z, 2, difficulty);
            } else if (rng < 0.85) {
                this._spawnCoins(z);
            } else if (rng < 0.95) {
                this._spawnPowerup(z);
            } else {
                // High difficulty row
                if (difficulty > 5) {
                    this._spawnObstacles(z, 2, difficulty);
                    this._spawnCoins(z);
                }
            }
        },

        /**
         * Create obstacles in specific lanes.
         * @param {number} z - World Z position.
         * @param {number} count - Number of obstacles in the row.
         * @param {number} difficulty - Difficulty scale.
         * @private
         */
        _spawnObstacles: function (z, count, difficulty) {
            var lanes = [-600, 0, 600];
            var occupied = [];
            
            for (var i = 0; i < count; i++) {
                if (occupied.length >= 3) break;
                
                var laneIdx = Math.floor(this._random() * 3);
                while (occupied.indexOf(laneIdx) !== -1) {
                    laneIdx = (laneIdx + 1) % 3;
                }
                occupied.push(laneIdx);

                var template = this.obstacleTemplates[Math.floor(this._random() * this.obstacleTemplates.length)];
                
                window.NeonRunner.Gameplay.entities.push({
                    type: "obstacle",
                    subType: template.type,
                    id: "obs_" + z + "_" + i,
                    x: lanes[laneIdx],
                    y: template.y || 0,
                    z: z,
                    width: template.width,
                    height: template.height,
                    canJump: template.canJump,
                    canDuck: template.canDuck
                });
            }
        },

        /**
         * Create a sequence of coins.
         * @param {number} z - World Z position.
         * @private
         */
        _spawnCoins: function (z) {
            var lanes = [-600, 0, 600];
            var laneIdx = Math.floor(this._random() * 3);
            var x = lanes[laneIdx];
            
            // Spawn a line of 5 coins
            for (var i = 0; i < 5; i++) {
                window.NeonRunner.Gameplay.entities.push({
                    type: "coin",
                    id: "coin_" + z + "_" + i,
                    x: x,
                    y: 50,
                    z: z + (i * 200),
                    width: 40,
                    height: 40
                });
            }
        },

        /**
         * Create a power-up entity.
         * @param {number} z - World Z position.
         * @private
         */
        _spawnPowerup: function (z) {
            var lanes = [-600, 0, 600];
            var laneIdx = Math.floor(this._random() * 3);
            var types = ["shield", "magnet", "multiplier", "speed"];
            var subType = types[Math.floor(this._random() * types.length)];

            window.NeonRunner.Gameplay.entities.push({
                type: "powerup",
                subType: subType,
                id: "pwr_" + z,
                x: lanes[laneIdx],
                y: 50,
                z: z,
                width: 50,
                height: 50
            });
        },

        /**
         * Log spawner activity.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner/Spawner] " + msg);
        }
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.Spawner = Spawner;

    // Hook into engine update
    if (window.NeonRunner.Engine) {
        window.NeonRunner.Engine.onUpdate(function (state) {
            if (window.NeonRunner.Gameplay) {
                Spawner.update(window.NeonRunner.Gameplay.getData());
            }
        });
    }
})();
