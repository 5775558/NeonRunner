/**
 * NeonRunner - 星际疾跑
 * Collision Detection System
 * Handles spatial partitioning and intersection testing between the player and world entities.
 * Optimized for high-speed runner gameplay.
 */

/**
 * @module systems/collision
 */

(function () {
    "use strict";

    /**
     * Collision System singleton.
     * Manages entity hitboxes and resolution logic.
     */
    var CollisionSystem = {
        /** @type {number} Collision tolerance padding */
        padding: 5,

        /** @type {boolean} Debug mode for showing hitboxes */
        debug: false,

        /**
         * Initialize the collision system.
         */
        init: function () {
            this._log("Collision system initialized");
        },

        /**
         * Main update loop for collision detection.
         * @param {Object} state - Current gameplay state.
         */
        update: function (state) {
            if (!state.active || state.playerState === "crashing") return;

            var player = state.entities.find(e => e.type === "player");
            if (!player) return;

            // Simple AABB collision detection
            for (var i = 0; i < state.entities.length; i++) {
                var entity = state.entities[i];
                if (entity.type === "player") continue;

                // First pass: Z-distance check (rough culling)
                var dz = Math.abs(entity.z - player.z);
                if (dz > 200) continue;

                // Second pass: Precise AABB intersection
                if (this.checkCollision(player, entity)) {
                    this._handleCollision(player, entity);
                }
            }
        },

        /**
         * Perform AABB (Axis-Aligned Bounding Box) intersection test.
         * @param {Object} a - First entity.
         * @param {Object} b - Second entity.
         * @returns {boolean} True if intersecting.
         */
        checkCollision: function (a, b) {
            // Note: In our 3D-ish world, X is horizontal, Y is vertical, Z is depth.
            // Width and height are defined in the entity objects.
            
            var aHalfW = (a.width || 60) / 2;
            var bHalfW = (b.width || 60) / 2;
            
            var horizontalMatch = Math.abs(a.x - b.x) < (aHalfW + bHalfW - this.padding);
            var verticalMatch = Math.abs(a.y - b.y) < ((a.height || 100) + (b.height || 100)) / 2;
            var depthMatch = Math.abs(a.z - b.z) < 50; // Z-depth tolerance

            return horizontalMatch && verticalMatch && depthMatch;
        },

        /**
         * Resolve the collision based on entity types.
         * @param {Object} player - The player entity.
         * @param {Object} entity - The entity collided with.
         * @private
         */
        _handleCollision: function (player, entity) {
            var Gameplay = window.NeonRunner.Gameplay;
            if (!Gameplay) return;

            this._log("Collision detected with: " + entity.type + " (" + entity.subType + ")");

            switch (entity.type) {
                case "obstacle":
                    Gameplay.onCollision(entity);
                    break;
                case "coin":
                    this._collectCoin(entity);
                    Gameplay.onCollision(entity);
                    break;
                case "powerup":
                    this._collectPowerup(entity);
                    Gameplay.onCollision(entity);
                    break;
            }
        },

        /**
         * Handle coin collection.
         * @param {Object} coin - The coin entity.
         * @private
         */
        _collectCoin: function (coin) {
            // Remove coin from game world
            var Gameplay = window.NeonRunner.Gameplay;
            var idx = Gameplay.entities.indexOf(coin);
            if (idx !== -1) {
                Gameplay.entities.splice(idx, 1);
            }

            // Spawn visual effect
            var Renderer = window.NeonRunner.Renderer;
            if (Renderer) {
                // Approximate screen coords for effect
                Renderer.spawnExplosion(window.innerWidth / 2, window.innerHeight / 2, "#ff0", 10);
            }
        },

        /**
         * Handle powerup collection.
         * @param {Object} pwr - The powerup entity.
         * @private
         */
        _collectPowerup: function (pwr) {
            var Gameplay = window.NeonRunner.Gameplay;
            
            // Remove from world
            var idx = Gameplay.entities.indexOf(pwr);
            if (idx !== -1) {
                Gameplay.entities.splice(idx, 1);
            }

            // Apply effect
            switch (pwr.subType) {
                case "shield":
                    Gameplay.player.shielded = true;
                    this._log("Shield activated");
                    break;
                case "magnet":
                    Gameplay.player.magnetActive = true;
                    setTimeout(() => Gameplay.player.magnetActive = false, 10000);
                    break;
                case "multiplier":
                    Gameplay.player.scoreMultiplier = 2.0;
                    setTimeout(() => Gameplay.player.scoreMultiplier = 1.0, 15000);
                    break;
                case "speed":
                    var oldSpeed = Gameplay.speed;
                    Gameplay.speed *= 1.5;
                    setTimeout(() => Gameplay.speed = oldSpeed, 5000);
                    break;
            }
        },

        /**
         * Log collision events.
         * @private
         */
        _log: function (msg) {
            if (this.debug) console.log("[NeonRunner/Collision] " + msg);
        }
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.CollisionSystem = CollisionSystem;

    // Hook into engine
    if (window.NeonRunner.Engine) {
        window.NeonRunner.Engine.onUpdate(function (state) {
            if (window.NeonRunner.Gameplay) {
                CollisionSystem.update(window.NeonRunner.Gameplay.getData());
            }
        });
    }
})();
