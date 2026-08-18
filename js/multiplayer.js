/* =========================================================
   ONLINE MULTIPLAYER ARENA ("HALLAND")
   Rock-Solid Direct Player Synchronization
   - Instant 0ms Local Play via BroadcastChannel
   - Native WebSocket Relay for Internet Play
   - Direct Entity Integration with Single-Player Combat
   - 5 Unique Selectable Legends (Halland, LeBrown, Jordunn, McBape, Ronalds)
========================================================= */

class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.isMultiplayer = false;
    this.roomCode = 'ARENA1';
    this.senderId = 'p_' + Math.random().toString(36).substring(2, 9);

    // Profile Settings
    this.playerName = localStorage.getItem('pvp_player_name') || 'FIGHTER ' + Math.floor(Math.random() * 90 + 10);
    this.characterId = localStorage.getItem('pvp_character_id') || 'halland';
    this.serverUrl = localStorage.getItem('render_server_url') || 'wss://mygameserver-bsow.onrender.com/';

    this.ws = null;
    this.bc = null;
    this.syncInterval = null;
    this.banner = { text: '', sub: '', timer: 0 };

    this.initBroadcastChannel();
    this.initWebSocket();
  }

  // --- DUAL-TRANSPORT NETWORKING ---
  initBroadcastChannel() {
    try {
      this.bc = new BroadcastChannel('halland_pvp_channel');
      this.bc.onmessage = (e) => {
        if (e.data) this.handleIncomingMessage(e.data);
      };
    } catch(e) {
      console.warn("[PVP] BroadcastChannel unavailable:", e);
    }
  }

  initWebSocket() {
    if (this.ws) {
      try { this.ws.close(); } catch(e) {}
    }
    try {
      this.ws = new WebSocket(this.serverUrl);
      this.ws.onopen = () => {
        console.log("[PVP] Connected to WebSocket Relay:", this.serverUrl);
      };
      this.ws.onmessage = async (e) => {
        try {
          let text = '';
          if (e.data instanceof Blob) text = await e.data.text();
          else if (typeof e.data === 'string') text = e.data;
          else if (e.data instanceof ArrayBuffer) text = new TextDecoder().decode(e.data);
          else text = e.data.toString();

          const msg = JSON.parse(text);
          this.handleIncomingMessage(msg);
        } catch(err) {
          // ignore malformed packets
        }
      };
      this.ws.onerror = () => {
        console.warn("[PVP] WebSocket notice (server waking or offline)");
      };
      this.ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(() => this.initWebSocket(), 3000);
      };
    } catch(e) {
      console.warn("[PVP] WS connection failed:", e);
    }
  }

  sendPacket(msg) {
    msg.room = this.roomCode;
    msg.sender = this.senderId;

    // 1. Send via local BroadcastChannel (instant across tabs on same device)
    if (this.bc) {
      try { this.bc.postMessage(msg); } catch(e) {}
    }

    // 2. Send via WebSocket (across internet devices)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(msg)); } catch(e) {}
    }
  }

  // --- ARENA LAUNCH & PLAY ---
  enterArena(roomCode = 'ARENA1') {
    this.roomCode = (roomCode || 'ARENA1').trim().toUpperCase();
    this.isMultiplayer = true;

    // Close all menus
    const pvpModal = document.getElementById('pvp-modal');
    if (pvpModal) pvpModal.classList.add('hidden');
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');
    const victoryScreen = document.getElementById('victory-screen');
    if (victoryScreen) victoryScreen.classList.add('hidden');

    // Create Dojo Combat Arena Level
    this.game.currentStage = {
      id: 99,
      name: `PVP ARENA • ROOM: ${this.roomCode}`,
      belt: "BLACK",
      gravity: 0.68,
      friction: 0.88,
      startX: 220,
      startY: 420,
      platforms: [
        { x: 40, y: 520, w: 1000, h: 45, type: 'ground' },
        { x: 20, y: 150, w: 20, h: 370, type: 'wall' },
        { x: 1040, y: 150, w: 20, h: 370, type: 'wall' },
        // Fighting Pagoda Platforms
        { x: 140, y: 390, w: 220, h: 18, type: 'pagoda' },
        { x: 720, y: 390, w: 220, h: 18, type: 'pagoda' },
        { x: 430, y: 280, w: 220, h: 18, type: 'pagoda' },
        // Jump Bouncer
        { x: 510, y: 510, w: 60, h: 12, isBouncer: true }
      ],
      breakables: [
        { x: 240, y: 330, w: 16, h: 60, broken: false },
        { x: 820, y: 330, w: 16, h: 60, broken: false }
      ],
      entities: []
    };

    // Initialize Local Player
    const p = this.game.physics.createPlayer(220 + Math.random() * 400, 420);
    p.characterId = this.characterId;
    p.name = this.playerName;
    p.hp = 100;
    p.maxHp = 100;
    p.beltColor = '#ef4444';
    this.game.player = p;

    this.game.isPlaying = true;
    this.game.isPaused = false;
    this.game.isEndlessMode = false;
    this.game.stageTime = 0;

    // Reset camera & ribbons
    this.game.camera.x = p.x;
    this.game.camera.y = p.y - 28;
    this.game.stickRenderer.resetRibbons(p.x, p.y - 54, p.x, p.y - 26);

    const hudStageName = document.getElementById('hud-stage-name');
    if (hudStageName) hudStageName.textContent = `⚔️ PVP ARENA • ${this.roomCode}`;

    if (window.Audio) window.Audio.resume();

    this.triggerBanner('⚔️ PVP ARENA READY', `FIGHTER: ${this.playerName} • ROOM: ${this.roomCode}`, 3.0);

    // Broadcast state at 40Hz
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.broadcastState(), 1000 / 40);

    // Immediate join announcement
    this.sendPacket({
      type: 'join',
      name: this.playerName,
      characterId: this.characterId
    });
  }

  // --- STATE BROADCASTER ---
  broadcastState() {
    if (!this.isMultiplayer || !this.game.player) return;
    const p = this.game.player;

    this.sendPacket({
      type: 'sync',
      name: this.playerName,
      characterId: this.characterId,
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      vx: Math.round(p.vx * 10) / 10,
      vy: Math.round(p.vy * 10) / 10,
      facing: p.facing || 1,
      state: p.state || 'IDLE',
      hp: p.hp,
      isBlocking: this.game.input ? this.game.input.isBlocking : false,
      comboStep: p.comboStep || 0
    });
  }

  // --- MESSAGE RECEIVER & ENTITY MANAGER ---
  handleIncomingMessage(msg) {
    if (!msg || msg.room !== this.roomCode || msg.sender === this.senderId) return;

    if (!this.game.currentStage) return;
    if (!this.game.currentStage.entities) this.game.currentStage.entities = [];

    switch(msg.type) {
      case 'join':
      case 'sync': {
        let ent = this.game.currentStage.entities.find(e => e.id === msg.sender);
        if (!ent) {
          // Spawn remote player directly into currentStage.entities
          ent = {
            id: msg.sender,
            name: msg.name || 'OPPONENT',
            characterId: msg.characterId || 'halland',
            type: 'pvp_fighter',
            isPvP: true,
            isTarget: true,
            isPlayer: true,
            w: 22,
            h: 60,
            x: Number.isFinite(msg.x) ? msg.x : 600,
            y: Number.isFinite(msg.y) ? msg.y : 420,
            vx: 0,
            vy: 0,
            facing: msg.facing || -1,
            state: msg.state || 'IDLE',
            hp: msg.hp !== undefined ? msg.hp : 100,
            maxHp: 100,
            hitTimer: 0,
            isDead: false,
            renderer: new StickmanRenderer()
          };
          this.game.currentStage.entities.push(ent);
          this.triggerBanner('⚡ OPPONENT JOINED!', `${ent.name.toUpperCase()} ENTERED THE ARENA!`, 2.5);
        }

        // Smooth position and sync animation
        if (Number.isFinite(msg.x)) ent.x += (msg.x - ent.x) * 0.6;
        if (Number.isFinite(msg.y)) ent.y += (msg.y - ent.y) * 0.6;
        ent.vx = msg.vx || 0;
        ent.vy = msg.vy || 0;
        ent.facing = msg.facing || ent.facing;
        ent.state = msg.state || 'IDLE';
        ent.characterId = msg.characterId || ent.characterId;
        ent.name = msg.name || ent.name;
        if (msg.hp !== undefined) ent.hp = msg.hp;
        break;
      }

      case 'hit': {
        if (msg.target === this.senderId) {
          this.receiveDamage(msg.damage || 15, msg.kbX || 6, msg.kbY || -4, msg.atkType);
        }
        break;
      }

      case 'defeat': {
        const victim = this.game.currentStage.entities.find(e => e.id === msg.victimId);
        if (victim) victim.isDead = true;
        this.triggerBanner('🏆 KNOCKOUT! 🏆', `${msg.winnerName} DEFEATED OPPONENT!`, 4.0);
        break;
      }

      case 'respawn': {
        const ent = this.game.currentStage.entities.find(e => e.id === msg.sender);
        if (ent) {
          ent.isDead = false;
          ent.hp = 100;
          ent.x = msg.x || 500;
          ent.y = 420;
        }
        break;
      }
    }
  }

  // --- DAMAGE & IMPACT ---
  receiveDamage(dmg, kbX, kbY, atkType) {
    const p = this.game.player;
    if (!p || p.invulnerableTimer > 0 || p.hp <= 0) return;

    p.hp = Math.max(0, p.hp - dmg);
    p.vx = kbX;
    p.vy = kbY;
    p.invulnerableTimer = 0.35;
    p.state = 'HIT';

    if (window.Audio) window.Audio.play('hit');
    if (this.game.combat) {
      this.game.combat.triggerHitStop(0.04);
      this.game.combat.triggerScreenShake(7);
      this.game.combat.spawnImpactParticles(p.x, p.y - 30, '#ef4444', 16);
    }

    const flashEl = document.getElementById('damage-flash');
    if (flashEl) {
      flashEl.classList.add('flash');
      setTimeout(() => flashEl.classList.remove('flash'), 180);
    }

    if (p.hp <= 0) {
      p.isDead = true;
      this.sendPacket({
        type: 'defeat',
        victimId: this.senderId,
        winnerName: 'OPPONENT'
      });
      this.triggerBanner('💀 YOU WERE DEFEATED', 'PRESS [SPACE] TO RESPAWN', 5.0);

      // Auto-respawn after 3.5 seconds
      setTimeout(() => {
        if (this.isMultiplayer && p.isDead) {
          this.respawnPlayer();
        }
      }, 3500);
    }
  }

  respawnPlayer() {
    const p = this.game.player;
    if (!p) return;
    p.hp = 100;
    p.isDead = false;
    p.x = 220 + Math.random() * 500;
    p.y = 420;
    p.vx = 0;
    p.vy = 0;
    p.state = 'IDLE';
    this.sendPacket({
      type: 'respawn',
      x: p.x
    });
    this.triggerBanner('⚡ RESPAWNED!', 'READY FOR ROUND 2!', 2.0);
  }

  triggerBanner(title, sub, duration = 2.5) {
    this.banner.text = title;
    this.banner.sub = sub;
    this.banner.timer = duration;
  }

  // --- RENDER MATCH BANNER & HUD ---
  render(ctx) {
    if (!this.isMultiplayer) return;

    // Draw Top Match Banner
    if (this.banner.timer > 0) {
      this.banner.timer -= 0.016;
      ctx.save();
      ctx.fillStyle = 'rgba(7, 9, 14, 0.88)';
      ctx.fillRect(0, this.game.height * 0.22 - 40, this.game.width, 95);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 30px Outfit, Syncopate, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.banner.text, this.game.width / 2, this.game.height * 0.22 + 6);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 15px Outfit, monospace';
      ctx.fillText(this.banner.sub, this.game.width / 2, this.game.height * 0.22 + 34);
      ctx.restore();
    }
  }

  // --- UI CONTROLS ---
  openPvpModal() {
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.remove('hidden');

    const nameInput = document.getElementById('pvp-player-name-input');
    if (nameInput) nameInput.value = this.playerName;

    const charCards = document.querySelectorAll('.char-select-card');
    charCards.forEach(c => {
      const isSelected = c.getAttribute('data-char') === this.characterId;
      c.classList.toggle('active', isSelected);
      c.style.border = isSelected ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)';
    });
  }

  closePvpModal() {
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.add('hidden');
  }

  setPlayerProfile(name, charId) {
    this.playerName = (name || 'FIGHTER').trim();
    this.characterId = charId || 'halland';
    localStorage.setItem('pvp_player_name', this.playerName);
    localStorage.setItem('pvp_character_id', this.characterId);
  }
}
