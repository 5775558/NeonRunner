/**
 * NeonRunner - 星际疾跑
 * Advanced Particle System
 * Manages high-performance visual effects like sparks, exhaust, and explosions.
 * Designed to provide the "neon" juice to the game's visuals.
 */

/**
 * @module systems/particles
 */

(function () {
    "use strict";

    /**
     * Particle System singleton.
     * Handles particle lifecycle and optimized rendering.
     */
    var ParticleSystem = {
        /** @type {Array} Active particle objects */
        pool: [],

        /** @type {number} Maximum number of concurrent particles */
        maxParticles: 500,

        /** @type {Object} Color palette for particles */
        colors: {
            spark: ["#0ff", "#fff", "#08f"],
            explosion: ["#f0f", "#f80", "#ff0"],
            exhaust: ["rgba(0,255,255,0.5)", "rgba(0,100,255,0.2)"]
        },

        /**
         * Initialize the particle system.
         */
        init: function () {
            this._log("Particle system initialized");
        },

        /**
         * Emit a burst of particles from a location.
         * @param {number} x - Screen X coordinate.
         * @param {number} y - Screen Y coordinate.
         * @param {Object} options - Custom particle properties.
         */
        emit: function (x, y, options) {
            var count = (options && options.count) || 20;
            var color = (options && options.color) || this.colors.spark[0];
            
            for (var i = 0; i < count; i++) {
                if (this.pool.length >= this.maxParticles) break;

                this.pool.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * ((options && options.speed) || 10),
                    vy: (Math.random() - 0.5) * ((options && options.speed) || 10),
                    size: Math.random() * 4 + 1,
                    life: 1.0,
                    decay: 0.01 + Math.random() * 0.03,
                    color: color,
                    gravity: (options && options.gravity) || 0.1
                });
            }
        },

        /**
         * Update all active particles.
         * @param {number} dt - Delta time multiplier.
         */
        update: function (dt) {
            for (var i = this.pool.length - 1; i >= 0; i--) {
                var p = this.pool[i];
                p.life -= p.decay * dt;
                
                if (p.life <= 0) {
                    this.pool.splice(i, 1);
                    continue;
                }

                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += p.gravity * dt;
            }
        },

        /**
         * Draw particles to the canvas context.
         * @param {CanvasRenderingContext2D} ctx - Canvas context.
         */
        draw: function (ctx) {
            ctx.save();
            for (var i = 0; i < this.pool.length; i++) {
                var p = this.pool[i];
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                
                // Add glow if high quality
                if (window.NeonRunner && window.NeonRunner.CONFIG && window.NeonRunner.CONFIG.GRAPHICS.GLOW_ENABLED) {
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = p.color;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        },

        /**
         * Log particle system messages.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner/Particles] " + msg);
        }
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.ParticleSystem = ParticleSystem;

    // Register with engine
    if (window.NeonRunner.Engine) {
        window.NeonRunner.Engine.onUpdate(function (state) {
            ParticleSystem.update(state.dtNormalized);
        });
        
        window.NeonRunner.Engine.onRender(function (ctx) {
            ParticleSystem.draw(ctx);
        });
    }
})();
