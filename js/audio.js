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

    try {
      if (this.bgmAudio) {
        this.bgmAudio.pause();
        this.bgmAudio = null;
      }

      const url = URL.createObjectURL(file);
      this.bgmAudio = new Audio(url);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.bgmVolume;
      this.bgmTrackName = file.name.replace(/\.[^/.]+$/, ""); // strip extension

      this.bgmAudio.play().then(() => {
        this.isBgmPlaying = true;
        this.updateBgmHUD();
      }).catch(e => {
        this.isBgmPlaying = false;
        this.updateBgmHUD();
      });

      return this.bgmTrackName;
    } catch (e) {
      console.warn("Failed to load custom BGM:", e);
    }
  }

  setBgmVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }

  toggleBgm() {
    if (!this.bgmAudio) return false;
    if (this.bgmAudio.paused) {
      this.bgmAudio.play().catch(() => {});
      this.isBgmPlaying = true;
    } else {
      this.bgmAudio.pause();
      this.isBgmPlaying = false;
    }
    this.updateBgmHUD();
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

    osc.start(now);
    osc.stop(now + duration);
  }

  playThud(now, startFreq, endFreq, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playChirp(now, startFreq, endFreq, duration, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playNoiseCrack(now, duration, volume) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  playWoodSnap(now, duration, volume) {
    this.playNoiseCrack(now, duration * 0.7, volume);
    this.playThud(now, 320, 80, duration, volume * 0.8);
  }

  playCannonballLaunch(now) {
    this.playWhoosh(now, 140, 480, 0.25, 0.6);
    this.playThud(now, 200, 60, 0.2, 0.4);
  }

  playWebZip(now) {
    this.playWhoosh(now, 680, 190, 0.10, 0.35);
    this.playNoiseCrack(now, 0.06, 0.2);
  }

  playCheckpointChime(now) {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  playDeathSound(now) {
    this.playThud(now, 150, 20, 0.4, 0.7);
    this.playNoiseCrack(now, 0.3, 0.4);
  }

  playVictoryFanfare(now) {
    const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.3, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.6);
    });
  }
}

window.Audio = new AudioController();
