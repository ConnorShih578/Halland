/* =========================================================
   INPUT & GESTURE CONTROLLER
   Left Movement Joystick + Invisible Right Gesture Canvas
   with fluid white strike trails and zero gesture lag.
   Keyboard: WASD (move/jump/crouch/block), E (tap), Arrow Keys (right canvas swipes).
========================================================= */

class InputController {
  constructor(canvas) {
    this.canvas = canvas;

    // Movement state (Left Stick / Keyboard WASD)
    this.moveX = 0;       // -1 .. 1
    this.moveY = 0;       // -1 .. 1
    this.jumpPressed = false;
    this.jumpHeld = false;
    this.crouchHeld = false;

    // Action state queue & current gesture
    this.pendingAction = null;
    this.isBlocking = false;

    // Combo alternation counter (for ground tap)
    this.comboStep = 0;

    // Left Touch Management (Movement Joystick)
    this.leftTouchId = null;
    this.leftStickOrigin = { x: 0, y: 0 };
    this.leftStickCurrent = { x: 0, y: 0 };
    this.leftStickActive = false;
    this.leftStickRadius = 55;

    // Right Gesture Touch Management (Invisible Canvas)
    this.rightTouchId = null;
    this.rightTouchStart = { x: 0, y: 0, time: 0 };
    this.rightTouchPoints = [];
    this.isRightTouching = false;

    // Active White Trails list for rendering
    this.trails = [];

    // Desktop Keyboard State
    this.keys = {};

    this.bindEvents();
  }

  bindEvents() {
    const el = this.canvas;

    // Touch Events
    el.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    el.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    el.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    el.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

    // Mouse Fallback on Right Canvas
    let isMouseDownRight = false;
    el.addEventListener('mousedown', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x > rect.width * 0.45) {
        isMouseDownRight = true;
        this.startRightGesture(999, x, y);
      }
    });

    el.addEventListener('mousemove', (e) => {
      if (isMouseDownRight) {
        const rect = el.getBoundingClientRect();
        this.updateRightGesture(999, e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    const endMouse = (e) => {
      if (isMouseDownRight) {
        isMouseDownRight = false;
        const rect = el.getBoundingClientRect();
        this.endRightGesture(999, e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    el.addEventListener('mouseup', endMouse);
    el.addEventListener('mouseleave', endMouse);

    // Keyboard Events
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  // --- Touch Event Handlers ---

  handleTouchStart(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const halfWidth = rect.width * 0.5;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;

      if (x < halfWidth) {
        // LEFT HALF: Movement Joystick
        if (this.leftTouchId === null) {
          this.leftTouchId = t.identifier;
          this.leftStickOrigin = { x, y };
          this.leftStickCurrent = { x, y };
          this.leftStickActive = true;
          if (window.Haptics) window.Haptics.trigger('tap');
        }
      } else {
        // RIGHT HALF: Invisible Martial Arts Gesture Canvas
        if (this.rightTouchId === null) {
          this.startRightGesture(t.identifier, x, y);
        }
      }
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;

      if (t.identifier === this.leftTouchId) {
        this.leftStickCurrent = { x, y };
        const dx = x - this.leftStickOrigin.x;
        const dy = y - this.leftStickOrigin.y;
        const dist = Math.hypot(dx, dy);

        const clampedDist = Math.min(dist, this.leftStickRadius);
        const angle = Math.atan2(dy, dx);

        this.moveX = (Math.cos(angle) * clampedDist) / this.leftStickRadius;
        this.moveY = (Math.sin(angle) * clampedDist) / this.leftStickRadius;

        if (this.moveY < -0.55) {
          if (!this.jumpHeld) {
            this.jumpPressed = true;
          }
          this.jumpHeld = true;
        } else {
          this.jumpHeld = false;
        }

        this.crouchHeld = this.moveY > 0.55;
      } else if (t.identifier === this.rightTouchId) {
        this.updateRightGesture(t.identifier, x, y);
      }
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;

      if (t.identifier === this.leftTouchId) {
        this.leftTouchId = null;
        this.leftStickActive = false;
        this.moveX = 0;
        this.moveY = 0;
        this.jumpHeld = false;
        this.crouchHeld = false;
      } else if (t.identifier === this.rightTouchId) {
        this.endRightGesture(t.identifier, x, y);
      }
    }
  }

  // --- Right Gesture Canvas Methods ---

  startRightGesture(id, x, y) {
    this.rightTouchId = id;
    const now = performance.now();
    this.rightTouchStart = { x, y, time: now };
    this.rightTouchPoints = [{ x, y, time: now }];
    this.isRightTouching = true;
    this.isBlocking = false;
  }

  updateRightGesture(id, x, y) {
    const now = performance.now();
    this.rightTouchPoints.push({ x, y, time: now });

    this.rightTouchPoints = this.rightTouchPoints.filter(p => now - p.time < 260);

    const start = this.rightTouchStart;
    const totalDist = Math.hypot(x - start.x, y - start.y);
    const elapsed = now - start.time;

    // Detect Hold to Block (held for > 180ms with little movement)
    if (elapsed > 180 && totalDist < 25) {
      if (!this.isBlocking) {
        this.isBlocking = true;
        if (window.Haptics) window.Haptics.trigger('block');
      }
    }
  }

  endRightGesture(id, x, y) {
    const now = performance.now();
    const start = this.rightTouchStart;
    const dx = x - start.x;
    const dy = y - start.y;
    const dist = Math.hypot(dx, dy);
    const duration = now - start.time;

    if (this.rightTouchPoints.length > 1) {
      this.trails.push({
        points: [...this.rightTouchPoints],
        birth: performance.now(),
        duration: 260
      });
    }

    if (this.isBlocking) {
      this.isBlocking = false;
    } else if (duration < 220 && dist < 22) {
      // 💥 TAP (Alternating Combo on ground / Cannonball in air)
      this.queueAction('TAP');
      if (window.Haptics) window.Haptics.trigger('tap');
    } else if (dist >= 22) {
      // 🥋 DIRECTIONAL SWIPES
      const angle = Math.atan2(dy, dx); // [-PI..PI]

      if (angle >= -Math.PI / 4 && angle <= Math.PI / 4) {
        // Swipe Right (Straight Punch on ground / Diving Punch in air)
        this.queueAction('SWIPE_RIGHT');
        if (window.Haptics) window.Haptics.trigger('whoosh');
      } else if (angle > Math.PI / 4 && angle < (3 * Math.PI) / 4) {
        // Swipe Down (Super Tough Sweep Kick on ground / Body Slam in air)
        this.queueAction('SWIPE_DOWN');
        if (window.Haptics) window.Haptics.trigger('whoosh');
      } else if (angle < -Math.PI / 4 && angle > (-3 * Math.PI) / 4) {
        // Swipe Up (Uppercut on ground / Upwards Kick in air)
        this.queueAction('SWIPE_UP');
        if (window.Haptics) window.Haptics.trigger('whoosh');
      } else {
        // Swipe Left (Backstep on ground / Backflip Dodge in air)
        this.queueAction('SWIPE_LEFT');
        if (window.Haptics) window.Haptics.trigger('whoosh');
      }
    }

    this.rightTouchId = null;
    this.isRightTouching = false;
    this.rightTouchPoints = [];
  }

  queueAction(type) {
    this.pendingAction = type;
  }

  consumeAction() {
    const act = this.pendingAction;
    this.pendingAction = null;
    return act;
  }

  // --- Desktop Keyboard & Gamepad Input ---

  handleKeyDown(e) {
    const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyT', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyR'];
    if (gameKeys.includes(e.code)) {
      e.preventDefault();
    }

    this.keys[e.code] = true;

    // 1. WASD Movement Keys
    if (this.keys['KeyA'] && !this.keys['KeyD']) this.moveX = -1;
    else if (this.keys['KeyD'] && !this.keys['KeyA']) this.moveX = 1;
    else if (!this.keys['KeyA'] && !this.keys['KeyD']) this.moveX = 0;

    // W Key = Jump
    if (e.code === 'KeyW') {
      if (!this.jumpHeld) this.jumpPressed = true;
      this.jumpHeld = true;
    }

    if (e.code === 'KeyS') {
      this.crouchHeld = true;
      this.isBlocking = true;
    }

    // Ignore browser auto-repeat for attack action triggers
    if (e.repeat && ['Space', 'KeyE', 'KeyT', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowLeft'].includes(e.code)) {
      return;
    }

    // 2. T Key = Signature Character Taunt / Emote
    if (e.code === 'KeyT') {
      this.queueAction('EMOTE');
      if (window.Haptics) window.Haptics.trigger('tap');
    }

    // 3. Spacebar (or E Key) = Basic Punch / Kick Combo
    if (e.code === 'Space' || e.code === 'KeyE') {
      this.queueAction('TAP');
      this.spawnSyntheticKeyTrail('TAP');
      if (window.Haptics) window.Haptics.trigger('tap');
    }

    // 3. Arrow Keys = Right Canvas Directional Swipes with White Motion Trails
    if (e.code === 'ArrowRight') {
      this.queueAction('SWIPE_RIGHT');
      this.spawnSyntheticKeyTrail('SWIPE_RIGHT');
      if (window.Haptics) window.Haptics.trigger('whoosh');
    }
    if (e.code === 'ArrowDown') {
      this.queueAction('SWIPE_DOWN');
      this.spawnSyntheticKeyTrail('SWIPE_DOWN');
      if (window.Haptics) window.Haptics.trigger('whoosh');
    }
    if (e.code === 'ArrowUp') {
      this.queueAction('SWIPE_UP');
      this.spawnSyntheticKeyTrail('SWIPE_UP');
      if (window.Haptics) window.Haptics.trigger('whoosh');
    }
    if (e.code === 'ArrowLeft') {
      this.queueAction('SWIPE_LEFT');
      this.spawnSyntheticKeyTrail('SWIPE_LEFT');
      if (window.Haptics) window.Haptics.trigger('whoosh');
    }

    // Restart shortcut (R)
    if (e.code === 'KeyR' && window.Game) {
      window.Game.restartCheckpoint();
    }
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;

    // Update horizontal movement
    if (this.keys['KeyA'] && !this.keys['KeyD']) this.moveX = -1;
    else if (this.keys['KeyD'] && !this.keys['KeyA']) this.moveX = 1;
    else this.moveX = 0;

    if (e.code === 'KeyW' || e.code === 'Space') {
      this.jumpHeld = false;
    }

    if (e.code === 'KeyS') {
      this.crouchHeld = false;
      this.isBlocking = false;
    }
  }

  // Spawn visual white slash trail on right half for keyboard arrow keys
  spawnSyntheticKeyTrail(type) {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width * 0.75;
    const centerY = rect.height * 0.5;
    const now = performance.now();
    const points = [];

    const len = 95;
    let dx = 0, dy = 0;

    switch (type) {
      case 'SWIPE_RIGHT': dx = len; break;
      case 'SWIPE_DOWN': dy = len; break;
      case 'SWIPE_UP': dy = -len; break;
      case 'SWIPE_LEFT': dx = -len; break;
      case 'TAP':
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          points.push({ x: centerX + Math.cos(a) * 18, y: centerY + Math.sin(a) * 18, time: now });
        }
        break;
    }

    if (type !== 'TAP') {
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        points.push({
          x: centerX - dx * 0.5 + dx * t,
          y: centerY - dy * 0.5 + dy * t,
          time: now
        });
      }
    }

    this.trails.push({
      points: points,
      birth: now,
      duration: 250
    });
  }

  updateGamepad() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp) return;

    const stickX = gp.axes[0];
    if (Math.abs(stickX) > 0.2) this.moveX = stickX;
    else if (!this.keys['KeyA'] && !this.keys['KeyD']) this.moveX = 0;

    const btnA = gp.buttons[0] && gp.buttons[0].pressed;
    if (btnA) {
      if (!this.jumpHeld) this.jumpPressed = true;
      this.jumpHeld = true;
    } else if (!this.keys['Space'] && !this.keys['KeyW']) {
      this.jumpHeld = false;
    }

    if (gp.buttons[2] && gp.buttons[2].pressed) this.queueAction('TAP');
    if (gp.buttons[1] && gp.buttons[1].pressed) this.queueAction('SWIPE_DOWN');
    if (gp.buttons[3] && gp.buttons[3].pressed) this.queueAction('SWIPE_UP');
    if (gp.buttons[5] && gp.buttons[5].pressed) this.queueAction('SWIPE_RIGHT');
    if (gp.buttons[4] && gp.buttons[4].pressed) this.isBlocking = true;
    else if (!this.keys['KeyS']) this.isBlocking = false;
  }

  draw(ctx, canvasWidth, canvasHeight) {
    const now = performance.now();
    const isMobileDevice = ('ontouchstart' in window) || (canvasWidth < 768);

    // Ambient Touch Zone Indicator on Mobile (subtle guide for thumbs)
    if (isMobileDevice && !this.leftStickActive && !this.isRightTouching) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;

      // Left Stick Zone
      const leftCenterX = Math.max(70, canvasWidth * 0.14);
      const leftCenterY = canvasHeight - 90;
      ctx.beginPath();
      ctx.arc(leftCenterX, leftCenterY, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '800 9px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('🕹️ MOVE', leftCenterX, leftCenterY + 3);

      // Right Action Zone
      const rightCenterX = canvasWidth - Math.max(70, canvasWidth * 0.14);
      const rightCenterY = canvasHeight - 90;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.arc(rightCenterX, rightCenterY, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillText('⚡ ATTACK', rightCenterX, rightCenterY + 3);

      ctx.restore();
    }

    // 1. Draw Left Virtual Joystick if active
    if (this.leftStickActive) {
      ctx.save();
      const origin = this.leftStickOrigin;
      const cur = this.leftStickCurrent;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, this.leftStickRadius, 0, Math.PI * 2);
      ctx.stroke();

      const dx = cur.x - origin.x;
      const dy = cur.y - origin.y;
      const dist = Math.min(Math.hypot(dx, dy), this.leftStickRadius);
      const angle = Math.atan2(dy, dx);
      const knobX = origin.x + Math.cos(angle) * dist;
      const knobY = origin.y + Math.sin(angle) * dist;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(knobX, knobY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Active Right Motion Trail
    if (this.isRightTouching && this.rightTouchPoints.length > 1) {
      this.renderTrail(ctx, this.rightTouchPoints, 1.0);
    }

    // 3. Draw Fading Completed Trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      const age = now - tr.birth;
      if (age > tr.duration) {
        this.trails.splice(i, 1);
      } else {
        const alpha = 1.0 - (age / tr.duration);
        this.renderTrail(ctx, tr.points, alpha);
      }
    }
  }

  renderTrail(ctx, points, globalAlpha) {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const tNorm = i / points.length;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);

      ctx.lineWidth = 4 + tNorm * 10;
      ctx.strokeStyle = `rgba(255, 255, 255, ${tNorm * globalAlpha * 0.9})`;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8 * globalAlpha;
      ctx.stroke();
    }

    ctx.restore();
  }
}

window.InputController = InputController;
