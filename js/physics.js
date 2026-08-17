/* =========================================================
   PHYSICS & PLATFORMING ENGINE ("HOLLAND")
   Ultra-Crisp, High-Responsiveness Vex Platforming:
   - Instant Turnaround & Zero-Lag Ground Acceleration
   - Full Precision Air Steering Authority
   - Apex Jump Hang-Time & Crisp Fast-Falling Curve
   - Non-Locking Moving Strikes (Run-Punching)
   - Generous 150ms Coyote Time & Jump Buffering
========================================================= */

class PhysicsEngine {
  constructor() {
    this.gravity = 0.68;
    this.maxFallSpeed = 15;
    this.runSpeed = 6.6;
    this.groundAccel = 1.0;     // Instant zero-lag ground acceleration
    this.airAccel = 0.88;       // Surgical precision air steering
    this.groundFriction = 0.55;  // Instant crisp stopping without sliding into hazards
    this.jumpForce = -13.2;
    this.wallJumpForceX = 8.0;
    this.wallJumpForceY = -12.0;
    this.wallSlideSpeed = 2.0;

    // Generous Buffer Windows
    this.coyoteTime = 0.15;
    this.jumpBufferTime = 0.15;
  }

  createPlayer(startX, startY) {
    return {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      w: 22,
      h: 60,
      standingHeight: 60,
      crouchHeight: 32,
      facing: 1,
      isGrounded: false,
      isWallSliding: false,
      wallDir: 0,

      // Animation & Action State
      state: 'IDLE',
      stateTime: 0,
      stateDuration: 0,
      beltColor: '#ffffff',
      comboStep: 0,
      comboChainTimer: 0,

      // Health System for Halland
      hp: 100,
      maxHp: 100,
      invulnerableTimer: 0,

      // Timers & Web Zip (1x per jump)
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      hasUsedWebZip: false,

      // Checkpoint & Death
      spawnX: startX,
      spawnY: startY,
      isDead: false,
      deaths: 0
    };
  }

  updatePlayer(player, input, combat, level, dt) {
    if (player.isDead) return;

    player.stateTime += dt;

    // 1. Process Actions from Right Gesture Canvas / Keyboard
    const action = input.consumeAction();
    if (action) {
      this.executeAction(player, action, input, combat, level);
    }

    // 2. Process Block / Guard from Input
    if (input.isBlocking) {
      if (player.state !== 'BLOCK' && player.state !== 'AIR_BLOCK') {
        player.state = player.isGrounded ? 'BLOCK' : 'AIR_BLOCK';
        player.stateTime = 0;
        player.stateDuration = 0.99;
      }
    } else if (player.state === 'BLOCK' || player.state === 'AIR_BLOCK') {
      player.state = player.isGrounded ? 'IDLE' : 'JUMP';
      player.stateTime = 0;
    }

    // 3. Update Coyote & Jump Buffer Timers
    if (player.isGrounded) {
      player.coyoteTimer = this.coyoteTime;
    } else {
      player.coyoteTimer -= dt;
    }

    if (input.jumpPressed) {
      player.jumpBufferTimer = this.jumpBufferTime;
      input.jumpPressed = false;
    } else {
      player.jumpBufferTimer -= dt;
    }

    // 4. Ultra-Crisp Horizontal Movement & Steering
    const isLockedTrajectory = ['BODY_SLAM'].includes(player.state);

    if (!isLockedTrajectory && !input.isBlocking) {
      const targetVx = input.moveX * this.runSpeed;

      if (input.moveX !== 0) {
        player.facing = input.moveX > 0 ? 1 : -1;

        if (player.isGrounded) {
          // Instant direction snap if turning around on the ground
          if (targetVx * player.vx < 0) {
            player.vx = targetVx * 0.8;
          } else {
            player.vx += (targetVx - player.vx) * this.groundAccel;
          }
        } else {
          // Air control steering
          player.vx += (targetVx - player.vx) * this.airAccel;
        }
      } else {
        // Crisp stopping on release
        if (player.isGrounded) {
          player.vx *= this.groundFriction;
          if (Math.abs(player.vx) < 0.25) player.vx = 0;
        } else {
          player.vx *= 0.92; // Slight air drag
        }
      }
    }

    // 5. Vertical Movement with Apex Hang-Time & Fast Falling
    if (!player.isGrounded) {
      if (player.isWallSliding && player.vy > 0) {
        player.vy = Math.min(player.vy + this.gravity * 0.35, this.wallSlideSpeed);
      } else if (player.state === 'BODY_SLAM') {
        player.vy = Math.min(player.vy + this.gravity * 2.5, 22);
      } else if (player.state === 'CANNONBALL') {
        player.vy = Math.min(player.vy + this.gravity * 1.3, 16);
      } else {
        // Apex Hang-Time Curve
        let currentGravity = this.gravity;
        if (Math.abs(player.vy) < 2.2) {
          currentGravity *= 0.55; // Subtle hang-time at the apex of the jump
        } else if (player.vy > 0) {
          currentGravity *= 1.15; // Snappy crisp descent
        }

        player.vy = Math.min(player.vy + currentGravity, this.maxFallSpeed);
      }

      // Variable Jump Height: releasing jump button cuts ascent
      if (!input.jumpHeld && player.vy < -2.5 && !['WEB_ZIP', 'BACKFLIP'].includes(player.state)) {
        player.vy *= 0.65;
      }
    }

    // 6. Responsive Jump & Wall-Jump Logic
    if (player.jumpBufferTimer > 0) {
      if (player.coyoteTimer > 0) {
        // Instant Ground Jump
        player.vy = this.jumpForce;
        player.isGrounded = false;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.state = 'JUMP';
        player.stateTime = 0;
        if (window.Audio) window.Audio.play('jump');
        if (window.Haptics) window.Haptics.trigger('tap');
      } else if (player.isWallSliding) {
        // Instant Wall Kick
        player.vx = -player.wallDir * this.wallJumpForceX;
        player.vy = this.wallJumpForceY;
        player.facing = -player.wallDir;
        player.isWallSliding = false;
        player.hasUsedWebZip = false;
        player.jumpBufferTimer = 0;
        player.state = 'JUMP';
        player.stateTime = 0;
        if (window.Audio) window.Audio.play('wallKick');
        if (window.Haptics) window.Haptics.trigger('wallKick');
      }
    }

    // 7. Move & Collide with Platforms & Bouncers
    this.moveAndCollide(player, input, level, dt);

    // 8. Update Animation State Transitions
    this.updateAnimationStates(player, input);

    // 9. Update Timers & Health HUD
    if (player.invulnerableTimer > 0) player.invulnerableTimer -= dt;
    if (player.comboChainTimer > 0) player.comboChainTimer -= dt;

    const hpBar = document.getElementById('hud-hp-bar');
    const hpText = document.getElementById('hud-hp-text');
    if (hpBar) {
      const pct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
      hpBar.style.width = `${pct}%`;
    }
    if (hpText) {
      hpText.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHp}`;
    }

    // 10. Check Level Hazards & Triggers
    this.checkLevelInteractions(player, level);
  }

  executeAction(player, action, input, combat, level) {
    let bestTarget = null;
    if (combat && level) {
      bestTarget = combat.findBestTarget(player, action, level.entities, level.breakables);
      if (bestTarget) {
        combat.applyStrikeMagnetism(player, bestTarget, action);
      }
    }

    const isAir = !player.isGrounded && player.coyoteTimer <= 0;
    const isBehind = bestTarget && bestTarget.isBehind;

    if (!isAir) {
      // ==========================================
      // GROUND MOVESET (FORWARD & REVERSE AUTO-AIM)
      // ==========================================
      switch (action) {
        case 'TAP': {
          // Automatic Combo Chain Progression (6-hit Forward / 3-hit Reverse)
          if (player.comboChainTimer <= 0) {
            player.comboStep = 0;
          }

          if (isBehind) {
            // Target is behind: automatic spinning reverse strike sequence
            const reverseCombos = [
              { state: 'SPIN_BACKFIST', dur: 0.20, sound: 'jab' },
              { state: 'SPIN_HEEL_KICK', dur: 0.22, sound: 'kick' },
              { state: 'SPIN_SWEEP', dur: 0.28, sound: 'sweep' }
            ];
            const move = reverseCombos[player.comboStep % reverseCombos.length];
            player.state = move.state;
            player.stateTime = 0;
            player.stateDuration = move.dur;
            player.comboStep = (player.comboStep + 1) % reverseCombos.length;
            player.comboChainTimer = 0.55; // Chain buffer window
            if (window.Audio) window.Audio.play(move.sound);
          } else {
            // Forward: 6-hit automatic martial arts combo chain!
            const forwardCombos = [
              { state: 'JAB', dur: 0.16, sound: 'jab', lunge: 3.5 },
              { state: 'STRAIGHT_PUNCH', dur: 0.18, sound: 'jab', lunge: 4.8 },
              { state: 'SNAP_KICK', dur: 0.20, sound: 'kick', lunge: 5.5 },
              { state: 'SPIN_BACKFIST', dur: 0.22, sound: 'jab', lunge: 6.0 },
              { state: 'FLYING_TORNADO_KICK', dur: 0.26, sound: 'kick', lunge: 7.5 },
              { state: 'DRAGON_UPPERCUT', dur: 0.30, sound: 'wallKick', lunge: 9.0 }
            ];
            const move = forwardCombos[player.comboStep % forwardCombos.length];
            player.state = move.state;
            player.stateTime = 0;
            player.stateDuration = move.dur;
            player.vx = player.facing * move.lunge;
            player.comboStep = (player.comboStep + 1) % forwardCombos.length;
            player.comboChainTimer = 0.60; // Generous combo buffer window

            if (move.state === 'DRAGON_UPPERCUT') {
              player.vy = -6.5; // Uppercut launch
            }

            if (window.Audio) window.Audio.play(move.sound);
          }
          break;
        }

        case 'SWIPE_RIGHT': {
          if (isBehind && player.facing > 0) {
            // Target is behind: spinning backfist!
            player.state = 'SPIN_BACKFIST';
            player.stateTime = 0;
            player.stateDuration = 0.26;
            if (window.Audio) window.Audio.play('jab');
          } else {
            player.state = 'STRAIGHT_PUNCH';
            player.stateTime = 0;
            player.stateDuration = 0.26;
            player.vx = player.facing * 10.5;
            if (window.Audio) window.Audio.play('jab');
          }
          break;
        }

        case 'SWIPE_DOWN': {
          if (isBehind) {
            player.state = 'SPIN_SWEEP';
            player.stateTime = 0;
            player.stateDuration = 0.36;
            if (window.Audio) window.Audio.play('sweep');
          } else {
            player.state = 'SLIDE_SWEEP';
            player.stateTime = 0;
            player.stateDuration = 0.36;
            player.vx = player.facing * 11.5;
            if (window.Audio) window.Audio.play('sweep');
          }
          break;
        }

        case 'SWIPE_UP': {
          player.state = 'WEB_ZIP';
          player.stateTime = 0;
          player.stateDuration = 0.32;
          player.vy = -7.5;
          if (window.Audio) window.Audio.play('webZip');
          if (window.Haptics) window.Haptics.trigger('whoosh');
          break;
        }

        case 'SWIPE_LEFT': {
          if (isBehind && player.facing > 0) {
            // Target is behind: execute spinning heel kick!
            player.state = 'SPIN_HEEL_KICK';
            player.stateTime = 0;
            player.stateDuration = 0.28;
            if (window.Audio) window.Audio.play('kick');
          } else {
            player.state = 'BACKSTEP';
            player.stateTime = 0;
            player.stateDuration = 0.20;
            player.vx = -player.facing * 8.5;
            if (window.Audio) window.Audio.play('dodge');
          }
          break;
        }
      }
    } else {
      // ==========================================
      // CUSTOM AIRBORNE MOVESET
      // ==========================================
      switch (action) {
        case 'TAP': {
          player.state = 'CANNONBALL';
          player.stateTime = 0;
          player.stateDuration = 0.50;
          player.vx = player.facing * 11.5;
          player.vy = 8.5;
          if (window.Audio) window.Audio.play('cannonball');
          if (window.Haptics) window.Haptics.trigger('cannonball');
          break;
        }
        case 'SWIPE_RIGHT': {
          player.state = 'DIVING_PUNCH';
          player.stateTime = 0;
          player.stateDuration = 0.38;
          player.vx = player.facing * 14.0;
          player.vy = -1.2;
          if (window.Audio) window.Audio.play('jab');
          break;
        }
        case 'SWIPE_DOWN': {
          player.state = 'BODY_SLAM';
          player.stateTime = 0;
          player.stateDuration = 0.55;
          player.vx = player.facing * 3;
          player.vy = 17;
          if (window.Audio) window.Audio.play('sweep');
          break;
        }
        case 'SWIPE_UP': {
          if (!player.hasUsedWebZip) {
            player.hasUsedWebZip = true;
            player.state = 'WEB_ZIP';
            player.stateTime = 0;
            player.stateDuration = 0.34;
            player.vy = -10.2;
            if (window.Audio) window.Audio.play('webZip');
            if (window.Haptics) window.Haptics.trigger('whoosh');
          }
          break;
        }
        case 'SWIPE_LEFT': {
          player.state = 'BACKFLIP';
          player.stateTime = 0;
          player.stateDuration = 0.32;
          player.vx = -player.facing * 8.5;
          player.vy = -5.8;
          if (window.Audio) window.Audio.play('backflip');
          if (window.Haptics) window.Haptics.trigger('backflip');
          break;
        }
      }
    }
  }

  moveAndCollide(player, input, level, dt) {
    const prevGrounded = player.isGrounded;
    player.isGrounded = false;
    player.isWallSliding = false;
    player.wallDir = 0;

    const isLow = player.state === 'CROUCH' || player.state === 'SLIDE_SWEEP' || player.state === 'CANNONBALL';
    player.h = isLow ? player.crouchHeight : player.standingHeight;

    // 1. Horizontal Movement & Wall Collisions
    player.x += player.vx;
    let bounds = this.getPlayerBounds(player);

    for (const plat of level.platforms) {
      if (this.checkAABB(bounds, plat)) {
        if (player.vx > 0) {
          player.x = plat.x - player.w / 2;
          player.wallDir = 1;
        } else if (player.vx < 0) {
          player.x = plat.x + plat.w + player.w / 2;
          player.wallDir = -1;
        }
        player.vx = 0;
        bounds = this.getPlayerBounds(player);

        const pushingWall = (player.wallDir === 1 && input.moveX > 0.1) || (player.wallDir === -1 && input.moveX < -0.1);
        if (!prevGrounded && player.vy > 0 && pushingWall) {
          player.isWallSliding = true;
          player.state = 'WALL_SLIDE';
          player.hasUsedWebZip = false;
        }
      }
    }

    // 2. Vertical Movement & Apex Corner Correction
    player.y += player.vy;
    bounds = this.getPlayerBounds(player);

    // Platform Collisions with Sub-pixel Corner Correction
    for (const plat of level.platforms) {
      if (this.checkAABB(bounds, plat)) {
        if (player.vy > 0) {
          player.y = plat.y;
          player.vy = 0;
          player.isGrounded = true;
          player.isWallSliding = false;
          player.hasUsedWebZip = false;

          if (!prevGrounded) {
            if (player.state === 'BODY_SLAM') {
              if (window.Audio) window.Audio.play('bodySlam');
              if (window.Haptics) window.Haptics.trigger('bodySlam');
            } else {
              if (window.Audio) window.Audio.play('land');
              if (window.Haptics) window.Haptics.trigger('land');
            }
          }
        } else if (player.vy < 0) {
          // Apex Corner Assist: If player hits ceiling near edge by < 8px, nudge around corner!
          const leftOverlap = (player.x + player.w / 2) - plat.x;
          const rightOverlap = (plat.x + plat.w) - (player.x - player.w / 2);

          if (leftOverlap > 0 && leftOverlap < 8) {
            player.x -= leftOverlap + 1; // Nudge left around corner
          } else if (rightOverlap > 0 && rightOverlap < 8) {
            player.x += rightOverlap + 1; // Nudge right around corner
          } else {
            player.y = plat.y + plat.h + player.h;
            player.vy = 0;
          }
        }
        bounds = this.getPlayerBounds(player);
      }
    }
  }

  updateAnimationStates(player, input) {
    const actionStates = [
      'JAB', 'SNAP_KICK', 'STRAIGHT_PUNCH', 'SLIDE_SWEEP', 'WEB_ZIP', 'BACKSTEP',
      'SPIN_BACKFIST', 'SPIN_HEEL_KICK', 'SPIN_SWEEP',
      'CANNONBALL', 'DIVING_PUNCH', 'BODY_SLAM', 'BACKFLIP'
    ];

    if (actionStates.includes(player.state)) {
      if (player.stateTime >= player.stateDuration) {
        if (player.isGrounded) {
          player.state = Math.abs(player.vx) > 0.5 ? 'RUN' : 'IDLE';
        } else {
          player.state = 'JUMP';
        }
        player.stateTime = 0;
      }
    } else if (player.isGrounded) {
      if (input.crouchHeld) {
        player.state = 'CROUCH';
      } else if (Math.abs(player.vx) > 0.6) {
        player.state = 'RUN';
      } else if (player.state !== 'BLOCK') {
        player.state = 'IDLE';
      }
    } else if (!player.isWallSliding && player.state !== 'AIR_BLOCK') {
      player.state = 'JUMP';
    }
  }

  checkLevelInteractions(player, level) {
    const bounds = this.getPlayerBounds(player);

    if (level.hazards) {
      for (const h of level.hazards) {
        if (this.checkAABB(bounds, h)) {
          this.killPlayer(player, 'Spike Trap');
          return;
        }
      }
    }

    if (level.saws) {
      for (const saw of level.saws) {
        const bodyCenterY = player.y - player.h / 2;
        const dist = Math.hypot(player.x - saw.x, bodyCenterY - saw.y);
        if (dist < saw.radius + 10) {
          this.killPlayer(player, 'Sawblade');
          return;
        }
      }
    }

    if (level.checkpoints) {
      for (const cp of level.checkpoints) {
        if (!cp.activated && this.checkAABB(bounds, cp)) {
          cp.activated = true;
          player.spawnX = cp.x + cp.w / 2;
          player.spawnY = cp.y + cp.h;
          if (window.Audio) window.Audio.play('checkpoint');
          if (window.Haptics) window.Haptics.trigger('checkpoint');
        }
      }
    }

    if (player.y > (level.killY || 1800)) {
      this.killPlayer(player, 'Void Fall');
    }

    if (level.goal && this.checkAABB(bounds, level.goal)) {
      // 1. Mandatory Yellow Barrier Check
      const remainingBreakables = level.breakables ? level.breakables.filter(b => !b.broken).length : 0;
      if (remainingBreakables > 0) {
        // Goal is locked until all yellow walls are destroyed!
        player.x = level.goal.x - 25;
        player.vx = -4.5;
        if (window.Game && window.Game.combat) {
          window.Game.combat.announceAction(`🚨 DESTROY ALL YELLOW BARRIERS! (${remainingBreakables} LEFT)`);
        }
        if (window.Audio) window.Audio.play('hit');
        return;
      }

      // 2. Final Boss Defeat Check (if applicable)
      if (level.isFinalBoss) {
        const boss = level.entities ? level.entities.find(e => e.isGiantLeBrown) : null;
        if (boss && !boss.isDead) {
          player.x = level.goal.x - 30;
          player.vx = -4.5;
          if (window.Game && window.Game.combat) {
            window.Game.combat.announceAction(`👑 DEFEAT GIANT LEBROWN JAMESON FIRST!`);
          }
          if (window.Audio) window.Audio.play('hit');
          return;
        }
      }

      if (window.Game) window.Game.completeStage();
    }
  }

  killPlayer(player, reason) {
    if (player.isDead) return;

    player.isDead = true;
    player.deaths++;
    player.hp = 0;

    // Trigger red screen damage flash
    const flashEl = document.getElementById('damage-flash');
    if (flashEl) {
      flashEl.classList.add('flash');
      setTimeout(() => flashEl.classList.remove('flash'), 300);
    }

    if (window.Audio) window.Audio.play('death');
    if (window.Haptics) window.Haptics.trigger('death');

    const dEl = document.getElementById('hud-deaths');
    if (dEl) dEl.textContent = player.deaths;

    setTimeout(() => {
      player.x = player.spawnX;
      player.y = player.spawnY;
      player.vx = 0;
      player.vy = 0;
      player.hp = player.maxHp;
      player.invulnerableTimer = 1.0; // 1s grace period on respawn
      player.state = 'IDLE';
      player.stateTime = 0;
      player.isDead = false;
      if (window.Game && window.Game.stickRenderer) {
        window.Game.stickRenderer.resetRibbons(player.x, player.y - 54, player.x, player.y - 28);
      }
    }, 400);
  }

  getPlayerBounds(player) {
    return {
      x: player.x - player.w / 2,
      y: player.y - player.h,
      w: player.w,
      h: player.h
    };
  }

  checkAABB(r1, r2) {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }
}

window.PhysicsEngine = PhysicsEngine;
