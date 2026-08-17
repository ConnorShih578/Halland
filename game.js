// =========================================================
// HALLAND - ULTRA-COMPACT ENDLESS RUNNER ENGINE
// =========================================================

(function() {
  'use strict';

  // 1. Procedural Micro Web Audio Synthesizer
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playSfx(type) {
    if (!audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'hit' || type === 'punch') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t); osc.stop(t + 0.12);
      } else if (type === 'kick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
        osc.start(t); osc.stop(t + 0.16);
      } else if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(360, t + 0.14);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
        osc.start(t); osc.stop(t + 0.14);
      } else if (type === 'parry') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1760, t + 0.22);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
        osc.start(t); osc.stop(t + 0.22);
      } else if (type === 'death') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.start(t); osc.stop(t + 0.35);
      }
    } catch(e) {}
  }

  // 2. Input System (Keyboard + Mobile Touch)
  const input = {
    keys: {},
    moveX: 0,
    jumpPressed: false,
    isBlocking: false,
    actionQueue: [],
    stick: { active: false, ox: 0, oy: 0, cx: 0, cy: 0 }
  };

  window.addEventListener('keydown', e => {
    initAudio();
    input.keys[e.code] = true;
    if (['ArrowUp', 'KeyW'].includes(e.code)) input.jumpPressed = true;
    if (e.code === 'Space' || e.code === 'KeyE') input.actionQueue.push('TAP');
    if (['ArrowRight', 'KeyD'].includes(e.code) && e.shiftKey) input.actionQueue.push('SWIPE_RIGHT');
    if (['ArrowDown', 'KeyS'].includes(e.code) && e.shiftKey) input.actionQueue.push('SWIPE_DOWN');
    if (['ArrowUp', 'KeyW'].includes(e.code) && e.shiftKey) input.actionQueue.push('SWIPE_UP');
  });

  window.addEventListener('keyup', e => {
    input.keys[e.code] = false;
  });

  // Touch Controls
  let touchStart = null;
  window.addEventListener('touchstart', e => {
    initAudio();
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth * 0.5) {
        input.stick.active = true;
        input.stick.ox = t.clientX; input.stick.oy = t.clientY;
        input.stick.cx = t.clientX; input.stick.cy = t.clientY;
      } else {
        touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
      }
    }
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (input.stick.active && t.clientX < window.innerWidth * 0.55) {
        input.stick.cx = t.clientX; input.stick.cy = t.clientY;
        const dx = input.stick.cx - input.stick.ox;
        input.moveX = Math.max(-1, Math.min(1, dx / 40));
        if (input.stick.cy - input.stick.oy < -35) input.jumpPressed = true;
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth * 0.55) {
        input.stick.active = false;
        input.moveX = 0;
      } else if (touchStart) {
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        const dt = performance.now() - touchStart.t;
        const dist = Math.hypot(dx, dy);

        if (dist > 30 && dt < 300) {
          if (Math.abs(dx) > Math.abs(dy)) input.actionQueue.push(dx > 0 ? 'SWIPE_RIGHT' : 'SWIPE_LEFT');
          else input.actionQueue.push(dy > 0 ? 'SWIPE_DOWN' : 'SWIPE_UP');
        } else if (dist < 15 && dt < 250) {
          input.actionQueue.push('TAP');
        }
        touchStart = null;
      }
    }
  });

  // 3. Stickman Kinematics (2-Bone IK Solver & Ribbon Hair)
  class Stickman {
    constructor() {
      this.hair = Array.from({ length: 6 }, () => ({ x: 0, y: 0, oldX: 0, oldY: 0 }));
      this.belt = Array.from({ length: 5 }, () => ({ x: 0, y: 0, oldX: 0, oldY: 0 }));
    }

    solveIK(root, target, l1, l2, bend) {
      const dx = target.x - root.x;
      const dy = target.y - root.y;
      const dist = Math.min(Math.hypot(dx, dy) || 0.001, l1 + l2 - 0.01);
      const alpha = Math.atan2(dy, dx);
      const cosAngle = (dist * dist + l1 * l1 - l2 * l2) / (2 * dist * l1);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * bend;
      const jx = root.x + Math.cos(alpha + angle) * l1;
      const jy = root.y + Math.sin(alpha + angle) * l1;
      return { root, joint: { x: jx, y: jy }, end: target };
    }

    updateRibbons(hx, hy, vx, vy, facing) {
      this.hair[0].x = hx - facing * 4;
      this.hair[0].y = hy - 4;
      for (let i = 1; i < this.hair.length; i++) {
        const p = this.hair[i], prev = this.hair[i - 1];
        const cvx = (p.x - p.oldX) * 0.85, cvy = (p.y - p.oldY) * 0.85;
        p.oldX = p.x; p.oldY = p.y;
        p.x += cvx - vx * 0.4 - facing * 2.5;
        p.y += cvy - vy * 0.2 + 0.8;
        const dx = p.x - prev.x, dy = p.y - prev.y;
        const d = Math.hypot(dx, dy) || 1;
        p.x = prev.x + (dx / d) * 5;
        p.y = prev.y + (dy / d) * 5;
      }
    }

    draw(ctx, p) {
      const { x, y, facing, state, vx, vy } = p;
      const isRun = state === 'RUN';
      const isSlide = state === 'SLIDE';
      const isAttack = state.startsWith('ATK');

      const headY = y - (isSlide ? 24 : 48);
      const hipY = y - (isSlide ? 12 : 26);
      this.updateRibbons(x, headY, vx, vy, facing);

      ctx.save();
      ctx.lineCap = 'round';

      // 1. Torso
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(x, hipY);
      ctx.lineTo(x + facing * (isRun ? 4 : 0), headY + 8);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.2;
      ctx.stroke();

      // 2. Limbs via Simple IK
      const stride = Math.sin(performance.now() * 0.015) * 14;
      const footL = { x: x - (isRun ? stride : facing * 8), y: y };
      const footR = { x: x + (isRun ? stride : facing * 8), y: y };
      const handL = { x: x - (isAttack ? facing * 22 : 8), y: headY + (isAttack ? 4 : 12) };
      const handR = { x: x + (isAttack ? facing * 26 : 8), y: headY + (isAttack ? 2 : 12) };

      const legL = this.solveIK({ x, y: hipY }, footL, 14, 14, 1);
      const legR = this.solveIK({ x, y: hipY }, footR, 14, 14, -1);
      const armL = this.solveIK({ x, y: headY + 8 }, handL, 11, 11, -1);
      const armR = this.solveIK({ x, y: headY + 8 }, handR, 11, 11, 1);

      const drawLimb = (ik) => {
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3.8;
        ctx.beginPath(); ctx.moveTo(ik.root.x, ik.root.y); ctx.lineTo(ik.joint.x, ik.joint.y); ctx.lineTo(ik.end.x, ik.end.y); ctx.stroke();
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(ik.root.x, ik.root.y); ctx.lineTo(ik.joint.x, ik.joint.y); ctx.lineTo(ik.end.x, ik.end.y); ctx.stroke();
      };

      drawLimb(legL); drawLimb(legR); drawLimb(armL); drawLimb(armR);

      // 3. Head (Spider-Mask)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(x, headY, 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.stroke();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x + facing * 2, headY - 2);
      ctx.lineTo(x + facing * 6, headY - 3);
      ctx.lineTo(x + facing * 4, headY + 2);
      ctx.fill();

      // Ponytail Ribbon
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(this.hair[0].x, this.hair[0].y);
      for (let i = 1; i < this.hair.length; i++) ctx.lineTo(this.hair[i].x, this.hair[i].y);
      ctx.stroke();

      // Floating Overhead Health Bar
      const hpPct = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x - 16, headY - 18, 32, 4);
      ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(x - 15, headY - 17, 30 * hpPct, 2);

      ctx.restore();
    }
  }

  // 4. Procedural Endless World Generator
  class WorldStreamer {
    constructor() {
      this.platforms = [];
      this.entities = [];
      this.breakables = [];
      this.particles = [];
      this.nextX = 0;
      this.init();
    }

    init() {
      this.platforms = [{ x: 0, y: 500, w: 900, h: 40 }];
      this.entities = [];
      this.breakables = [];
      this.particles = [];
      this.nextX = 900;
      for (let i = 0; i < 4; i++) this.generateChunk();
    }

    generateChunk() {
      const startX = this.nextX;
      const type = Math.floor(Math.random() * 4);
      const chunkW = 700 + Math.floor(Math.random() * 300);

      if (type === 0) {
        // Flat run with ninja ambushes
        this.platforms.push({ x: startX, y: 500, w: chunkW, h: 40 });
        this.entities.push({ x: startX + 350, y: 500, w: 22, h: 56, hp: 2, facing: -1, vx: 0, vy: 0, aiTimer: 0 });
        this.breakables.push({ x: startX + 220, y: 440, w: 16, h: 60, broken: false });
      } else if (type === 1) {
        // Gap jump with bouncer
        this.platforms.push({ x: startX, y: 500, w: 260, h: 40 });
        this.platforms.push({ x: startX + 270, y: 500, w: 40, h: 14, isBouncer: true });
        this.platforms.push({ x: startX + 360, y: 430, w: 280, h: 40 });
      } else if (type === 2) {
        // Stepped pagoda rooftops
        this.platforms.push({ x: startX, y: 500, w: 220, h: 40 });
        this.platforms.push({ x: startX + 260, y: 420, w: 220, h: 30 });
        this.platforms.push({ x: startX + 520, y: 350, w: 220, h: 30 });
        this.entities.push({ x: startX + 600, y: 350, w: 22, h: 56, hp: 3, facing: -1, vx: 0, vy: 0, aiTimer: 0 });
      } else {
        // High-speed slide run under low ceiling
        this.platforms.push({ x: startX, y: 500, w: chunkW, h: 40 });
        this.platforms.push({ x: startX + 160, y: 440, w: 320, h: 20 });
        this.breakables.push({ x: startX + 520, y: 440, w: 16, h: 60, broken: false });
      }

      this.nextX += chunkW + 80;
    }

    update(playerX) {
      if (playerX + 1200 > this.nextX) this.generateChunk();
      this.platforms = this.platforms.filter(p => p.x + p.w > playerX - 900);
      this.entities = this.entities.filter(e => e.x > playerX - 900 && e.hp > 0);
      this.breakables = this.breakables.filter(b => b.x > playerX - 900 && !b.broken);
    }
  }

  // 5. Game Core
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const stickman = new Stickman();
  const world = new WorldStreamer();

  const player = {
    x: 100, y: 490, vx: 0, vy: 0, w: 20, h: 54,
    facing: 1, isGrounded: false, hasWebZip: true,
    hp: 100, maxHp: 100, invulnerableTimer: 0,
    state: 'IDLE', stateTime: 0, comboStep: 0,
    coyoteTimer: 0, jumpBufferTimer: 0
  };

  let isRunning = false;
  let distance = 0;
  let score = 0;
  let cameraX = 0;
  let comboCount = 0;

  const hudDist = document.getElementById('hud-dist');
  const hudScore = document.getElementById('hud-score');
  const bestDistEl = document.getElementById('best-dist');
  const highScoreEl = document.getElementById('high-score');
  const startScreen = document.getElementById('screen');
  const flashEl = document.getElementById('flash');

  const bestDist = localStorage.getItem('h_bdist') || 0;
  const bestScore = localStorage.getItem('h_bscore') || 0;
  bestDistEl.textContent = `${bestDist}m`;
  highScoreEl.textContent = bestScore;

  document.getElementById('btn-start').addEventListener('click', () => {
    initAudio();
    startScreen.classList.add('hidden');
    isRunning = true;
    resetRun();
  });

  function resetRun() {
    world.init();
    player.x = 100; player.y = 490; player.vx = 0; player.vy = 0;
    player.hp = 100; player.state = 'IDLE'; player.invulnerableTimer = 0;
    distance = 0; score = 0; comboCount = 0; cameraX = 0;
  }

  function killPlayer() {
    playSfx('death');
    flashEl.classList.add('flash');
    setTimeout(() => flashEl.classList.remove('flash'), 250);

    if (distance > bestDist) localStorage.setItem('h_bdist', Math.floor(distance));
    if (score > bestScore) localStorage.setItem('h_bscore', score);
    bestDistEl.textContent = `${localStorage.getItem('h_bdist')}m`;
    highScoreEl.textContent = localStorage.getItem('h_bscore');

    resetRun();
  }

  function spawnSparks(x, y, col, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 8 + 2;
      world.particles.push({
        x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 2,
        col, size: Math.random() * 3 + 2, life: 0.35
      });
    }
  }

  // 6. Game Loop (60FPS Fixed-Step)
  let lastT = performance.now();

  function loop(now) {
    const dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;

    if (isRunning) {
      // 1. Process Actions
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) input.moveX = -1;
      else if (input.keys['KeyD'] || input.keys['ArrowRight']) input.moveX = 1;
      else if (!input.stick.active) input.moveX = 0;

      input.isBlocking = !!input.keys['KeyS'];

      if (input.jumpPressed) {
        player.jumpBufferTimer = 0.14;
        input.jumpPressed = false;
      } else {
        player.jumpBufferTimer -= dt;
      }

      if (player.isGrounded) player.coyoteTimer = 0.14;
      else player.coyoteTimer -= dt;

      // 2. Horizontal Movement
      const moveSpd = 6.4;
      if (input.moveX !== 0 && !input.isBlocking) {
        player.vx = input.moveX * moveSpd;
        player.facing = Math.sign(input.moveX);
        if (player.isGrounded && player.state !== 'SLIDE' && !player.state.startsWith('ATK')) player.state = 'RUN';
      } else {
        player.vx *= 0.5;
        if (player.isGrounded && player.state === 'RUN') player.state = 'IDLE';
      }

      // 3. Jump
      if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
        player.vy = -13.0;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.isGrounded = false;
        player.state = 'JUMP';
        playSfx('jump');
      }

      // 4. Combat Actions
      const act = input.actionQueue.shift();
      if (act) {
        if (act === 'TAP') {
          player.comboStep = (player.comboStep + 1) % 6;
          player.state = `ATK_${player.comboStep}`;
          player.stateTime = 0;
          playSfx(player.comboStep % 2 === 0 ? 'punch' : 'kick');

          // Strike Hitbox
          const hb = { x: player.x + (player.facing > 0 ? 0 : -45), y: player.y - 45, w: 45, h: 45 };
          for (const ent of world.entities) {
            if (Math.abs(ent.x - player.x) < 55 && Math.abs(ent.y - player.y) < 40) {
              ent.hp -= 1;
              ent.vx = player.facing * 8;
              ent.vy = -4;
              score += 150;
              comboCount++;
              spawnSparks(ent.x, ent.y - 25, '#ef4444', 10);
              playSfx('hit');
            }
          }
          for (const b of world.breakables) {
            if (!b.broken && Math.abs(b.x - player.x) < 50) {
              b.broken = true;
              score += 200;
              spawnSparks(b.x, b.y + 30, '#d97706', 12);
              playSfx('hit');
            }
          }
        } else if (act === 'SWIPE_UP' && player.hasWebZip) {
          player.hasWebZip = false;
          player.vy = -10.5;
          playSfx('jump');
        } else if (act === 'SWIPE_DOWN') {
          player.state = 'SLIDE';
          player.vx = player.facing * 10;
        }
      }

      // 5. Gravity & Vertical Movement
      player.vy = Math.min(15, player.vy + 0.65);
      player.x += player.vx;
      player.y += player.vy;
      player.isGrounded = false;

      // Platform Collisions
      for (const plat of world.platforms) {
        if (player.x + player.w/2 > plat.x && player.x - player.w/2 < plat.x + plat.w) {
          if (player.y >= plat.y && player.y - player.vy <= plat.y + 12) {
            player.y = plat.y;
            player.isGrounded = true;
            player.hasWebZip = true;

            if (plat.isBouncer) {
              player.vy = -16.5;
              playSfx('jump');
            } else {
              player.vy = 0;
            }
          }
        }
      }

      // Pit Death
      if (player.y > 650) killPlayer();

      // Enemy AI & Damage
      for (const ent of world.entities) {
        const dx = player.x - ent.x;
        const dist = Math.abs(dx);
        ent.facing = Math.sign(dx);
        ent.vx = ent.facing * 3.4;
        ent.x += ent.vx;

        if (dist < 32 && Math.abs(player.y - ent.y) < 35 && player.invulnerableTimer <= 0) {
          if (input.isBlocking) {
            ent.vx = -ent.facing * 7;
            playSfx('parry');
            score += 100;
            spawnSparks(player.x, player.y - 25, '#38bdf8', 12);
          } else {
            player.hp -= 20;
            player.invulnerableTimer = 0.5;
            player.vx = ent.facing * 8;
            player.vy = -5;
            playSfx('hit');
            flashEl.classList.add('flash');
            setTimeout(() => flashEl.classList.remove('flash'), 180);
            if (player.hp <= 0) killPlayer();
          }
        }
      }

      if (player.invulnerableTimer > 0) player.invulnerableTimer -= dt;

      // World Stream & Distance Tracking
      world.update(player.x);
      distance = Math.max(distance, player.x / 10);
      score += Math.floor(dt * 15);
      hudDist.textContent = `${Math.floor(distance)}m`;
      hudScore.textContent = `SCORE: ${score}`;

      // Smooth Camera Lerp
      cameraX += (player.x + 120 - cameraX) * (1 - Math.exp(-6 * dt));
    }

    // 7. Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width * 0.35 - cameraX, canvas.height * 0.5 - 240);

    // Platforms
    for (const plat of world.platforms) {
      ctx.fillStyle = plat.isBouncer ? '#f59e0b' : '#0f172a';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = plat.isBouncer ? '#fbbf24' : '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }

    // Breakables
    for (const b of world.breakables) {
      if (!b.broken) {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#f59e0b';
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
    }

    // Enemies (Ninjas)
    for (const ent of world.entities) {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath(); ctx.arc(ent.x, ent.y - 42, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4338ca'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ent.x, ent.y); ctx.lineTo(ent.x, ent.y - 35); ctx.stroke();
    }

    // Particles
    for (let i = world.particles.length - 1; i >= 0; i--) {
      const p = world.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.016;
      if (p.life <= 0) { world.particles.splice(i, 1); continue; }
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    // Player Stickman
    stickman.draw(ctx, player);

    ctx.restore();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
