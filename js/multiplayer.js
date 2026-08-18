/* =========================================================
   ONLINE MULTIPLAYER 1V1 PVP DUEL ENGINE ("HALLAND")
   - Native Render WebSocket Server Relay (wss://mygameserver-bsow.onrender.com/)
   - Configurable Render Server URL with LocalStorage persistence
   - 5-Character Room Codes & Shareable URL Links (?room=XXXXX)
   - Real-time 40Hz State Sync & Interpolation
   - Dedicated 1v1 Dojo Arena with Round Manager & Win Counter
========================================================= */

class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.isMultiplayer = false;
    this.isHost = false;
    this.ws = null;
    this.bc = null;
    this.roomCode = null;
    this.isConnected = false;
    this.opponent = null;
    this.senderId = 'player_' + Math.random().toString(36).substring(2, 9);

    // Default Render WebSocket Server URL (from user's world-game / driving projects)
    this.serverUrl = localStorage.getItem('render_server_url') || 'wss://mygameserver-bsow.onrender.com/';

    // PvP Round Manager
    this.rounds = {
      hostScore: 0,
      guestScore: 0,
      currentRound: 1,
      maxRounds: 3,
      isRoundOver: false,
      bannerText: '',
      bannerSub: '',
      bannerTimer: 0
    };

    this.initBroadcastChannel();
    this.checkUrlRoomParam();
  }

  initBroadcastChannel() {
    try {
      this.bc = new BroadcastChannel('halland_pvp_channel');
      this.bc.onmessage = (e) => {
        if (this.isMultiplayer && e.data) {
          this.handleIncomingMessage(e.data);
        }
      };
    } catch(e) {
      console.warn("[PVP] BroadcastChannel not supported");
    }
  }

  checkUrlRoomParam() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room') || params.get('pvp');
    if (room) {
      setTimeout(() => {
        const inputEl = document.getElementById('pvp-join-code');
        if (inputEl) inputEl.value = room.toUpperCase();
        this.openPvpModal();
      }, 300);
    }
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  sanitizeWsUrl(url) {
    let cleaned = (url || '').trim();
    if (cleaned.startsWith('http://')) cleaned = cleaned.replace('http://', 'ws://');
    else if (cleaned.startsWith('https://')) cleaned = cleaned.replace('https://', 'wss://');
    else if (!cleaned.startsWith('ws://') && !cleaned.startsWith('wss://')) {
      if (cleaned.includes('localhost') || cleaned.includes('127.0.0.1')) cleaned = 'ws://' + cleaned;
      else cleaned = 'wss://' + cleaned;
    }
    return cleaned;
  }

  setServerUrl(newUrl) {
    this.serverUrl = this.sanitizeWsUrl(newUrl);
    localStorage.setItem('render_server_url', this.serverUrl);
  }

  // --- HOST A MATCH (RENDER WEBSOCKET) ---
  hostMatch() {
    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    this.isMultiplayer = true;
    this.updateStatusUI(`Connecting to Render Server (<code>${this.serverUrl}</code>)...`);

    this.connectWebSocket(() => {
      this.updateStatusUI(`🟢 ROOM ACTIVE: <strong>${this.roomCode}</strong><br><span style="font-size:0.85em;color:#94a3b8">Connected to Render server! Waiting for opponent to join...</span>`);
      this.showHostLobbyUI(this.roomCode);

      // Register host on room
      this.sendWsPacket({
        roomCode: this.roomCode,
        event: 'host_ready',
        senderId: this.senderId,
        data: { hostName: 'PLAYER 1' }
      });
    });
  }

  // --- JOIN A MATCH (RENDER WEBSOCKET) ---
  joinMatch(code) {
    if (!code || code.trim().length < 3) {
      this.updateStatusUI("❌ Please enter a valid room code!");
      return;
    }

    this.roomCode = code.trim().toUpperCase();
    this.isHost = false;
    this.isMultiplayer = true;
    this.updateStatusUI(`Connecting to Room <strong>${this.roomCode}</strong> via Render Server...`);

    this.connectWebSocket(() => {
      // Signal join to host
      this.sendWsPacket({
        roomCode: this.roomCode,
        event: 'player_join',
        senderId: this.senderId,
        data: { player: { id: this.senderId, name: 'PLAYER 2 (GUEST)' } }
      });

      this.updateStatusUI(`⚡ Joined room ${this.roomCode}! Waiting for match start...`);
    });
  }

  connectWebSocket(onOpen) {
    if (this.ws) {
      try { this.ws.close(); } catch(e) {}
    }

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log(`[PVP] Connected to Render WebSocket server: ${this.serverUrl}`);
        if (onOpen) onOpen();
      };

      this.ws.onmessage = async (event) => {
        try {
          let text = '';
          if (event.data instanceof Blob) {
            text = await event.data.text();
          } else if (typeof event.data === 'string') {
            text = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(event.data);
          } else {
            text = event.data.toString();
          }

          const msg = JSON.parse(text);
          this.handleIncomingMessage(msg);
        } catch(err) {
          console.error("[PVP] Error parsing WS message:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[PVP] WebSocket error:", err);
        this.updateStatusUI(`⚠️ Server waking up or offline. (Render free-tier spins down after inactivity).<br><span style="font-size:0.8em;color:#f59e0b">Retrying connection...</span>`);
      };

      this.ws.onclose = () => {
        console.log("[PVP] WebSocket disconnected.");
      };
    } catch(e) {
      console.error("[PVP] WebSocket init failed:", e);
      this.updateStatusUI(`❌ WebSocket connection error: ${e.message}`);
    }
  }

  sendWsPacket(msg) {
    const payload = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    }
    // Also post to BroadcastChannel for instant local testing
    if (this.bc) {
      try { this.bc.postMessage(msg); } catch(e) {}
    }
  }

  handleIncomingMessage(msg) {
    if (!msg || msg.roomCode !== this.roomCode) return;
    if (msg.senderId === this.senderId) return; // Ignore our own echo

    switch(msg.event) {
      case 'player_join':
        if (this.isHost) {
          console.log("[PVP] Opponent joined room!");
          this.isConnected = true;
          this.initOpponent();
          this.startPvPGame();

          // Acknowledge join
          this.sendWsPacket({
            roomCode: this.roomCode,
            event: 'host_start',
            senderId: this.senderId,
            data: { hostName: 'HOST (PLAYER 1)' }
          });
        }
        break;

      case 'host_start':
        if (!this.isHost) {
          console.log("[PVP] Host initiated match start!");
          this.isConnected = true;
          this.initOpponent();
          this.startPvPGame();
        }
        break;

      case 'state_sync':
        if (this.opponent && msg.data) {
          this.opponent.targetX = msg.data.x;
          this.opponent.targetY = msg.data.y;
          this.opponent.vx = msg.data.vx;
          this.opponent.vy = msg.data.vy;
          this.opponent.facing = msg.data.facing;
          this.opponent.state = msg.data.state;
          this.opponent.hp = msg.data.hp;
          this.opponent.isBlocking = msg.data.isBlocking;
          this.opponent.comboStep = msg.data.comboStep;
        }
        break;

      case 'action':
        if (msg.data) {
          if (msg.data.event === 'hit') {
            this.receiveHit(msg.data.damage, msg.data.knockbackX, msg.data.knockbackY, msg.data.attackType);
          } else if (msg.data.event === 'round_win') {
            this.handleRoundLoss(msg.data.winnerIsHost);
          } else if (msg.data.event === 'rematch') {
            this.triggerRoundBanner('REMATCH ACCEPTED', 'FIGHT!');
            this.resetRound();
          }
        }
        break;
    }
  }

  initOpponent() {
    this.opponent = {
      x: this.isHost ? 700 : 150,
      y: 400,
      vx: 0,
      vy: 0,
      facing: this.isHost ? -1 : 1,
      state: 'IDLE',
      hp: 100,
      maxHp: 100,
      isBlocking: false,
      comboStep: 0,
      invulnerableTimer: 0,
      beltColor: this.isHost ? '#38bdf8' : '#ef4444',
      name: this.isHost ? 'OPPONENT (GUEST)' : 'HOST (PLAYER 1)'
    };
  }

  startPvPGame() {
    // Close PVP Modal & Start Screen
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.add('hidden');

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');

    // Load Dedicated 1v1 Dojo Arena
    this.loadPvpArena();

    // Reset Player Positions
    const p = this.game.player;
    p.x = this.isHost ? 150 : 700;
    p.y = 400;
    p.vx = 0;
    p.vy = 0;
    p.facing = this.isHost ? 1 : -1;
    p.hp = 100;
    p.maxHp = 100;
    p.state = 'IDLE';

    this.rounds.hostScore = 0;
    this.rounds.guestScore = 0;
    this.rounds.currentRound = 1;
    this.triggerRoundBanner(`ROUND 1`, `FIGHT!`);

    this.game.isPlaying = true;
    this.game.isEndlessMode = false;
    if (window.Audio) window.Audio.resume();

    // Start 40Hz State Sync Broadcast Loop
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.broadcastState(), 1000 / 40);
  }

  loadPvpArena() {
    this.game.currentStage = {
      id: 99,
      name: "1V1 PVP: THE GRAND DOJO ARENA",
      belt: "BLACK",
      gravity: 0.65,
      friction: 0.88,
      playerStart: { x: this.isHost ? 150 : 700, y: 400 },
      platforms: [
        { x: 50, y: 450, w: 780, h: 40, type: 'ground' },
        { x: 30, y: 150, w: 20, h: 320, type: 'wall' },
        { x: 830, y: 150, w: 20, h: 320, type: 'wall' },
        { x: 140, y: 320, w: 180, h: 18, type: 'pagoda' },
        { x: 560, y: 320, w: 180, h: 18, type: 'pagoda' },
        { x: 410, y: 440, w: 60, h: 12, isBouncer: true }
      ],
      breakables: [
        { x: 220, y: 260, w: 16, h: 60, broken: false },
        { x: 640, y: 260, w: 16, h: 60, broken: false }
      ],
      entities: []
    };
  }

  broadcastState() {
    if (!this.isConnected) return;

    const p = this.game.player;
    this.sendWsPacket({
      roomCode: this.roomCode,
      event: 'state_sync',
      senderId: this.senderId,
      data: {
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        vx: Math.round(p.vx * 10) / 10,
        vy: Math.round(p.vy * 10) / 10,
        facing: p.facing,
        state: p.state,
        hp: p.hp,
        isBlocking: this.game.input.isBlocking,
        comboStep: p.comboStep || 0
      }
    });
  }

  checkPvpCombat(player, dt) {
    if (!this.isConnected || !this.opponent) return;

    if (this.opponent.targetX !== undefined) {
      this.opponent.x += (this.opponent.targetX - this.opponent.x) * 0.45;
      this.opponent.y += (this.opponent.targetY - this.opponent.y) * 0.45;
    }

    const isAttacking = player.state.startsWith('ATK') || player.state === 'FLYING_TORNADO_KICK' || player.state === 'DRAGON_UPPERCUT';
    if (isAttacking && player.stateTime < 0.12 && !player.hasHitOpponentThisMove) {
      const dx = this.opponent.x - player.x;
      const dy = this.opponent.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 65 && Math.sign(dx) === player.facing) {
        player.hasHitOpponentThisMove = true;

        if (this.opponent.isBlocking) {
          if (window.Audio) window.Audio.playParry();
          player.vx = -player.facing * 8;
          player.state = 'STUNNED';
          this.game.combat.spawnImpactParticles(this.opponent.x, this.opponent.y - 30, '#38bdf8', 16);
        } else {
          const dmg = player.state === 'DRAGON_UPPERCUT' ? 26 : 14;
          const kbX = player.facing * (player.state === 'DRAGON_UPPERCUT' ? 12 : 8);
          const kbY = player.state === 'DRAGON_UPPERCUT' ? -10 : -4;

          this.opponent.hp = Math.max(0, this.opponent.hp - dmg);
          if (window.Audio) window.Audio.playPunch();
          this.game.combat.spawnImpactParticles(this.opponent.x, this.opponent.y - 30, '#ef4444', 18);

          this.sendWsPacket({
            roomCode: this.roomCode,
            event: 'action',
            senderId: this.senderId,
            data: {
              event: 'hit',
              damage: dmg,
              knockbackX: kbX,
              knockbackY: kbY,
              attackType: player.state
            }
          });

          if (this.opponent.hp <= 0 && !this.rounds.isRoundOver) {
            this.handleRoundVictory();
          }
        }
      }
    }

    if (!isAttacking) {
      player.hasHitOpponentThisMove = false;
    }
  }

  receiveHit(dmg, kbX, kbY, atkType) {
    const p = this.game.player;
    if (p.invulnerableTimer > 0) return;

    p.hp = Math.max(0, p.hp - dmg);
    p.vx = kbX;
    p.vy = kbY;
    p.invulnerableTimer = 0.4;
    p.state = 'HIT';

    if (window.Audio) window.Audio.playKick();
    this.game.combat.triggerHitStop(0.04);
    this.game.combat.triggerScreenShake(7);

    const flashEl = document.getElementById('damage-flash');
    if (flashEl) {
      flashEl.classList.add('flash');
      setTimeout(() => flashEl.classList.remove('flash'), 180);
    }

    if (p.hp <= 0 && !this.rounds.isRoundOver) {
      this.sendWsPacket({
        roomCode: this.roomCode,
        event: 'action',
        senderId: this.senderId,
        data: { event: 'round_win', winnerIsHost: !this.isHost }
      });
      this.handleRoundLoss(!this.isHost);
    }
  }

  handleRoundVictory() {
    this.rounds.isRoundOver = true;
    if (this.isHost) this.rounds.hostScore++;
    else this.rounds.guestScore++;

    if (window.Audio) window.Audio.playVictoryStinger();

    const myScore = this.isHost ? this.rounds.hostScore : this.rounds.guestScore;
    const oppScore = this.isHost ? this.rounds.guestScore : this.rounds.hostScore;

    if (myScore >= 2) {
      this.triggerRoundBanner('🏆 MATCH VICTORY! 🏆', `FINAL SCORE: ${myScore} - ${oppScore}`, 4.0);
    } else {
      this.triggerRoundBanner('K.O. - ROUND WON!', `SCORE: ${myScore} - ${oppScore}`, 2.5);
      setTimeout(() => this.nextRound(), 2500);
    }
  }

  handleRoundLoss(winnerIsHost) {
    this.rounds.isRoundOver = true;
    if (winnerIsHost) this.rounds.hostScore++;
    else this.rounds.guestScore++;

    if (window.Audio) window.Audio.playDeath();

    const myScore = this.isHost ? this.rounds.hostScore : this.rounds.guestScore;
    const oppScore = this.isHost ? this.rounds.guestScore : this.rounds.hostScore;

    if (oppScore >= 2) {
      this.triggerRoundBanner('DEFEAT', `FINAL SCORE: ${myScore} - ${oppScore}`, 4.0);
    } else {
      this.triggerRoundBanner('K.O. - ROUND LOST', `SCORE: ${myScore} - ${oppScore}`, 2.5);
      setTimeout(() => this.nextRound(), 2500);
    }
  }

  nextRound() {
    this.rounds.currentRound++;
    this.triggerRoundBanner(`ROUND ${this.rounds.currentRound}`, 'FIGHT!');
    this.resetRound();
  }

  resetRound() {
    this.rounds.isRoundOver = false;
    const p = this.game.player;
    p.x = this.isHost ? 150 : 700;
    p.y = 400;
    p.vx = 0;
    p.vy = 0;
    p.hp = 100;
    p.facing = this.isHost ? 1 : -1;
    p.state = 'IDLE';

    if (this.opponent) {
      this.opponent.x = this.isHost ? 700 : 150;
      this.opponent.y = 400;
      this.opponent.vx = 0;
      this.opponent.vy = 0;
      this.opponent.hp = 100;
      this.opponent.facing = this.isHost ? -1 : 1;
      this.opponent.state = 'IDLE';
    }
  }

  triggerRoundBanner(title, sub, duration = 2.0) {
    this.rounds.bannerText = title;
    this.rounds.bannerSub = sub;
    this.rounds.bannerTimer = duration;
  }

  render(ctx) {
    if (!this.isConnected || !this.opponent) return;

    ctx.save();
    ctx.translate(this.opponent.x, this.opponent.y);

    if (this.game.stickRenderer) {
      this.game.stickRenderer.draw(
        ctx,
        this.opponent.facing,
        this.opponent.state,
        this.opponent.beltColor,
        0,
        this.opponent.vx,
        this.opponent.vy,
        { hp: this.opponent.hp, maxHp: this.opponent.maxHp, isDead: this.opponent.hp <= 0 }
      );
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 11px Outfit, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.opponent.name, 0, -78);

    ctx.restore();

    if (this.rounds.bannerTimer > 0) {
      this.rounds.bannerTimer -= 0.016;
      ctx.save();
      ctx.fillStyle = 'rgba(7, 9, 14, 0.75)';
      ctx.fillRect(0, this.game.height * 0.3 - 40, this.game.width, 100);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 36px Outfit, Syncopate';
      ctx.textAlign = 'center';
      ctx.fillText(this.rounds.bannerText, this.game.width / 2, this.game.height * 0.3 + 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 16px Outfit, monospace';
      ctx.fillText(this.rounds.bannerSub, this.game.width / 2, this.game.height * 0.3 + 42);
      ctx.restore();
    }
  }

  openPvpModal() {
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.remove('hidden');

    const urlInput = document.getElementById('pvp-server-url-input');
    if (urlInput) urlInput.value = this.serverUrl;
  }

  closePvpModal() {
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.add('hidden');
  }

  showHostLobbyUI(code) {
    const codeEl = document.getElementById('pvp-room-code-display');
    if (codeEl) codeEl.textContent = code;

    const copyBtn = document.getElementById('btn-copy-pvp-link');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
        navigator.clipboard.writeText(url).then(() => {
          copyBtn.textContent = 'COPIED! ✓';
          setTimeout(() => copyBtn.textContent = 'COPY LINK 🔗', 2000);
        });
      };
    }
  }

  updateStatusUI(html) {
    const statusEl = document.getElementById('pvp-status-msg');
    if (statusEl) statusEl.innerHTML = html;
  }
}

window.MultiplayerManager = MultiplayerManager;
