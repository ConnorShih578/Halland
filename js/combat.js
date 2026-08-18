/* =========================================================
   INTELLIGENT OPPONENT AI & COMBAT SYSTEM ("HOLLAND")
   Hand-eye coordination martial arts combat:
   - Telegraphed enemy attacks (Wind-up -> Strike)
   - Perfect Parry System (Block on impact = Stun counter)
   - Dynamic Enemy AI: Patrol, Chase, Strike, Stun, Trip
   - Full support for Holland's Punches, Sweeps, Slams, Zips
========================================================= */

class CombatSystem {
  constructor() {
    this.hitStopTimer = 0;
    this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    this.particles = [];
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  triggerHitStop(duration = 0.04) {
    this.hitStopTimer = duration;
  }

  triggerScreenShake(intensity = 6, duration = 0.18) {
    this.screenShake = {
      x: 0,
      y: 0,
      intensity: intensity,
      duration: duration
    };
  }

  update(dt, player, entities, level) {
    // 1. Update Hit-Stop Freeze Frame
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return true;
    }

    // 2. Update Screen Shake
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= dt;
      const factor = this.screenShake.duration / 0.15;
      this.screenShake.x = (Math.random() * 2 - 1) * this.screenShake.intensity * factor;
      this.screenShake.y = (Math.random() * 2 - 1) * this.screenShake.intensity * factor;
    } else {
      this.screenShake.x = 0;
      this.screenShake.y = 0;
    }

    // 3. Update Combo Window
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.updateComboHUD();
      }
    }

    // 4. Update Particle Effects
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += 0.35;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Update Intelligent Enemy AI State Machines & Combat Interactions
    this.updateOpponentAI(dt, player, entities, level);

    // 6. Check Player Attack Hitboxes against Enemies & Boards
    if (this.isAttackActive(player)) {
      const hitbox = this.getPlayerHitbox(player);
      this.checkPlayerAttack(player, hitbox, entities, level);
    }

    return false;
  }

  // -----------------------------------------------------------
  // FREEFLOW AUTO-TARGETING (CLOSE-QUARTERS & REVERSE AWARE)
  // -----------------------------------------------------------
  findBestTarget(player, action, entities, breakables) {
    let bestTarget = null;
    let closestDist = 180; // Natural close-quarters radius

    const searchX = player.x;
    const searchY = player.y - 30;

    // 1. Search Enemy Martial Artists (Checks both front and behind!)
    if (entities) {
      for (const ent of entities) {
        if (ent.isDead) continue;

        const targetCenterY = ent.y - ent.h / 2;
        const dx = ent.x - searchX;
        const dy = targetCenterY - searchY;
        const dist = Math.hypot(dx, dy);

        if (dist < closestDist) {
          closestDist = dist;
          const isBehind = (dx * player.facing) < -8; // Target is directly behind Holland
          bestTarget = { x: ent.x, y: targetCenterY, ent, type: 'entity', isBehind, dx, dy };
        }
      }
    }

    // 2. Search Breakable Wooden Boards
    if (!bestTarget && breakables) {
      for (const b of breakables) {
        if (b.broken) continue;
        const bx = b.x + b.w / 2;
        const by = b.y + b.h / 2;
        const dx = bx - searchX;
        const dy = by - searchY;
        const dist = Math.hypot(dx, dy);

        if (dist < closestDist) {
          closestDist = dist;
          const isBehind = (dx * player.facing) < -8;
          bestTarget = { x: bx, y: by, breakable: b, type: 'breakable', isBehind, dx, dy };
        }
      }
    }

    return bestTarget;
  }

  applyStrikeMagnetism(player, target, action) {
    if (!target) return;

    // Short close-quarters magnetic step (Keeps Holland from flying across the screen)
    const dist = Math.abs(target.dx);
    if (dist > 30 && dist < 120) {
      const stepDist = Math.min(dist * 0.18, 4.2);
      player.vx = Math.sign(target.dx) * stepDist;
    }
  }

  isAttackActive(player) {
    const attacks = [
      'JAB', 'SNAP_KICK', 'STRAIGHT_PUNCH', 'SLIDE_SWEEP', 'WEB_ZIP',
      'SPIN_BACKFIST', 'SPIN_HEEL_KICK', 'SPIN_SWEEP',
      'FLYING_TORNADO_KICK', 'DRAGON_UPPERCUT',
      'CANNONBALL', 'DIVING_PUNCH', 'BODY_SLAM'
    ];
    return attacks.includes(player.state);
  }

  getPlayerHitbox(player) {
    const { x, y, facing, state, h } = player;
    let hb = { x: x, y: y - h, w: 30, h: h, damage: 1, type: state };

    switch (state) {
      case 'JAB':
        hb = { x: x + (facing > 0 ? 8 : -42), y: y - 52, w: 34, h: 24, damage: 1, type: 'light' };
        break;
      case 'SNAP_KICK':
        hb = { x: x + (facing > 0 ? 8 : -46), y: y - 44, w: 38, h: 28, damage: 1, type: 'light' };
        break;
      case 'STRAIGHT_PUNCH':
        hb = { x: x + (facing > 0 ? 8 : -56), y: y - 50, w: 48, h: 32, damage: 2, type: 'heavy', smashWood: true };
        break;
      case 'SPIN_BACKFIST':
        // Hits opponent directly behind Holland!
        hb = { x: x + (facing > 0 ? -52 : 6), y: y - 50, w: 46, h: 30, damage: 2, type: 'heavy', smashWood: true };
        break;
      case 'SPIN_HEEL_KICK':
        // Spinning kick reaching behind Holland!
        hb = { x: x + (facing > 0 ? -56 : 6), y: y - 46, w: 50, h: 32, damage: 2, type: 'heavy', smashWood: true };
        break;
      case 'SPIN_SWEEP':
        // Sweeps both front and behind!
        hb = { x: x - 45, y: y - 24, w: 90, h: 24, damage: 2, type: 'sweep', smashWood: true };
        break;
      case 'FLYING_TORNADO_KICK':
        hb = { x: x + (facing > 0 ? 4 : -60), y: y - 58, w: 56, h: 42, damage: 3, type: 'heavy', smashWood: true };
        break;
      case 'DRAGON_UPPERCUT':
        hb = { x: x + (facing > 0 ? 8 : -52), y: y - 76, w: 44, h: 62, damage: 4, type: 'launch', smashWood: true };
        break;
      case 'SLIDE_SWEEP':
        hb = { x: x + (facing > 0 ? -4 : -46), y: y - 24, w: 52, h: 24, damage: 2, type: 'sweep', smashWood: true };
        break;
      case 'WEB_ZIP':
        hb = { x: x + (facing > 0 ? -4 : -32), y: y - 78, w: 36, h: 50, damage: 2, type: 'launch' };
        break;
      case 'CANNONBALL':
        hb = { x: x - 22, y: y - 48, w: 44, h: 44, damage: 2, type: 'cannonball', smashWood: true };
        break;
      case 'DIVING_PUNCH':
        hb = { x: x + (facing > 0 ? 4 : -50), y: y - 46, w: 48, h: 32, damage: 2, type: 'heavy', smashWood: true };
        break;
      case 'BODY_SLAM':
        hb = { x: x - 25, y: y - 45, w: 50, h: 45, damage: 3, type: 'slam', smashWood: true };
        break;
    }

    return hb;
  }

  // -----------------------------------------------------------
  // HARDCORE AGGRESSIVE OPPONENT AI
  // -----------------------------------------------------------
  updateOpponentAI(dt, player, entities, level) {
    if (!entities || player.isDead) return;

    for (const ent of entities) {
      if (ent.isDead) continue;

      // Initialize AI properties if not present
      if (!ent.aiState) {
        ent.aiState = 'PATROL';
        ent.aiTimer = Math.random() * 1.5;
        ent.facing = -1;
        ent.vx = 0;
        ent.vy = 0;
        ent.stunTimer = 0;
        ent.windupTimer = 0;
        ent.dodgeCooldown = 0;
      }

      if (ent.dodgeCooldown > 0) ent.dodgeCooldown -= dt;

      // 1. Handle Stun / Hit Recovery
      if (ent.stunTimer > 0) {
        ent.stunTimer -= dt;
        ent.aiState = 'STUNNED';
        continue;
      }

      const dx = player.x - ent.x;
      const dy = player.y - ent.y;
      const dist = Math.hypot(dx, dy);

      // Face the player when engaged
      if (dist < 320) {
        ent.facing = dx > 0 ? 1 : -1;
      }

      // 2. Tactical Dodge Reaction: If player strikes nearby, agile bots can backstep!
      if (this.isAttackActive(player) && dist < 75 && ent.dodgeCooldown <= 0 && ent.aiState === 'CHASE') {
        if (Math.random() < (ent.type === 'ninja' ? 0.45 : 0.28)) {
          ent.aiState = 'DODGE';
          ent.dodgeTimer = 0.20;
          ent.dodgeCooldown = 2.0;
          ent.vx = -ent.facing * 8.5; // Rapid evasive backstep
          continue;
        }
      }

      // 3. AI State Machine
      switch (ent.aiState) {
        case 'PATROL':
        case 'STUNNED': {
          if (dist < 280 && Math.abs(dy) < 90) {
            ent.aiState = 'CHASE';
          } else {
            // Aggressive patrol
            ent.aiTimer -= dt;
            if (ent.aiTimer <= 0) {
              ent.facing = -ent.facing;
              ent.aiTimer = 1.2 + Math.random() * 1.5;
            }
            ent.vx = ent.facing * 2.2;
          }
          break;
        }

        case 'DODGE': {
          ent.dodgeTimer -= dt;
          if (ent.dodgeTimer <= 0) {
            // Immediately counter-attack out of dodge!
            ent.aiState = 'WINDUP';
            ent.windupTimer = 0.16;
            ent.vx = 0;
          }
          break;
        }

        case 'CHASE': {
          const attackRange = ent.type === 'boss' ? 70 : ent.type === 'ninja' ? 60 : 52;

          if (dist > 400 || Math.abs(dy) > 140) {
            ent.aiState = 'PATROL';
            ent.vx = 0;
          } else if (dist <= 30 && Math.abs(dy) < 45 && !player.isDead && player.invulnerableTimer <= 0) {
            // Immediate close-quarters strike!
            if (player.state === 'BLOCK' || player.state === 'AIR_BLOCK') {
              this.triggerPerfectParry(player, ent);
            } else {
              this.damagePlayer(player, ent);
            }
          } else if (dist <= attackRange) {
            // Fast telegraphed windup for lethal strike
            ent.aiState = 'WINDUP';
            ent.windupTimer = ent.type === 'ninja' ? 0.12 : ent.type === 'boss' ? 0.16 : 0.18;
            ent.vx = 0;
          } else {
            // High speed pursuit
            const speed = ent.type === 'ninja' ? 5.5 : ent.type === 'boss' ? 5.0 : ent.type === 'kicker' ? 4.4 : 3.8;
            ent.vx = ent.facing * speed;

            // Leap lunge if player is slightly elevated
            if (dy < -20 && dist < 140 && Math.random() < 0.08) {
              ent.vy = -7.5;
            }
          }
          break;
        }

        case 'WINDUP': {
          ent.windupTimer -= dt;
          ent.vx = 0;

          // Windup complete -> Execute Strike!
          if (ent.windupTimer <= 0) {
            ent.aiState = 'ATTACK';
            ent.attackTimer = 0.22;
            const lungeSpeed = ent.type === 'kicker' ? 10.0 : ent.type === 'boss' ? 9.2 : 8.0;
            ent.vx = ent.facing * lungeSpeed;

            if (window.Audio) window.Audio.play('kick');
          }
          break;
        }

        case 'ATTACK': {
          ent.attackTimer -= dt;

          // Check if enemy attack connects with player
          const entHitbox = {
            x: ent.x + (ent.facing > 0 ? -10 : -55),
            y: ent.y - ent.h,
            w: 65,
            h: ent.h
          };

          const playerBounds = {
            x: player.x - player.w / 2,
            y: player.y - player.h,
            w: player.w,
            h: player.h
          };

          if (this.rectsOverlap(entHitbox, playerBounds)) {
            // Check if player is blocking -> PERFECT PARRY!
            if (player.state === 'BLOCK' || player.state === 'AIR_BLOCK') {
              this.triggerPerfectParry(player, ent);
            } else if (!player.isDead && player.invulnerableTimer <= 0) {
              // Enemy hits player!
              this.damagePlayer(player, ent);
            }
          }

          if (ent.attackTimer <= 0) {
            ent.aiState = 'CHASE';
          }
          break;
        }
      }
    }
  }

  triggerPerfectParry(player, ent) {
    // Stun the enemy for 1.4s
    ent.stunTimer = 1.4;
    ent.aiState = 'STUNNED';
    ent.vx = -ent.facing * 5;

    this.hitStopTimer = 0.10;
    this.screenShake = { x: 0, y: 0, intensity: 8, duration: 0.20 };

    if (window.Audio) window.Audio.play('wallKick');
    if (window.Haptics) window.Haptics.trigger('parry');

    this.announceAction('⚡ PERFECT PARRY! ENEMY STUNNED! (2x CRIT)');
    this.spawnImpactParticles(ent.x, ent.y - 30, 'parry', 3);
  }

  damagePlayer(player, ent) {
    if (player.isDead || player.invulnerableTimer > 0) return;

    // Calculate damage based on enemy threat level
    const dmg = ent.isGiantLeBrown ? 30 : ent.type === 'boss' ? 25 : ent.type === 'ninja' ? 18 : 14;
    player.hp = Math.max(0, player.hp - dmg);
    player.invulnerableTimer = 0.50; // Invulnerability window

    // Red damage vignette screen flash
    const flashEl = document.getElementById('damage-flash');
    if (flashEl) {
      flashEl.classList.add('flash');
      setTimeout(() => flashEl.classList.remove('flash'), 180);
    }

    // Knock player back with impact
    player.vx = ent.facing * 9.0;
    player.vy = -6.5;
    player.isGrounded = false;

    if (window.Audio) window.Audio.play('hit');
    if (window.Haptics) window.Haptics.trigger('hit');

    this.screenShake = { x: 0, y: 0, intensity: 8, duration: 0.22 };
    this.announceAction(`⚠️ HIT BY ${ent.name.toUpperCase()}! (-${dmg} HP)`);

    // Check if player's HP reached 0
    if (player.hp <= 0 && window.Game && window.Game.physics) {
      window.Game.physics.killPlayer(player, `Defeated by ${ent.name}`);
    }
  }

  getEntityBounds(ent) {
    return {
      x: ent.x - ent.w / 2 - 10, // Generous horizontal hit zone
      y: ent.y - ent.h - 10,     // Top of head to feet
      w: ent.w + 20,
      h: ent.h + 15
    };
  }

  checkPlayerAttack(player, hb, entities, level) {
    // 1. Breakable Wooden Boards
    if (level && level.breakables) {
      for (const b of level.breakables) {
        if (!b.broken && this.rectsOverlap(hb, b)) {
          b.broken = true;
          this.triggerHitImpact(b.x + b.w / 2, b.y + b.h / 2, 'wood', hb.damage);
          this.announceAction(hb.type === 'sweep' ? 'SWEEP SHATTER!' : hb.type === 'slam' ? 'BODY SLAM CRUSH!' : 'BOARD SHATTER!');
        }
      }
    }

    // 2. Enemy Martial Artists
    if (entities) {
      for (const ent of entities) {
        if (!ent.isDead && ent.isTarget) {
          const entBounds = this.getEntityBounds(ent);
          if (this.rectsOverlap(hb, entBounds)) {
            // Prevent duplicate multi-hits within the same strike
            if (ent.lastHitState !== player.state + '_' + player.comboStep) {
              ent.lastHitState = player.state + '_' + player.comboStep;
              this.applyHitToEntity(player, hb, ent);
            }
          }
        }
      }
    }
  }

  applyHitToEntity(player, hb, ent) {
    const damage = (hb.damage || 1) * (ent.aiState === 'STUNNED' ? 2 : 1);
    ent.hp = Math.max(0, ent.hp - damage);
    ent.hitTimer = 0.35; // Red/White hit flash duration

    const facing = player.facing;
    if (hb.type === 'launch' || hb.type === 'WEB_ZIP') {
      ent.vx = facing * 4.5;
      ent.vy = -12.5;
      ent.stunTimer = 0.8;
      this.announceAction('WEB LAUNCH!');
    } else if (hb.type === 'slam' || hb.type === 'BODY_SLAM') {
      ent.vx = facing * 2.5;
      ent.vy = 9.5;
      ent.stunTimer = 1.0;
      this.announceAction('BODY SLAM CRUSH!');
    } else if (hb.type === 'sweep' || hb.type === 'SPIN_SWEEP') {
      ent.vx = (hb.type === 'SPIN_SWEEP' ? -facing : facing) * 9.5;
      ent.vy = -4.0;
      ent.stunTimer = 1.2;
      this.announceAction('SWEEP TRIP!');
    } else if (hb.type === 'SPIN_BACKFIST' || hb.type === 'SPIN_HEEL_KICK') {
      ent.vx = -facing * 10.5; // Knocks opponent behind Holland backwards!
      ent.vy = -5.0;
      ent.stunTimer = 0.6;
      this.announceAction('SPINNING STRIKE!');
    } else {
      ent.vx = facing * 9.5;
      ent.vy = -4.5;
      ent.stunTimer = 0.5;
      this.announceAction(hb.type === 'cannonball' ? 'CANNONBALL STRIKE!' : 'SOLID STRIKE!');
    }

    if (ent.hp <= 0) {
      ent.isDead = true;
      this.announceAction(ent.name.toUpperCase() + ' DEFEATED!');
    }

    this.triggerHitImpact(ent.x, ent.y - ent.h / 2, 'flesh', damage);
  }

  triggerHitImpact(x, y, material, damage) {
    this.hitStopTimer = damage >= 2 ? 0.045 : 0.03;

    this.screenShake = {
      x: 0, y: 0,
      intensity: damage >= 2 ? 6 : 3,
      duration: damage >= 2 ? 0.16 : 0.1
    };

    if (material === 'wood') {
      if (window.Audio) window.Audio.play('boardBreak');
      if (window.Haptics) window.Haptics.trigger('boardBreak');
    } else {
      if (window.Audio) window.Audio.play(damage >= 2 ? 'heavyHit' : 'hit');
      if (window.Haptics) window.Haptics.trigger(damage >= 2 ? 'heavyHit' : 'hit');
    }
     this.comboCount++;
    this.comboTimer = 3.0;
    this.updateComboHUD();

    this.spawnImpactParticles(x, y, material, damage);

    // Floating combat text popup
    const popupText = damage >= 4 ? '🔥 DRAGON CRIT!' : damage >= 3 ? '⚡ TORNADO HIT!' : damage >= 2 ? '💥 CRIT 2x!' : `+${damage * 10}`;
    const popupColor = damage >= 3 ? '#f59e0b' : damage >= 2 ? '#38bdf8' : '#ffffff';
    this.particles.push({
      x: x + (Math.random() * 20 - 10),
      y: y - 15,
      vx: (Math.random() * 2 - 1) * 0.8,
      vy: -2.8,
      isText: true,
      text: popupText,
      color: popupColor,
      size: damage >= 3 ? 14 : 11,
      life: 0.65,
      maxLife: 0.65
    });
  }

  spawnImpactParticles(x, y, material, damage) {
    const count = damage >= 3 ? 22 : damage >= 2 ? 14 : 8;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 3;
      const col = material === 'wood' ? '#f59e0b' : material === 'parry' ? '#38bdf8' : damage >= 3 ? '#fbbf24' : '#ef4444';
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        color: col,
        size: Math.random() * 3.5 + 2,
        life: 0.40 + Math.random() * 0.2,
        maxLife: 0.6
      });
    }

    // Expanding shockwave impact ring
    this.particles.push({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      isRing: true,
      radius: 4,
      maxRadius: damage >= 3 ? 50 : 35,
      color: material === 'parry' ? '#38bdf8' : damage >= 3 ? '#f59e0b' : '#ffffff',
      life: 0.22,
      maxLife: 0.22
    });

    // Starburst cross flares
    this.particles.push({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      isStarburst: true,
      size: damage >= 3 ? 28 : 18,
      color: '#ffffff',
      life: 0.15,
      maxLife: 0.15
    });
  }

  draw(ctx) {
    // Render juicy combat particles, shockwave rings, and floating text
    for (const p of this.particles) {
      const tNorm = Math.max(0, p.life / (p.maxLife || 0.4));

      if (p.isText) {
        ctx.save();
        ctx.font = `900 ${p.size}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = Math.min(1, tNorm * 1.5);
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      } else if (p.isRing) {
        p.radius += 140 * 0.016;
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5 * tNorm;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = tNorm;
        ctx.stroke();
        ctx.restore();
      } else if (p.isStarburst) {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.2 * tNorm;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.globalAlpha = tNorm;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y);
        ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s, p.y);
        ctx.moveTo(p.x - s * 0.7, p.y - s * 0.7); ctx.lineTo(p.x + s * 0.7, p.y + s * 0.7);
        ctx.moveTo(p.x - s * 0.7, p.y + s * 0.7); ctx.lineTo(p.x + s * 0.7, p.y - s * 0.7);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = tNorm;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * tNorm, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  updateComboHUD() {
    const el = document.getElementById('combo-display');
    if (!el) return;
    if (this.comboCount > 1) {
      el.textContent = `${this.comboCount}x COMBO!`;
      el.classList.add('show');
    } else {
      el.classList.remove('show');
    }
  }

  announceAction(text) {
    const el = document.getElementById('action-announcement');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._annTimeout);
    this._annTimeout = setTimeout(() => {
      el.classList.remove('show');
    }, 900);
  }

  rectsOverlap(r1, r2) {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }

  drawParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      if (p.isRing) {
        const progress = 1.0 - (p.life / p.maxLife);
        const r = p.radius + (p.maxRadius - p.radius) * progress;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

window.CombatSystem = CombatSystem;
