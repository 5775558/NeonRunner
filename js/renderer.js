/**
 * NeonRunner - 星际疾跑
 * Graphics Renderer Module
 * Handles all 2D and pseudo-3D canvas rendering, particle systems, and visual effects.
 * Optimized for high-performance neon aesthetics.
 */

/**
 * @module gameplay/renderer
 */

(function () {
    "use strict";

    /**
     * Renderer singleton.
     * Manages the drawing pipeline, camera projection, and visual assets.
     */
    var Renderer = {
        /** @type {Object} Camera configuration for pseudo-3D effect */
        camera: {
            x: 0,
            y: 0,
            z: 0,
            fov: 100,
            depth: 0.8,
            screenDist: 0,
            horizon: 0.45, // Vertical position of the horizon [0,1]
        },

        /** @type {Array} Active particle systems */
        particles: [],

        /** @type {Object} Color palette for neon theme */
        colors: {
            cyan: "#00ffff",
            magenta: "#ff00ff",
            yellow: "#ffff00",
            white: "#ffffff",
            bgStart: "#0a0a2e",
            bgEnd: "#000000",
            lane: "rgba(0, 255, 255, 0.2)",
            laneEdge: "rgba(0, 255, 255, 0.5)",
            glowCyan: "rgba(0, 255, 255, 0.3)",
            glowMagenta: "rgba(255, 0, 255, 0.3)",
        },

        /** @type {number} Global brightness factor for flicker effects */
        brightness: 1.0,

        /** @type {boolean} High quality mode (glow, particles) */
        highQuality: true,

        /** @type {number} Road width constant */
        roadWidth: 2000,

        /** @type {number} Lane width constant */
        laneWidth: 600,

        /** @type {number} Segment length for the road track */
        segmentLength: 200,

        /**
         * Initialize the renderer.
         * @param {CanvasRenderingContext2D} ctx - The canvas context.
         */
        init: function (ctx) {
            this._log("Renderer initialized");
            this._updateScreenDist(ctx.canvas.width);
        },

        /**
         * Update camera and screen parameters based on canvas size.
         * @param {number} width - Canvas width.
         * @private
         */
        _updateScreenDist: function (width) {
            this.camera.screenDist = 1 / Math.tan(((this.camera.fov / 2) * Math.PI) / 180);
        },

        /**
         * Transform 3D coordinates to 2D screen coordinates.
         * @param {number} x - 3D X position (world).
         * @param {number} y - 3D Y position (world).
         * @param {number} z - 3D Z position (world).
         * @param {number} canvasW - Canvas width.
         * @param {number} canvasH - Canvas height.
         * @returns {Object} Screen coordinates and scale.
         */
        project: function (x, y, z, canvasW, canvasH) {
            var relativeZ = z - this.camera.z;
            if (relativeZ <= 0) return null;

            var scale = this.camera.screenDist / relativeZ;
            var screenX = (canvasW / 2) + (x - this.camera.x) * scale * (canvasW / 2);
            var screenY = (canvasH * this.camera.horizon) - (y - this.camera.y) * scale * (canvasH / 2);
            var screenW = scale * this.roadWidth * (canvasW / 2);

            return {
                x: screenX,
                y: screenY,
                w: screenW,
                scale: scale,
            };
        },

        /**
         * Main render entry point.
         * @param {CanvasRenderingContext2D} ctx - The canvas context.
         * @param {Object} gameState - Current game state data.
         * @param {number} alpha - Frame interpolation factor.
         */
        render: function (ctx, gameState, alpha) {
            var w = ctx.canvas.width;
            var h = ctx.canvas.height;

            this._updateScreenDist(w);
            this._drawBackground(ctx, w, h);
            this._drawRoad(ctx, w, h, gameState.distance);
            this._drawEntities(ctx, w, h, gameState.entities);
            this._drawParticles(ctx, alpha);
            this._drawHUDOverlay(ctx, w, h, gameState);
        },

        /**
         * Draw the scrolling neon road.
         * @private
         */
        _drawRoad: function (ctx, w, h, distance) {
            var startZ = distance;
            var segments = 50;
            var horizonY = h * this.camera.horizon;

            ctx.save();

            // Draw road background
            ctx.fillStyle = "#050515";
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(w, h);
            ctx.lineTo(w / 2 + 100, horizonY);
            ctx.lineTo(w / 2 - 100, horizonY);
            ctx.fill();

            // Draw lanes
            for (var n = 0; n < segments; n++) {
                var z1 = (Math.floor(startZ / this.segmentLength) + n) * this.segmentLength;
                var z2 = z1 + this.segmentLength;

                var p1 = this.project(0, 0, z1, w, h);
                var p2 = this.project(0, 0, z2, w, h);

                if (!p1 || !p2) continue;

                // Alternate lane colors for sense of speed
                var isEven = Math.floor(z1 / this.segmentLength) % 2 === 0;
                ctx.strokeStyle = isEven ? this.colors.lane : "transparent";
                ctx.lineWidth = 2;

                // Center lane markers
                this._drawLaneMarker(ctx, p1, p2, 0);
                this._drawLaneMarker(ctx, p1, p2, -0.6); // Left
                this._drawLaneMarker(ctx, p1, p2, 0.6);  // Right
            }

            ctx.restore();
        },

        /**
         * Helper to draw a lane line.
         * @private
         */
        _drawLaneMarker: function (ctx, p1, p2, offset) {
            var x1 = p1.x + offset * p1.w;
            var x2 = p2.x + offset * p2.w;
            ctx.beginPath();
            ctx.moveTo(x1, p1.y);
            ctx.lineTo(x2, p2.y);
            ctx.stroke();
        },

        /**
         * Draw game entities (player, obstacles, coins).
         * @private
         */
        _drawEntities: function (ctx, w, h, entities) {
            if (!entities) return;

            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                var p = this.project(entity.x, entity.y, entity.z, w, h);

                if (!p || p.scale < 0.01) continue;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.scale(p.scale, p.scale);

                switch (entity.type) {
                    case "player":
                        this._drawPlayer(ctx, entity);
                        break;
                    case "obstacle":
                        this._drawObstacle(ctx, entity);
                        break;
                    case "coin":
                        this._drawCoin(ctx, entity);
                        break;
                    case "powerup":
                        this._drawPowerup(ctx, entity);
                        break;
                }

                ctx.restore();
            }
        },

        /**
         * Draw the player character.
         * @private
         */
        _drawPlayer: function (ctx, player) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.colors.cyan;
            ctx.fillStyle = this.colors.cyan;

            // Simple original placeholder: a sleek triangular ship/runner
            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(30, 20);
            ctx.lineTo(0, 0);
            ctx.lineTo(-30, 20);
            ctx.closePath();
            ctx.fill();

            // Glow core
            ctx.fillStyle = "#fff";
            ctx.fillRect(-5, -20, 10, 20);
        },

        /**
         * Draw a neon obstacle.
         * @private
         */
        _drawObstacle: function (ctx, obs) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.colors.magenta;
            ctx.strokeStyle = this.colors.magenta;
            ctx.lineWidth = 5;

            var size = obs.size || 60;
            ctx.strokeRect(-size/2, -size, size, size);

            // Warning pattern
            ctx.beginPath();
            ctx.moveTo(-size/2, -size);
            ctx.lineTo(size/2, 0);
            ctx.moveTo(size/2, -size);
            ctx.lineTo(-size/2, 0);
            ctx.stroke();
        },

        /**
         * Draw a collectible coin.
         * @private
         */
        _drawCoin: function (ctx, coin) {
            var rot = (Date.now() / 200) % (Math.PI * 2);
            ctx.rotate(rot);
            ctx.shadowBlur = 12;
            ctx.shadowColor = this.colors.yellow;
            ctx.fillStyle = this.colors.yellow;

            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
        },

        /**
         * Draw a power-up item.
         * @private
         */
        _drawPowerup: function (ctx, p) {
            var pulse = Math.sin(Date.now() / 150) * 0.2 + 1.0;
            ctx.scale(pulse, pulse);
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.colors.white;

            ctx.fillStyle = p.subType === "shield" ? "#4f4" : "#f44";
            ctx.beginPath();
            ctx.moveTo(0, -30);
            ctx.lineTo(30, 0);
            ctx.lineTo(0, 30);
            ctx.lineTo(-30, 0);
            ctx.closePath();
            ctx.fill();
        },

        /**
         * Draw particle effects.
         * @private
         */
        _drawParticles: function (ctx, alpha) {
            for (var i = this.particles.length - 1; i >= 0; i--) {
                var p = this.particles[i];
                p.life -= 0.02;
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }

                p.x += p.vx;
                p.y += p.vy;

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        },

        /**
         * Spawn particles at a location.
         * @param {number} x - Screen X.
         * @param {number} y - Screen Y.
         * @param {string} color - Particle color.
         * @param {number} count - Number of particles.
         */
        spawnExplosion: function (x, y, color, count) {
            for (var i = 0; i < count; i++) {
                this.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    size: Math.random() * 5 + 2,
                    life: 1.0,
                    color: color || this.colors.cyan,
                });
            }
        },

        /**
         * Draw static background elements (stars, nebula).
         * @private
         */
        _drawBackground: function (ctx, w, h) {
            var grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, this.colors.bgStart);
            grad.addColorStop(1, this.colors.bgEnd);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Draw distant stars
            ctx.fillStyle = "#fff";
            var time = Date.now() * 0.001;
            for (var i = 0; i < 100; i++) {
                var x = (Math.sin(i * 543.21) * 0.5 + 0.5) * w;
                var y = (Math.cos(i * 123.45) * 0.5 + 0.5) * h * 0.6;
                var s = (Math.sin(time + i) * 0.5 + 0.5) * 2;
                ctx.fillRect(x, y, s, s);
            }
        },

        /**
         * Draw canvas-based HUD elements.
         * @private
         */
        _drawHUDOverlay: function (ctx, w, h, state) {
            if (state.engineState !== "playing") return;

            // Draw speed meter (bottom right)
            ctx.save();
            ctx.translate(w - 100, h - 100);
            ctx.strokeStyle = this.colors.cyan;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 60, Math.PI * 0.8, Math.PI * 2.2);
            ctx.stroke();

            var speedRatio = Math.min(state.speed / 100, 1.0);
            var angle = Math.PI * 0.8 + (Math.PI * 1.4 * speedRatio);
            ctx.strokeStyle = "#fff";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 50, Math.sin(angle) * 50);
            ctx.stroke();
            ctx.restore();
        },

        /**
         * Log a message.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner/Renderer] " + msg);
        },
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.Renderer = Renderer;
})();
