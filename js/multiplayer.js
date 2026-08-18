/* =========================================================
   ONLINE MULTIPLAYER ARENA MANAGER ("HALLAND")
   - Matchmaking Lobby: Host Room, Copy Invite Link, Join Code
   - 5 Parody Legends: Halland, LeBrown, Jordunn, McBape, Ronalds
   - Direct Entity Streaming: Remote players stream into currentStage.entities
   - Native Singleplayer Combat Integration: Full combos, strike magnetism & hitboxes
========================================================= */

class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.isMultiplayer = false;
    this.isHost = false;
    this.roomCode = null;
    this.isConnected = false;
    this.senderId = 'p_' + Math.random().toString(36).substring(2, 8);

    // Local Player Profile
    this.playerName = localStorage.getItem('pvp_player_name') || 'FIGHTER 1';
    this.characterId = localStorage.getItem('pvp_character_id') || 'halland';
    this.serverUrl = localStorage.getItem('render_server_url') || 'wss://mygameserver-bsow.onrender.com/';

    // Remote Players Pool
    this.players = new Map();
    this.renderers = new Map();

    this.isBattleActive = false;
    this.banner = { text: '', sub: '', timer: 0 };
    this.ws = null;
    this.bc = null;
    this.syncInterval = null;

    this.initBroadcastChannel();
    this.checkUrlRoomParam();
  }

  // --- DUAL TRANSPORT NETWORKING ---
  initBroadcastChannel() {
    try {
      this.bc = new BroadcastChannel('halland_party_pvp_channel');
      this.bc.onmessage = (e) => {
        if (this.isMultiplayer && e.data) {
          this.handleIncomingMessage(e.data);
        }
      };
    } catch(e) {
      console.warn("[PVP] BroadcastChannel unavailable:", e);
    }
  }

  checkUrlRoomParam() {
    try {
      if (typeof window !== 'undefined' && window.location && window.URLSearchParams) {
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
    } catch(e) {
      console.warn("[PVP] URL param check error:", e);
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

  setServerUrl(newUrl) {
    this.serverUrl = (newUrl || '').trim();
    localStorage.setItem('render_server_url', this.serverUrl);
  }

  setPlayerProfile(name, charId) {
    this.playerName = (name || 'FIGHTER').trim();
    this.characterId = charId || 'halland';
    localStorage.setItem('pvp_player_name', this.playerName);
    localStorage.setItem('pvp_character_id', this.characterId);
  }

  // --- HOST A MULTI-PLAYER MATCH ---
  hostMatch() {
    this.roomCode = this.generateRoomCode();
    this.isHost = true;
    this.isMultiplayer = true;
    this.isConnected = true;
    this.players.clear();
    this.renderers.clear();

    this.showHostLobbyUI(this.roomCode);
    this.updateStatusUI(`🟢 ROOM CREATED: <strong>${this.roomCode}</strong><br><span style="font-size:0.85em;color:#94a3b8">Share room code or invite link. (2 - 8 Players)</span>`);

    const launchBtn = document.getElementById('btn-launch-arena');
    if (launchBtn) launchBtn.style.display = 'block';

    this.connectWebSocket(() => {
      this.isConnected = true;
      this.sendWsPacket({
        roomCode: this.roomCode,
        event: 'player_join',
        senderId: this.senderId,
        data: {
          name: this.playerName,
          characterId: this.characterId,
          isHost: true
        }
      });
    });

    this.sendWsPacket({
      roomCode: this.roomCode,
      event: 'player_join',
      senderId: this.senderId,
      data: {
        name: this.playerName,
        characterId: this.characterId,
        isHost: true
      }
    });
  }

  // --- JOIN A MULTI-PLAYER MATCH ---
  joinMatch(code) {
    if (!code || code.trim().length < 3) {
      this.updateStatusUI("❌ Please enter a valid room code!");
      return;
    }

    this.roomCode = code.trim().toUpperCase();
    this.isHost = false;
    this.isMultiplayer = true;
    this.isConnected = true;
    this.players.clear();
    this.renderers.clear();

    this.updateStatusUI(`Connecting to Room <strong>${this.roomCode}</strong>...`);

    const launchBtn = document.getElementById('btn-launch-arena');
    if (launchBtn) launchBtn.style.display = 'none';

    this.connectWebSocket(() => {
      this.isConnected = true;
      this.sendWsPacket({
        roomCode: this.roomCode,
        event: 'player_join',
        senderId: this.senderId,
        data: {
          name: this.playerName,
          characterId: this.characterId,
          isHost: false
        }
      });
      this.updateStatusUI(`⚡ Connected to room ${this.roomCode}! Waiting for host to launch battle...`);
    });

    this.sendWsPacket({
      roomCode: this.roomCode,
      event: 'player_join',
      senderId: this.senderId,
      data: {
        name: this.playerName,
        characterId: this.characterId,
        isHost: false
      }
    });
  }

  connectWebSocket(onOpen) {
    if (this.ws) {
      try { this.ws.close(); } catch(e) {}
    }

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log(`[PVP] Connected to WebSocket server: ${this.serverUrl}`);
        if (onOpen) onOpen();
      };

      this.ws.onmessage = async (event) => {
        try {
          let text = '';
          if (event.data instanceof Blob) text = await event.data.text();
          else if (typeof event.data === 'string') text = event.data;
          else if (event.data instanceof ArrayBuffer) text = new TextDecoder().decode(event.data);
          else text = event.data.toString();

          const msg = JSON.parse(text);
          this.handleIncomingMessage(msg);
        } catch(err) {}
      };

      this.ws.onerror = (err) => {
        console.warn("[PVP] WebSocket notice (server waking or offline):", err);
      };

      this.ws.onclose = () => {
        console.log("[PVP] Disconnected from WebSocket server.");
      };
    } catch(e) {
      console.error("[PVP] Init error:", e);
    }
  }

  sendWsPacket(msg) {
    const payload = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(payload); } catch(e) {}
    }
    if (this.bc) {
      try { this.bc.postMessage(msg); } catch(e) {}
    }
  }

  handleIncomingMessage(msg) {
    if (!msg || msg.roomCode !== this.roomCode || msg.senderId === this.senderId) return;

    switch(msg.event) {
      case 'player_join': {
        const pData = msg.data || {};
        if (!this.players.has(msg.senderId)) {
          const newPlayer = {
            id: msg.senderId,
            name: pData.name || 'GUEST',
            characterId: pData.characterId || 'lebrown',
            type: 'pvp_opponent',
            isTarget: true,
            isPvP: true,
            isPlayer: true,
            w: 22,
            h: 60,
            x: 500 + (this.players.size * 100),
            y: 400,
            targetX: 500 + (this.players.size * 100),
            targetY: 400,
            vx: 0,
            vy: 0,
            facing: -1,
            state: 'IDLE',
            hp: 100,
            maxHp: 100,
            hitTimer: 0,
            isDead: false,
            renderer: new StickmanRenderer()
          };
          this.players.set(msg.senderId, newPlayer);
          this.renderers.set(msg.senderId, newPlayer.renderer);

          if (this.game.currentStage && this.game.currentStage.entities) {
            if (!this.game.currentStage.entities.some(e => e.id === msg.senderId)) {
              this.game.currentStage.entities.push(newPlayer);
            }
          }
        }

        this.updateLobbyPlayerList();

        if (this.isHost) {
          this.sendWsPacket({
            roomCode: this.roomCode,
            event: 'roster_sync',
            senderId: this.senderId,
            data: {
              hostName: this.playerName,
              hostCharId: this.characterId,
              isBattleActive: this.isBattleActive,
              playersCount: this.players.size + 1
            }
          });
        }
        break;
      }

      case 'roster_sync': {
        if (!this.players.has(msg.senderId)) {
          const hostPlayer = {
            id: msg.senderId,
            name: msg.data.hostName || 'HOST',
            characterId: msg.data.hostCharId || 'halland',
            type: 'pvp_opponent',
            isTarget: true,
            isPvP: true,
            isPlayer: true,
            w: 22,
            h: 60,
            x: 200,
            y: 400,
            targetX: 200,
            targetY: 400,
            vx: 0,
            vy: 0,
            facing: 1,
            state: 'IDLE',
            hp: 100,
            maxHp: 100,
            hitTimer: 0,
            isDead: false,
            renderer: new StickmanRenderer()
          };
          this.players.set(msg.senderId, hostPlayer);
          this.renderers.set(msg.senderId, hostPlayer.renderer);

          if (this.game.currentStage && this.game.currentStage.entities) {
            if (!this.game.currentStage.entities.some(e => e.id === msg.senderId)) {
              this.game.currentStage.entities.push(hostPlayer);
            }
          }
        }
        this.updateLobbyPlayerList();

        if (msg.data.isBattleActive && !this.isBattleActive) {
          this.startMultiplayerArena();
        }
        break;
      }

      case 'start_battle': {
        this.startMultiplayerArena();
        break;
      }

      case 'state_sync': {
        if (!msg.data) break;
        let target = this.players.get(msg.senderId);
        if (!target) {
          target = {
            id: msg.senderId,
            name: msg.data.name || 'OPPONENT',
            characterId: msg.data.characterId || 'lebrown',
            type: 'pvp_opponent',
            isTarget: true,
            isPvP: true,
            isPlayer: true,
            w: 22,
            h: 60,
            x: Number.isFinite(msg.data.x) ? msg.data.x : 500,
            y: Number.isFinite(msg.data.y) ? msg.data.y : 400,
            targetX: Number.isFinite(msg.data.x) ? msg.data.x : 500,
            targetY: Number.isFinite(msg.data.y) ? msg.data.y : 400,
            vx: 0,
            vy: 0,
            facing: msg.data.facing || -1,
            state: msg.data.state || 'IDLE',
            hp: msg.data.hp !== undefined ? msg.data.hp : 100,
            maxHp: 100,
            hitTimer: 0,
            isDead: false,
            renderer: new StickmanRenderer()
          };
          this.players.set(msg.senderId, target);
          this.renderers.set(msg.senderId, target.renderer);

          if (this.game.currentStage && this.game.currentStage.entities) {
            if (!this.game.currentStage.entities.some(e => e.id === msg.senderId)) {
              this.game.currentStage.entities.push(target);
            }
          }
        }

        // Direct position streaming
        if (Number.isFinite(msg.data.x)) {
          target.targetX = msg.data.x;
          target.x += (msg.data.x - target.x) * 0.55;
        }
        if (Number.isFinite(msg.data.y)) {
          target.targetY = msg.data.y;
          target.y += (msg.data.y - target.y) * 0.55;
        }
        target.vx = msg.data.vx || 0;
        target.vy = msg.data.vy || 0;
        target.facing = msg.data.facing || target.facing || -1;
        target.state = msg.data.state || 'IDLE';
        if (msg.data.hp !== undefined) target.hp = msg.data.hp;
        target.characterId = msg.data.characterId || target.characterId || 'halland';
        if (msg.data.name) target.name = msg.data.name;

        // Ensure presence in active stage entities list for singleplayer combat hits
        if (this.game.currentStage && this.game.currentStage.entities) {
          if (!this.game.currentStage.entities.some(e => e.id === msg.senderId)) {
            this.game.currentStage.entities.push(target);
          }
        }
        break;
      }

      case 'action': {
        if (msg.data) {
          if (msg.data.event === 'hit' && msg.data.targetId === this.senderId) {
            this.receiveDamage(msg.data.damage, msg.data.knockbackX, msg.data.knockbackY, msg.data.attackType);
          } else if (msg.data.event === 'player_defeated') {
            const victim = this.players.get(msg.data.victimId);
            if (victim) victim.isDead = true;
            this.checkLastStanding();
          }
        }
        break;
      }
    }
  }

  updateLobbyPlayerList() {
    const listEl = document.getElementById('pvp-connected-count');
    const totalCount = this.players.size + 1;
    if (listEl) listEl.textContent = `${totalCount} / 8 FIGHTERS IN LOBBY`;

    if (totalCount >= 2) {
      this.updateStatusUI(`🟢 ${totalCount} FIGHTERS READY! Host can launch arena!`);
    }
  }

  updateStatusUI(html) {
    const el = document.getElementById('pvp-status-msg');
    if (el) el.innerHTML = html;
  }

  getArenaConfiguration(playerCount) {
    return {
      id: 99,
      name: "CYBER DOJO PVP ARENA",
      belt: "BLACK",
      gravity: 0.68,
      friction: 0.88,
      startX: 180,
      startY: 400,
      platforms: [
        { x: 40, y: 480, w: 920, h: 40, type: 'ground' },
        { x: 20, y: 120, w: 20, h: 370, type: 'wall' },
        { x: 960, y: 120, w: 20, h: 370, type: 'wall' },
        { x: 140, y: 350, w: 200, h: 18, type: 'pagoda' },
        { x: 660, y: 350, w: 200, h: 18, type: 'pagoda' },
        { x: 400, y: 240, w: 200, h: 18, type: 'pagoda' },
        { x: 470, y: 470, w: 60, h: 12, isBouncer: true }
      ],
      breakables: [
        { x: 220, y: 290, w: 16, h: 60, broken: false },
        { x: 740, y: 290, w: 16, h: 60, broken: false }
      ],
      entities: []
    };
  }

  // --- START BATTLE ARENA ---
  startMultiplayerArena() {
    this.isBattleActive = true;

    // Close Modals
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.add('hidden');
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');

    const totalCount = this.players.size + 1;
    this.game.currentStage = this.getArenaConfiguration(totalCount);
    this.game.currentStage.entities = [];

    // Position local player
    const p = this.game.player;
    p.characterId = this.characterId;
    p.name = this.playerName;
    p.hp = 100;
    p.maxHp = 100;
    p.isDead = false;
    p.state = 'IDLE';

    const spawnOffsets = [180, 720, 340, 560, 450, 850];
    let slot = this.isHost ? 0 : 1;
    p.x = spawnOffsets[slot % spawnOffsets.length];
    p.y = 400;
    p.facing = p.x < 500 ? 1 : -1;

    // Put all remote players directly into currentStage.entities
    let rSlot = 0;
    for (const [id, rPlayer] of this.players) {
      if (rSlot === slot) rSlot++;
      rPlayer.x = spawnOffsets[rSlot % spawnOffsets.length];
      rPlayer.targetX = rPlayer.x;
      rPlayer.y = 400;
      rPlayer.hp = 100;
      rPlayer.isDead = false;
      rPlayer.isPvP = true;
      rPlayer.isTarget = true;
      rPlayer.isPlayer = true;
      this.game.currentStage.entities.push(rPlayer);
      rSlot++;
    }

    this.triggerBanner(`BATTLE ARENA`, `${totalCount} FIGHTERS • FIGHT!`, 3.0);

    this.game.isPlaying = true;
    this.game.isEndlessMode = false;
    this.game.camera.x = p.x;
    this.game.camera.y = p.y - 28;
    this.game.stickRenderer.resetRibbons(p.x, p.y - 54, p.x, p.y - 26);

    if (window.Audio) window.Audio.resume();

    // Start 40Hz State Streaming Loop
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.broadcastState(), 1000 / 40);

    if (this.isHost) {
      this.sendWsPacket({
        roomCode: this.roomCode,
        event: 'start_battle',
        senderId: this.senderId
      });
    }
  }

  // --- STREAM PLAYER STATE ---
  broadcastState() {
    if (!this.isConnected || !this.game.player) return;

    const p = this.game.player;
    this.sendWsPacket({
      roomCode: this.roomCode,
      event: 'state_sync',
      senderId: this.senderId,
      data: {
        name: this.playerName,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        vx: Math.round(p.vx * 10) / 10,
        vy: Math.round(p.vy * 10) / 10,
        facing: p.facing || 1,
        state: p.state || 'IDLE',
        hp: p.hp,
        characterId: this.characterId
      }
    });
  }

  receiveDamage(dmg, kbX, kbY, atkType) {
    const p = this.game.player;
    if (p.invulnerableTimer > 0 || p.hp <= 0) return;

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
      this.sendWsPacket({
        roomCode: this.roomCode,
        event: 'action',
        senderId: this.senderId,
        data: { event: 'player_defeated', victimId: this.senderId }
      });
      this.checkLastStanding();
    }
  }

  checkLastStanding() {
    let aliveCount = this.game.player.hp > 0 ? 1 : 0;
    let winnerName = this.game.player.name;

    for (const [id, rPlayer] of this.players) {
      if (rPlayer.hp > 0 && !rPlayer.isDead) {
        aliveCount++;
        winnerName = rPlayer.name;
      }
    }

    if (aliveCount <= 1) {
      if (this.game.player.hp > 0) {
        if (window.Audio) window.Audio.playVictoryStinger();
        this.triggerBanner('🏆 ARENA CHAMPION! 🏆', `${this.playerName} ELIMINATED ALL OPPONENTS!`, 4.5);
      } else {
        if (window.Audio) window.Audio.playDeath();
        this.triggerBanner('MATCH CONCLUDED', `WINNER: ${winnerName}`, 4.5);
      }
    }
  }

  triggerBanner(title, sub, duration = 2.5) {
    this.banner.text = title;
    this.banner.sub = sub;
    this.banner.timer = duration;
  }

  render(ctx) {
    if (!this.isBattleActive) return;

    // Draw Match Banner
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

  openPvpModal() {
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.remove('hidden');

    const nameInput = document.getElementById('pvp-player-name-input');
    if (nameInput) nameInput.value = this.playerName;

    const urlInput = document.getElementById('pvp-server-url-input');
    if (urlInput) urlInput.value = this.serverUrl;

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

  showHostLobbyUI(code) {
    const codeEl = document.getElementById('pvp-room-code-display');
    if (codeEl) codeEl.textContent = code;

    const hostDetails = document.getElementById('pvp-host-details');
    if (hostDetails) hostDetails.style.display = 'block';

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
}
