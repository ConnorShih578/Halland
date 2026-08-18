/* =========================================================
   GAME CONTROLLER & PROCEDURAL RENDER ENGINE ("HALLAND")
   - Full 5-Act Narrative Campaign & Ending Cutscene
   - Giant Boss LeBrown Jameson & Caged Michael Jordan (MJ)
   - Dynamic 4-Theme World Renderer & Interactive Tutorial Prompts
   - Infinite Continuous World Streamer
========================================================= */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.stickRenderer = new StickmanRenderer();
    this.physics = new PhysicsEngine();
    this.combat = new CombatSystem();
    this.input = new InputController(this.canvas);

    this.camera = { x: 0, y: 0, zoom: 1.0 };

    this.currentStageIndex = 0;
    this.currentStage = null;
    this.player = null;

    this.isEndlessMode = false;
    this.distanceTraveled = 0;
    this.endlessScore = 0;
    this.endlessKills = 0;

    // Drifting Sakura Blossom Petals
    this.sakuraPetals = Array.from({ length: 35 }, () => ({
      x: Math.random() * 3000,
      y: Math.random() * 800,
      vx: Math.random() * 1.5 + 0.8,
      vy: Math.random() * 0.8 + 0.4,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.05,
      size: Math.random() * 4 + 3,
      alpha: Math.random() * 0.4 + 0.3
    }));

    // MJ Paper Ball Animation State in Act 5
    this.mjBall = {
      t: 0,
      active: true,
      startX: 1080,
      startY: 490,
      targetX: 1140,
      targetY: 530
    };

    this.stageTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.fixedStep = 1 / 60;

    this.initCanvasSize();
    this.bindUI();
    if (window.Cutscenes) window.Cutscenes.init();
    this.loadStage(0);

    requestAnimationFrame((t) => this.loop(t));
  }

  initCanvasSize() {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    resize();
  }

  bindUI() {
    // 1. High Score & Distance Readout Sync
    const updateEndlessStatsUI = () => {
      const bestDist = localStorage.getItem('halland_best_dist') || 0;
      const highScore = localStorage.getItem('halland_high_score') || 0;

      const wEl = document.getElementById('endless-best-wave');
      const sEl = document.getElementById('endless-high-score');

      if (wEl) wEl.textContent = `${Number(bestDist).toLocaleString()}m`;
      if (sEl) sEl.textContent = Number(highScore).toLocaleString();
    };
    updateEndlessStatsUI();

    // 2. Clean Single Start Button
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        document.getElementById('start-screen').classList.add('hidden');
        this.isEndlessMode = true;
        this.distanceTraveled = 0;
        this.endlessKills = 0;
        this.endlessScore = 0;
        this.loadInfiniteEndlessWorld();
        this.isPlaying = true;
        if (window.Audio) window.Audio.resume();
      });
    }

    const btnPlayEndless = document.getElementById('btn-play-endless');
    if (btnPlayEndless) {
      btnPlayEndless.addEventListener('click', () => {
        document.getElementById('start-screen').classList.add('hidden');
        this.isEndlessMode = true;
        this.distanceTraveled = 0;
        this.endlessKills = 0;
        this.endlessScore = 0;
        this.loadInfiniteEndlessWorld();
        this.isPlaying = true;
        if (window.Audio) window.Audio.resume();
      });
    }

    document.getElementById('btn-next-stage').addEventListener('click', () => {
      document.getElementById('victory-screen').classList.add('hidden');
      if (this.isEndlessMode) {
        this.loadInfiniteEndlessWorld();
      } else {
        const nextIdx = (this.currentStageIndex + 1) % STAGES.length;
        this.loadStage(nextIdx);
      }
      this.isPlaying = true;
    });

    document.getElementById('btn-menu').addEventListener('click', () => {
      document.getElementById('victory-screen').classList.add('hidden');
      document.getElementById('start-screen').classList.remove('hidden');
      this.isPlaying = false;
    });

    const btnSound = document.getElementById('btn-sound');
    btnSound.addEventListener('click', () => {
      const enabled = window.Audio.toggle();
      btnSound.textContent = enabled ? '🔊' : '🔇';
      btnSound.classList.toggle('active', enabled);
    });

    const btnHaptics = document.getElementById('btn-haptics');
    btnHaptics.addEventListener('click', () => {
      const enabled = window.Haptics.toggle();
      btnHaptics.textContent = enabled ? '📳' : '🔕';
      btnHaptics.classList.toggle('active', enabled);
    });

    const btnHelp = document.getElementById('btn-help');
    const hintOverlay = document.getElementById('controls-hint');
    btnHelp.addEventListener('click', () => {
      hintOverlay.classList.remove('hidden');
    });
    document.getElementById('btn-close-guide').addEventListener('click', () => {
      hintOverlay.classList.add('hidden');
    });

    // 5. Custom Background Music (BGM) Manager Handlers
    const btnCustomMusic = document.getElementById('btn-custom-music');
    const musicModal = document.getElementById('custom-music-modal');
    const btnCloseMusic = document.getElementById('btn-close-music');
    const bgmFileInput = document.getElementById('bgm-file-input');
    const bgmDropzone = document.getElementById('bgm-dropzone');
    const btnBgmPlayToggle = document.getElementById('btn-bgm-play-toggle');
    const btnBgmSample = document.getElementById('btn-bgm-sample');
    const bgmVolumeSlider = document.getElementById('bgm-volume-slider');

    if (btnCustomMusic && musicModal) {
      btnCustomMusic.addEventListener('click', () => {
        musicModal.classList.remove('hidden');
      });
      btnCloseMusic.addEventListener('click', () => {
        musicModal.classList.add('hidden');
      });

      const handleAudioFile = (file) => {
        if (file && window.Audio) {
          window.Audio.resume();
          const trackName = window.Audio.loadCustomBgm(file);
          if (trackName && this.combat) {
            this.combat.announceAction(`BGM: ${trackName.toUpperCase()}`);
          }
        }
      };

      bgmFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleAudioFile(file);
      });

      // Drag and drop audio files
      if (bgmDropzone) {
        bgmDropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          bgmDropzone.classList.add('drag-hover');
        });
        bgmDropzone.addEventListener('dragleave', () => {
          bgmDropzone.classList.remove('drag-hover');
        });
        bgmDropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          bgmDropzone.classList.remove('drag-hover');
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleAudioFile(e.dataTransfer.files[0]);
          }
        });
      }

      // Sample Beat Button
      if (btnBgmSample) {
        btnBgmSample.addEventListener('click', () => {
          if (window.Audio) {
            window.Audio.playProceduralSampleBgm();
            if (this.combat) this.combat.announceAction("BGM: CYBER DOJO BEAT");
          }
        });
      }

      btnBgmPlayToggle.addEventListener('click', () => {
        if (window.Audio) window.Audio.toggleBgm();
      });

      bgmVolumeSlider.addEventListener('input', (e) => {
        if (window.Audio) window.Audio.setBgmVolume(parseFloat(e.target.value));
      });
    }

    // 6. Pause System Handlers
    const btnPause = document.getElementById('btn-pause');
    const btnResumeGame = document.getElementById('btn-resume-game');
    const btnPauseClose = document.getElementById('btn-pause-close');
    const btnPauseRestart = document.getElementById('btn-pause-restart');
    const btnPauseMusic = document.getElementById('btn-pause-music');
    const btnPauseGuide = document.getElementById('btn-pause-guide');
    const btnPauseMenu = document.getElementById('btn-pause-menu');

    if (btnPause) {
      btnPause.addEventListener('click', () => this.togglePause());
    }
    if (btnResumeGame) {
      btnResumeGame.addEventListener('click', () => this.resumeGame());
    }
    if (btnPauseClose) {
      btnPauseClose.addEventListener('click', () => this.resumeGame());
    }
    if (btnPauseRestart) {
      btnPauseRestart.addEventListener('click', () => {
        this.resumeGame();
        this.restartCheckpoint();
      });
    }
    if (btnPauseMusic && musicModal) {
      btnPauseMusic.addEventListener('click', () => {
        musicModal.classList.remove('hidden');
      });
    }
    if (btnPauseGuide && hintOverlay) {
      btnPauseGuide.addEventListener('click', () => {
        hintOverlay.classList.remove('hidden');
      });
    }
    if (btnPauseMenu) {
      btnPauseMenu.addEventListener('click', () => {
        this.resumeGame();
        this.isPlaying = false;
        document.getElementById('start-screen').classList.remove('hidden');
      });
    }

    // Keyboard Pause Shortcuts (ESC / P)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.togglePause();
      }
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.restartCheckpoint();
    });
  }

  togglePause() {
    if (this.isPaused) this.resumeGame();
    else this.pauseGame();
  }

  pauseGame() {
    this.isPaused = true;
    if (this.input) {
      this.input.keys = {};
      this.input.actionQueue = [];
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.input.isBlocking = false;
      this.input.jumpPressed = false;
      this.input.leftStickActive = false;
      this.input.isRightTouching = false;
    }
    if (this.player) {
      this.player.vx = 0;
      this.player.vy = 0;
    }
    const pauseModal = document.getElementById('pause-screen');
    if (pauseModal) {
      const missionEl = document.getElementById('pause-mission-name');
      const timerEl = document.getElementById('pause-timer');
      const deathsEl = document.getElementById('pause-deaths');
      if (missionEl) missionEl.textContent = this.isEndlessMode ? `INFINITE (${this.distanceTraveled || 0}m)` : `ACT ${(this.currentStageIndex || 0) + 1}`;
      if (timerEl) timerEl.textContent = this.formatTime(this.stageTime || 0);
      if (deathsEl) deathsEl.textContent = this.player ? this.player.deaths : 0;
      pauseModal.classList.remove('hidden');
    }
    if (window.Audio) window.Audio.play('tap');
  }

  resumeGame() {
    this.isPaused = false;
    if (this.input) {
      this.input.keys = {};
      this.input.actionQueue = [];
      this.input.moveX = 0;
      this.input.moveY = 0;
    }
    const pauseModal = document.getElementById('pause-screen');
    if (pauseModal) pauseModal.classList.add('hidden');
    this.lastFrameTime = performance.now();
    if (window.Audio) window.Audio.play('tap');
  }

  loadStage(index) {
    this.isEndlessMode = false;
    this.currentStageIndex = index;
    this.currentStage = JSON.parse(JSON.stringify(STAGES[index]));
    this.player = this.physics.createPlayer(this.currentStage.startX, this.currentStage.startY);
    this.player.beltColor = this.currentStage.beltColor;

    this.stageTime = 0;
    this.accumulator = 0;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y - 28;

    this.stickRenderer.resetRibbons(this.player.x, this.player.y - 54, this.player.x, this.player.y - 26);

    document.getElementById('hud-stage-name').textContent = this.currentStage.name;
    const beltEl = document.getElementById('hud-belt');
    beltEl.textContent = this.currentStage.belt;
    beltEl.className = `hud-badge belt-${this.currentStage.belt.toLowerCase()}`;
    document.getElementById('hud-deaths').textContent = '0';
  }

  loadInfiniteEndlessWorld() {
    this.isEndlessMode = true;
    this.currentStage = window.LevelGenerator.createInfiniteEndlessWorld();
    this.player = this.physics.createPlayer(this.currentStage.startX, this.currentStage.startY);
    this.player.beltColor = '#ffffff';

    this.distanceTraveled = 0;
    this.endlessScore = 0;
    this.endlessKills = 0;

    this.stageTime = 0;
    this.accumulator = 0;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y - 28;

    this.stickRenderer.resetRibbons(this.player.x, this.player.y - 54, this.player.x, this.player.y - 26);

    document.getElementById('hud-stage-name').textContent = 'INFINITE GAUNTLET • 0m';
    const beltEl = document.getElementById('hud-belt');
    beltEl.textContent = 'WHITE';
    beltEl.className = 'hud-badge belt-white';
    document.getElementById('hud-deaths').textContent = '0';
  }

  restartCheckpoint() {
    if (!this.player) return;
    this.player.x = this.player.spawnX;
    this.player.y = this.player.spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.state = 'IDLE';
    this.player.stateTime = 0;
    this.player.isDead = false;
    this.stickRenderer.resetRibbons(this.player.x, this.player.y - 54, this.player.x, this.player.y - 26);
    if (window.Audio) window.Audio.play('tap');
    if (window.Haptics) window.Haptics.trigger('tap');
  }

  completeStage() {
    this.isPlaying = false;
    if (window.Audio) window.Audio.play('victory');
    if (window.Haptics) window.Haptics.trigger('checkpoint');

    // If Act 5 (Final Boss) is cleared -> Trigger Cinematic Ending Cutscene!
    if (!this.isEndlessMode && this.currentStageIndex === STAGES.length - 1) {
      if (window.Cutscenes) {
        window.Cutscenes.playEndingCutscene();
        return;
      }
    }

    const vicScreen = document.getElementById('victory-screen');
    document.querySelector('.victory-kicker').textContent = `STAGE CLEARED`;
    document.querySelector('.victory-title').textContent = `VICTORY ACHIEVED`;
    document.querySelector('.victory-badge').textContent = `🥋 GRANDMASTER PERFORMANCE`;

    document.getElementById('victory-time').textContent = this.formatTime(this.stageTime);
    document.getElementById('victory-deaths').textContent = this.player.deaths;
    document.getElementById('victory-combos').textContent = this.combat.comboCount || 12;
    vicScreen.classList.remove('hidden');
  }

  loop(currentTime) {
    const rawDt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = currentTime;

    if (this.isPlaying && this.player && !this.isPaused) {
      this.stageTime += rawDt;
      this.updateHUDTimer();

      this.input.updateGamepad();

      this.accumulator += rawDt;
      while (this.accumulator >= this.fixedStep) {
        const hitStopped = this.combat.update(this.fixedStep, this.player, this.currentStage.entities, this.currentStage);

        if (!hitStopped) {
          this.physics.updatePlayer(this.player, this.input, this.combat, this.currentStage, this.fixedStep);
          this.updateEntities(this.fixedStep);
          this.updateSakuraPetals(this.fixedStep);
          this.updateMJPaperBall(this.fixedStep);
          this.checkTutorialSteps();

          if (this.isEndlessMode && this.currentStage.isInfinite) {
            window.LevelGenerator.streamInfiniteWorld(this.currentStage, this.player.x);
            this.updateInfiniteProgression();
          }
        }
        this.accumulator -= this.fixedStep;
      }

      this.updateCamera(rawDt);
    }

    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  checkTutorialSteps() {
    if (!this.currentStage || !this.currentStage.tutorialSteps) return;
    for (const step of this.currentStage.tutorialSteps) {
      if (!step.triggered && Math.abs(this.player.x - step.x) < 70) {
        step.triggered = true;
        this.combat.announceAction(step.text);
      }
    }
  }

  updateMJPaperBall(dt) {
    if (!this.currentStage || !this.currentStage.isFinalBoss) return;
    this.mjBall.t += dt * 0.9;
    if (this.mjBall.t > 1.0) {
      this.mjBall.t = 0; // MJ shoots another paper ball!
    }
  }

  updateInfiniteProgression() {
    const currentMeters = Math.max(0, Math.floor((this.player.x - 100) / 10));
    if (currentMeters > this.distanceTraveled) {
      this.distanceTraveled = currentMeters;
      this.endlessScore = this.distanceTraveled * 10 + (this.combat.comboCount || 0) * 100;

      document.getElementById('hud-stage-name').textContent = `INFINITE GAUNTLET • ${this.distanceTraveled}m`;

      const belt = window.LevelGenerator.getBeltForDistance(this.distanceTraveled * 10);
      if (this.player.beltColor !== belt.color) {
        this.player.beltColor = belt.color;
        const beltEl = document.getElementById('hud-belt');
        beltEl.textContent = belt.name;
        beltEl.className = `hud-badge belt-${belt.name.toLowerCase()}`;
        this.combat.announceAction(`${belt.name} BELT ATTAINED!`);
        if (window.Audio) window.Audio.play('checkpoint');
      }

      const bestDist = parseInt(localStorage.getItem('halland_best_dist') || 0, 10);
      const curScore = parseInt(localStorage.getItem('halland_high_score') || 0, 10);
      if (this.distanceTraveled > bestDist) localStorage.setItem('halland_best_dist', this.distanceTraveled);
      if (this.endlessScore > curScore) localStorage.setItem('halland_high_score', this.endlessScore);
    }
  }

  updateEntities(dt) {
    if (!this.currentStage.entities) return;

    for (const ent of this.currentStage.entities) {
      if (ent.isDead) continue;

      if (ent.hitTimer > 0) {
        ent.hitTimer -= dt;
      }

      ent.vy = (ent.vy || 0) + 0.65;
      ent.x += (ent.vx || 0);
      ent.y += ent.vy;
      ent.vx = (ent.vx || 0) * 0.85;

      const entBounds = {
        x: ent.x - ent.w / 2,
        y: ent.y - ent.h,
        w: ent.w,
        h: ent.h
      };

      for (const plat of this.currentStage.platforms) {
        if (this.physics.checkAABB(entBounds, plat)) {
          if (ent.vy > 0) {
            ent.y = plat.y;
            ent.vy = 0;
          }
        }
      }
    }
  }

  updateSakuraPetals(dt) {
    const camX = this.camera.x;
    for (const p of this.sakuraPetals) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;

      if (p.x > camX + this.width + 100) p.x = camX - 100;
      if (p.y > 750) p.y = 100;
    }
  }

  updateCamera(dt) {
    const p = this.player;
    if (!p) return;

    const lookAheadX = p.facing * Math.min(90, Math.abs(p.vx) * 11);
    const verticalLead = p.vy > 4 ? 35 : p.vy < -4 ? -25 : 0;

    const targetX = p.x + lookAheadX;
    const targetY = (p.y - 28) + verticalLead;

    const lerpSpeedX = 6.2;
    const lerpSpeedY = 5.2;

    this.camera.x += (targetX - this.camera.x) * (1 - Math.exp(-lerpSpeedX * dt));
    this.camera.y += (targetY - this.camera.y) * (1 - Math.exp(-lerpSpeedY * dt));
  }

  updateHUDTimer() {
    const el = document.getElementById('hud-timer');
    if (el) el.textContent = this.formatTime(this.stageTime);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  // -----------------------------------------------------------
  // RENDER PIPELINE WITH MJ'S CAGE & MULTI-THEME SCENERY
  // -----------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    if (!this.currentStage || !this.player) return;

    ctx.save();

    const shake = this.combat.screenShake;
    const camX = this.camera.x + shake.x;
    const camY = this.camera.y + shake.y;

    ctx.translate(w / 2, h / 2);
    ctx.translate(-camX, -camY);

    this.drawBackground(ctx, camX, camY);
    this.drawDecorations(ctx);
    this.drawPlatforms(ctx);
    this.drawBreakables(ctx);
    this.drawGoal(ctx);
    this.drawEntities(ctx);

    this.stickRenderer.draw(ctx, this.player);
    this.combat.drawParticles(ctx);
    this.drawSakuraPetals(ctx);

    ctx.restore();

    this.input.draw(ctx, w, h);

    // Canvas Pause Backdrop & Indicator
    if (this.isPaused) {
      ctx.save();
      ctx.fillStyle = 'rgba(5, 7, 10, 0.65)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  drawBackground(ctx, camX, camY) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    const gridSize = 80;
    const startX = Math.floor((camX - this.width) / gridSize) * gridSize;
    const endX = Math.ceil((camX + this.width) / gridSize) * gridSize;
    const startY = Math.floor((camY - this.height) / gridSize) * gridSize;
    const endY = Math.ceil((camY + this.height) / gridSize) * gridSize;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  drawGoal(ctx) {
    if (!this.currentStage.goal) return;
    const g = this.currentStage.goal;
    const remainingBreakables = this.currentStage.breakables ? this.currentStage.breakables.filter(b => !b.broken).length : 0;
    const isLocked = remainingBreakables > 0;

    ctx.save();
    // Portal Rim
    ctx.fillStyle = isLocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.3)';
    ctx.strokeStyle = isLocked ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.strokeRect(g.x, g.y, g.w, g.h);

    // Lock Indicator or Torii Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 12px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(isLocked ? `🔒 LOCKED (${remainingBreakables})` : '⛩️ EXIT GATE', g.x + g.w / 2, g.y - 12);

    ctx.restore();
  }

  // -----------------------------------------------------------
  // MULTI-THEME SCENERY & MJ'S CAGE RENDERING ENGINE
  // -----------------------------------------------------------
  drawDecorations(ctx) {
    if (!this.currentStage.decorations) return;
    ctx.save();

    for (const d of this.currentStage.decorations) {
      if (d.type === 'mj_cage_scene') {
        this.drawMJCageScene(ctx, d.x, d.y, d.w, d.h);
      } else if (d.type === 'shoe_shrine') {
        this.drawShoeShrine(ctx, d.x, d.y, d.label);
      } else if (d.type === 'basketball_hoop') {
        this.drawBasketballHoop(ctx, d.x, d.y);
      } else if (d.type === 'stadium_scoreboard') {
        this.drawScoreboard(ctx, d.x, d.y, d.text);
      } else if (d.type === 'city_billboard') {
        this.drawCityBillboard(ctx, d.x, d.y, d.text);
      } else if (d.type === 'dumpster_prop') {
        this.drawDumpster(ctx, d.x, d.y);
      } else if (d.type === 'crane_hook') {
        this.drawCrane(ctx, d.x, d.y);
      } else if (d.type === 'torii_gate') {
        this.drawToriiGate(ctx, d.x, d.y, d.w, d.h, d.label);
      } else if (d.type === 'sakura_tree') {
        this.drawSakuraTree(ctx, d.x, d.y);
      } else if (d.type === 'pagoda_structure') {
        this.drawPagoda(ctx, d.x, d.y, d.w, d.tiers);
      }
    }

    ctx.restore();
  }

  // Michael Jordan locked in cage shooting paper balls into trash can!
  drawMJCageScene(ctx, cx, groundY, w, h) {
    ctx.save();

    // 1. Golden Laser Cage Bars
    ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
    ctx.fillRect(cx, groundY - h, w, h);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx, groundY - h, w, h);

    for (let bx = cx + 18; bx < cx + w; bx += 22) {
      ctx.beginPath();
      ctx.moveTo(bx, groundY - h);
      ctx.lineTo(bx, groundY);
      ctx.stroke();
    }

    // 2. Michael Jordan Stickman (#23 Red Jersey)
    const mjX = cx + 32;
    const mjY = groundY;

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#dc2626'; // Red Jersey
    ctx.beginPath();
    ctx.moveTo(mjX, mjY - 18);
    ctx.lineTo(mjX, mjY - 42); // Torso
    ctx.stroke();

    // MJ Legs
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(mjX, mjY - 18);
    ctx.lineTo(mjX - 8, mjY);
    ctx.moveTo(mjX, mjY - 18);
    ctx.lineTo(mjX + 8, mjY);
    ctx.stroke();

    // MJ Shooting Arm
    ctx.strokeStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(mjX, mjY - 40);
    ctx.lineTo(mjX + 16, mjY - 50);
    ctx.stroke();

    // MJ Head & Headband
    ctx.beginPath();
    ctx.arc(mjX, mjY - 52, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // "MJ #23" Label
    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 11px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText("MJ #23", mjX, groundY - h - 8);

    // 3. Trash Can
    const trashX = cx + w - 24;
    const trashY = groundY;

    ctx.fillStyle = '#64748b';
    ctx.fillRect(trashX - 10, trashY - 26, 20, 26);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(trashX - 10, trashY - 26, 20, 26);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 8px Outfit';
    ctx.fillText("TRASH", trashX, trashY - 8);

    // 4. Parabolic Paper Ball Flight Animation
    const t = this.mjBall.t;
    const ballX = mjX + 16 + (trashX - (mjX + 16)) * t;
    const arcHeight = Math.sin(t * Math.PI) * 45;
    const ballY = (mjY - 50) + ((trashY - 26) - (mjY - 50)) * t - arcHeight;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Swish particle when entering trash can
    if (t > 0.9) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = '800 10px Outfit';
      ctx.fillText("SWISH! 🏀", trashX, trashY - 32);
    }

    ctx.restore();
  }

  drawShoeShrine(ctx, x, y, label) {
    ctx.save();
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(x - 25, y - 40, 50, 40);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 25, y - 40, 50, 40);

    ctx.font = '22px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('👟', x, y - 48);

    ctx.fillStyle = '#fef3c7';
    ctx.font = '800 9px Outfit';
    ctx.fillText(label, x, y - 20);
    ctx.restore();
  }

  drawBasketballHoop(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 110);
    ctx.stroke();

    // Backboard
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 15, y - 130, 30, 24);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 15, y - 130, 30, 24);

    // Orange Rim
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 112);
    ctx.lineTo(x + 20, y - 112);
    ctx.stroke();

    ctx.restore();
  }

  drawScoreboard(ctx, x, y, text) {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 100, y, 200, 40);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 100, y, 200, 40);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 12px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y + 25);
    ctx.restore();
  }

  drawCityBillboard(ctx, x, y, text) {
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, 160, 50);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 160, 50);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 12px Syncopate';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + 80, y + 32);
    ctx.restore();
  }

  drawDumpster(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#065f46';
    ctx.fillRect(x, y - 40, 60, 40);
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y - 40, 60, 40);
    ctx.restore();
  }

  drawCrane(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 80);
    ctx.lineTo(x - 15, y + 95);
    ctx.stroke();
    ctx.restore();
  }

  drawToriiGate(ctx, x, y, w, h, label) {
    ctx.save();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x + 10, y - h, 14, h);
    ctx.fillRect(x + w - 24, y - h, 14, h);

    ctx.beginPath();
    ctx.moveTo(x - 20, y - h);
    ctx.quadraticCurveTo(x + w / 2, y - h - 18, x + w + 20, y - h);
    ctx.lineTo(x + w + 16, y - h + 16);
    ctx.quadraticCurveTo(x + w / 2, y - h + 4, x - 16, y - h + 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(x, y - h + 28, w, 10);

    if (label) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(x + w / 2 - 28, y - h + 16, 56, 22);
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(x + w / 2 - 28, y - h + 16, 56, 22);

      ctx.fillStyle = '#fef3c7';
      ctx.font = '800 11px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y - h + 32);
    }
    ctx.restore();
  }

  drawSakuraTree(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#3f2e21';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 10, y - 60, x - 25, y - 110);
    ctx.stroke();

    ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
    const puffs = [{ ox: -60, oy: -150, r: 28 }, { ox: -25, oy: -130, r: 35 }, { ox: 25, oy: -160, r: 30 }];
    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(x + p.ox, y + p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPagoda(ctx, cx, groundY, w, tiers = 2) {
    ctx.save();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - w / 2 + 30, groundY - 200, 14, 200);
    ctx.fillRect(cx + w / 2 - 44, groundY - 200, 14, 200);

    for (let i = 0; i < tiers; i++) {
      const roofY = groundY - 80 - i * 80;
      const roofW = w - i * 70;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(cx - roofW / 2 - 20, roofY + 10);
      ctx.quadraticCurveTo(cx, roofY - 25, cx + roofW / 2 + 20, roofY + 10);
      ctx.lineTo(cx + roofW / 2, roofY + 22);
      ctx.quadraticCurveTo(cx, roofY + 5, cx - roofW / 2, roofY + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSakuraPetals(ctx) {
    ctx.save();
    for (const p of this.sakuraPetals) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(244, 114, 182, ${p.alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawPlatforms(ctx) {
    ctx.save();
    ctx.fillStyle = '#1e2430';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    for (const p of this.currentStage.platforms) {
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.w, p.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
    }
    ctx.restore();
  }

  drawBreakables(ctx) {
    if (!this.currentStage.breakables) return;
    ctx.save();

    for (const b of this.currentStage.breakables) {
      if (b.broken) continue;

      // Bright yellow wooden smashable barrier
      ctx.fillStyle = '#eab308';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      ctx.fillStyle = '#1e293b';
      ctx.font = '800 10px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('SMASH', b.x + b.w / 2, b.y + b.h / 2);
    }
    ctx.restore();
  }

  drawEntities(ctx) {
    if (!this.currentStage.entities) return;
    ctx.save();

    for (const ent of this.currentStage.entities) {
      if (ent.isDead) continue;

      ctx.save();
      ctx.translate(ent.x, ent.y);

      const isHit = ent.hitTimer > 0;
      const isStunned = ent.stunTimer > 0;
      const isWindup = ent.aiState === 'WINDUP';
      const facing = ent.facing || 1;

      if (isWindup) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '900 20px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillText('⚡ ATTACK !', 0, -ent.h - 18);
        ctx.shadowBlur = 0;
      }

      if (isStunned) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 16px Outfit';
        ctx.textAlign = 'center';
        const starOffset = Math.sin(performance.now() * 0.01) * 6;
        ctx.fillText('⭐ STUNNED ⭐', starOffset, -ent.h - 14);
      }

      // Giant LeBrown Jameson Boss Styling
      if (ent.isGiantLeBrown) {
        ctx.fillStyle = '#a855f7'; // Purple & Gold Lakes Crown
        ctx.font = '900 18px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('👑 LEBROWN JAMESON #6 👑', 0, -ent.h - 22);

        let bodyColor = isHit ? '#ffffff' : '#7e22ce';
        let suitColor = isHit ? '#ffffff' : '#eab308';

        ctx.lineWidth = 5.5;
        ctx.strokeStyle = suitColor;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(-facing * 14, -16);
        ctx.lineTo(-facing * 14, 0);
        ctx.moveTo(0, -32);
        ctx.lineTo(facing * 14, -16);
        ctx.lineTo(facing * 14, 0);
        ctx.stroke();

        ctx.lineWidth = 7.0;
        ctx.strokeStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(facing * 2, -58);
        ctx.stroke();

        ctx.lineWidth = 5.5;
        ctx.strokeStyle = suitColor;
        ctx.beginPath();
        ctx.moveTo(facing * 2, -56);
        ctx.lineTo(facing * 20, -50);
        ctx.lineTo(facing * 34, -50);
        ctx.stroke();

        // Giant Head & Gold Headband
        ctx.beginPath();
        ctx.arc(facing * 4, -68, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#581c87';
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Giant Boss Health Bar
        const barW = 70;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(-barW / 2, -ent.h - 10, barW, 7);

        const hpRatio = Math.max(0, ent.hp / ent.maxHp);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-barW / 2, -ent.h - 10, barW * hpRatio, 7);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, -ent.h - 10, barW, 7);

        ctx.restore();
        continue;
      }

      // Standard Martial Artist Opponents
      let bodyColor = '#ef4444';
      let suitColor = '#1e293b';
      let eyeColor = '#fbbf24';

      if (ent.type === 'ninja') {
        bodyColor = '#0f172a';
        suitColor = '#334155';
        eyeColor = '#38bdf8';
      } else if (ent.type === 'kicker') {
        bodyColor = '#2563eb';
        suitColor = '#1d4ed8';
        eyeColor = '#ffffff';
      } else if (ent.type === 'boss') {
        bodyColor = '#7c2d12';
        suitColor = '#d97706';
        eyeColor = '#ef4444';
      }

      if (isHit) {
        bodyColor = '#ffffff';
        suitColor = '#ffffff';
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = suitColor;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(-facing * 8, -12);
      ctx.lineTo(-facing * 8, 0);
      ctx.moveTo(0, -24);
      ctx.lineTo(facing * 8, -12);
      ctx.lineTo(facing * 8, 0);
      ctx.stroke();

      ctx.lineWidth = 4.2;
      ctx.strokeStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(facing * 2, -42);
      ctx.stroke();

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = suitColor;
      ctx.beginPath();
      ctx.moveTo(facing * 2, -40);
      ctx.lineTo(facing * 14, -38);
      ctx.lineTo(facing * 24, -38);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(facing * 4, -50, 8, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      const barW = 36;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barW / 2, -ent.h - 8, barW, 5);

      const hpRatio = Math.max(0, ent.hp / ent.maxHp);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-barW / 2, -ent.h - 8, barW * hpRatio, 5);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '700 9px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(ent.name, 0, -ent.h - 10);

      ctx.restore();
    }
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.Game = new GameEngine();
});
