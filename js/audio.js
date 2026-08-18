/* =========================================================
   AUDIO CONTROLLER ("HOLLAND")
   Zero-latency procedural Web Audio synthesizer for crisp SFX
========================================================= */

class AudioController {
  constructor() {
    this.enabled = true;
    this.ctx = null;

    // Custom BGM Player State
    this.bgmAudio = null;
    this.bgmTrackName = "No Track Loaded";
    this.bgmVolume = 0.65;
    this.isBgmPlaying = false;

    this.initContext();
  }

  initContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && !this.ctx) {
      this.ctx = new AudioContextClass();
    }
  }

  // --- CUSTOM BGM MP3 TRACK MANAGER ---
  loadCustomBgm(file) {
    if (!file) return;

    this.initContext();
    this.resume();

    this.bgmTrackName = file.name.replace(/\.[^/.]+$/, "");
    const titleEl = document.getElementById('bgm-track-title');
    if (titleEl) titleEl.textContent = `Loading: ${this.bgmTrackName}...`;

    try {
      // 1. Hook up the dedicated DOM Audio Element
      let audioEl = document.getElementById('bgm-player');
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = 'bgm-player';
        audioEl.loop = true;
        document.body.appendChild(audioEl);
      }

      audioEl.pause();
      audioEl.loop = true;
      audioEl.volume = this.bgmVolume;
      this.bgmAudio = audioEl;

      const fileUrl = URL.createObjectURL(file);
      audioEl.src = fileUrl;

      // Event listeners for state sync
      audioEl.onplay = () => {
        this.isBgmPlaying = true;
        this.updateBgmHUD();
      };
      audioEl.onpause = () => {
        this.isBgmPlaying = false;
        this.updateBgmHUD();
      };

      // Play with user gesture confirmation
      const startPlay = () => {
        audioEl.play().then(() => {
          this.isBgmPlaying = true;
          this.updateBgmHUD();
        }).catch(err => {
          console.warn("Direct play deferred, trying DataURL fallback:", err);
          const reader = new FileReader();
          reader.onload = (e) => {
            audioEl.src = e.target.result;
            audioEl.play().then(() => {
              this.isBgmPlaying = true;
              this.updateBgmHUD();
            }).catch(e2 => {
              console.warn("DataURL play blocked:", e2);
              this.isBgmPlaying = false;
              this.updateBgmHUD();
            });
          };
          reader.readAsDataURL(file);
        });
      };

      startPlay();

      // Parallel Web Audio Buffer Pipeline for maximum compatibility
      const arrayReader = new FileReader();
      arrayReader.onload = async (e) => {
        try {
          if (this.ctx) {
            const buffer = await this.ctx.decodeAudioData(e.target.result);
            this.customAudioBuffer = buffer;
          }
        } catch (e) {
          // Handled by HTML5 audio
        }
      };
      arrayReader.readAsArrayBuffer(file);

      this.updateBgmHUD();
      return this.bgmTrackName;
    } catch (e) {
      console.error("Error loading custom audio file:", e);
    }
  }

  // Built-in Cyber Hype Beat sample for immediate testing
  playProceduralSampleBgm() {
    this.bgmTrackName = "Cyber Dojo Hype Beat (Sample)";
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }

    this.isBgmPlaying = true;
    this.updateBgmHUD();
    this.startSynthBeat();
  }

  startSynthBeat() {
    if (this.synthBeatInterval) clearInterval(this.synthBeatInterval);
    let step = 0;
    this.synthBeatInterval = setInterval(() => {
      if (!this.isBgmPlaying || !this.enabled) return;
      this.resume();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Bass kick on steps 0, 4, 8, 12
      if (step % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        gain.gain.setValueAtTime(0.4 * this.bgmVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }

      // Hi-hat on every step
      if (step % 2 === 0) {
        this.playNoiseCrack(now, 0.03, 0.08 * this.bgmVolume);
      }

      // Snare / clap on steps 4, 12
      if (step % 8 === 4) {
        this.playThud(now, 200, 60, 0.1, 0.3 * this.bgmVolume);
        this.playNoiseCrack(now, 0.08, 0.15 * this.bgmVolume);
      }

      step = (step + 1) % 16;
    }, 125); // 120 BPM 16th notes
  }

  setBgmVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }

  toggleBgm() {
    if (this.synthBeatInterval && !this.bgmAudio) {
      this.isBgmPlaying = !this.isBgmPlaying;
      this.updateBgmHUD();
      return this.isBgmPlaying;
    }

    if (!this.bgmAudio) return false;
    if (this.bgmAudio.paused) {
      this.bgmAudio.play().then(() => {
        this.isBgmPlaying = true;
        this.updateBgmHUD();
      }).catch(() => {});
    } else {
      this.bgmAudio.pause();
      this.isBgmPlaying = false;
      this.updateBgmHUD();
    }
    return this.isBgmPlaying;
  }

  updateBgmHUD() {
    const titleEl = document.getElementById('bgm-track-title');
    const playBtn = document.getElementById('btn-bgm-play-toggle');
    const visualizer = document.getElementById('bgm-visualizer');

    if (titleEl) titleEl.textContent = this.bgmTrackName;
    if (playBtn) playBtn.textContent = this.isBgmPlaying ? '⏸️ PAUSE' : '▶️ PLAY';
    if (visualizer) visualizer.classList.toggle('active', this.isBgmPlaying);
  }

  resume() {
    if (!this.ctx) this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.bgmAudio && this.isBgmPlaying && this.bgmAudio.paused) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.resume();
      this.play('tap');
    } else {
      if (this.bgmAudio && !this.bgmAudio.paused) {
        this.bgmAudio.pause();
      }
    }
    return this.enabled;
  }

  play(type) {
    if (!this.enabled) return;
    this.resume();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      switch (type) {
        case 'tap':
        case 'jab':
          this.playWhoosh(now, 380, 140, 0.08, 0.25);
          break;

        case 'kick':
          this.playWhoosh(now, 260, 90, 0.12, 0.35);
          break;

        case 'hit':
        case 'punchImpact':
          this.playThud(now, 160, 45, 0.14, 0.45);
          this.playNoiseCrack(now, 0.06, 0.2);
          break;

        case 'boardBreak':
        case 'heavyHit':
          this.playThud(now, 140, 30, 0.22, 0.7);
          this.playWoodSnap(now, 0.15, 0.5);
          break;

        case 'bodySlam':
          this.playThud(now, 110, 25, 0.35, 0.9);
          this.playWoodSnap(now, 0.2, 0.7);
          this.playNoiseCrack(now, 0.18, 0.6);
          break;

        case 'cannonball':
          this.playCannonballLaunch(now);
          break;

        case 'webZip':
          this.playWebZip(now);
          break;

        case 'sweep':
          this.playWhoosh(now, 200, 70, 0.2, 0.4);
          this.playNoiseCrack(now, 0.12, 0.15);
          break;

        case 'jump':
          this.playChirp(now, 180, 340, 0.09, 0.2);
          break;

        case 'wallKick':
          this.playChirp(now, 240, 480, 0.1, 0.25);
          this.playNoiseCrack(now, 0.05, 0.2);
          break;

        case 'land':
          this.playThud(now, 100, 40, 0.08, 0.2);
          break;

        case 'checkpoint':
          this.playCheckpointChime(now);
          break;

        case 'death':
          this.playDeathSound(now);
          break;

        case 'victory':
          this.playVictoryFanfare(now);
          break;
      }
    } catch (e) {}
  }

  playWhoosh(now, startFreq, endFreq, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);

    gain.gain.setValueAtTime(volume * 1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playChirp(now, startFreq, endFreq, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(volume * 1.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playThud(now, startFreq, endFreq, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);

    gain.gain.setValueAtTime(volume * 1.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playNoiseCrack(now, duration, volume) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    if (bufferSize <= 0) return;

    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 1.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  playWoodSnap(now, duration, volume) {
    this.playNoiseCrack(now, duration * 0.7, volume * 1.2);
    this.playThud(now, 320, 80, duration, volume);
  }

  playCannonballLaunch(now) {
    this.playWhoosh(now, 140, 480, 0.25, 0.7);
    this.playThud(now, 200, 60, 0.2, 0.5);
  }

  playWebZip(now) {
    this.playWhoosh(now, 720, 220, 0.12, 0.45);
    this.playNoiseCrack(now, 0.08, 0.3);
  }

  playCheckpointChime(now) {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.28, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  playDeathSound(now) {
    this.playThud(now, 180, 20, 0.45, 0.9);
    this.playNoiseCrack(now, 0.35, 0.6);
  }

  playVictoryFanfare(now) {
    const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.35, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.6);
    });
  }

  playEmote(characterId) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;
    const charId = (characterId || 'halland').toLowerCase();

    if (charId === 'ronalds') {
      // SIUUU deep power chord & rising cheer
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.35);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (charId === 'mcbape') {
      // Soldier military salute bugle fanfare
      [330, 392, 523, 659].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.3, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.09 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } else if (charId === 'lebrown') {
      // Heavy double bass silencer stomp
      this.playThud(now, 120, 30, 0.25, 0.7);
      setTimeout(() => this.playThud(this.ctx.currentTime, 110, 25, 0.3, 0.8), 280);
    } else if (charId === 'jordunn') {
      // Playful tongue swish & shoe squeak
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Halland Zen bell chime
      const bell = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(528, now); // 528Hz Solfeggio frequency
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      bell.connect(gain);
      gain.connect(this.ctx.destination);
      bell.start(now);
      bell.stop(now + 1.2);
    }
  }
}

window.Audio = new AudioController();

// Global Auto-Unlock Listeners for browser AudioContext
['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'].forEach(evt => {
  window.addEventListener(evt, () => {
    if (window.Audio) window.Audio.resume();
  }, { passive: true });
});
