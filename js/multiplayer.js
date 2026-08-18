/* =========================================================
   ONLINE MULTIPLAYER 1V1 PVP DUEL ENGINE ("HALLAND")
   - P2P WebRTC DataChannel synchronization via PeerJS
   - Same-device multi-tab instant testing via BroadcastChannel
   - Ultra-low latency state replication with interpolation
   - Dedicated 1v1 Dojo Arena with Round Manager & Win Counter
========================================================= */

class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.isMultiplayer = false;
    this.isHost = false;
    this.peer = null;
    this.conn = null;
    this.bc = null;
    this.roomCode = null;
    this.isConnected = false;
    this.opponent = null;
    this.ping = 0;
    this.lastPingTs = 0;

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

    // State buffer for smooth interpolation
    this.opponentStates = [];

    this.initBroadcastChannel();
    this.checkUrlRoomParam();
  }

  initBroadcastChannel() {
    try {
      this.bc = new BroadcastChannel('halland_pvp_channel');
      this.bc.onmessage = (e) => {
        if (!this.isConnected && this.isMultiplayer) {
          this.handleBcMessage(e.data);
        }
      };
    } catch(e) {
      console.warn("BroadcastChannel not supported in this environment");
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
    let code = 'HALL-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // --- HOSTING A PVP MATCH ---
  hostMatch() {
    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    this.isMultiplayer = true;
    this.updateStatusUI(`Hosting match... Generating Room Code: ${this.roomCode}`);

    this.initPeer(this.roomCode, () => {
      this.updateStatusUI(`🟢 ROOM READY: <strong>${this.roomCode}</strong><br><span style="font-size:0.85em;color:#94a3b8">Waiting for opponent to join...</span>`);
      this.showHostLobbyUI(this.roomCode);
    });
  }

  // --- JOINING A PVP MATCH ---
  joinMatch(code) {
    if (!code || code.trim().length === 0) {
      this.updateStatusUI("❌ Please enter a valid room code!");
      return;
    }

    this.roomCode = code.trim().toUpperCase();
    this.isHost = false;
    this.isMultiplayer = true;
    this.updateStatusUI(`Connecting to Room ${this.roomCode}...`);

    this.initPeer(null, () => {
      const conn = this.peer.connect(this.roomCode, { reliable: true });
      this.setupConnection(conn);

      // Also announce via BroadcastChannel for same-device multi-tab instant play
      if (this.bc) {
        this.bc.postMessage({ type: 'JOIN_REQ', roomCode: this.roomCode });
      }
    });
  }

  initPeer(customId, onReady) {
    if (typeof Peer === 'undefined') {
      console.warn("PeerJS not loaded. Using local broadcast fallback.");
      if (onReady) onReady();
      return;
    }

    if (this.peer) {
      try { this.peer.destroy(); } catch(e) {}
    }

    const peerConfig = {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    };

    try {
      this.peer = customId ? new Peer(customId, peerConfig) : new Peer(peerConfig);

      this.peer.on('open', (id) => {
        console.log(`[PVP] Peer initialized with ID: ${id}`);
        if (onReady) onReady();
      });

      this.peer.on('connection', (conn) => {
        console.log(`[PVP] Incoming connection from opponent: ${conn.peer}`);
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn(`[PVP] Peer error:`, err);
        if (err.type === 'unavailable-id') {
          this.hostMatch(); // Retry with fresh room code
        } else {
          this.updateStatusUI(`⚠️ Peer Notice: ${err.message || 'Connecting via fallback...'}`);
        }
      });
    } catch(e) {
      console.error("PeerJS initialization failed:", e);
      if (onReady) onReady();
    }
  }

  setupConnection(conn) {
    this.conn = conn;

    conn.on('open', () => {
      console.log("[PVP] WebRTC DataChannel Connected!");
      this.isConnected = true;
      this.initOpponent();
      this.startPvPGame();

      // Handshake
      this.send({ type: 'HANDSHAKE', isHost: this.isHost, ts: performance.now() });
    });

    conn.on('data', (data) => {
      this.handleMessage(data);
    });

    conn.on('close', () => {
      this.handleOpponentDisconnect();
    });

    conn.on('error', (err) => {
      console.warn("[PVP] Conn error:", err);
    });
  }

  handleBcMessage(data) {
    if (this.isHost && data.type === 'JOIN_REQ' && data.roomCode === this.roomCode) {
      this.isConnected = true;
      this.initOpponent();
      this.startPvPGame();
      this.bc.postMessage({ type: 'JOIN_ACK', roomCode: this.roomCode });
    } else if (!this.isHost && data.type === 'JOIN_ACK' && data.roomCode === this.roomCode) {
      this.isConnected = true;
      this.initOpponent();
      this.startPvPGame();
    } else if (this.isConnected) {
      this.handleMessage(data);
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
      beltColor: this.isHost ? '#38bdf8' : '#ef4444', // Guest is Blue, Host is Red
      name: this.isHost ? 'OPPONENT (GUEST)' : 'HOST (PLAYER 1)'
    };
  }

  startPvPGame() {
    // 1. Close PVP Modal
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.add('hidden');

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');

    // 2. Load Dedicated 1v1 Dojo Arena
    this.loadPvpArena();

    // 3. Reset positions
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

    // Start 60Hz Network Sync Loop
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.broadcastState(), 1000 / 40);
  }

  loadPvpArena() {
    // Dedicated 1v1 Dojo Battle Stage
    this.game.currentStage = {
      id: 99,
      name: "1V1 PVP: THE GRAND DOJO ARENA",
      belt: "BLACK",
      gravity: 0.65,
      friction: 0.88,
      playerStart: { x: this.isHost ? 150 : 700, y: 400 },
      platforms: [
        // Main battle platform
        { x: 50, y: 450, w: 780, h: 40, type: 'ground' },
        // Left & Right boundary walls (wall-kickable)
        { x: 30, y: 150, w: 20, h: 320, type: 'wall' },
        { x: 830, y: 150, w: 20, h: 320, type: 'wall' },
        // Elevated Pagoda Jump Lofts
        { x: 140, y: 320, w: 180, h: 18, type: 'pagoda' },
        { x: 560, y: 320, w: 180, h: 18, type: 'pagoda' },
        // Center Power Bouncer
        { x: 410, y: 440, w: 60, h: 12, isBouncer: true }
      ],
      breakables: [
        { x: 220, y: 260, w: 16, h: 60, broken: false },
        { x: 640, y: 260, w: 16, h: 60, broken: false }
      ],
      entities: [] // No bots, pure PvP!
    };
  }

  broadcastState() {
    if (!this.isConnected) return;

    const p = this.game.player;
    const statePacket = {
      type: 'STATE',
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      vx: Math.round(p.vx * 10) / 10,
      vy: Math.round(p.vy * 10) / 10,
      facing: p.facing,
      state: p.state,
      hp: p.hp,
      isBlocking: this.game.input.isBlocking,
      comboStep: p.comboStep || 0,
      ts: performance.now()
    };

    this.send(statePacket);
  }

  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    } else if (this.bc) {
      this.bc.postMessage(data);
    }
  }

  handleMessage(msg) {
    if (!msg || !msg.type) return;

    switch(msg.type) {
      case 'STATE':
        if (this.opponent) {
          // Smooth target state
          this.opponent.targetX = msg.x;
          this.opponent.targetY = msg.y;
          this.opponent.vx = msg.vx;
          this.opponent.vy = msg.vy;
          this.opponent.facing = msg.facing;
          this.opponent.state = msg.state;
          this.opponent.hp = msg.hp;
          this.opponent.isBlocking = msg.isBlocking;
          this.opponent.comboStep = msg.comboStep;
        }
        break;

      case 'HIT':
        // Opponent landed a confirmed strike on us
        this.receiveHit(msg.damage, msg.knockbackX, msg.knockbackY, msg.attackType);
        break;

      case 'ROUND_WIN':
        this.handleRoundLoss(msg.winnerIsHost);
        break;

      case 'REMATCH_REQ':
        this.triggerRoundBanner('REMATCH ACCEPTED', 'FIGHT!');
        this.resetRound();
        break;
    }
  }

  // --- PVP COMBAT RESOLUTION ---
  checkPvpCombat(player, dt) {
    if (!this.isConnected || !this.opponent) return;

    // Smooth opponent position interpolation
    if (this.opponent.targetX !== undefined) {
      this.opponent.x += (this.opponent.targetX - this.opponent.x) * 0.45;
      this.opponent.y += (this.opponent.targetY - this.opponent.y) * 0.45;
    }

    // Check if our attack hits the opponent
    const isAttacking = player.state.startsWith('ATK') || player.state === 'FLYING_TORNADO_KICK' || player.state === 'DRAGON_UPPERCUT';
    if (isAttacking && player.stateTime < 0.12 && !player.hasHitOpponentThisMove) {
      const dx = this.opponent.x - player.x;
      const dy = this.opponent.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 65 && Math.sign(dx) === player.facing) {
        player.hasHitOpponentThisMove = true;

        if (this.opponent.isBlocking) {
          // Opponent blocked / parried our strike
          if (window.Audio) window.Audio.playParry();
          player.vx = -player.facing * 8;
          player.state = 'STUNNED';
          this.game.combat.spawnImpactParticles(this.opponent.x, this.opponent.y - 30, '#38bdf8', 16);
        } else {
          // We landed a clean hit!
          const dmg = player.state === 'DRAGON_UPPERCUT' ? 26 : 14;
          const kbX = player.facing * (player.state === 'DRAGON_UPPERCUT' ? 12 : 8);
          const kbY = player.state === 'DRAGON_UPPERCUT' ? -10 : -4;

          this.opponent.hp = Math.max(0, this.opponent.hp - dmg);
          if (window.Audio) window.Audio.playPunch();
          this.game.combat.spawnImpactParticles(this.opponent.x, this.opponent.y - 30, '#ef4444', 18);

          // Send confirmed hit packet to opponent
          this.send({
            type: 'HIT',
            damage: dmg,
            knockbackX: kbX,
            knockbackY: kbY,
            attackType: player.state
          });

          // Check for K.O.
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

    // Screen flash
    const flashEl = document.getElementById('damage-flash');
    if (flashEl) {
      flashEl.classList.add('flash');
      setTimeout(() => flashEl.classList.remove('flash'), 180);
    }

    if (p.hp <= 0 && !this.rounds.isRoundOver) {
      this.send({ type: 'ROUND_WIN', winnerIsHost: !this.isHost });
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

  // --- RENDER OPPONENT & PVP HUD ---
  render(ctx) {
    if (!this.isConnected || !this.opponent) return;

    // 1. Draw Opponent Stickman
    ctx.save();
    ctx.translate(this.opponent.x, this.opponent.y);

    if (this.game.stickRenderer) {
      this.game.stickRenderer.draw(
        ctx,
        this.opponent.facing,
        this.opponent.state,
        this.opponent.beltColor,
        0, // landingSquash
        this.opponent.vx,
        this.opponent.vy,
        { hp: this.opponent.hp, maxHp: this.opponent.maxHp, isDead: this.opponent.hp <= 0 }
      );
    }

    // Opponent Overhead Nametag
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 11px Outfit, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.opponent.name, 0, -78);

    ctx.restore();

    // 2. Draw PvP Round Banner
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

  // --- UI HELPERS ---
  openPvpModal() {
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.remove('hidden');
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

  handleOpponentDisconnect() {
    this.isConnected = false;
    this.triggerRoundBanner('OPPONENT DISCONNECTED', 'Returning to main menu...', 3.0);
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
}

window.MultiplayerManager = MultiplayerManager;
