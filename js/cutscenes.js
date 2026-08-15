/* =========================================================
   ANIMATED CANVAS CUTSCENE ENGINE ("HALLAND")
   Fully procedural, interactive animated canvas cutscene:
   - Scene 1: Kneeling LeBrown crying tears & handing over MJ's left shoe to Halland
   - Scene 2: Caged MJ breaking out & iconic Jumpman windmill dunk into trash can
   - Scene 3: LeBrown traded to Lakes with #6 Purple & Gold jersey + high five with MJ
   - Scene 4: MJ & LeBrown alley-oop duo at local park + Halland juggling soccer ball!
   - Scene 5: Halland on golden podium with Balloon d'Oof, Osgars & confetti shower!
========================================================= */

class CutsceneEngine {
  constructor() {
    this.active = false;
    this.currentSlide = 0;
    this.canvas = null;
    this.ctx = null;
    this.animTime = 0;
    this.lastTime = performance.now();
    this.confetti = [];

    // Animation variables
    this.hallandJuggleY = 0;
    this.hallandJuggleVy = 0;
    this.ballY = 0;
    this.ballVy = 0;
    this.dunkT = 0;
    this.tearTimer = 0;
  }

  init() {
    this.container = document.getElementById('cutscene-screen');
    const nextBtn = document.getElementById('btn-cutscene-next');
    const skipBtn = document.getElementById('btn-cutscene-skip');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextSlide());
    }
    if (skipBtn) {
      skipBtn.addEventListener('click', () => this.endCutscene());
    }

    this.initConfetti();
  }

  initCanvas() {
    const graphicContainer = document.getElementById('cutscene-graphic');
    if (!graphicContainer) return;

    graphicContainer.innerHTML = '<canvas id="cutscene-canvas" width="600" height="240"></canvas>';
    this.canvas = document.getElementById('cutscene-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }

  initConfetti() {
    this.confetti = Array.from({ length: 60 }, () => ({
      x: Math.random() * 600,
      y: Math.random() * -240,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2 + 1.5,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.1,
      size: Math.random() * 6 + 4,
      color: ['#ef4444', '#f59e0b', '#38bdf8', '#10b981', '#a855f7', '#fbbf24'][Math.floor(Math.random() * 6)]
    }));
  }

  playEndingCutscene() {
    this.active = true;
    this.currentSlide = 0;
    this.animTime = 0;
    if (!this.container) this.container = document.getElementById('cutscene-screen');
    if (this.container) {
      this.container.classList.remove('hidden');
      this.initCanvas();
      this.renderSlide();
    }
    if (window.Audio) window.Audio.play('victory');

    requestAnimationFrame((t) => this.loop(t));
  }

  nextSlide() {
    this.currentSlide++;
    this.animTime = 0;
    this.dunkT = 0;
    const totalSlides = 5;
    if (this.currentSlide >= totalSlides) {
      this.endCutscene();
    } else {
      this.renderSlide();
      if (window.Audio) window.Audio.play('tap');
    }
  }

  endCutscene() {
    this.active = false;
    if (this.container) {
      this.container.classList.add('hidden');
    }
    const vicScreen = document.getElementById('victory-screen');
    if (vicScreen) {
      vicScreen.classList.remove('hidden');
    }
  }

  renderSlide() {
    const slideTitle = document.getElementById('cutscene-title');
    const slideText = document.getElementById('cutscene-text');
    const nextBtn = document.getElementById('btn-cutscene-next');

    if (!slideTitle || !slideText) return;

    switch (this.currentSlide) {
      case 0:
        slideTitle.textContent = "THE APOLOGY & SACRED SHOE HANDOVER";
        slideText.innerHTML = `After an epic battle, <strong>Halland</strong> stands victorious! The giant bully <strong>LeBrown Jameson</strong> drops to his knees with tears streaming down his face: <em>"I'm sorry Halland! I only stole MJ's Left Shoe so I could be MVP of the MLB!"</em> He holds out the glowing shoe.`;
        if (nextBtn) nextBtn.textContent = "NEXT ➔";
        break;

      case 1:
        slideTitle.textContent = "MJ'S FREEDOM & WINDMILL SWISH";
        slideText.innerHTML = `Halland shatters the cage with a flying side kick! <strong>Michael Jordan (MJ #23)</strong> steps out, laces up his iconic Left Shoe, soars across the room in classic Jumpman fashion, and throws down a windmill dunk into the trash can! <em>"Appreciate it, Halland!"</em>`;
        break;

      case 2:
        slideTitle.textContent = "LEBROWN TRADED TO THE LAKES (#6)";
        slideText.innerHTML = `Humbled by the loss, <strong>LeBrown Jameson</strong> gets traded to the <strong>Lakes</strong> and proudly wears <strong>Number 6</strong>. LeBrown apologizes directly to MJ, and they seal their new partnership with a thunderous high-five!`;
        break;

      case 3:
        slideTitle.textContent = "THE LOCAL PARK UNSTOPPABLE DUO";
        slideText.innerHTML = `<strong>LeBrown Jameson & Michael Jordan</strong> officially team up to dominate the local park, running unstoppable alley-oops! On the sideline, <strong>Halland is casually juggling a soccer ball</strong> with his feet and knees, smiling in approval.`;
        break;

      case 4:
        slideTitle.textContent = "THE BALLOON D'OOF & THE OSGARS!";
        slideText.innerHTML = `Justice is served! <strong>Halland</strong> takes the stage to win the prestigious <strong>Balloon d'Oof 🎈</strong> and sweeps <strong>The Osgars 🏆</strong> for his historic smash-hit movie: <em>"Spooderman: Brand New Suuuiiiiiiiiiit"</em>!`;
        if (nextBtn) nextBtn.textContent = "COMPLETE CAMPAIGN 🏆";
        break;
    }
  }

  loop(currentTime) {
    if (!this.active) return;
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    this.animTime += dt;

    this.renderCanvas(dt);
    requestAnimationFrame((t) => this.loop(t));
  }

  // -----------------------------------------------------------
  // PROCEDURAL ANIMATED CANVAS SCENE RENDERER
  // -----------------------------------------------------------
  renderCanvas(dt) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background Gradient & Floor
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ground line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - 35);
    ctx.lineTo(w, h - 35);
    ctx.stroke();

    const t = this.animTime;

    switch (this.currentSlide) {
      // -------------------------------------------------------
      // SCENE 1: LEBROWN KNEELING & CRYING TEARS + SHOE HANDOVER
      // -------------------------------------------------------
      case 0: {
        // Halland Standing Heroic (Left)
        this.drawHallandStick(ctx, 160, h - 35, 1, false);

        // Giant LeBrown Kneeling (Right)
        this.drawLeBrownKneeling(ctx, 380, h - 35, t);

        // Glowing Floating Left Shoe between them
        const shoeY = h - 75 + Math.sin(t * 4) * 8;
        ctx.font = '28px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 18;
        ctx.fillText('👟✨', 270, shoeY);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fef3c7';
        ctx.font = '800 11px Outfit';
        ctx.fillText("MJ'S SACRED LEFT SHOE", 270, shoeY + 22);
        break;
      }

      // -------------------------------------------------------
      // SCENE 2: MJ BREAKING OUT OF CAGE & WINDMILL JUMPMAN DUNK
      // -------------------------------------------------------
      case 1: {
        // Broken Cage (Left)
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 3;
        ctx.strokeRect(60, h - 145, 90, 110);
        ctx.font = '22px Outfit';
        ctx.fillText('💥🔓', 105, h - 90);

        // Trash Can (Right)
        const trashX = 480;
        ctx.fillStyle = '#475569';
        ctx.fillRect(trashX - 14, h - 65, 28, 30);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(trashX - 14, h - 65, 28, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 9px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('TRASH', trashX, h - 45);

        // MJ Jumpman Flying Across to Dunk!
        const dunkProgress = (t * 0.8) % 1.2;
        const mjX = 180 + Math.min(dunkProgress / 0.8, 1.0) * (trashX - 180);
        const arc = Math.sin(Math.min(dunkProgress / 0.8, 1.0) * Math.PI) * 75;
        const mjY = (h - 60) - arc;

        this.drawMJStick(ctx, mjX, mjY, true);

        // Paper Ball
        if (dunkProgress < 0.8) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(mjX + 16, mjY - 20, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.font = '900 16px Outfit';
          ctx.fillText('SWISH! 🏀🔥', trashX, h - 80);
        }
        break;
      }

      // -------------------------------------------------------
      // SCENE 3: LEBROWN LAKES #6 JERSEY & HIGH-FIVE WITH MJ
      // -------------------------------------------------------
      case 2: {
        // LeBrown in Purple & Gold #6 (Left)
        this.drawLeBrownLakes(ctx, 230, h - 35, t);

        // MJ in Red #23 (Right)
        this.drawMJStick(ctx, 370, h - 35, false);

        // High Five Spark
        const sparkOffset = Math.sin(t * 5) * 3;
        ctx.font = '26px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('🤝✨', 300, h - 90 + sparkOffset);

        ctx.fillStyle = '#f59e0b';
        ctx.font = '800 14px Syncopate';
        ctx.fillText('THE NEW DUO IS FORMED!', 300, 45);
        break;
      }

      // -------------------------------------------------------
      // SCENE 4: LOCAL PARK ALLEY-OOP + HALLAND JUGGLING SOCCER BALL
      // -------------------------------------------------------
      case 3: {
        // Left Side: Halland actively juggling soccer ball
        this.drawHallandJuggling(ctx, 130, h - 35, t);

        // Center-Right: Park Basketball Court & Hoop
        const hoopX = 480;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hoopX, h - 35);
        ctx.lineTo(hoopX, h - 145);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hoopX - 16, h - 165, 32, 24);
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(hoopX - 16, h - 165, 32, 24);

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hoopX, h - 145);
        ctx.lineTo(hoopX - 22, h - 145);
        ctx.stroke();

        // LeBrown throwing alley-oop to MJ!
        this.drawLeBrownLakes(ctx, 280, h - 35, t);

        const alleyOopArc = Math.sin((t * 1.2) % Math.PI) * 60;
        const flyingMjY = (h - 80) - alleyOopArc;
        this.drawMJStick(ctx, 420, flyingMjY, true);

        // Basketball flying to hoop
        const bBallX = 300 + ((t * 120) % 150);
        const bBallY = h - 90 - Math.sin(((t * 120) % 150) / 150 * Math.PI) * 45;
        ctx.font = '16px Outfit';
        ctx.fillText('🏀', bBallX, bBallY);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '800 11px Outfit';
        ctx.fillText('LOCAL PARK COURT', 380, h - 15);
        ctx.fillText('HALLAND (CHILLIN & JUGGLING)', 130, h - 15);
        break;
      }

      // -------------------------------------------------------
      // SCENE 5: BALLOON D'OOF & OSGARS AWARD CEREMONY + CONFETTI
      // -------------------------------------------------------
      case 4: {
        // Golden Podium
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(210, h - 85, 180, 50);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.strokeRect(210, h - 85, 180, 50);

        ctx.fillStyle = '#0f172a';
        ctx.font = '900 18px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('#1 CHAMPION', 300, h - 55);

        // Halland on Top Holding Trophies
        this.drawHallandStick(ctx, 300, h - 85, 1, true);

        // Balloon d'Oof (Floating Golden Balloon)
        ctx.font = '32px Outfit';
        ctx.fillText('🎈', 240, h - 145 + Math.sin(t * 3) * 6);
        ctx.font = '800 11px Outfit';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText("BALLOON D'OOF", 240, h - 165);

        // Oscar Trophy
        ctx.font = '32px Outfit';
        ctx.fillText('🏆', 360, h - 145 + Math.sin(t * 3 + 1) * 6);
        ctx.font = '800 11px Outfit';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText("THE OSGARS", 360, h - 165);

        // Movie Marquee Banner
        ctx.fillStyle = '#ef4444';
        ctx.font = '900 13px Syncopate';
        ctx.fillText('SPOODERMAN: BRAND NEW SUUUUIIIIIIIT', 300, 32);

        // Falling Confetti Shower
        this.updateAndDrawConfetti(ctx, dt, w, h);
        break;
      }
    }
  }

  // -----------------------------------------------------------
  // INDIVIDUAL CHARACTER PROCEDURAL RENDERERS
  // -----------------------------------------------------------
  drawHallandStick(ctx, x, y, facing, holdingTrophies) {
    ctx.save();
    ctx.strokeStyle = '#ef4444'; // Red suit
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';

    // Legs
    ctx.beginPath();
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x - 8, y);
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x + 8, y);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x, y - 48);
    ctx.stroke();

    // Arms
    if (holdingTrophies) {
      ctx.beginPath();
      ctx.moveTo(x, y - 44);
      ctx.lineTo(x - 22, y - 62);
      ctx.moveTo(x, y - 44);
      ctx.lineTo(x + 22, y - 62);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - 44);
      ctx.lineTo(x + facing * 16, y - 38);
      ctx.stroke();
    }

    // Head
    ctx.beginPath();
    ctx.arc(x, y - 56, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Haaland Blonde Ponytail Ribbon
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 60);
    ctx.quadraticCurveTo(x - 14, y - 58, x - 18, y - 48);
    ctx.stroke();

    ctx.restore();
  }

  // Halland actively juggling a soccer ball!
  drawHallandJuggling(ctx, x, y, t) {
    ctx.save();

    // Dynamic Soccer Ball Physics
    const ballCycle = (t * 2.6) % 1.0;
    const ballHeight = Math.sin(ballCycle * Math.PI) * 40;
    const soccerY = (y - 32) - ballHeight;

    // Leg kicking motion
    const kickLeg = ballCycle < 0.25 ? -12 : 0;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';

    // Standing & Juggling Legs
    ctx.beginPath();
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x - 10, y);
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x + 10, y + kickLeg);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x, y - 48);
    ctx.stroke();

    // Relaxed Arms
    ctx.beginPath();
    ctx.moveTo(x, y - 44);
    ctx.lineTo(x - 12, y - 32);
    ctx.moveTo(x, y - 44);
    ctx.lineTo(x + 12, y - 32);
    ctx.stroke();

    // Head & Ponytail
    ctx.beginPath();
    ctx.arc(x, y - 56, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 60);
    ctx.quadraticCurveTo(x - 14, y - 58, x - 18, y - 48);
    ctx.stroke();

    // The Juggled Soccer Ball
    ctx.font = '18px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('⚽', x + 12, soccerY);

    ctx.restore();
  }

  drawLeBrownKneeling(ctx, x, y, t) {
    ctx.save();
    ctx.strokeStyle = '#7e22ce'; // Purple
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';

    // Kneeling Legs
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x - 14, y);
    ctx.stroke();

    // Slumped Torso
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x - 10, y - 42);
    ctx.stroke();

    // Arm reaching out with shoe
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 40);
    ctx.lineTo(x - 45, y - 34);
    ctx.stroke();

    // Head & Headband
    ctx.beginPath();
    ctx.arc(x - 12, y - 52, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#581c87';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Animated Crying Tears Droplets!
    const tearY = (y - 50) + ((t * 80) % 24);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x - 20, tearY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eab308';
    ctx.font = '800 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('LEBROWN (SOBBING)', x, y - 68);

    ctx.restore();
  }

  drawLeBrownLakes(ctx, x, y, t) {
    ctx.save();
    ctx.strokeStyle = '#eab308'; // Gold Lakes jersey
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';

    // Legs
    ctx.beginPath();
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x - 12, y);
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x + 12, y);
    ctx.stroke();

    // Torso
    ctx.strokeStyle = '#7e22ce'; // Purple
    ctx.beginPath();
    ctx.moveTo(x, y - 28);
    ctx.lineTo(x, y - 54);
    ctx.stroke();

    // Head & Gold Headband
    ctx.beginPath();
    ctx.arc(x, y - 66, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#581c87';
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Jersey #6 Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('#6 LAKES', x, y - 80);

    ctx.restore();
  }

  drawMJStick(ctx, x, y, isJumpman) {
    ctx.save();
    ctx.strokeStyle = '#dc2626'; // Red #23 Bulls
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';

    if (isJumpman) {
      // Iconic Splayed Jumpman Legs in mid-air!
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x - 22, y + 8);
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x + 22, y + 2);
      ctx.stroke();

      // Torso
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x + 4, y - 42);
      ctx.stroke();

      // Splayed High Dunking Arm
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 38);
      ctx.lineTo(x + 18, y - 55);
      ctx.stroke();
    } else {
      // Standing
      ctx.beginPath();
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x - 8, y);
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x + 8, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x, y - 46);
      ctx.stroke();
    }

    // MJ Head
    ctx.beginPath();
    ctx.arc(x + (isJumpman ? 6 : 0), y - 54, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 11px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('MJ #23', x, y - 68);

    ctx.restore();
  }

  updateAndDrawConfetti(ctx, dt, w, h) {
    for (const c of this.confetti) {
      c.x += c.vx;
      c.y += c.vy;
      c.rot += c.vRot;

      if (c.y > h) {
        c.y = -20;
        c.x = Math.random() * w;
      }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      ctx.restore();
    }
  }
}

window.Cutscenes = new CutsceneEngine();
