/* =========================================================
   ONLINE MULTIPLAYER ARENA BRAWLER (2-8 PLAYERS) ("HALLAND")
   - Native Render WebSocket Server Relay (wss://mygameserver-bsow.onrender.com/)
   - 5 Selectable Parody Legends (Halland, LeBrown, Jordunn, McBape, Ronalds)
   - Custom Player Names with LocalStorage persistence
   - Dynamic Map Scaling: 2P Duel -> 4P Pagoda -> 8P Cyber Stadium
   - Multi-Target Hitbox Resolution & Real-time State Synchronization
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
    this.senderId = 'p_' + Math.random().toString(36).substring(2, 8);

    // Local Player Profile
    this.playerName = localStorage.getItem('pvp_player_name') || 'FIGHTER 1';
    this.characterId = localStorage.getItem('pvp_character_id') || 'halland';

    // Remote Players Pool (Map of peerId -> PlayerObject)
    this.players = new Map();
    this.renderers = new Map(); // Dedicated StickmanRenderer per remote player

    // Render WebSocket Server Endpoint
    this.serverUrl = localStorage.getItem('render_server_url') || 'wss://mygameserver-bsow.onrender.com/';

    // Battle Arena State
    this.arenaTier = 'duel'; // 'duel' (2P), 'pagoda' (3-4P), 'stadium' (5-8P)
    this.isBattleActive = false;
    this.banner = { text: '', sub: '', timer: 0 };

    this.initBroadcastChannel();
    this.checkUrlRoomParam();
  }

  initBroadcastChannel() {
    try {
      this.bc = new BroadcastChannel('halland_party_pvp_channel');
      this.bc.onmessage = (e) => {
        if (this.isMultiplayer && e.data) {
          this.handleIncomingMessage(e.data);
        }
      };
    } catch(e) {
      console.warn("[PVP] BroadcastChannel unavailable");
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

  setPlayerProfile(name, charId) {
    this.playerName = name || 'FIGHTER';
    this.characterId = charId || 'halland';
    localStorage.setItem('pvp_player_name', this.playerName);
    localStorage.setItem('pvp_character_id', this.characterId);
    if (this.game.player) {
      this.game.player.name = this.playerName;
      this.game.player.characterId = this.characterId;
    }
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

    this.connectWebSocket(() => {
      this.isConnected = true;
      this.updateStatusUI(`🟢 ROOM ACTIVE: <strong>${this.roomCode}</strong><br><span style="font-size:0.85em;color:#94a3b8">Share room code or invite link. (2 - 8 Players)</span>`);
      this.showHostLobbyUI(this.roomCode);

      // Register host
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

    // Also broadcast over local channel immediately
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

    this.connectWebSocket(() => {
      this.isConnected = true;
      // Send join announcement with our character profile
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

    // Also broadcast over local channel immediately
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
          console.error("[PVP] Error parsing message:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[PVP] WebSocket notice:", err);
        this.updateStatusUI(`⚠️ Server waking up or offline. Retrying connection...`);
      };

      this.ws.onclose = () => {
        console.log("[PVP] Disconnected from WebSocket server.");
      };
    } catch(e) {
      console.error("[PVP] Init error:", e);
      this.updateStatusUI(`❌ WebSocket error: ${e.message}`);
    }
  }

  sendWsPacket(msg) {
    const payload = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    }
    if (this.bc) {
      try { this.bc.postMessage(msg); } catch(e) {}
    }
  }

  handleIncomingMessage(msg) {
    if (!msg || msg.roomCode !== this.roomCode) return;
    if (msg.senderId === this.senderId) return; // Ignore echo

    switch(msg.event) {
      case 'player_join': {
        const pData = msg.data;
        if (!this.players.has(msg.senderId)) {
          this.players.set(msg.senderId, {
            id: msg.senderId,
            name: pData.name || 'GUEST',
            characterId: pData.characterId || 'lebrown',
            x: 500 + (this.players.size * 100),
            y: 380,
            targetX: 500 + (this.players.size * 100),
            targetY: 380,
            vx: 0,
            vy: 0,
            facing: -1,
            state: 'IDLE',
            hp: 100,
            maxHp: 100,
            isBlocking: false,
            comboStep: 0,
            beltColor: '#38bdf8',
            isDead: false
          });

          this.renderers.set(msg.senderId, new StickmanRenderer());
        }

        this.updateLobbyPlayerList();

        // If host, respond with current roster and match state
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
          this.players.set(msg.senderId, {
            id: msg.senderId,
            name: msg.data.hostName || 'HOST',
            characterId: msg.data.hostCharId || 'halland',
            x: 200,
            y: 380,
            targetX: 200,
            targetY: 380,
            vx: 0,
            vy: 0,
            facing: 1,
            state: 'IDLE',
            hp: 100,
            maxHp: 100,
            isBlocking: false,
            comboStep: 0,
            beltColor: '#ef4444',
            isDead: false
          });

          this.renderers.set(msg.senderId, new StickmanRenderer());
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
            x: Number.isFinite(msg.data.x) ? msg.data.x : 500,
            y: Number.isFinite(msg.data.y) ? msg.data.y : 380,
            targetX: Number.isFinite(msg.data.x) ? msg.data.x : 500,
            targetY: Number.isFinite(msg.data.y) ? msg.data.y : 380,
            vx: 0,
            vy: 0,
            facing: msg.data.facing || -1,
            state: msg.data.state || 'IDLE',
            hp: msg.data.hp !== undefined ? msg.data.hp : 100,
            maxHp: 100,
            isBlocking: !!msg.data.isBlocking,
            comboStep: msg.data.comboStep || 0,
            beltColor: '#38bdf8',
            isDead: false
          };
          this.players.set(msg.senderId, target);
          this.renderers.set(msg.senderId, new StickmanRenderer());
        }

        if (Number.isFinite(msg.data.x)) target.targetX = msg.data.x;
        if (Number.isFinite(msg.data.y)) target.targetY = msg.data.y;
        target.vx = msg.data.vx || 0;
        target.vy = msg.data.vy || 0;
        target.facing = msg.data.facing || target.facing || -1;
        target.state = msg.data.state || 'IDLE';
        if (msg.data.hp !== undefined) target.hp = msg.data.hp;
        target.isBlocking = !!msg.data.isBlocking;
        target.comboStep = msg.data.comboStep || 0;
        target.characterId = msg.data.characterId || target.characterId || 'halland';
        if (msg.data.name) target.name = msg.data.name;
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

    const startBtn = document.getElementById('btn-launch-arena');
    if (startBtn) {
      if (this.isHost) {
        startBtn.style.display = 'block';
        startBtn.textContent = `⚔️ LAUNCH BATTLE (${totalCount} PLAYERS)`;
      } else {
        startBtn.style.display = 'none';
      }
    }
  }

  // --- DYNAMIC ARENA SCALING BASED ON PLAYER COUNT ---
  getArenaConfiguration(playerCount) {
    if (playerCount <= 2) {
      // 2-Player Classic Dojo (800px width)
      return {
        id: 99,
        name: "1V1: THE GRAND DOJO",
        belt: "BLACK",
        gravity: 0.65,
        friction: 0.88,
        playerStart: { x: 180, y: 400 },
        platforms: [
          { x: 50, y: 450, w: 800, h: 40, type: 'ground' },
          { x: 30, y: 150, w: 20, h: 320, type: 'wall' },
          { x: 850, y: 150, w: 20, h: 320, type: 'wall' },
          { x: 140, y: 320, w: 180, h: 18, type: 'pagoda' },
          { x: 580, y: 320, w: 180, h: 18, type: 'pagoda' },
          { x: 420, y: 440, w: 60, h: 12, isBouncer: true }
        ],
        breakables: [
          { x: 220, y: 260, w: 16, h: 60, broken: false },
          { x: 660, y: 260, w: 16, h: 60, broken: false }
        ],
        entities: []
      };
    } else if (playerCount <= 4) {
      // 3-4 Players: Grand Multi-Tier Pagoda (1450px width)
      return {
        id: 99,
        name: "4-PLAYER: PAGODA GAUNTLET ARENA",
        belt: "BLACK",
        gravity: 0.65,
        friction: 0.88,
        playerStart: { x: 220, y: 400 },
        platforms: [
          { x: 50, y: 500, w: 1400, h: 45, type: 'ground' },
          { x: 30, y: 120, w: 20, h: 400, type: 'wall' },
          { x: 1450, y: 120, w: 20, h: 400, type: 'wall' },
          // Multi-Tier Pagoda Platforms
          { x: 160, y: 380, w: 240, h: 20, type: 'pagoda' },
          { x: 1100, y: 380, w: 240, h: 20, type: 'pagoda' },
          { x: 480, y: 320, w: 220, h: 20, type: 'pagoda' },
          { x: 800, y: 320, w: 220, h: 20, type: 'pagoda' },
          { x: 620, y: 220, w: 260, h: 20, type: 'pagoda' },
          // Power Bouncers
          { x: 410, y: 490, w: 60, h: 12, isBouncer: true },
          { x: 1030, y: 490, w: 60, h: 12, isBouncer: true }
        ],
        breakables: [
          { x: 280, y: 320, w: 16, h: 60, broken: false },
          { x: 740, y: 160, w: 16, h: 60, broken: false },
          { x: 1200, y: 320, w: 16, h: 60, broken: false }
        ],
        entities: []
      };
    } else {
      // 5-8 Players: Colossal Cyber Battle Stadium (2200px width)
      return {
        id: 99,
        name: "8-PLAYER: COLOSSAL CYBER STADIUM",
        belt: "BLACK",
        gravity: 0.65,
        friction: 0.88,
        playerStart: { x: 300, y: 450 },
        platforms: [
          { x: 50, y: 550, w: 2200, h: 50, type: 'ground' },
          { x: 30, y: 80, w: 20, h: 500, type: 'wall' },
          { x: 2250, y: 80, w: 20, h: 500, type: 'wall' },
          // Tier 1 lofts
          { x: 180, y: 430, w: 280, h: 20, type: 'pagoda' },
          { x: 1840, y: 430, w: 280, h: 20, type: 'pagoda' },
          { x: 600, y: 390, w: 320, h: 20, type: 'pagoda' },
          { x: 1380, y: 390, w: 320, h: 20, type: 'pagoda' },
          // Tier 2 high apex roof
          { x: 920, y: 260, w: 460, h: 22, type: 'pagoda' },
          // Power Bouncers
          { x: 500, y: 540, w: 70, h: 12, isBouncer: true },
          { x: 1120, y: 540, w: 70, h: 12, isBouncer: true },
          { x: 1730, y: 540, w: 70, h: 12, isBouncer: true }
        ],
        breakables: [
          { x: 320, y: 370, w: 16, h: 60, broken: false },
          { x: 760, y: 330, w: 16, h: 60, broken: false },
          { x: 1140, y: 200, w: 16, h: 60, broken: false },
          { x: 1520, y: 330, w: 16, h: 60, broken: false },
          { x: 1960, y: 370, w: 16, h: 60, broken: false }
        ],
        entities: []
      };
    }
  }

  startMultiplayerArena() {
    this.isBattleActive = true;

    // Close Modals
    const modal = document.getElementById('pvp-modal');
    if (modal) modal.classList.add('hidden');
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');

    // Configure dynamically scaled map
    const totalCount = this.players.size + 1;
    this.game.currentStage = this.getArenaConfiguration(totalCount);

    // Position local player
    const p = this.game.player;
    p.characterId = this.characterId;
    p.name = this.playerName;
    p.hp = 100;
    p.maxHp = 100;
    p.isDead = false;
    p.state = 'IDLE';

    // Distribute spawn points across the arena
    const spawnOffsets = [180, 700, 360, 1100, 520, 950, 1400, 1750];
    let slot = this.isHost ? 0 : 1;
    p.x = spawnOffsets[slot % spawnOffsets.length];
    p.y = 380;
    p.facing = p.x < 600 ? 1 : -1;

    let rSlot = 0;
    for (const [id, rPlayer] of this.players) {
      if (rSlot === slot) rSlot++;
      rPlayer.x = spawnOffsets[rSlot % spawnOffsets.length];
      rPlayer.targetX = rPlayer.x;
      rPlayer.y = 380;
      rPlayer.hp = 100;
      rPlayer.isDead = false;
      rSlot++;
    }

    this.triggerBanner(`BATTLE ARENA`, `${totalCount} FIGHTERS • FIGHT!`);

    this.game.isPlaying = true;
    this.game.isEndlessMode = false;
    if (window.Audio) window.Audio.resume();

    // Start 40Hz State Sync Loop
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
        isBlocking: this.game.input ? this.game.input.isBlocking : false,
        comboStep: p.comboStep || 0,
        characterId: this.characterId
      }
    });
  }

  // --- MULTI-TARGET ATTACK HITBOX RESOLUTION ---
  checkPvpCombat(player, dt) {
    if (!this.isConnected || this.players.size === 0 || player.hp <= 0) return;

    // Smooth remote player positions
    for (const [id, rPlayer] of this.players) {
      if (rPlayer.targetX !== undefined) {
        rPlayer.x += (rPlayer.targetX - rPlayer.x) * 0.45;
        rPlayer.y += (rPlayer.targetY - rPlayer.y) * 0.45;
      }
    }

    const isAttacking = this.game.combat ? this.game.combat.isAttackActive(player) : (
      ['JAB', 'SNAP_KICK', 'STRAIGHT_PUNCH', 'SLIDE_SWEEP', 'WEB_ZIP', 'SPIN_BACKFIST', 'SPIN_HEEL_KICK', 'SPIN_SWEEP', 'FLYING_TORNADO_KICK', 'DRAGON_UPPERCUT'].includes(player.state)
    );

    if (isAttacking && !player.hasHitMultiplayerThisMove) {
      player.hasHitMultiplayerThisMove = true;

      const hitbox = this.game.combat ? this.game.combat.getPlayerHitbox(player) : { x: player.x - 20, y: player.y - 60, w: 50, h: 60 };
      const isUppercut = player.state === 'DRAGON_UPPERCUT';
      const isHeavy = ['FLYING_TORNADO_KICK', 'DRAGON_UPPERCUT', 'STRAIGHT_PUNCH', 'SPIN_BACKFIST', 'SPIN_HEEL_KICK'].includes(player.state);

      for (const [targetId, rPlayer] of this.players) {
        if (rPlayer.isDead || rPlayer.hp <= 0) continue;

        const rBounds = {
          x: rPlayer.x - 22,
          y: rPlayer.y - 65,
          w: 44,
          h: 70
        };

        const dx = rPlayer.x - player.x;
        const dy = rPlayer.y - player.y;
        const dist = Math.hypot(dx, dy);

        // Check either rectangular overlap with hitbox or natural close proximity in front/reverse
        const rectOverlap = this.game.combat ? this.game.combat.rectsOverlap(hitbox, rBounds) : false;
        const isReverseAttack = ['SPIN_BACKFIST', 'SPIN_HEEL_KICK', 'SPIN_SWEEP'].includes(player.state);
        const directionalMatch = isReverseAttack || Math.sign(dx) === player.facing || Math.abs(dx) < 28;
        const proxHit = dist < 72 && directionalMatch && Math.abs(dy) < 60;

        if (rectOverlap || proxHit) {
          if (rPlayer.isBlocking) {
            if (window.Audio) window.Audio.playParry();
            player.vx = -player.facing * 8;
            player.state = 'STUNNED';
            if (this.game.combat) this.game.combat.spawnImpactParticles(rPlayer.x, rPlayer.y - 30, '#38bdf8', 16);
          } else {
            const dmg = isUppercut ? 28 : player.state === 'FLYING_TORNADO_KICK' ? 24 : isHeavy ? 18 : 12;
            const kbX = player.facing * (isUppercut ? 14 : isHeavy ? 10 : 6);
            const kbY = isUppercut ? -11 : -4;

            rPlayer.hp = Math.max(0, rPlayer.hp - dmg);
            if (window.Audio) window.Audio.playPunch();
            if (this.game.combat) {
              this.game.combat.spawnImpactParticles(rPlayer.x, rPlayer.y - 30, '#ef4444', 18);
              this.game.combat.triggerScreenShake(isHeavy ? 6 : 3);
            }

            this.sendWsPacket({
              roomCode: this.roomCode,
              event: 'action',
              senderId: this.senderId,
              data: {
                event: 'hit',
                targetId: targetId,
                damage: dmg,
                knockbackX: kbX,
                knockbackY: kbY,
                attackType: player.state
              }
            });

            if (rPlayer.hp <= 0) {
              rPlayer.isDead = true;
              this.checkLastStanding();
            }
          }
        }
      }
    }

    if (!isAttacking) {
      player.hasHitMultiplayerThisMove = false;
    }
  }

  receiveDamage(dmg, kbX, kbY, atkType) {
    const p = this.game.player;
    if (p.invulnerableTimer > 0 || p.hp <= 0) return;

    p.hp = Math.max(0, p.hp - dmg);
    p.vx = kbX;
    p.vy = kbY;
    p.invulnerableTimer = 0.35;
    p.state = 'HIT';

    if (window.Audio) window.Audio.playKick();
    this.game.combat.triggerHitStop(0.04);
    this.game.combat.triggerScreenShake(7);

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

  // --- RENDER ALL REMOTE FIGHTERS & MULTI-HEALTH HUD ---
  render(ctx) {
    if (!this.isConnected) return;

    // 1. Draw All Remote Stickmen with their dedicated renderers
    for (const [id, rPlayer] of this.players) {
      if (rPlayer.isDead) continue;

      let rRenderer = this.renderers.get(id);
      if (!rRenderer) {
        rRenderer = new StickmanRenderer();
        this.renderers.set(id, rRenderer);
      }

      ctx.save();
      rRenderer.draw(ctx, rPlayer);

      // Fighter Overhead Health Bar
      const barW = 44;
      const barH = 5;
      const barX = (rPlayer.x || 0) - barW / 2;
      const barY = (rPlayer.y || 0) - 76;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(barX, barY, barW, barH);

      const hpRatio = Math.max(0, Math.min(1, (rPlayer.hp !== undefined ? rPlayer.hp : 100) / (rPlayer.maxHp || 100)));
      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      // Fighter Overhead Custom Name Pill
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((rPlayer.name || 'OPPONENT').toUpperCase(), rPlayer.x || 0, barY - 4);

      ctx.restore();
    }

    // 2. Draw Match Banner
    if (this.banner.timer > 0) {
      this.banner.timer -= 0.016;
      ctx.save();
      ctx.fillStyle = 'rgba(7, 9, 14, 0.85)';
      ctx.fillRect(0, this.game.height * 0.25 - 45, this.game.width, 105);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 34px Outfit, Syncopate';
      ctx.textAlign = 'center';
      ctx.fillText(this.banner.text, this.game.width / 2, this.game.height * 0.25 + 6);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 16px Outfit, monospace';
      ctx.fillText(this.banner.sub, this.game.width / 2, this.game.height * 0.25 + 38);
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

  updateStatusUI(html) {
    const statusEl = document.getElementById('pvp-status-msg');
    if (statusEl) statusEl.innerHTML = html;
  }
}

window.MultiplayerManager = MultiplayerManager;
