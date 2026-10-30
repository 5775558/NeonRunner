/**
 * NeonRunner - 星际疾跑
 * Challenge & Achievement System
 * Implements daily missions, long-term achievements, and progression rewards.
 * Encourages player retention through goals.
 */

/**
 * @module systems/challenge
 */

(function () {
    "use strict";

    /**
     * Challenge System singleton.
     * Manages mission tracking and unlocking rewards.
     */
    var ChallengeSystem = {
        /** @type {Array} Current active missions */
        activeMissions: [],

        /** @type {Array} List of all possible achievements */
        achievements: [
            { id: "marathon", title: "马拉松选手", description: "单次跑过 10000 米", goal: 10000, type: "distance" },
            { id: "collector", title: "金币达人", description: "累计获得 50000 金币", goal: 50000, type: "coins_total" },
            { id: "survivor", title: "幸存者", description: "在不碰撞的情况下坚持 5 分钟", goal: 300, type: "time_no_hit" }
        ],

        /** @type {Object} Progress for each mission/achievement */
        stats: {
            currentDistance: 0,
            currentCoins: 0,
            sessionStartTime: 0
        },

        /**
         * Initialize the challenge system.
         */
        init: function () {
            this._log("Challenge system initialized");
            this.generateDailyMissions();
        },

        /**
         * Randomly select missions for the day.
         */
        generateDailyMissions: function () {
            this.activeMissions = [
                { id: "daily_1", text: "在一局中跳跃 50 次", goal: 50, current: 0, type: "jump" },
                { id: "daily_2", text: "收集 200 个金币", goal: 200, current: 0, type: "coins" }
            ];
        },

        /**
         * Update progress for a specific action type.
         * @param {string} type - Action type (jump, coin, distance).
         * @param {number} [amount] - Increment amount.
         */
        trackProgress: function (type, amount) {
            var val = amount || 1;
            
            this.activeMissions.forEach(function(m) {
                if (m.type === type) {
                    m.current += val;
                    if (m.current >= m.goal && !m.completed) {
                        m.completed = true;
                        window.NeonRunner.UIManager.notify("任务完成: " + m.text, "success");
                    }
                }
            });
        },

        /**
         * Main update loop for distance/time based goals.
         * @param {Object} state - Current gameplay stats.
         */
        update: function (state) {
            if (!state.active) return;
            
            this.trackProgress("distance_continuous", state.distance);
            
            // Check achievements
            var storage = window.NeonRunner.Storage;
            if (storage) {
                var totalDist = storage.get("totalDistance") || 0;
                if (totalDist > 10000) {
                    this._unlockAchievement("marathon");
                }
            }
        },

        /**
         * Handle achievement unlocking.
         * @param {string} id - Achievement ID.
         * @private
         */
        _unlockAchievement: function (id) {
            var ach = this.achievements.find(a => a.id === id);
            if (ach && !ach.unlocked) {
                ach.unlocked = true;
                this._log("Achievement Unlocked: " + ach.title);
                if (window.NeonRunner.UIManager) {
                    window.NeonRunner.UIManager.notify("成就达成: " + ach.title, "info");
                }
            }
        },

        /**
         * Log events.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner/Challenge] " + msg);
        }
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.ChallengeSystem = ChallengeSystem;

    // Hook into gameplay
    if (window.NeonRunner.Engine) {
        window.NeonRunner.Engine.onUpdate(function (state) {
            if (window.NeonRunner.Gameplay) {
                ChallengeSystem.update(window.NeonRunner.Gameplay.getData());
            }
        });
    }
})();
