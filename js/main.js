/* =========================================================
   GAME CONTROLLER & PROCEDURAL RENDER ENGINE ("HOLLAND")
   - Infinite Continuous World Streaming (Pagodas & Torii Gates)
   - Sakura Blossom Petal Particle System
   - Live Distance & Infinite Score Tracking
   - 60Hz Fixed Physics Timestep
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

    // Drifting Sakura Blossom Petals in the Air
    this.sakuraPetals = Array.from({ length: 45 }, () => ({
      x: Math.random() * 3000,
      y: Math.random() * 800,
      vx: Math.random() * 1.5 + 0.8,
      vy: Math.random() * 0.8 + 0.4,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.05,
      size: Math.random() * 4 + 3,
      alpha: Math.random() * 0.4 + 0.3
    }));

    this.stageTime = 0;
    this.isPlaying = false;
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.fixedStep = 1 / 60;

    this.initCanvasSize();
    this.bindUI();
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
    // 1. "TIMMY'S GAMES PRESENTS" Intro Sequence Lifecycle
    const introScreen = document.getElementById('intro-screen');
    const startScreen = document.getElementById('start-screen');

    const finishIntro = () => {
      if (introScreen && !introScreen.classList.contains('fade-out')) {
        introScreen.classList.add('fade-out');
        setTimeout(() => {
          introScreen.style.display = 'none';
          if (startScreen) startScreen.classList.remove('hidden');
        }, 800);
      }
    };

    if (introScreen) {
      introScreen.addEventListener('click', finishIntro);
      window.addEventListener('keydown', (e) => {
        if (introScreen && !introScreen.classList.contains('fade-out')) {
          finishIntro();
        }
      }, { once: true });

      setTimeout(finishIntro, 2400);
    }

    // 2. Mode Tabs (Campaign vs Endless Survival)
    const tabCampaign = document.getElementById('tab-campaign');
    const tabEndless = document.getElementById('tab-endless');
    const campaignView = document.getElementById('campaign-view');
    const endlessView = document.getElementById('endless-view');

    const updateEndlessStatsUI = () => {
      const bestDist = localStorage.getItem('holland_best_dist') || 0;
      const bestKills = localStorage.getItem('holland_best_kills') || 0;
      const highScore = localStorage.getItem('holland_high_score') || 0;

      const wEl = document.getElementById('endless-best-wave');
      const kEl = document.getElementById('endless-best-kills');
      const sEl = document.getElementById('endless-high-score');

      if (wEl) wEl.textContent = `${Number(bestDist).toLocaleString()}m`;
      if (kEl) kEl.textContent = bestKills;
      if (sEl) sEl.textContent = Number(highScore).toLocaleString();
    };
    updateEndlessStatsUI();

    if (tabCampaign && tabEndless) {
      tabCampaign.addEventListener('click', () => {
        tabCampaign.classList.add('active');
        tabEndless.classList.remove('active');
        campaignView.classList.remove('hidden');
        endlessView.classList.add('hidden');
        this.isEndlessMode = false;
      });

      tabEndless.addEventListener('click', () => {
        tabEndless.classList.add('active');
        tabCampaign.classList.remove('active');
        endlessView.classList.remove('hidden');
        campaignView.classList.add('hidden');
        this.isEndlessMode = true;
        updateEndlessStatsUI();
      });
    }

    // 3. Populate 24 Act Cards in UI
    const stageGrid = document.getElementById('stage-grid');
    if (stageGrid && window.STAGES) {
      stageGrid.innerHTML = '';
      window.STAGES.forEach((st, idx) => {
        const btn = document.createElement('button');
        btn.className = `stage-card ${idx === this.currentStageIndex ? 'active' : ''}`;
        btn.dataset.stage = idx;
        btn.innerHTML = `
          <div class="st-header">
            <span class="st-num">ACT ${idx + 1}</span>
            <span class="st-rank ${st.belt.toLowerCase()}">${st.belt} BELT</span>
          </div>
          <div class="st-title">${st.name.split(':')[1] || st.name}</div>
          <div class="st-desc">${st.entities ? st.entities.length : 4} Opponents • Grandmaster Encounter</div>
        `;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.stage-card').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.isEndlessMode = false;
          this.loadStage(idx);
        });
        stageGrid.appendChild(btn);
      });
    }

    // 4. Start Buttons
    document.getElementById('btn-play').addEventListener('click', () => {
      document.getElementById('start-screen').classList.add('hidden');
      this.isEndlessMode = false;
      this.isPlaying = true;
      if (window.Audio) window.Audio.resume();
    });

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
    const btnBgmPlayToggle = document.getElementById('btn-bgm-play-toggle');
    const bgmVolumeSlider = document.getElementById('bgm-volume-slider');

    if (btnCustomMusic && musicModal) {
      btnCustomMusic.addEventListener('click', () => {
        musicModal.classList.remove('hidden');
      });
      btnCloseMusic.addEventListener('click', () => {
        musicModal.classList.add('hidden');
      });

      // File Input Change
      bgmFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && window.Audio) {
          const trackName = window.Audio.loadCustomBgm(file);
          if (trackName && this.combat) {
            this.combat.announceAction(`BGM: ${trackName.toUpperCase()}`);
          }
        }
      });

      // Play / Pause Toggle
      btnBgmPlayToggle.addEventListener('click', () => {
        if (window.Audio) {
          window.Audio.toggleBgm();
        }
      });

      // Volume Slider
      bgmVolumeSlider.addEventListener('input', (e) => {
        if (window.Audio) {
          window.Audio.setBgmVolume(parseFloat(e.target.value));
        }
      });
    }

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.restartCheckpoint();
    });
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

    document.getElementById('hud-stage-name').textContent = 'ENDLESS PAGODA REALM';
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

    if (this.isPlaying && this.player) {
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

          // Dynamic Infinite World Streaming Check
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

  updateInfiniteProgression() {
    const currentMeters = Math.max(0, Math.floor((this.player.x - 100) / 10));
    if (currentMeters > this.distanceTraveled) {
      this.distanceTraveled = currentMeters;
      this.endlessScore = this.distanceTraveled * 10 + (this.combat.comboCount || 0) * 100;

      // Update HUD
      document.getElementById('hud-stage-name').textContent = `ENDLESS DOJO • ${this.distanceTraveled}m`;

      // Dynamic Belt Progression in Endless Mode
      const belt = window.LevelGenerator.getBeltForDistance(this.distanceTraveled * 10);
      if (this.player.beltColor !== belt.color) {
        this.player.beltColor = belt.color;
        const beltEl = document.getElementById('hud-belt');
        beltEl.textContent = belt.name;
        beltEl.className = `hud-badge belt-${belt.name.toLowerCase()}`;
        this.combat.announceAction(`${belt.name} BELT ATTAINED!`);
        if (window.Audio) window.Audio.play('checkpoint');
      }

      // Save Best Records
      const bestDist = parseInt(localStorage.getItem('holland_best_dist') || 0, 10);
      const curScore = parseInt(localStorage.getItem('holland_high_score') || 0, 10);
      if (this.distanceTraveled > bestDist) localStorage.setItem('holland_best_dist', this.distanceTraveled);
      if (this.endlessScore > curScore) localStorage.setItem('holland_high_score', this.endlessScore);
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
    const playerCenterY = p.y - 28;

    const deadzoneX = 75;
    const deadzoneY = 60;

    const dx = p.x - this.camera.x;
    const dy = playerCenterY - this.camera.y;

    if (Math.abs(dx) > deadzoneX) {
      const excessX = dx - Math.sign(dx) * deadzoneX;
      this.camera.x += excessX * (1 - Math.exp(-4.8 * dt));
    }

    if (Math.abs(dy) > deadzoneY) {
      const excessY = dy - Math.sign(dy) * deadzoneY;
      this.camera.y += excessY * (1 - Math.exp(-4.2 * dt));
    }
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
  // RENDER PIPELINE WITH PAGODAS, SAKURA PETALS & TORII GATES
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
    this.drawDecorations(ctx); // Pagodas, Torii Gates, Sakura Trees
    this.drawPlatforms(ctx);
    this.drawBreakables(ctx);
    this.drawEntities(ctx);

    this.stickRenderer.draw(ctx, this.player);
    this.combat.drawParticles(ctx);
    this.drawSakuraPetals(ctx);

    ctx.restore();

    this.input.draw(ctx, w, h);
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

  // -----------------------------------------------------------
  // UNIQUE JAPANESE ARCHITECTURE DRAWING ENGINE
  // -----------------------------------------------------------
  drawDecorations(ctx) {
    if (!this.currentStage.decorations) return;
    ctx.save();

    for (const d of this.currentStage.decorations) {
      if (d.type === 'pagoda_structure') {
        this.drawPagoda(ctx, d.x, d.y, d.w, d.tiers);
      } else if (d.type === 'torii_gate') {
        this.drawToriiGate(ctx, d.x, d.y, d.w, d.h, d.label);
      } else if (d.type === 'sakura_tree') {
        this.drawSakuraTree(ctx, d.x, d.y);
      } else if (d.type === 'lantern') {
        this.drawLantern(ctx, d.x, d.y);
      }
    }

    ctx.restore();
  }

  drawPagoda(ctx, cx, groundY, w, tiers = 3) {
    ctx.save();

    // Wooden Pillars
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - w / 2 + 30, groundY - 220, 14, 220);
    ctx.fillRect(cx + w / 2 - 44, groundY - 220, 14, 220);

    // Curved Pagoda Roofs
    for (let i = 0; i < tiers; i++) {
      const roofY = groundY - 80 - i * 80;
      const roofW = w - i * 70;

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444'; // Crimson glowing rim
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      // Curved traditional upturned eaves
      ctx.moveTo(cx - roofW / 2 - 20, roofY + 10);
      ctx.quadraticCurveTo(cx, roofY - 25, cx + roofW / 2 + 20, roofY + 10);
      ctx.lineTo(cx + roofW / 2, roofY + 22);
      ctx.quadraticCurveTo(cx, roofY + 5, cx - roofW / 2, roofY + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hanging mini-lantern on eaves
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx - roofW / 2 - 18, roofY + 20, 4.5, 0, Math.PI * 2);
      ctx.arc(cx + roofW / 2 + 18, roofY + 20, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawToriiGate(ctx, x, y, w, h, label) {
    ctx.save();

    // Crimson Torii Pillars
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 2;

    ctx.fillRect(x + 10, y - h, 14, h);
    ctx.fillRect(x + w - 24, y - h, 14, h);

    // Curved Top Beam
    ctx.beginPath();
    ctx.moveTo(x - 20, y - h);
    ctx.quadraticCurveTo(x + w / 2, y - h - 18, x + w + 20, y - h);
    ctx.lineTo(x + w + 16, y - h + 16);
    ctx.quadraticCurveTo(x + w / 2, y - h + 4, x - 16, y - h + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Secondary Cross Beam
    ctx.fillRect(x, y - h + 28, w, 10);

    // Milestone Tablet
    if (label) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(x + w / 2 - 26, y - h + 16, 52, 22);
      ctx.strokeStyle = '#f59e0b';
      ctx.strokeRect(x + w / 2 - 26, y - h + 16, 52, 22);

      ctx.fillStyle = '#fef3c7';
      ctx.font = '800 11px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y - h + 32);
    }

    ctx.restore();
  }

  drawSakuraTree(ctx, x, y) {
    ctx.save();

    // Dark Gnarled Trunk
    ctx.strokeStyle = '#3f2e21';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 10, y - 60, x - 25, y - 110);
    ctx.stroke();

    // Branches
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 25, y - 110);
    ctx.lineTo(x - 60, y - 150);
    ctx.moveTo(x - 25, y - 110);
    ctx.lineTo(x + 25, y - 160);
    ctx.stroke();

    // Pink Sakura Foliage Puffs
    ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
    const puffs = [
      { ox: -60, oy: -150, r: 28 },
      { ox: -25, oy: -130, r: 35 },
      { ox: 25, oy: -160, r: 30 },
      { ox: 0, oy: -175, r: 26 }
    ];

    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(x + p.ox, y + p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawLantern(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('灯', x, y + 3.5);

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

      ctx.fillStyle = '#b45309';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      ctx.strokeStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y + 8);
      ctx.lineTo(b.x + b.w / 2 - 3, b.y + b.h / 2);
      ctx.lineTo(b.x + b.w / 2 + 3, b.y + b.h / 2 + 15);
      ctx.lineTo(b.x + b.w / 2, b.y + b.h - 8);
      ctx.stroke();
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
      if (isWindup) {
        ctx.moveTo(facing * 2, -40);
        ctx.lineTo(-facing * 12, -36);
        ctx.lineTo(-facing * 18, -34);
      } else if (ent.aiState === 'ATTACK') {
        ctx.moveTo(facing * 2, -40);
        ctx.lineTo(facing * 14, -38);
        ctx.lineTo(facing * 24, -38);
      } else {
        ctx.moveTo(facing * 2, -40);
        ctx.lineTo(facing * 8, -32);
        ctx.lineTo(facing * 14, -36);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(facing * 4, -50, 8, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = eyeColor;
      ctx.fillRect(facing * 4 + facing * 2, -52, facing * 3, 2);

      const barW = ent.type === 'boss' ? 50 : 36;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barW / 2, -ent.h - 8, barW, 5);

      const hpRatio = Math.max(0, ent.hp / ent.maxHp);
      ctx.fillStyle = ent.type === 'boss' ? '#f59e0b' : '#ef4444';
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
