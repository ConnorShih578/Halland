/* =========================================================
   KEYBOARD-ONLY ARCADE INPUT CONTROLLER ("HALLAND ARCADE")
   - Pure Keyboard Controls (Zero Touch/Virtual Joystick Clutter)
   - Player 1:
       * WASD (or Arrow Keys when Solo) = Movement / Jump / Crouch / Block
       * X (or Space / E) = Combo Flurry Attack
       * C = Web Sling (Upward Lift & Zip)
       * T = Taunt / Emote
   - Player 2 (Local 2-Player Co-op / Duel):
       * Arrow Keys = Movement / Jump / Crouch / Block
       * . (Period) = Combo Flurry Attack
       * / (Slash) = Web Sling (Upward Lift & Zip)
       * ' (Quote) / L = Taunt / Emote
========================================================= */

class PlayerInputState {
  constructor(playerId = 1) {
    this.playerId = playerId;
    this.moveX = 0;       // -1 .. 1
    this.moveY = 0;       // -1 .. 1
    this.jumpPressed = false;
    this.jumpHeld = false;
    this.crouchHeld = false;
    this.isBlocking = false;
    this.pendingAction = null;
    this.comboStep = 0;
    this.active = playerId === 1;
  }

  queueAction(type) {
    this.pendingAction = type;
  }

  consumeAction() {
    const act = this.pendingAction;
    this.pendingAction = null;
    return act;
  }

  reset() {
    this.moveX = 0;
    this.moveY = 0;
    this.jumpPressed = false;
    this.jumpHeld = false;
    this.crouchHeld = false;
    this.isBlocking = false;
    this.pendingAction = null;
  }
}

class InputController {
  constructor(canvas) {
    this.canvas = canvas;

    // Player 1 & Player 2 Input Instances
    this.p1 = new PlayerInputState(1);
    this.p2 = new PlayerInputState(2);

    // Active White Strike Motion Trails
    this.trails = [];

    // Keyboard Key Map
    this.keys = {};

    this.bindKeyboardEvents();
  }

  // --- Convenience Getters & Setters for Player 1 Backward Compatibility ---
  get moveX() { return this.p1.moveX; }
  set moveX(v) { this.p1.moveX = v; }
  get moveY() { return this.p1.moveY; }
  set moveY(v) { this.p1.moveY = v; }
  get jumpPressed() { return this.p1.jumpPressed; }
  set jumpPressed(v) { this.p1.jumpPressed = v; }
  get jumpHeld() { return this.p1.jumpHeld; }
  set jumpHeld(v) { this.p1.jumpHeld = v; }
  get crouchHeld() { return this.p1.crouchHeld; }
  set crouchHeld(v) { this.p1.crouchHeld = v; }
  get isBlocking() { return this.p1.isBlocking; }
  set isBlocking(v) { this.p1.isBlocking = v; }
  get pendingAction() { return this.p1.pendingAction; }
  set pendingAction(v) { this.p1.pendingAction = v; }

  queueAction(type) {
    this.p1.queueAction(type);
  }

  consumeAction() {
    return this.p1.consumeAction();
  }

  reset() {
    this.keys = {};
    this.p1.reset();
    this.p2.reset();
  }

  bindKeyboardEvents() {
    // Keyboard Only - Pure desktop & arcade responsiveness
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
      return;
    }

    const gameKeys = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyX', 'KeyC', 'KeyT', 'KeyE', 'Space',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Period', 'NumpadDecimal', 'Slash', 'NumpadDivide', 'Quote', 'KeyL',
      'KeyR', 'KeyM', 'KeyH', 'KeyN', 'KeyP', 'Escape'
    ];

    if (gameKeys.includes(e.code) || e.key === '.' || e.key === '/' || e.key === "'") {
      // Prevent page scrolling on Space / Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash'].includes(e.code) || e.key === '/') {
        e.preventDefault();
      }
    }

    this.keys[e.code] = true;
    if (e.key === '.') this.keys['Period'] = true;
    if (e.key === '/') this.keys['Slash'] = true;

    // Detect Player 2 Joining (P2 action keys: . or / or ')
    const isP2ActionKey = [
      'Period', 'NumpadDecimal', 'Slash', 'NumpadDivide', 'Quote', 'KeyL'
    ].includes(e.code) || e.key === '.' || e.key === '/' || e.key === "'";

    const isDuelMode = window.Game && window.Game.is1v1Duel;

    if ((isP2ActionKey || isDuelMode) && !this.p2.active) {
      this.p2.active = true;
      if (!isDuelMode && window.Game && typeof window.Game.spawnPlayer2 === 'function') {
        window.Game.spawnPlayer2();
      }
    }

    // =========================================================
    // 1. PLAYER 1 (WASD Movement, X Attack, C Web Sling, T Taunt)
    // =========================================================
    // Horizontal Movement
    if (this.keys['KeyA'] && !this.keys['KeyD']) {
      this.p1.moveX = -1;
    } else if (this.keys['KeyD'] && !this.keys['KeyA']) {
      this.p1.moveX = 1;
    } else if (!this.keys['KeyA'] && !this.keys['KeyD']) {
      // If Player 2 is NOT active, solo player can also use Arrow keys
      if (!this.p2.active) {
        if (this.keys['ArrowLeft'] && !this.keys['ArrowRight']) this.p1.moveX = -1;
        else if (this.keys['ArrowRight'] && !this.keys['ArrowLeft']) this.p1.moveX = 1;
        else this.p1.moveX = 0;
      } else {
        this.p1.moveX = 0;
      }
    }

    // W = Jump (or Up Arrow when solo)
    if (e.code === 'KeyW' || (!this.p2.active && e.code === 'ArrowUp')) {
      if (!this.p1.jumpHeld) this.p1.jumpPressed = true;
      this.p1.jumpHeld = true;
    }

    // S = Crouch & Block / Parry (or Down Arrow when solo)
    if (e.code === 'KeyS' || (!this.p2.active && e.code === 'ArrowDown')) {
      this.p1.crouchHeld = true;
      this.p1.isBlocking = true;
    }

    // X (or Space / E) = Combo Attack
    if (e.code === 'KeyX' || e.code === 'Space' || e.code === 'KeyE') {
      if (!e.repeat) {
        this.p1.queueAction('TAP');
        this.spawnSyntheticKeyTrail('TAP', 0.35);
        if (window.Haptics) window.Haptics.trigger('tap');
      }
    }

    // C = Web Sling (Upward Lift & Zip)
    if (e.code === 'KeyC') {
      if (!e.repeat) {
        this.p1.queueAction('SWIPE_UP');
        this.spawnSyntheticKeyTrail('SWIPE_UP', 0.35);
        if (window.Haptics) window.Haptics.trigger('whoosh');
      }
    }

    // T = Signature Taunt / Emote
    if (e.code === 'KeyT') {
      if (!e.repeat) {
        this.p1.queueAction('EMOTE');
        if (window.Haptics) window.Haptics.trigger('tap');
      }
    }

    // =========================================================
    // 2. PLAYER 2 (Arrow Keys Move, . Attack, / Web Sling)
    // =========================================================
    if (this.p2.active) {
      // Horizontal Movement
      if (this.keys['ArrowLeft'] && !this.keys['ArrowRight']) {
        this.p2.moveX = -1;
      } else if (this.keys['ArrowRight'] && !this.keys['ArrowLeft']) {
        this.p2.moveX = 1;
      } else {
        this.p2.moveX = 0;
      }

      // Up Arrow = Jump
      if (e.code === 'ArrowUp') {
        if (!this.p2.jumpHeld) this.p2.jumpPressed = true;
        this.p2.jumpHeld = true;
      }

      // Down Arrow = Crouch & Block / Parry
      if (e.code === 'ArrowDown') {
        this.p2.crouchHeld = true;
        this.p2.isBlocking = true;
      }

      // . (Period) = Combo Attack
      if (e.code === 'Period' || e.code === 'NumpadDecimal' || e.key === '.') {
        if (!e.repeat) {
          this.p2.queueAction('TAP');
          this.spawnSyntheticKeyTrail('TAP', 0.75);
          if (window.Haptics) window.Haptics.trigger('tap');
        }
      }

      // / (Slash) = Web Sling
      if (e.code === 'Slash' || e.code === 'NumpadDivide' || e.key === '/') {
        if (!e.repeat) {
          this.p2.queueAction('SWIPE_UP');
          this.spawnSyntheticKeyTrail('SWIPE_UP', 0.75);
          if (window.Haptics) window.Haptics.trigger('whoosh');
        }
      }

      // ' (Quote) or L = Signature Taunt / Emote
      if (e.code === 'Quote' || e.code === 'KeyL' || e.key === "'") {
        if (!e.repeat) {
          this.p2.queueAction('EMOTE');
          if (window.Haptics) window.Haptics.trigger('tap');
        }
      }
    }

    // Quick Restart / Rematch (R)
    if (e.code === 'KeyR' && window.Game) {
      if (window.Game.is1v1Duel) {
        window.Game.start1v1Duel(window.Game.p1Char, window.Game.p1Name, window.Game.p2Char, window.Game.p2Name);
      } else if (window.Game.isEndlessMode) {
        window.Game.startEndlessGame();
      } else if (typeof window.Game.restartCheckpoint === 'function') {
        window.Game.restartCheckpoint();
      }
    }
  }

  handleKeyUp(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
      return;
    }

    this.keys[e.code] = false;
    if (e.key === '.') this.keys['Period'] = false;
    if (e.key === '/') this.keys['Slash'] = false;

    // --- P1 Release ---
    if (this.keys['KeyA'] && !this.keys['KeyD']) {
      this.p1.moveX = -1;
    } else if (this.keys['KeyD'] && !this.keys['KeyA']) {
      this.p1.moveX = 1;
    } else {
      if (!this.p2.active) {
        if (this.keys['ArrowLeft'] && !this.keys['ArrowRight']) this.p1.moveX = -1;
        else if (this.keys['ArrowRight'] && !this.keys['ArrowLeft']) this.p1.moveX = 1;
        else this.p1.moveX = 0;
      } else {
        this.p1.moveX = 0;
      }
    }

    if (e.code === 'KeyW' || (!this.p2.active && e.code === 'ArrowUp')) {
      this.p1.jumpHeld = false;
    }

    if (e.code === 'KeyS' || (!this.p2.active && e.code === 'ArrowDown')) {
      this.p1.crouchHeld = false;
      this.p1.isBlocking = false;
    }

    // --- P2 Release ---
    if (this.p2.active) {
      if (this.keys['ArrowLeft'] && !this.keys['ArrowRight']) {
        this.p2.moveX = -1;
      } else if (this.keys['ArrowRight'] && !this.keys['ArrowLeft']) {
        this.p2.moveX = 1;
      } else {
        this.p2.moveX = 0;
      }

      if (e.code === 'ArrowUp') {
        this.p2.jumpHeld = false;
      }

      if (e.code === 'ArrowDown') {
        this.p2.crouchHeld = false;
        this.p2.isBlocking = false;
      }
    }
  }

  // Visual Arcade Slash Arc Effect
  spawnSyntheticKeyTrail(type, screenXFraction = 0.5) {
    const rect = this.canvas ? this.canvas.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const centerX = (rect.width || 800) * screenXFraction;
    const centerY = (rect.height || 600) * 0.5;
    const now = performance.now();
    const points = [];

    const len = 90;
    let dx = 0, dy = 0;

    switch (type) {
      case 'SWIPE_UP':
        dy = -len;
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          points.push({ x: centerX + (t - 0.5) * 20, y: centerY - dy * 0.5 + dy * t, time: now });
        }
        break;
      case 'TAP':
      default:
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          points.push({ x: centerX + Math.cos(a) * 22, y: centerY + Math.sin(a) * 22, time: now });
        }
        break;
    }

    this.trails.push({
      points: points,
      birth: now,
      duration: 220
    });
  }

  updateGamepad() {
    // Optional gamepad support
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp) return;

    const stickX = gp.axes[0];
    if (Math.abs(stickX) > 0.2) this.p1.moveX = stickX;
    else if (!this.keys['KeyA'] && !this.keys['KeyD']) this.p1.moveX = 0;

    const btnA = gp.buttons[0] && gp.buttons[0].pressed;
    if (btnA) {
      if (!this.p1.jumpHeld) this.p1.jumpPressed = true;
      this.p1.jumpHeld = true;
    } else if (!this.keys['Space'] && !this.keys['KeyW']) {
      this.p1.jumpHeld = false;
    }

    if (gp.buttons[2] && gp.buttons[2].pressed) this.p1.queueAction('TAP');
    if (gp.buttons[3] && gp.buttons[3].pressed) this.p1.queueAction('SWIPE_UP');
    if (gp.buttons[4] && gp.buttons[4].pressed) this.p1.isBlocking = true;
    else if (!this.keys['KeyS']) this.p1.isBlocking = false;
  }

  draw(ctx, canvasWidth, canvasHeight) {
    const now = performance.now();

    // Render active strike visual trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      const elapsed = now - trail.birth;
      if (elapsed > trail.duration) {
        this.trails.splice(i, 1);
        continue;
      }
      const alpha = 1 - (elapsed / trail.duration);
      this.renderTrail(ctx, trail.points, alpha);
    }
  }

  renderTrail(ctx, points, alpha) {
    if (points.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.4})`;
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.restore();
  }
}
