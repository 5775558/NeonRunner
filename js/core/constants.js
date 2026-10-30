/**
 * NeonRunner - 星际疾跑
 * Global Constants Module
 * Centralized configuration for game balance, visual parameters, and system settings.
 * All magic numbers should be defined here for easier maintenance.
 */

/**
 * @module core/constants
 */

(function () {
    "use strict";

    /**
     * Global game configuration.
     * @readonly
     */
    var CONFIG = {
        // Game Metadata
        VERSION: "1.0.0",
        TITLE: "NeonRunner",
        DEBUG: false,

        // World Dimensions
        WORLD_WIDTH: 3000,
        LANE_WIDTH: 600,
        LANE_COUNT: 3,
        HORIZON_Y: 0.45,
        SEGMENT_LENGTH: 200,

        // Player Physics
        PLAYER: {
            BASE_SPEED: 400,
            MAX_SPEED: 1500,
            ACCELERATION: 0.05,
            LANE_SWITCH_SPEED: 18,
            JUMP_POWER: 28,
            GRAVITY: 1.4,
            DUCK_DURATION: 650,
            COLLISION_RADIUS: 40
        },

        // Entity Spawning
        SPAWN: {
            INITIAL_INTERVAL: 1000,
            MIN_INTERVAL: 400,
            AHEAD_DISTANCE: 6000,
            MAX_ENTITIES: 50
        },

        // Visual Effects
        GRAPHICS: {
            TARGET_FPS: 60,
            PARTICLE_LIMIT: 200,
            GLOW_ENABLED: true,
            HIGH_QUALITY_STARS: 150
        },

        // Colors (Neon Palette)
        COLORS: {
            CYAN: "#00ffff",
            MAGENTA: "#ff00ff",
            YELLOW: "#ffff00",
            WHITE: "#ffffff",
            BLUE: "#0088ff",
            PURPLE: "#8800ff",
            DARK_BG: "#050515"
        },

        // Input Mappings
        CONTROLS: {
            LEFT: ["ArrowLeft", "KeyA"],
            RIGHT: ["ArrowRight", "KeyD"],
            JUMP: ["ArrowUp", "KeyW", "Space"],
            DUCK: ["ArrowDown", "KeyS"],
            PAUSE: ["Escape", "KeyP"]
        },

        // Audio Balance
        AUDIO: {
            DEFAULT_VOLUME: 0.5,
            BGM_FADE_SPEED: 0.5
        }
    };

    /**
     * Enumeration of entity types for identification.
     * @enum {number}
     */
    var ENTITY_TYPE = {
        PLAYER: 0,
        OBSTACLE: 1,
        COIN: 2,
        POWERUP: 3,
        DECORATION: 4
    };

    /**
     * Enumeration of powerup subtypes.
     * @enum {string}
     */
    var POWERUP_TYPE = {
        SHIELD: "shield",
        MAGNET: "magnet",
        MULTIPLIER: "multiplier",
        SPEED: "speed"
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.CONFIG = CONFIG;
    window.NeonRunner.ENTITY_TYPE = ENTITY_TYPE;
    window.NeonRunner.POWERUP_TYPE = POWERUP_TYPE;

    console.log("[NeonRunner/Constants] Configuration loaded.");
})();
