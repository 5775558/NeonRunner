/**
 * NeonRunner - 星际疾跑
 * Data Storage Module
 * Manages local persistence for high scores, player progress, settings, and unlockables.
 * Uses localStorage with versioning for future compatibility.
 */

/**
 * @module data/storage
 */

(function () {
    "use strict";

    /**
     * Storage System singleton.
     * Encapsulates all browser-based persistent data operations.
     */
    var Storage = {
        /** @type {string} Prefix for localStorage keys to avoid collisions */
        keyPrefix: "neonrunner_",

        /** @type {string} Current data schema version */
        version: "1.0.0",

        /** @type {Object} Default game data structure */
        defaults: {
            highScore: 0,
            totalDistance: 0,
            totalCoins: 0,
            currency: 0,
            unlockedCharacters: ["default"],
            activeCharacter: "default",
            settings: {
                musicVolume: 0.5,
                sfxVolume: 0.7,
                showFPS: false,
                highQuality: true,
                language: "zh-CN"
            },
            stats: {
                gamesPlayed: 0,
                totalPlayTime: 0,
                maxDifficulty: 1
            },
            lastPlayed: null
        },

        /** @type {Object} Cached game data in memory */
        cache: null,

        /**
         * Initialize the storage system.
         * Loads existing data or creates defaults.
         */
        init: function () {
            this._log("Storage system initializing...");
            this.load();
            this._log("Storage ready. High Score: " + this.cache.highScore);
        },

        /**
         * Load data from localStorage into memory cache.
         * Performs version migration if necessary.
         */
        load: function () {
            var raw = localStorage.getItem(this.keyPrefix + "save");
            if (!raw) {
                this._log("No save data found, creating defaults.");
                this.cache = JSON.parse(JSON.stringify(this.defaults));
                this.save();
                return;
            }

            try {
                this.cache = JSON.parse(raw);
                this._migrate();
            } catch (e) {
                this._log("Error parsing save data: " + e.message);
                this.cache = JSON.parse(JSON.stringify(this.defaults));
            }
        },

        /**
         * Save memory cache to localStorage.
         */
        save: function () {
            if (!this.cache) return;
            
            this.cache.lastPlayed = new Date().toISOString();
            
            try {
                var raw = JSON.stringify(this.cache);
                localStorage.setItem(this.keyPrefix + "save", raw);
            } catch (e) {
                this._log("Failed to save data: " + e.message);
            }
        },

        /**
         * Handle data structure updates between versions.
         * @private
         */
        _migrate: function () {
            // Future migration logic here
            if (this.cache.version !== this.version) {
                this._log("Migrating data from " + (this.cache.version || "legacy") + " to " + this.version);
                
                // Merge defaults for missing keys
                this._deepMerge(this.cache, this.defaults);
                this.cache.version = this.version;
                this.save();
            }
        },

        /**
         * Helper for deep merging objects during migration.
         * @private
         */
        _deepMerge: function (target, source) {
            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] instanceof Object && !Array.isArray(source[key])) {
                        if (!target[key]) target[key] = {};
                        this._deepMerge(target[key], source[key]);
                    } else if (target[key] === undefined) {
                        target[key] = source[key];
                    }
                }
            }
        },

        /**
         * Update the high score if the new score is higher.
         * @param {number} newScore - The score to check.
         * @returns {boolean} Whether a new record was set.
         */
        updateHighScore: function (newScore) {
            if (newScore > this.cache.highScore) {
                this.cache.highScore = Math.floor(newScore);
                this.save();
                return true;
            }
            return false;
        },

        /**
         * Add currency to the player's account.
         * @param {number} amount - Amount to add.
         */
        addCurrency: function (amount) {
            this.cache.currency += Math.floor(amount);
            this.cache.totalCoins += Math.floor(amount);
            this.save();
        },

        /**
         * Update specific settings.
         * @param {string} category - The settings category (e.g., 'settings', 'stats').
         * @param {string} key - The setting key.
         * @param {*} value - The new value.
         */
        updateField: function (category, key, value) {
            if (this.cache[category] && this.cache[category].hasOwnProperty(key)) {
                this.cache[category][key] = value;
                this.save();
            }
        },

        /**
         * Get a value from the cache.
         * @param {string} category - The data category.
         * @param {string} [key] - The specific key (returns category if omitted).
         */
        get: function (category, key) {
            if (!this.cache) this.load();
            if (!key) return this.cache[category];
            return this.cache[category] ? this.cache[category][key] : null;
        },

        /**
         * Reset all progress and settings to defaults.
         */
        wipe: function () {
            if (confirm("确定要清除所有存档数据吗？此操作不可撤销。")) {
                this.cache = JSON.parse(JSON.stringify(this.defaults));
                this.save();
                window.location.reload();
            }
        },

        /**
         * Log storage activity.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner/Storage] " + msg);
        }
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.Storage = Storage;

    // Initialize immediately
    Storage.init();
})();
