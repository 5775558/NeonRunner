/**
 * NeonRunner - 星际疾跑
 * Procedural Audio System
 * Uses WebAudio API to synthesize sound effects and background music in real-time.
 * Eliminates the need for external asset files and ensures a unique neon atmosphere.
 */

/**
 * @module systems/audio
 */

(function () {
    "use strict";

    /**
     * Audio Engine singleton.
     * Manages oscillators, gain nodes, and audio context lifecycle.
     */
    var AudioSystem = {
        /** @type {AudioContext} Main web audio context */
        ctx: null,

        /** @type {GainNode} Master volume control */
        masterGain: null,

        /** @type {boolean} Audio enabled flag */
        enabled: true,

        /** @type {number} Global volume level [0,1] */
        volume: 0.5,

        /** @type {Object} State of active sound sources */
        activeSounds: {},

        /** @type {Object} Predefined synth parameters for game events */
        presets: {
            jump: {
                freq: 150,
                type: "sine",
                duration: 0.2,
                slide: 400
            },
            coin: {
                freq: 880,
                type: "square",
                duration: 0.1,
                slide: 1200
            },
            hit: {
                freq: 100,
                type: "sawtooth",
                duration: 0.5,
                slide: 40,
                noise: true
            },
            powerup: {
                freq: 440,
                type: "triangle",
                duration: 0.4,
                slide: 880
            },
            ui_hover: {
                freq: 660,
                type: "sine",
                duration: 0.05
            },
            ui_click: {
                freq: 440,
                type: "sine",
                duration: 0.1
            }
        },

        /** @type {boolean} BGM playing flag */
        bgmPlaying: false,

        /** @type {OscillatorNode[]} BGM oscillators */
        bgmNodes: [],

        /**
         * Initialize the audio system.
         * Note: AudioContext usually requires a user gesture to start.
         */
        init: function () {
            this._log("Audio system preparing...");
            
            try {
                var AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) {
                    this._log("Web Audio API not supported");
                    this.enabled = false;
                    return;
                }
                
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.masterGain.gain.value = this.volume;
                
                this._bindEvents();
                this._log("Audio system initialized");
            } catch (e) {
                this._log("Failed to init audio: " + e.message);
                this.enabled = false;
            }
        },

        /**
         * Bind game events to sound triggers.
         * @private
         */
        _bindEvents: function () {
            var self = this;
            
            // Interaction listeners to resume context (browser security)
            var resumeAudio = function () {
                if (self.ctx && self.ctx.state === "suspended") {
                    self.ctx.resume();
                }
            };
            
            window.addEventListener("mousedown", resumeAudio);
            window.addEventListener("touchstart", resumeAudio);
            window.addEventListener("keydown", resumeAudio);
        },

        /**
         * Play a synthesized sound based on a preset.
         * @param {string} presetName - The name of the preset to play.
         */
        playSound: function (presetName) {
            if (!this.enabled || !this.ctx) return;
            
            var preset = this.presets[presetName];
            if (!preset) return;

            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            
            osc.type = preset.type || "sine";
            osc.frequency.setValueAtTime(preset.freq, this.ctx.currentTime);
            
            if (preset.slide) {
                osc.frequency.exponentialRampToValueAtTime(preset.slide, this.ctx.currentTime + preset.duration);
            }
            
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + preset.duration);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start();
            osc.stop(this.ctx.currentTime + preset.duration);
            
            if (preset.noise) {
                this._playNoise(preset.duration);
            }
        },

        /**
         * Synthesize white noise for explosion/hit effects.
         * @param {number} duration - Seconds to play.
         * @private
         */
        _playNoise: function (duration) {
            var bufferSize = this.ctx.sampleRate * duration;
            var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            var data = buffer.getChannelData(0);
            
            for (var i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            var noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            var filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);
            
            var gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start();
            noise.stop(this.ctx.currentTime + duration);
        },

        /**
         * Start procedural background music.
         */
        startBGM: function () {
            if (!this.enabled || this.bgmPlaying) return;
            this.bgmPlaying = true;
            this._log("Starting procedural BGM");
            this._bgmLoop();
        },

        /**
         * Stop background music.
         */
        stopBGM: function () {
            this.bgmPlaying = false;
            this.bgmNodes.forEach(node => {
                try { node.stop(); } catch(e) {}
            });
            this.bgmNodes = [];
        },

        /**
         * Core BGM logic using oscillators for a synthwave vibe.
         * @private
         */
        _bgmLoop: function () {
            if (!this.bgmPlaying) return;
            
            var self = this;
            var tempo = 120;
            var step = 60 / tempo / 2; // 1/8 note
            
            var sequence = [
                110, 110, 164, 110,
                110, 110, 196, 110,
                110, 110, 164, 110,
                146, 146, 130, 123
            ];
            
            var now = this.ctx.currentTime;
            for (var i = 0; i < sequence.length; i++) {
                this._playBgmNote(sequence[i], now + i * step, step * 0.8);
            }
            
            // Schedule next loop
            setTimeout(function() {
                self._bgmLoop();
            }, sequence.length * step * 1000);
        },

        /**
         * Play a single BGM note.
         * @private
         */
        _playBgmNote: function (freq, time, duration) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0.02, time);
            gain.gain.linearRampToValueAtTime(0, time + duration);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(time);
            osc.stop(time + duration);
            
            this.bgmNodes.push(osc);
            // Cleanup nodes
            setTimeout(() => {
                var idx = this.bgmNodes.indexOf(osc);
                if (idx !== -1) this.bgmNodes.splice(idx, 1);
            }, (time - this.ctx.currentTime + duration + 1) * 1000);
        },

        /**
         * Set master volume.
         * @param {number} value - Volume [0,1].
         */
        setVolume: function (value) {
            this.volume = Math.max(0, Math.min(1, value));
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
            }
            this._log("Volume set to " + this.volume);
        },

        /**
         * Toggle audio on/off.
         */
        toggle: function () {
            this.enabled = !this.enabled;
            if (!this.enabled) {
                this.stopBGM();
                if (this.masterGain) this.masterGain.gain.value = 0;
            } else {
                if (this.masterGain) this.masterGain.gain.value = this.volume;
                this.startBGM();
            }
            return this.enabled;
        },

        /**
         * Log audio events.
         * @private
         */
        _log: function (msg) {
            console.log("[NeonRunner/Audio] " + msg);
        }
    };

    window.NeonRunner = window.NeonRunner || {};
    window.NeonRunner.AudioSystem = AudioSystem;

    // Auto-init logic
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            AudioSystem.init();
        });
    } else {
        AudioSystem.init();
    }
})();
