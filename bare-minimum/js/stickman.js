/* =========================================================
   STICKMAN PROCEDURAL KINEMATICS & SPIN ANIMATIONS ("HOLLAND")
   - Dedicated Reverse Moves: Spinning Backfist, Reverse Heel Kick,
     360° Spin Sweep, Reverse Over-Shoulder Web Zip
   - True 2-Bone Analytic Inverse Kinematics
   - Smooth Harmonic Spring Interpolation
   - Cubic Bézier Ribbon Physics
========================================================= */

class StickmanRenderer {
  constructor() {
    this.thighLen = 14;
    this.shinLen = 14;
    this.upperArmLen = 12;
    this.forearmLen = 11;
    this.headRadius = 8.5;

    this.spine = {
      hips: { x: 0, y: -26, vx: 0, vy: 0 },
      chest: { x: 2, y: -38, vx: 0, vy: 0 },
      neck: { x: 5, y: -45, vx: 0, vy: 0 },
      head: { x: 8, y: -53, vx: 0, vy: 0 }
    };

    this.effectors = {
      leftFoot: { x: -6, y: 0, vx: 0, vy: 0 },
      rightFoot: { x: 6, y: 0, vx: 0, vy: 0 },
      leftHand: { x: -8, y: -36, vx: 0, vy: 0 },
      rightHand: { x: 14, y: -36, vx: 0, vy: 0 }
    };

    this.rotation = 0;
    this.spinProgress = 0;

    this.hair = Array.from({ length: 6 }, () => ({ x: 0, y: 0, oldX: 0, oldY: 0 }));
    this.belt = Array.from({ length: 5 }, () => ({ x: 0, y: 0, oldX: 0, oldY: 0 }));
    this.ghostTrails = [];
    this.landingSquash = 0;
    this.initializedRibbons = false;
  }

  solveIK(root, target, l1, l2, bendDirection = 1) {
    const rx = Number.isFinite(root.x) ? root.x : 0;
    const ry = Number.isFinite(root.y) ? root.y : 0;
    const tx = Number.isFinite(target.x) ? target.x : rx + 10;
    const ty = Number.isFinite(target.y) ? target.y : ry + 10;

    const dx = tx - rx;
    const dy = ty - ry;
    const dist = Math.hypot(dx, dy) || 0.001;

    const maxReach = l1 + l2 - 0.01;
    const minReach = Math.abs(l1 - l2) + 0.01;
    const clampedDist = Math.max(minReach, Math.min(dist, maxReach));

    const cosAngle1 = (l1 * l1 + clampedDist * clampedDist - l2 * l2) / (2 * l1 * clampedDist);
    const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)));

    const baseAngle = Math.atan2(dy, dx);
    const jointAngle = baseAngle + angle1 * (bendDirection || 1);

    const joint = {
      x: rx + Math.cos(jointAngle) * l1,
      y: ry + Math.sin(jointAngle) * l1
    };

    return { root: { x: rx, y: ry }, joint, end: { x: tx, y: ty } };
  }

  springDamper(current, target, k = 620, d = 42, dt = 0.016) {
    if (!Number.isFinite(current.x)) current.x = 0;
    if (!Number.isFinite(current.y)) current.y = 0;
    if (!Number.isFinite(current.vx)) current.vx = 0;
    if (!Number.isFinite(current.vy)) current.vy = 0;

    const tx = Number.isFinite(target.x) ? target.x : current.x;
    const ty = Number.isFinite(target.y) ? target.y : current.y;

    const fx = (tx - current.x) * k - current.vx * d;
    const fy = (ty - current.y) * k - current.vy * d;
    current.vx += fx * dt;
    current.vy += fy * dt;
    current.x += current.vx * dt;
    current.y += current.vy * dt;
  }

  resetRibbons(headX, headY, hipX, hipY) {
    for (let i = 0; i < this.hair.length; i++) {
      this.hair[i].x = headX - i * 5;
      this.hair[i].y = headY - 2 + i * 1.5;
      this.hair[i].oldX = this.hair[i].x;
      this.hair[i].oldY = this.hair[i].y;
    }
    for (let i = 0; i < this.belt.length; i++) {
      this.belt[i].x = hipX - i * 4;
      this.belt[i].y = hipY + i * 2.5;
      this.belt[i].oldX = this.belt[i].x;
      this.belt[i].oldY = this.belt[i].y;
    }
    this.initializedRibbons = true;
  }

  updateRibbons(headX, headY, hipX, hipY, facing, vx, vy) {
    if (!this.initializedRibbons) {
      this.resetRibbons(headX, headY, hipX, hipY);
      return;
    }

    const windX = -vx * 0.45 - facing * 3.5;
    const windY = -vy * 0.2 + 0.8;

    this.hair[0].x = headX - facing * 5;
    this.hair[0].y = headY - 4;

    for (let i = 1; i < this.hair.length; i++) {
      const p = this.hair[i];
      const prev = this.hair[i - 1];

      const curVx = (p.x - p.oldX) * 0.84;
      const curVy = (p.y - p.oldY) * 0.84;

      p.oldX = p.x;
      p.oldY = p.y;

      p.x += curVx + windX * 0.55;
      p.y += curVy + windY;

      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      const targetDist = 5.2;
      p.x = prev.x + (dx / d) * targetDist;
      p.y = prev.y + (dy / d) * targetDist;
    }

    this.belt[0].x = hipX - facing * 3;
    this.belt[0].y = hipY;

    for (let i = 1; i < this.belt.length; i++) {
      const p = this.belt[i];
      const prev = this.belt[i - 1];

      const curVx = (p.x - p.oldX) * 0.84;
      const curVy = (p.y - p.oldY) * 0.84;

      p.oldX = p.x;
      p.oldY = p.y;

      p.x += curVx + windX * 0.35;
      p.y += curVy + 1.2;

      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const d = Math.hypot(dx, dy) || 1;
      const targetDist = 5.0;
      p.x = prev.x + (dx / d) * targetDist;
      p.y = prev.y + (dy / d) * targetDist;
    }
  }

  computeDynamicPose(player, dt) {
    const { state, stateTime, stateDuration, facing, vx, vy, isGrounded, wallDir } = player;
    const dur = stateDuration || 0.2;
    const t = Math.min(stateTime / dur, 1.0);

    const speedRatio = Math.min(Math.abs(vx) / 6.6, 1.0);
    const momentumLean = facing * speedRatio * 8 + (vx * 1.3);
    const verticalSquash = Math.max(-5, Math.min(7, -vy * 0.45));

    const targetSpine = {
      hips: { x: momentumLean * 0.3, y: -26 + (isGrounded ? 0 : verticalSquash * 0.2) },
      chest: { x: facing * 3 + momentumLean * 0.6, y: -38 + verticalSquash * 0.4 },
      neck: { x: facing * 6 + momentumLean * 0.85, y: -45 + verticalSquash * 0.6 },
      head: { x: facing * 9 + momentumLean * 1.0, y: -53 + verticalSquash * 0.8 }
    };

    let targetLeftFoot = { x: -6, y: 0 };
    let targetRightFoot = { x: 6, y: 0 };
    let targetLeftHand = { x: -8, y: -36 };
    let targetRightHand = { x: 12, y: -36 };
    let targetRotation = 0;
    let isCannonball = false;

    switch (state) {
      case 'IDLE': {
        const bounce = Math.sin(stateTime * 6.0) * 2.2;
        const breath = Math.cos(stateTime * 3.0) * 1.2;

        targetSpine.hips.y += bounce * 0.6;
        targetSpine.chest.y += bounce * 0.8 + breath;
        targetSpine.neck.y += bounce + breath;
        targetSpine.head.y += bounce * 1.1 + breath;

        targetLeftFoot = { x: -facing * (6 + breath * 0.5), y: 0 };
        targetRightFoot = { x: facing * (6 - breath * 0.5), y: 0 };

        targetRightHand = { x: facing * (14 + Math.sin(stateTime * 4) * 1.5), y: -38 + bounce };
        targetLeftHand = { x: facing * (4 + Math.cos(stateTime * 4) * 1.5), y: -42 + bounce };
        break;
      }

      case 'RUN': {
        const runCycle = stateTime * 17.5;
        const phase1 = runCycle;
        const phase2 = runCycle + Math.PI;

        const foot1X = Math.cos(phase1) * 16;
        const foot1Y = Math.sin(phase1) > 0 ? -Math.sin(phase1) * 13 : 0;

        const foot2X = Math.cos(phase2) * 16;
        const foot2Y = Math.sin(phase2) > 0 ? -Math.sin(phase2) * 13 : 0;

        targetLeftFoot = { x: foot1X, y: foot1Y };
        targetRightFoot = { x: foot2X, y: foot2Y };

        const armSw = Math.cos(runCycle);
        targetRightHand = { x: facing * (8 + armSw * 16), y: -34 - armSw * 8 };
        targetLeftHand = { x: facing * (8 - armSw * 16), y: -34 + armSw * 8 };

        targetSpine.hips.y += Math.abs(Math.sin(runCycle)) * 2.6;
        break;
      }

      case 'CROUCH': {
        targetSpine.hips.y = -14;
        targetSpine.chest.y = -22;
        targetSpine.neck.y = -28;
        targetSpine.head.y = -35;
        targetSpine.head.x = facing * 10;

        targetLeftFoot = { x: -facing * 8, y: 0 };
        targetRightFoot = { x: facing * 12, y: 0 };
        targetRightHand = { x: facing * 12, y: -16 };
        targetLeftHand = { x: facing * 4, y: -18 };
        break;
      }

      case 'JUMP': {
        const fallTuck = Math.min(Math.abs(vy) * 0.4, 6);
        targetSpine.hips.y = -28;
        targetLeftFoot = { x: -facing * 8, y: -8 + fallTuck };
        targetRightFoot = { x: facing * 5, y: -4 + fallTuck };
        targetRightHand = { x: facing * 12, y: -48 };
        targetLeftHand = { x: -facing * 8, y: -42 };
        break;
      }

      case 'WALL_SLIDE': {
        const wallSide = wallDir;
        targetSpine.head.x = -wallSide * 4;
        targetRightHand = { x: wallSide * 15, y: -38 };
        targetLeftHand = { x: -wallSide * 4, y: -36 };
        targetRightFoot = { x: wallSide * 13, y: -4 };
        targetLeftFoot = { x: -wallSide * 6, y: 0 };
        break;
      }

      // --- STANDARD FORWARD ATTACKS ---
      case 'JAB': {
        let reach;
        if (t < 0.2) reach = -t * 15;
        else if (t < 0.6) reach = ((t - 0.2) / 0.4) * 28;
        else reach = 28 * (1 - (t - 0.6) / 0.4);

        const aimY = (player.targetAimAngle || 0) * 12;
        targetSpine.head.x += facing * 6;
        targetSpine.chest.x += facing * 4;
        targetRightHand = { x: facing * (14 + reach + speedRatio * 8), y: -42 + aimY };
        targetLeftHand = { x: facing * 3, y: -38 };
        break;
      }

      case 'SNAP_KICK': {
        const kickT = Math.sin(t * Math.PI);
        const ext = kickT * 32;
        const aimY = (player.targetAimAngle || 0) * 14;

        targetSpine.head.x -= facing * 4;
        targetSpine.chest.x -= facing * 2;
        targetRightFoot = { x: facing * (14 + ext + speedRatio * 6), y: -28 - kickT * 4 + aimY };
        targetLeftFoot = { x: -facing * 6, y: 0 };
        targetRightHand = { x: -facing * 8, y: -34 };
        targetLeftHand = { x: facing * 8, y: -44 };
        break;
      }

      case 'STRAIGHT_PUNCH': {
        const punchCurve = Math.sin(t * Math.PI);
        const reach = punchCurve * 36;
        const aimY = (player.targetAimAngle || 0) * 16;

        targetSpine.head.x += facing * (14 + speedRatio * 8);
        targetSpine.neck.x += facing * 11;
        targetSpine.chest.x += facing * 8;
        targetSpine.hips.x += facing * 4;

        targetRightHand = { x: facing * (16 + reach), y: -38 + aimY };
        targetLeftHand = { x: -facing * 9, y: -38 };
        targetLeftFoot = { x: -facing * 15, y: 0 };
        targetRightFoot = { x: facing * 11, y: 0 };
        break;
      }

      case 'SLIDE_SWEEP': {
        targetSpine.hips.y = -10;
        targetSpine.chest.y = -16;
        targetSpine.neck.y = -21;
        targetSpine.head.y = -26;
        targetSpine.head.x = -facing * 6;

        targetRightFoot = { x: facing * 34, y: 0 };
        targetLeftFoot = { x: -facing * 10, y: -2 };
        targetRightHand = { x: facing * 12, y: -16 };
        targetLeftHand = { x: -facing * 10, y: -10 };
        break;
      }

      // =========================================================
      // DEDICATED REVERSE / SPINNING ATTACKS (FOR TARGETS BEHIND)
      // =========================================================
      case 'SPIN_BACKFIST': {
        // 180° Torso rotation delivering a crisp spinning backfist behind Holland
        const spinT = Math.sin(t * Math.PI);
        const reachBehind = spinT * 34;

        targetSpine.head.x = -facing * 8; // Head glances over shoulder
        targetSpine.neck.x = -facing * 6;
        targetSpine.chest.x = -facing * 4;
        targetSpine.hips.x = 0;

        // Left arm whips around in a 180° backfist strike
        targetLeftHand = { x: -facing * (12 + reachBehind), y: -40 };
        targetRightHand = { x: facing * 6, y: -36 }; // Guarding front
        targetRightFoot = { x: facing * 4, y: 0 };
        targetLeftFoot = { x: -facing * 12, y: 0 };
        break;
      }

      case 'SPIN_HEEL_KICK': {
        // Full 360° spinning heel kick extending behind Holland
        const kickT = Math.sin(t * Math.PI);
        const extBehind = kickT * 36;

        targetSpine.head.x = -facing * 6;
        targetSpine.chest.x = -facing * 4;
        targetSpine.hips.x = 0;

        // Right leg spins around to strike the opponent behind
        targetRightFoot = { x: -facing * (14 + extBehind), y: -34 };
        targetLeftFoot = { x: facing * 8, y: 0 }; // Ground pivot
        targetRightHand = { x: facing * 8, y: -36 };
        targetLeftHand = { x: -facing * 6, y: -44 };
        break;
      }

      case 'SPIN_SWEEP': {
        // 360° low spinning helicopter leg sweep
        targetSpine.hips.y = -10;
        targetSpine.chest.y = -16;
        targetSpine.head.y = -26;

        targetRightFoot = { x: -facing * 34, y: 0 }; // Sweeps behind!
        targetLeftFoot = { x: facing * 10, y: -2 };
        targetRightHand = { x: -facing * 12, y: -16 };
        targetLeftHand = { x: facing * 10, y: -10 };
        break;
      }

      case 'FLYING_TORNADO_KICK': {
        // Acrobatic mid-air 360° spinning tornado kick
        const spin = Math.sin(t * Math.PI);
        targetSpine.head.y = -58 - spin * 8;
        targetSpine.chest.y = -44 - spin * 6;
        targetSpine.hips.y = -32 - spin * 4;

        targetRightFoot = { x: facing * (16 + spin * 26), y: -48 };
        targetLeftFoot = { x: -facing * 14, y: -18 };
        targetLeftHand = { x: -facing * 16, y: -40 };
        targetRightHand = { x: facing * 12, y: -30 };
        break;
      }

      case 'DRAGON_UPPERCUT': {
        // Blazing Ascending Dragon Uppercut
        const rise = Math.sin(t * Math.PI);
        targetSpine.head.y = -62 - rise * 14;
        targetSpine.chest.y = -48 - rise * 10;
        targetSpine.hips.y = -32 - rise * 6;

        targetRightHand = { x: facing * 18, y: -72 - rise * 18 }; // Skyward fist
        targetLeftHand = { x: -facing * 10, y: -36 };
        targetLeftFoot = { x: -facing * 8, y: -10 };
        targetRightFoot = { x: facing * 6, y: -18 };
        break;
      }

      case 'WEB_ZIP': {
        const rise = Math.sin(t * Math.PI);
        targetSpine.head.y = -56 - rise * 6;
        targetRightHand = { x: facing * 3, y: -74 - rise * 12 };
        targetLeftHand = { x: -facing * 8, y: -36 };
        targetLeftFoot = { x: -facing * 4, y: -6 };
        targetRightFoot = { x: facing * 4, y: -10 };
        break;
      }

      case 'BACKSTEP': {
        targetSpine.head.x = -facing * 10;
        targetSpine.hips.x = -facing * 8;
        targetRightFoot = { x: -facing * 4, y: -4 };
        targetLeftFoot = { x: -facing * 16, y: 0 };
        break;
      }

      case 'BLOCK':
      case 'AIR_BLOCK': {
        targetSpine.head.x = facing * 2;
        targetRightHand = { x: facing * 10, y: -46 };
        targetLeftHand = { x: facing * 8, y: -40 };
        break;
      }

      case 'CANNONBALL': {
        isCannonball = true;
        targetRotation = stateTime * 24 * facing;
        break;
      }

      case 'DIVING_PUNCH': {
        targetSpine.hips.y = -24;
        targetSpine.chest.x = facing * 18;
        targetSpine.head.x = facing * 28;
        targetSpine.head.y = -30;

        targetRightHand = { x: facing * 44, y: -28 };
        targetLeftHand = { x: facing * 10, y: -32 };
        targetLeftFoot = { x: -facing * 24, y: -20 };
        targetRightFoot = { x: -facing * 18, y: -22 };
        break;
      }

      case 'EMOTE': {
        const charId = (player.characterId || 'halland').toLowerCase();

        if (charId === 'ronalds') {
          // Chris Ronalds: Jump-Spin SUI Celebration!
          // Phase 1 (t < 0.40): Leaping high into the air and spinning 360°
          // Phase 2 (t >= 0.40): Power Stomp Landing, Arms thrust back at tight 45° (natural length!), chest puffed out!
          if (t < 0.40) {
            const jumpPhase = t / 0.40;
            const jumpHeight = Math.sin(jumpPhase * Math.PI) * 36; // 36px high mid-air leap!
            targetRotation = jumpPhase * Math.PI * 2 * facing; // Full 360 spin in air!
            targetSpine.head.y = -54 - jumpHeight;
            targetSpine.chest.y = -38 - jumpHeight;
            targetSpine.hips.y = -26 - jumpHeight;
            // Tuck knees up in mid-air
            targetLeftFoot = { x: -6, y: -16 - jumpHeight };
            targetRightFoot = { x: 6, y: -16 - jumpHeight };
            targetLeftHand = { x: -facing * 12, y: -34 - jumpHeight };
            targetRightHand = { x: facing * 12, y: -34 - jumpHeight };
          } else {
            // Landed Ground SUI Stance: Wide stomp, elbows tight, arms thrust back naturally (proportional length!)
            targetRotation = 0;
            targetSpine.head.x = facing * 4;
            targetSpine.head.y = -54; // Head held high
            targetSpine.chest.x = facing * 6; // Chest puffed out
            targetSpine.chest.y = -38;
            targetSpine.hips.y = -22; // Solid squat stance
            // Wide power stance feet
            targetLeftFoot = { x: -14, y: 0 };
            targetRightFoot = { x: 14, y: 0 };
            // Hands thrust back & down at 45° with natural arm reach (no hyper-extended arms)
            targetRightHand = { x: facing * 13, y: -18 };
            targetLeftHand = { x: -facing * 13, y: -18 };
          }
        } else if (charId === 'lebrown') {
          // King LeBrown: The Silencer Celebration
          // Phase 1 (0.00 - 0.36): High Left Knee Stomp in PERFECT sync with both hands pushing down
          // Phase 2 (0.36 - 0.72): High Right Knee Stomp in PERFECT sync with both hands pushing down
          // Phase 3 (0.72 - 1.00): Double Chest Thump & Crown point!
          if (t < 0.36) {
            const p = t / 0.36;
            const stompDown = Math.sin(p * Math.PI);
            targetSpine.head.y = -54;
            targetSpine.chest.y = -38;
            targetSpine.hips.y = -24 + stompDown * 3;
            targetLeftFoot = { x: -10, y: -(1 - stompDown) * 16 }; // Left knee lifts high then stomps down
            targetRightFoot = { x: 10, y: 0 };
            // Both hands push down in EXACT cadence with stomp
            const handY = -34 + stompDown * 14;
            targetLeftHand = { x: -facing * 8, y: handY };
            targetRightHand = { x: facing * 8, y: handY };
          } else if (t < 0.72) {
            const p = (t - 0.36) / 0.36;
            const stompDown = Math.sin(p * Math.PI);
            targetSpine.head.y = -54;
            targetSpine.chest.y = -38;
            targetSpine.hips.y = -24 + stompDown * 3;
            targetRightFoot = { x: 10, y: -(1 - stompDown) * 16 }; // Right knee lifts high then stomps down
            targetLeftFoot = { x: -10, y: 0 };
            // Both hands push down in EXACT cadence with stomp
            const handY = -34 + stompDown * 14;
            targetLeftHand = { x: -facing * 8, y: handY };
            targetRightHand = { x: facing * 8, y: handY };
          } else {
            // Chest Thump with Right Fist & Standing Tall
            targetSpine.head.y = -56;
            targetSpine.chest.y = -40;
            targetSpine.hips.y = -26;
            targetLeftFoot = { x: -8, y: 0 };
            targetRightFoot = { x: 8, y: 0 };
            targetRightHand = { x: facing * 3, y: -40 }; // Right fist pounding chest
            targetLeftHand = { x: -facing * 10, y: -24 }; // Left hand resting on hip
          }
        } else if (charId === 'mcbape') {
          // Kylian McBape: Commander Military Salute -> Iconic Armpit Fold Stand
          if (t < 0.42) {
            // Crisp Military Salute at Attention (Hand placed on front cap visor, NEVER behind head!)
            targetSpine.head.y = -54;
            targetSpine.neck.y = -46;
            targetSpine.chest.y = -38;
            targetSpine.hips.y = -26;
            targetRightHand = { x: facing * 9, y: -52 }; // Crisp salute at front brim of peaked cap
            targetLeftHand = { x: -facing * 6, y: -20 }; // Firmly aligned with trouser seam
            targetLeftFoot = { x: -4, y: 0 };
            targetRightFoot = { x: 4, y: 0 };
          } else {
            // Signature Cross-Armed Fold (Hands neatly tucked in front of chest)
            targetSpine.head.y = -52;
            targetSpine.chest.y = -36;
            targetRightHand = { x: -facing * 4, y: -34 }; // Folded across front
            targetLeftHand = { x: facing * 4, y: -32 };
            targetLeftFoot = { x: -8, y: 0 };
            targetRightFoot = { x: 8, y: 0 };
          }
        } else if (charId === 'jordunn') {
          // Michael Jordunn: Tongue Out Wag & #1 Finger Point -> The Shrug
          if (t < 0.55) {
            targetSpine.head.x = facing * 8;
            targetSpine.head.y = -48; // Head tilted back
            targetRightHand = { x: facing * 12, y: -54 }; // Pointing #1 index finger in the sky
            targetLeftHand = { x: -facing * 8, y: -24 }; // Left hand on hip
            targetLeftFoot = { x: -8, y: 0 };
            targetRightFoot = { x: 8, y: 0 };
          } else {
            // The Shrug (Palms open at chest level, head tilted)
            targetSpine.head.x = -facing * 4;
            targetSpine.head.y = -50;
            targetRightHand = { x: facing * 12, y: -30 }; // Palm open shrug
            targetLeftHand = { x: -facing * 12, y: -30 };
            targetLeftFoot = { x: -10, y: 0 };
            targetRightFoot = { x: 10, y: 0 };
          }
        } else {
          // Erling Halland: Floating Zen Lotus Meditation
          const floatHover = Math.sin(t * Math.PI * 4) * 6;
          targetSpine.head.y = -44 - floatHover;
          targetSpine.chest.y = -32 - floatHover;
          targetSpine.hips.y = -18 - floatHover;
          targetLeftFoot = { x: -12, y: -10 - floatHover }; // Crossed lotus legs
          targetRightFoot = { x: 12, y: -10 - floatHover };
          targetLeftHand = { x: -14, y: -18 - floatHover }; // Mudra on knees
          targetRightHand = { x: 14, y: -18 - floatHover };
        }
        break;
      }

      case 'BODY_SLAM': {
        targetSpine.head.x = facing * 14;
        targetSpine.head.y = -38;
        targetRightHand = { x: facing * 24, y: -26 };
        targetLeftHand = { x: facing * 18, y: -22 };
        targetLeftFoot = { x: -facing * 12, y: -18 };
        targetRightFoot = { x: -facing * 6, y: -14 };
        break;
      }

      case 'BACKFLIP': {
        targetRotation = -t * Math.PI * 2 * facing;
        targetSpine.head.y = -42;
        targetSpine.hips.y = -22;
        targetLeftFoot = { x: -10, y: -6 };
        targetRightFoot = { x: 10, y: -6 };
        break;
      }
    }

    // 4. Spring Interpolation towards target kinematic positions
    const stiffness = 280;
    const damping = 26;

    this.springVector(this.spine.hips, targetSpine.hips, dt, stiffness, damping);
    this.springVector(this.spine.chest, targetSpine.chest, dt, stiffness, damping);
    this.springVector(this.spine.neck, targetSpine.neck, dt, stiffness, damping);
    this.springVector(this.spine.head, targetSpine.head, dt, stiffness, damping);

    this.springVector(this.effectors.leftFoot, targetLeftFoot, dt, stiffness, damping);
    this.springVector(this.effectors.rightFoot, targetRightFoot, dt, stiffness, damping);
    this.springVector(this.effectors.leftHand, targetLeftHand, dt, stiffness, damping);
    this.springVector(this.effectors.rightHand, targetRightHand, dt, stiffness, damping);

    this.rotation += (targetRotation - this.rotation) * Math.min(1, dt * 18);
  }

  springVector(current, target, dt, k, d) {
    const fx = -k * (current.x - target.x) - d * current.vx;
    const fy = -k * (current.y - target.y) - d * current.vy;

    current.vx += fx * dt;
    current.vy += fy * dt;
    current.x += current.vx * dt;
    current.y += current.vy * dt;

    if (!Number.isFinite(current.x)) current.x = target.x;
    if (!Number.isFinite(current.y)) current.y = target.y;
    if (!Number.isFinite(current.vx)) current.vx = 0;
    if (!Number.isFinite(current.vy)) current.vy = 0;
  }

  draw(ctx, player) {
    if (!player || player.isDead) return;

    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));
    ctx.rotate(this.rotation);

    const facing = player.facing || 1;
    const state = player.state || 'IDLE';
    const beltColor = player.beltColor || '#ffffff';
    const charId = (player.characterId || 'halland').toLowerCase();
    const eff = this.effectors;
    const spine = this.spine;

    // Kinematic Roots
    const hipsJoint = spine.hips;
    const leftHipJoint = { x: hipsJoint.x - 3, y: hipsJoint.y };
    const rightHipJoint = { x: hipsJoint.x + 3, y: hipsJoint.y };

    const leftShoulderJoint = { x: spine.chest.x - 4, y: spine.chest.y };
    const rightShoulderJoint = { x: spine.chest.x + 4, y: spine.chest.y };

    // Solve 2-Bone Analytic IK for Limbs with character bend direction
    const leftLeg = this.solveIK(leftHipJoint, eff.leftFoot, this.thighLen, this.shinLen, -facing);
    const rightLeg = this.solveIK(rightHipJoint, eff.rightFoot, this.thighLen, this.shinLen, facing);
    const leftArm = this.solveIK(leftShoulderJoint, eff.leftHand, this.upperArmLen, this.forearmLen, facing);
    const rightArm = this.solveIK(rightShoulderJoint, eff.rightHand, this.upperArmLen, this.forearmLen, -facing);

    // =========================================================
    // REALISTIC & CUSTOM CHARACTER STYLING / ACCESSORIES
    // =========================================================
    let suitColor = '#ef4444';
    let darkLimb = '#b91c1c';
    let headColor = '#ef4444';
    let torsoWidth = 4.6;
    let hasHairRibbon = false;
    let hasCrown = false;
    let hasHeadband = false;
    let headbandColor = '#ef4444';
    let hasHelmet = false;
    let jerseyNum = '';

    if (charId === 'lebrown') {
      // 👑 KING LEBROWN JAMES - Muscular Power Forward Build
      suitColor = '#7e22ce'; // Lakers Royal Purple
      darkLimb = '#eab308'; // Gold arm sleeve & accents
      headColor = '#4c1d95';
      torsoWidth = 5.6;
      hasCrown = true;
      hasHeadband = true;
      headbandColor = '#facc15';
      jerseyNum = '6';
    } else if (charId === 'jordunn') {
      // 👟 MICHAEL JORDUNN - Bulls GOAT Build
      suitColor = '#dc2626'; // Bulls Red
      darkLimb = '#09090b'; // Obsidian Black limbs
      headColor = '#18181b';
      torsoWidth = 4.8;
      hasHeadband = true;
      headbandColor = '#ef4444';
      jerseyNum = '23';
    } else if (charId === 'mcbape') {
      // 🪖 KYLIAN MCBAPE - Commander General Uniform
      suitColor = '#365314'; // Military Olive Green Trenchcoat
      darkLimb = '#1c1917'; // Polished Black Leather Boots & Gloves
      headColor = '#1c1917';
      torsoWidth = 5.0;
      hasHelmet = true; // High Peaked Officer Cap
      jerseyNum = '10';
    } else if (charId === 'ronalds') {
      // 💥 CHRIS RONALDS - Portugal Ruby Red Sculpted Striker
      suitColor = '#991b1b'; // Portugal Ruby Red
      darkLimb = '#15803d'; // Forest Emerald Green Shorts
      headColor = '#7f1d1d';
      torsoWidth = 4.8;
      jerseyNum = '7';
    } else {
      // 👱 ERLING HALLAND - Tall Viking Striker with Blonde Hair
      suitColor = '#ef4444'; // Cyber Karate Red
      darkLimb = '#0284c7'; // Sky-Blue Highlights
      headColor = '#ef4444';
      torsoWidth = 4.6;
      hasHairRibbon = true;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Back Limbs (Sleek, High-Contrast)
    this.drawLimb(ctx, leftArm, darkLimb, 3.2);
    this.drawLimb(ctx, leftLeg, darkLimb, 3.6);

    // 2. Torso & Spine Curve (Customized Width)
    ctx.lineWidth = torsoWidth;
    ctx.strokeStyle = suitColor;
    ctx.beginPath();
    ctx.moveTo(spine.hips.x, spine.hips.y);
    ctx.lineTo(spine.chest.x, spine.chest.y);
    ctx.lineTo(spine.neck.x, spine.neck.y);
    ctx.stroke();

    // McBape Military Epaulettes & Red Sash
    if (charId === 'mcbape') {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(spine.neck.x - 3, spine.neck.y);
      ctx.lineTo(spine.hips.x + 4, spine.hips.y);
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.fillRect(leftShoulderJoint.x - 3, leftShoulderJoint.y - 2, 6, 3);
      ctx.fillRect(rightShoulderJoint.x - 3, rightShoulderJoint.y - 2, 6, 3);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(spine.chest.x - 4, spine.chest.y - 2, 3, 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(spine.chest.x - 1, spine.chest.y - 2, 3, 2);
    }

    // LeBrown Purple Shooting Sleeve
    if (charId === 'lebrown') {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(rightShoulderJoint.x, rightShoulderJoint.y);
      ctx.lineTo(rightArm.joint.x, rightArm.joint.y);
      ctx.stroke();
    }

    // Jersey Number on Chest
    if (jerseyNum) {
      ctx.fillStyle = charId === 'mcbape' ? '#fde047' : '#ffffff';
      ctx.font = '900 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(jerseyNum, (spine.hips.x + spine.chest.x) / 2, (spine.hips.y + spine.chest.y) / 2 + 3);
    }

    // 3. Front Limbs
    this.drawLimb(ctx, rightLeg, suitColor, 3.6);
    this.drawLimb(ctx, rightArm, suitColor, 3.2);

    // Footwear Details (Sneakers / Cleats / Boots)
    if (charId === 'ronalds') {
      // Emerald Green Cleats with White Sock Band
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(eff.rightFoot.x - 2, eff.rightFoot.y - 4, 4, 3);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(eff.rightFoot.x - 4, eff.rightFoot.y - 2, 8, 3);
    } else if (charId === 'jordunn') {
      // Red & Black Air Jordan Sneakers
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(eff.rightFoot.x - 2, eff.rightFoot.y - 5, 4, 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(eff.rightFoot.x - 4, eff.rightFoot.y - 2, 8, 3);
    } else if (charId === 'mcbape') {
      // Black Officer Boots
      ctx.fillStyle = '#09090b';
      ctx.fillRect(eff.rightFoot.x - 4, eff.rightFoot.y - 4, 8, 5);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(eff.rightFoot.x - 1, eff.rightFoot.y - 3, 2, 2);
    }

    // 4. Head
    ctx.beginPath();
    ctx.arc(spine.head.x, spine.head.y, this.headRadius, 0, Math.PI * 2);
    ctx.fillStyle = headColor;
    ctx.fill();

    // 5. Headgear / Crown / Soldier Cap / Pompadour
    if (hasCrown) {
      ctx.font = '15px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('👑', spine.head.x, spine.head.y - 9);
    }

    if (hasHelmet) {
      // Supreme Dictator Military Peaked Officer Cap
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      ctx.moveTo(spine.head.x - 11, spine.head.y - 3);
      ctx.lineTo(spine.head.x - 13, spine.head.y - 12);
      ctx.lineTo(spine.head.x + 13, spine.head.y - 12);
      ctx.lineTo(spine.head.x + 11, spine.head.y - 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold Laurel Insignia Cockade on Front
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(spine.head.x, spine.head.y - 7, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Black Patent Leather Visor
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(spine.head.x - 10, spine.head.y - 2);
      ctx.lineTo(spine.head.x + facing * 12, spine.head.y - 2);
      ctx.stroke();
    }

    if (hasHeadband) {
      ctx.strokeStyle = headbandColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(spine.head.x - 7, spine.head.y - 2);
      ctx.lineTo(spine.head.x + 7, spine.head.y - 2);
      ctx.stroke();
    }

    if (charId === 'ronalds') {
      // Slick black styled pompadour hair
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(spine.head.x - facing * 2, spine.head.y - 5, 5.5, 0, Math.PI * 2);
      ctx.fill();
      // Golden highlight streak
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(spine.head.x - facing * 2, spine.head.y - 8);
      ctx.lineTo(spine.head.x + facing * 3, spine.head.y - 6);
      ctx.stroke();
    }

    // Spider Eyes
    this.drawSpiderEyes(ctx, spine.head.x, spine.head.y, facing);

    // Michael Jordunn Sticking Tongue Out 👅 during EMOTE
    if (charId === 'jordunn' && state === 'EMOTE') {
      ctx.fillStyle = '#f43f5e'; // Vibrant tongue pink
      ctx.beginPath();
      ctx.arc(spine.head.x + facing * 8, spine.head.y + 3, 3.5, 0, Math.PI);
      ctx.fill();
    }

    // 6. Karate Belt Knot / Gold Buckle
    ctx.fillStyle = beltColor || (charId === 'mcbape' ? '#eab308' : charId === 'ronalds' ? '#15803d' : '#ffffff');
    ctx.fillRect(spine.hips.x - 4, spine.hips.y - 2, 8, 4);

    // 7. Floating Overhead Health Bar
    this.drawOverheadHealth(ctx, player);

    // 8. Character Signature Emote Overlays & Dialogue Badges
    if (state === 'EMOTE') {
      ctx.save();
      const t = player.stateTime / Math.max(0.1, player.stateDuration || 2.0);

      if (charId === 'ronalds') {
        // SUUUUIIIIIIII expanding power shockwaves
        if (t >= 0.40) {
          const waveRadius = ((t - 0.40) * 120) % 70;
          ctx.strokeStyle = `rgba(245, 158, 11, ${Math.max(0, 1 - (t - 0.40))})`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#f59e0b';
        ctx.font = '900 13px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t < 0.40 ? "💥 LEAP & SPIN... 💥" : "💥 SUUUUIIIIIIII! 💥", 0, -92);
      } else if (charId === 'mcbape') {
        ctx.fillStyle = '#facc15';
        ctx.font = '900 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t < 0.42 ? "🪖 GENERAL SALUTE 🫡" : "⚡ SUPREME DICTATOR 🎖️", 0, -92);
      } else if (charId === 'jordunn') {
        ctx.fillStyle = '#ef4444';
        ctx.font = '900 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t < 0.55 ? "👅 #23 GOAT 👟" : "🤷 THE SHRUG 🏆", 0, -92);
      } else if (charId === 'lebrown') {
        // Silencer Crown Light Pulse
        const stompDown = Math.sin(t * Math.PI * 6);
        if (stompDown > 0.6) {
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#eab308';
        ctx.font = '900 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t < 0.72 ? "👑 THE SILENCER 👑" : "👑 THIS IS MY HOUSE! 👑", 0, -92);
      } else {
        // Halland Zen Lotus Chakra Mandala
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.sin(t * 12) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -25, 34, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("🧘 ZEN MEDITATION 🌸", 0, -92);
      }
      ctx.restore();
    }

    // 8. Spider-Web Line when executing WEB_ZIP
    if (state === 'WEB_ZIP') {
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(eff.rightHand.x, eff.rightHand.y);
      ctx.lineTo(eff.rightHand.x + facing * 2, eff.rightHand.y - 140);
      ctx.stroke();
    }

    // 9. Martial Arts Slash Crescent Arcs
    const isKick = ['SNAP_KICK', 'FLYING_TORNADO_KICK', 'SPIN_HEEL_KICK', 'SPIN_SWEEP'].includes(state);
    const isPunch = ['STRAIGHT_PUNCH', 'DRAGON_UPPERCUT', 'SPIN_BACKFIST'].includes(state);

    if (isKick || isPunch) {
      const slashColor = state === 'DRAGON_UPPERCUT' ? '#f59e0b' : isKick ? '#38bdf8' : suitColor;
      ctx.strokeStyle = slashColor;
      ctx.lineWidth = 2.6;

      if (isKick) {
        ctx.beginPath();
        const arcCenterX = state === 'SPIN_HEEL_KICK' ? -facing * 10 : facing * 12;
        const startAng = facing > 0 ? -Math.PI * 0.4 : Math.PI * 0.6;
        const endAng = facing > 0 ? Math.PI * 0.3 : Math.PI * 1.3;
        ctx.arc(arcCenterX, -28, 28, startAng, endAng, facing < 0);
        ctx.stroke();
      } else if (state === 'DRAGON_UPPERCUT') {
        ctx.beginPath();
        ctx.moveTo(facing * 8, -10);
        ctx.quadraticCurveTo(facing * 20, -50, facing * 16, -85);
        ctx.stroke();
      } else {
        ctx.beginPath();
        const punchX = state === 'SPIN_BACKFIST' ? -facing * 26 : facing * 28;
        ctx.moveTo(punchX - facing * 14, -38);
        ctx.lineTo(punchX + facing * 12, -38);
        ctx.stroke();
      }
    }

    ctx.restore();

    if (hasHairRibbon) {
      this.drawRibbons(ctx, beltColor || '#ffffff');
    }
  }

  drawLimb(ctx, ik, color, width) {
    const { root, joint, end } = ik;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.lineTo(joint.x, joint.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  drawOverheadHealth(ctx, player) {
    if (!player || player.isDead) return;
    const barW = 34;
    const barH = 5;
    const x = -barW / 2;
    const y = -66;

    // Dark background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);

    // Health Fill
    const maxHp = player.maxHp || 100;
    const curHp = Math.max(0, Math.min(maxHp, player.hp));
    const pct = curHp / maxHp;

    const hpColor = pct > 0.5 ? '#10b981' : pct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, barW * pct, barH);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, barW + 2, barH + 2);
  }

  drawSpiderEyes(ctx, hx, hy, facing) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;

    const eyeOffsetX = facing * 3.2;
    const eyeY = hy - 1;

    ctx.beginPath();
    ctx.moveTo(hx + eyeOffsetX, eyeY - 2.5);
    ctx.lineTo(hx + eyeOffsetX + facing * 5.0, eyeY - 3.5);
    ctx.lineTo(hx + eyeOffsetX + facing * 3.8, eyeY + 2.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawCannonball(ctx, beltColor) {
    ctx.lineWidth = 4.0;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#ef4444';

    ctx.beginPath();
    ctx.arc(0, -26, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, -26, 12, 0, Math.PI * 1.5);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(6, -34, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRibbons(ctx, beltColor) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.hair.length > 2) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.2;

      ctx.beginPath();
      ctx.moveTo(this.hair[0].x, this.hair[0].y);
      for (let i = 1; i < this.hair.length - 2; i++) {
        const xc = (this.hair[i].x + this.hair[i + 1].x) / 2;
        const yc = (this.hair[i].y + this.hair[i + 1].y) / 2;
        ctx.quadraticCurveTo(this.hair[i].x, this.hair[i].y, xc, yc);
      }
      ctx.quadraticCurveTo(
        this.hair[this.hair.length - 2].x,
        this.hair[this.hair.length - 2].y,
        this.hair[this.hair.length - 1].x,
        this.hair[this.hair.length - 1].y
      );
      ctx.stroke();
    }

    if (this.belt.length > 2) {
      ctx.strokeStyle = beltColor;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(this.belt[0].x, this.belt[0].y);
      for (let i = 1; i < this.belt.length - 2; i++) {
        const xc = (this.belt[i].x + this.belt[i + 1].x) / 2;
        const yc = (this.belt[i].y + this.belt[i + 1].y) / 2;
        ctx.quadraticCurveTo(this.belt[i].x, this.belt[i].y, xc, yc);
      }
      ctx.quadraticCurveTo(
        this.belt[this.belt.length - 2].x,
        this.belt[this.belt.length - 2].y,
        this.belt[this.belt.length - 1].x,
        this.belt[this.belt.length - 1].y
      );
      ctx.stroke();
    }

    ctx.restore();
  }
}

window.StickmanRenderer = StickmanRenderer;
