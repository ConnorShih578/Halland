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
    this.stickRenderer2 = new StickmanRenderer();
    this.physics = new PhysicsEngine();
    this.combat = new CombatSystem();
    this.input = new InputController(this.canvas);

    this.camera = { x: 0, y: 0, zoom: 1.0 };

    this.currentStageIndex = 0;
    this.currentStage = null;
    this.player = null;
    this.player2 = null;

    this.isEndlessMode = false;
    this.is1v1Duel = false;
    this.p1Char = 'halland';
    this.p1Name = 'HALLAND';
    this.p2Char = 'mcbape';
    this.p2Name = 'MCBAPE';
    this.duelWinner = null;
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
    if (window.MultiplayerManager) this.multiplayer = new MultiplayerManager(this);
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

    // 2. Mode Selector Tabs (Story Campaign vs Endless Survival)
    const tabCampaign = document.getElementById('tab-campaign');
    const tabEndless = document.getElementById('tab-endless');
    const campaignView = document.getElementById('campaign-view');
    const endlessView = document.getElementById('endless-view');

    if (tabCampaign && tabEndless) {
      tabCampaign.addEventListener('click', () => {
        tabCampaign.classList.add('active');
        tabEndless.classList.remove('active');
        if (campaignView) campaignView.classList.remove('hidden');
        if (endlessView) endlessView.classList.add('hidden');
        this.isEndlessMode = false;
      });

      tabEndless.addEventListener('click', () => {
        tabEndless.classList.add('active');
        tabCampaign.classList.remove('active');
        if (endlessView) endlessView.classList.remove('hidden');
        if (campaignView) campaignView.classList.add('hidden');
        this.isEndlessMode = true;
        updateEndlessStatsUI();
      });
    }

    // 3. Populate Campaign Acts in UI Level Selection Grid
    const stageGrid = document.getElementById('stage-grid');
    const stages = window.STAGES || (window.LevelGenerator ? window.LevelGenerator.getCampaignStages() : []);
    if (stageGrid && stages) {
      stageGrid.innerHTML = '';
      stages.forEach((st, idx) => {
        const btn = document.createElement('button');
        btn.className = `stage-card ${idx === this.currentStageIndex ? 'active' : ''}`;
        btn.dataset.stage = idx;
        btn.innerHTML = `
          <div class="st-header">
            <span class="st-num">ACT ${idx + 1}</span>
            <span class="st-rank ${(st.belt || 'white').toLowerCase()}">${st.belt || 'WHITE'} BELT</span>
          </div>
          <div class="st-title">${st.name.split(':')[1] || st.name}</div>
          <div class="st-desc">${st.subtitle || 'Smash all yellow barriers & defeat boss!'}</div>
        `;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.stage-card').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.isEndlessMode = false;
          this.currentStageIndex = idx;
          this.loadStage(idx);
        });
        stageGrid.appendChild(btn);
      });
    }

    // 4. Start Play Buttons
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.startStoryGame(this.currentStageIndex !== undefined ? this.currentStageIndex : 0);
      });
    }

    // 3. 1v1 Online Multiplayer PvP Buttons
    const btnOpenPvp = document.getElementById('btn-open-pvp');
    if (btnOpenPvp) {
      btnOpenPvp.addEventListener('click', () => {
        if (this.multiplayer) this.multiplayer.openPvpModal();
      });
    }

    const btnClosePvp = document.getElementById('btn-close-pvp');
    if (btnClosePvp) {
      btnClosePvp.addEventListener('click', () => {
        if (this.multiplayer) this.multiplayer.closePvpModal();
      });
    }

    const btnHostPvp = document.getElementById('btn-host-pvp');
    if (btnHostPvp) {
      btnHostPvp.addEventListener('click', () => {
        if (this.multiplayer) this.multiplayer.hostMatch();
      });
    }

    const btnJoinPvp = document.getElementById('btn-join-pvp');
    if (btnJoinPvp) {
      btnJoinPvp.addEventListener('click', () => {
        const codeInput = document.getElementById('pvp-join-code');
        if (this.multiplayer && codeInput) {
          this.multiplayer.joinMatch(codeInput.value);
        }
      });
    }

    const btnLaunchArena = document.getElementById('btn-launch-arena');
    if (btnLaunchArena) {
      btnLaunchArena.addEventListener('click', () => {
        if (this.multiplayer) this.multiplayer.startMultiplayerArena();
      });
    }

    const btnSaveServer = document.getElementById('btn-save-server-url');
    if (btnSaveServer) {
      btnSaveServer.addEventListener('click', () => {
        const input = document.getElementById('pvp-server-url-input');
        if (this.multiplayer && input) {
          this.multiplayer.setServerUrl(input.value);
          btnSaveServer.textContent = 'SAVED! ✓';
          setTimeout(() => btnSaveServer.textContent = 'SAVE', 2000);
        }
      });
    }

    // 1V1 Local Duel Setup Modal Handlers
    const btnOpen1v1 = document.getElementById('btn-open-1v1');
    const duelModal = document.getElementById('duel-modal');
    const btnCloseDuel = document.getElementById('btn-close-duel');
    const btnStartDuel = document.getElementById('btn-start-duel');

    if (btnOpen1v1 && duelModal) {
      btnOpen1v1.addEventListener('click', () => {
        duelModal.classList.remove('hidden');
      });
    }

    if (btnCloseDuel && duelModal) {
      btnCloseDuel.addEventListener('click', () => {
        duelModal.classList.add('hidden');
      });
    }

    // P1 Character Selection Cards
    const p1Cards = document.querySelectorAll('.p1-card');
    p1Cards.forEach(card => {
      card.addEventListener('click', () => {
        p1Cards.forEach(c => {
          c.classList.remove('active');
          c.style.border = '1px solid rgba(255,255,255,0.2)';
          c.style.background = 'rgba(15, 23, 42, 0.4)';
        });
        card.classList.add('active');
        card.style.border = '2px solid #ef4444';
        card.style.background = 'rgba(239,68,68,0.25)';
        this.p1Char = card.getAttribute('data-char') || 'halland';
      });
    });

    // P2 Character Selection Cards
    const p2Cards = document.querySelectorAll('.p2-card');
    p2Cards.forEach(card => {
      card.addEventListener('click', () => {
        p2Cards.forEach(c => {
          c.classList.remove('active');
          c.style.border = '1px solid rgba(255,255,255,0.2)';
          c.style.background = 'rgba(15, 23, 42, 0.4)';
        });
        card.classList.add('active');
        card.style.border = '2px solid #38bdf8';
        card.style.background = 'rgba(56,189,248,0.25)';
        this.p2Char = card.getAttribute('data-char') || 'mcbape';
      });
    });

    if (btnStartDuel) {
      btnStartDuel.addEventListener('click', () => {
        const p1NameIn = document.getElementById('p1-duel-name');
        const p2NameIn = document.getElementById('p2-duel-name');
        const p1Name = (p1NameIn && p1NameIn.value.trim()) ? p1NameIn.value.trim() : 'HALLAND';
        const p2Name = (p2NameIn && p2NameIn.value.trim()) ? p2NameIn.value.trim() : 'MCBAPE';
        this.start1v1Duel(this.p1Char, p1Name, this.p2Char, p2Name);
      });
    }

    const btnPlayEndless = document.getElementById('btn-play-endless');
    if (btnPlayEndless) {
      btnPlayEndless.addEventListener('click', () => {
        this.startEndlessGame();
      });
    }

    const btnNextStage = document.getElementById('btn-next-stage');
    if (btnNextStage) {
      btnNextStage.addEventListener('click', () => {
        const vicScreen = document.getElementById('victory-screen');
        if (vicScreen) vicScreen.classList.add('hidden');
        if (this.isEndlessMode) {
          this.loadInfiniteEndlessWorld();
        } else {
          const stages = window.STAGES || (window.LevelGenerator ? window.LevelGenerator.getCampaignStages() : []);
          const total = stages.length || 5;
          const nextIdx = (this.currentStageIndex + 1) % total;
          this.loadStage(nextIdx);
        }
        this.isPlaying = true;
      });
    }

    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        const vicScreen = document.getElementById('victory-screen');
        if (vicScreen) vicScreen.classList.add('hidden');
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.classList.remove('hidden');
        this.isPlaying = false;
      });
    }

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        if (this.is1v1Duel) {
          this.start1v1Duel(this.p1Char, this.p1Name, this.p2Char, this.p2Name);
        } else if (this.isEndlessMode) {
          this.startEndlessGame();
        } else {
          this.restartCheckpoint();
        }
      });
    }

    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        if (window.Audio) {
          const enabled = window.Audio.toggle();
          btnSound.textContent = enabled ? '🔊' : '🔇';
          btnSound.classList.toggle('active', enabled);
        }
      });
    }

    const btnHaptics = document.getElementById('btn-haptics');
    if (btnHaptics) {
      btnHaptics.addEventListener('click', () => {
        if (window.Haptics) {
          const enabled = window.Haptics.toggle();
          btnHaptics.textContent = enabled ? '📳' : '🔕';
          btnHaptics.classList.toggle('active', enabled);
        }
      });
    }

    const btnHelp = document.getElementById('btn-help');
    const hintOverlay = document.getElementById('controls-hint');
    if (btnHelp && hintOverlay) {
      btnHelp.addEventListener('click', () => {
        hintOverlay.classList.remove('hidden');
      });
    }
    const btnCloseGuide = document.getElementById('btn-close-guide');
    if (btnCloseGuide && hintOverlay) {
      btnCloseGuide.addEventListener('click', () => {
        hintOverlay.classList.add('hidden');
      });
    }

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
      if (btnCloseMusic) {
        btnCloseMusic.addEventListener('click', () => {
          musicModal.classList.add('hidden');
        });
      }

      const handleAudioFile = (file) => {
        if (file && window.Audio) {
          window.Audio.resume();
          const trackName = window.Audio.loadCustomBgm(file);
          if (trackName && this.combat) {
            this.combat.announceAction(`BGM: ${trackName.toUpperCase()}`);
          }
        }
      };

      if (bgmFileInput) {
        bgmFileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          handleAudioFile(file);
        });
      }

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

      if (btnBgmPlayToggle) {
        btnBgmPlayToggle.addEventListener('click', () => {
          if (window.Audio) window.Audio.toggleBgm();
        });
      }

      if (bgmVolumeSlider) {
        bgmVolumeSlider.addEventListener('input', (e) => {
          if (window.Audio) window.Audio.setBgmVolume(parseFloat(e.target.value));
        });
      }
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
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        return;
      }
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
      this.input.reset();
    }
    if (this.player) {
      this.player.vx = 0;
      this.player.vy = 0;
    }
    if (this.player2) {
      this.player2.vx = 0;
      this.player2.vy = 0;
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
      this.input.reset();
    }
    const pauseModal = document.getElementById('pause-screen');
    if (pauseModal) pauseModal.classList.add('hidden');
    this.lastFrameTime = performance.now();
    if (window.Audio) window.Audio.play('tap');
  }

  spawnPlayer2() {
    if (!this.currentStage) return;
    const spawnX = (this.player ? this.player.x + 35 : (this.currentStage.startX || 80) + 35);
    const spawnY = (this.player ? this.player.y : (this.currentStage.startY || 540));
    this.player2 = this.physics.createPlayer(spawnX, spawnY);
    this.player2.characterId = 'mcbape';
    this.player2.beltColor = '#38bdf8';
    this.player2.isPlayer2 = true;
    this.player2.name = 'PLAYER 2';
    if (!this.stickRenderer2) this.stickRenderer2 = new StickmanRenderer();
    this.stickRenderer2.resetRibbons(this.player2.x, this.player2.y - 54, this.player2.x, this.player2.y - 26);

    const p2Hud = document.getElementById('hud-p2-capsule');
    if (p2Hud) p2Hud.classList.remove('hidden');

    if (this.combat) {
      this.combat.announceAction('🎮 PLAYER 2 JOINED THE BRAWL! (ARROWS / . / /)');
    }
    if (window.Audio) window.Audio.play('checkpoint');
  }

  startStoryGame(index = 0) {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');
    this.isEndlessMode = false;
    this.is1v1Duel = false;
    if (this.multiplayer) this.multiplayer.isMultiplayer = false;
    const stageIdx = index !== undefined ? index : (this.currentStageIndex || 0);
    this.loadStage(stageIdx);
    this.isPlaying = true;
    if (window.Audio) window.Audio.resume();
  }

  startEndlessGame() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');
    const duelModal = document.getElementById('duel-modal');
    if (duelModal) duelModal.classList.add('hidden');

    this.is1v1Duel = false;
    this.isEndlessMode = true;
    this.duelWinner = null;
    this.distanceTraveled = 0;
    this.endlessKills = 0;
    this.endlessScore = 0;

    const p1Tag = document.getElementById('hud-p1-tag');
    if (p1Tag) p1Tag.textContent = 'P1: HALLAND';
    const p2Hud = document.getElementById('hud-p2-capsule');
    if (p2Hud) p2Hud.classList.add('hidden');

    const statLabel = document.getElementById('hud-stat-label');
    if (statLabel) statLabel.textContent = 'SCORE';

    this.loadInfiniteEndlessWorld();
    this.isPlaying = true;
    if (window.Audio) window.Audio.resume();
  }

  start1v1Duel(p1Char = 'halland', p1Name = 'HALLAND', p2Char = 'mcbape', p2Name = 'MCBAPE') {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');
    const duelModal = document.getElementById('duel-modal');
    if (duelModal) duelModal.classList.add('hidden');

    this.is1v1Duel = true;
    this.isEndlessMode = false;
    this.duelWinner = null;

    this.p1Char = p1Char;
    this.p1Name = p1Name;
    this.p2Char = p2Char;
    this.p2Name = p2Name;

    this.currentStage = window.LevelGenerator.createDojoArena();

    // Spawn Player 1
    this.player = this.physics.createPlayer(this.currentStage.startX || 260, this.currentStage.startY || 540);
    this.player.characterId = this.p1Char;
    this.player.name = this.p1Name;
    this.player.beltColor = '#ef4444';
    this.player.facing = 1;
    this.player.hp = 100;
    this.player.maxHp = 100;

    // Spawn Player 2
    this.player2 = this.physics.createPlayer(this.currentStage.startXP2 || 740, this.currentStage.startYP2 || 540);
    this.player2.characterId = this.p2Char;
    this.player2.name = this.p2Name;
    this.player2.beltColor = '#38bdf8';
    this.player2.facing = -1;
    this.player2.hp = 100;
    this.player2.maxHp = 100;
    this.player2.isPlayer2 = true;

    if (this.input) {
      this.input.p1.active = true;
      this.input.p2.active = true;
      this.input.reset();
    }

    this.stickRenderer.resetRibbons(this.player.x, this.player.y - 54, this.player.x, this.player.y - 26);
    this.stickRenderer2.resetRibbons(this.player2.x, this.player2.y - 54, this.player2.x, this.player2.y - 26);

    this.stageTime = 0;
    this.accumulator = 0;
    this.camera.x = (this.player.x + this.player2.x) * 0.5;
    this.camera.y = this.player.y - 28;

    // Update HUD for 1v1
    const p1Tag = document.getElementById('hud-p1-tag');
    if (p1Tag) p1Tag.textContent = `P1: ${this.player.name}`;
    const p2Tag = document.getElementById('hud-p2-tag');
    if (p2Tag) p2Tag.textContent = `P2: ${this.player2.name}`;
    const p2Hud = document.getElementById('hud-p2-capsule');
    if (p2Hud) p2Hud.classList.remove('hidden');

    const stageNameEl = document.getElementById('hud-stage-name');
    if (stageNameEl) stageNameEl.textContent = '1V1 DOJO ARENA';

    const statLabel = document.getElementById('hud-stat-label');
    if (statLabel) statLabel.textContent = 'DUEL';
    const beltEl = document.getElementById('hud-belt');
    if (beltEl) {
      beltEl.textContent = 'BLACK';
      beltEl.className = 'hud-badge belt-black';
    }

    this.updateHUDHealth();
    this.isPlaying = true;
    if (window.Audio) {
      window.Audio.resume();
      window.Audio.play('checkpoint');
    }
    if (this.combat) {
      this.combat.announceAction(`⚔️ ${this.player.name} VS ${this.player2.name} - FIGHT!`);
    }
  }

  handleDuelKnockout(winner, loser) {
    if (this.duelWinner) return;
    this.duelWinner = winner;
    loser.isDead = true;
    loser.state = 'KNOCKDOWN';

    if (this.combat) {
      this.combat.triggerHitStop(0.3);
      this.combat.triggerScreenShake(14, 0.4);
      this.combat.announceAction(`🏆 ${winner.name || 'WINNER'} WINS BY KNOCKOUT! 🏆`);
    }
    if (window.Audio) window.Audio.play('bossRoar');

    setTimeout(() => {
      const vicScreen = document.getElementById('victory-screen');
      if (vicScreen) {
        const titleEl = vicScreen.querySelector('.victory-title');
        const kickerEl = vicScreen.querySelector('.victory-kicker');
        const badgeEl = vicScreen.querySelector('.victory-badge');
        const timeEl = document.getElementById('victory-time');
        const deathsEl = document.getElementById('victory-deaths');
        const combosEl = document.getElementById('victory-combos');

        if (kickerEl) kickerEl.textContent = 'KNOCKOUT VICTORY!';
        if (titleEl) titleEl.textContent = `${winner.name} WINS! 🏆`;
        if (badgeEl) badgeEl.textContent = `CHAMPION: ${winner.characterId.toUpperCase()}`;
        if (timeEl) timeEl.textContent = this.formatTime(this.stageTime);
        if (deathsEl) deathsEl.textContent = '0';
        if (combosEl) combosEl.textContent = `${this.combat.comboCount || 10} HITS`;

        const nextBtn = document.getElementById('btn-next-stage');
        if (nextBtn) {
          nextBtn.querySelector('.btn-text').textContent = '↺ REMATCH (R)';
          nextBtn.onclick = () => {
            vicScreen.classList.add('hidden');
            this.start1v1Duel(this.p1Char, this.p1Name, this.p2Char, this.p2Name);
          };
        }
        const menuBtn = document.getElementById('btn-menu');
        if (menuBtn) {
          menuBtn.onclick = () => {
            vicScreen.classList.add('hidden');
            const startScreen = document.getElementById('start-screen');
            if (startScreen) startScreen.classList.remove('hidden');
            this.isPlaying = false;
          };
        }

        vicScreen.classList.remove('hidden');
      }
    }, 1100);
  }

  loadStage(index) {
    this.isEndlessMode = false;
    this.currentStageIndex = index;
    const stages = window.STAGES || (window.LevelGenerator ? window.LevelGenerator.getCampaignStages() : []);
    const stageData = stages[index] || stages[0];
    this.currentStage = JSON.parse(JSON.stringify(stageData));
    this.player = this.physics.createPlayer(this.currentStage.startX || 80, this.currentStage.startY || 540);
    this.player.beltColor = this.currentStage.beltColor || '#ffffff';

    if (this.input && this.input.p2 && this.input.p2.active) {
      this.spawnPlayer2();
    } else {
      this.player2 = null;
      const p2Hud = document.getElementById('hud-p2-capsule');
      if (p2Hud) p2Hud.classList.add('hidden');
    }

    this.stageTime = 0;
    this.accumulator = 0;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y - 28;

    this.stickRenderer.resetRibbons(this.player.x, this.player.y - 54, this.player.x, this.player.y - 26);

    const nameEl = document.getElementById('hud-stage-name');
    if (nameEl) nameEl.textContent = this.currentStage.name;
    const beltEl = document.getElementById('hud-belt');
    if (beltEl) {
      beltEl.textContent = this.currentStage.belt || 'WHITE';
      beltEl.className = `hud-badge belt-${(this.currentStage.belt || 'white').toLowerCase()}`;
    }
    const deathsEl = document.getElementById('hud-deaths');
    if (deathsEl) deathsEl.textContent = '0';
  }

  loadInfiniteEndlessWorld() {
    this.isEndlessMode = true;
    this.currentStage = window.LevelGenerator.createInfiniteEndlessWorld();
    this.player = this.physics.createPlayer(this.currentStage.startX, this.currentStage.startY);
    this.player.beltColor = '#ffffff';

    if (this.input && this.input.p2 && this.input.p2.active) {
      this.spawnPlayer2();
    } else {
      this.player2 = null;
      const p2Hud = document.getElementById('hud-p2-capsule');
      if (p2Hud) p2Hud.classList.add('hidden');
    }

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
    if (this.player) {
      this.player.x = this.player.spawnX;
      this.player.y = this.player.spawnY;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.state = 'IDLE';
      this.player.stateTime = 0;
      this.player.isDead = false;
      this.player.hp = this.player.maxHp;
      this.stickRenderer.resetRibbons(this.player.x, this.player.y - 54, this.player.x, this.player.y - 26);
    }
    if (this.player2) {
      this.player2.x = this.player ? this.player.spawnX + 35 : this.player2.spawnX;
      this.player2.y = this.player ? this.player.spawnY : this.player2.spawnY;
      this.player2.vx = 0;
      this.player2.vy = 0;
      this.player2.state = 'IDLE';
      this.player2.stateTime = 0;
      this.player2.isDead = false;
      this.player2.hp = this.player2.maxHp;
      if (this.stickRenderer2) this.stickRenderer2.resetRibbons(this.player2.x, this.player2.y - 54, this.player2.x, this.player2.y - 26);
    }
    this.updateHUDHealth();
    if (window.Audio) window.Audio.play('tap');
    if (window.Haptics) window.Haptics.trigger('tap');
  }

  completeStage() {
    this.isPlaying = false;
    if (window.Audio) window.Audio.play('victory');
    if (window.Haptics) window.Haptics.trigger('checkpoint');

    // If Act 5 (Final Boss) is cleared -> Trigger Cinematic Ending Cutscene!
    const stages = window.STAGES || (window.LevelGenerator ? window.LevelGenerator.getCampaignStages() : []);
    if (!this.isEndlessMode && this.currentStageIndex === stages.length - 1) {
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
      this.updateHUDHealth();

      this.input.updateGamepad();

      this.accumulator += rawDt;
      while (this.accumulator >= this.fixedStep) {
        const hitStopped = this.combat.update(this.fixedStep, this.player, this.currentStage.entities, this.currentStage);

        if (!hitStopped) {
          this.physics.updatePlayer(this.player, this.input.p1 || this.input, this.combat, this.currentStage, this.fixedStep);

          if (this.player2 && !this.player2.isDead) {
            this.physics.updatePlayer(this.player2, this.input.p2, this.combat, this.currentStage, this.fixedStep);
            this.combat.update(this.fixedStep, this.player2, this.currentStage.entities, this.currentStage);
          }

          if (this.is1v1Duel && this.player && this.player2 && !this.duelWinner) {
            this.combat.checkPvPCombat(this.player, this.player2);
            this.combat.checkPvPCombat(this.player2, this.player);
          }

          this.updateEntities(this.fixedStep);
          this.updateSakuraPetals(this.fixedStep);
          this.updateMJPaperBall(this.fixedStep);
          this.checkTutorialSteps();

          if (this.multiplayer && this.multiplayer.isMultiplayer) {
            this.multiplayer.checkPvpCombat(this.player, this.fixedStep);
          }

          if (this.isEndlessMode && this.currentStage.isInfinite) {
            const leadX = (this.player2 && !this.player2.isDead) ? Math.max(this.player.x, this.player2.x) : this.player.x;
            window.LevelGenerator.streamInfiniteWorld(this.currentStage, leadX);
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

    let targetX = p.x + p.facing * Math.min(90, Math.abs(p.vx) * 11);
    let targetY = (p.y - 28) + (p.vy > 4 ? 35 : p.vy < -4 ? -25 : 0);

    if (this.player2 && !this.player2.isDead) {
      const avgX = (p.x + this.player2.x) * 0.5;
      const avgY = (p.y + this.player2.y) * 0.5 - 28;
      targetX = avgX;
      targetY = avgY;
    }

    const lerpSpeedX = 6.2;
    const lerpSpeedY = 5.2;

    this.camera.x += (targetX - this.camera.x) * (1 - Math.exp(-lerpSpeedX * dt));
    this.camera.y += (targetY - this.camera.y) * (1 - Math.exp(-lerpSpeedY * dt));
  }

  updateHUDHealth() {
    if (this.player) {
      const hpRatio = Math.max(0, this.player.hp / (this.player.maxHp || 100));
      const bar = document.getElementById('hud-hp-bar');
      const text = document.getElementById('hud-hp-text');
      if (bar) bar.style.width = `${hpRatio * 100}%`;
      if (text) text.textContent = `${Math.max(0, Math.ceil(this.player.hp))} / ${this.player.maxHp || 100}`;
    }

    if (this.player2) {
      const p2Hud = document.getElementById('hud-p2-capsule');
      if (p2Hud) p2Hud.classList.remove('hidden');
      const hpRatio2 = Math.max(0, this.player2.hp / (this.player2.maxHp || 100));
      const bar2 = document.getElementById('hud-p2-hp-bar');
      const text2 = document.getElementById('hud-p2-hp-text');
      if (bar2) bar2.style.width = `${hpRatio2 * 100}%`;
      if (text2) text2.textContent = `${Math.max(0, Math.ceil(this.player2.hp))} / ${this.player2.maxHp || 100}`;
    }
  }

  drawPlayerTag(ctx, player, label, color) {
    if (!player) return;
    ctx.save();
    ctx.translate(player.x, player.y - player.h - 18);
    ctx.fillStyle = color || '#38bdf8';
    ctx.font = '800 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = color || '#38bdf8';
    ctx.shadowBlur = 6;
    ctx.fillText(label, 0, 0);

    // Mini overhead health pill
    const barW = 32;
    const barH = 4;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(-barW / 2, 4, barW, barH);
    const hpRatio = Math.max(0, (player.hp || 0) / (player.maxHp || 100));
    ctx.fillStyle = color || '#38bdf8';
    ctx.fillRect(-barW / 2, 4, barW * hpRatio, barH);
    ctx.restore();
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

    if (this.is1v1Duel || this.player2) {
      if (this.player2 && !this.player2.isDead) {
        this.stickRenderer2.draw(ctx, this.player2);
        this.drawPlayerTag(ctx, this.player2, `P2: ${this.player2.name || 'MCBAPE'}`, '#38bdf8');
      }
      this.drawPlayerTag(ctx, this.player, `P1: ${this.player.name || 'HALLAND'}`, '#ef4444');
    }

    if (this.multiplayer && this.multiplayer.isMultiplayer) {
      this.multiplayer.render(ctx);
    }
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
    if (!this.sakuraPetals || !this.sakuraPetals.length) return;
    ctx.fillStyle = 'rgba(244, 114, 182, 0.75)';
    ctx.beginPath();
    for (let i = 0; i < this.sakuraPetals.length; i++) {
      const p = this.sakuraPetals[i];
      ctx.moveTo(p.x + p.size, p.y);
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  drawPlatforms(ctx) {
    if (!this.currentStage || !this.currentStage.platforms) return;
    const plats = this.currentStage.platforms;

    // Batched single-pass fill
    ctx.fillStyle = '#1e2430';
    ctx.beginPath();
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      ctx.rect(p.x, p.y, p.w, p.h);
    }
    ctx.fill();

    // Batched top highlight rim
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.w, p.y);
    }
    ctx.stroke();
  }

  drawBreakables(ctx) {
    if (!this.currentStage || !this.currentStage.breakables) return;
    const breakables = this.currentStage.breakables;

    // Batched yellow wooden breakables
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < breakables.length; i++) {
      const b = breakables[i];
      if (!b.broken) ctx.rect(b.x, b.y, b.w, b.h);
    }
    ctx.fill();
    ctx.stroke();
  }

  drawEntities(ctx) {
    if (!this.currentStage.entities) return;
    ctx.save();

    for (const ent of this.currentStage.entities) {
      if (ent.isDead) continue;

      if (ent.isPvP || ent.isPlayer) {
        if (!ent.renderer) ent.renderer = new StickmanRenderer();
        ent.renderer.draw(ctx, ent);
        continue;
      }

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

window.selectP1Char = function(charId, btn) {
  document.querySelectorAll('.p1-card').forEach(b => {
    b.classList.remove('active');
    b.style.border = '1px solid rgba(255,255,255,0.2)';
    b.style.background = 'rgba(15, 23, 42, 0.4)';
  });
  if (btn) {
    btn.classList.add('active');
    btn.style.border = '2px solid #ef4444';
    btn.style.background = 'rgba(239,68,68,0.25)';
  }
  if (window.Game) window.Game.p1Char = charId;
};

window.selectP2Char = function(charId, btn) {
  document.querySelectorAll('.p2-card').forEach(b => {
    b.classList.remove('active');
    b.style.border = '1px solid rgba(255,255,255,0.2)';
    b.style.background = 'rgba(15, 23, 42, 0.4)';
  });
  if (btn) {
    btn.classList.add('active');
    btn.style.border = '2px solid #38bdf8';
    btn.style.background = 'rgba(56,189,248,0.25)';
  }
  if (window.Game) window.Game.p2Char = charId;
};

function initGameEngine() {
  if (!window.Game) {
    try {
      window.Game = new GameEngine();
      console.log("[HALLAND] GameEngine active and UI bound successfully.");
    } catch(e) {
      console.error("[HALLAND] Game initialization error:", e);
    }
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initGameEngine();
} else {
  window.addEventListener('DOMContentLoaded', initGameEngine);
  window.addEventListener('load', initGameEngine);
}
