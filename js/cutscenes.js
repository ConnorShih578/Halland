/* =========================================================
   CINEMATIC STORY & CUTSCENE SYSTEM ("HALLAND")
   The Epic Saga of MJ's Left Shoe:
   - LeBrown Jameson Heist & Bully Lore
   - MJ in the Cage shooting paper balls into trash can
   - LeBrown Apology, Number 6 Lakes Jersey, MJ & LeBrown Duo
   - Halland juggling soccer ball & winning the Balloon d'Oof & Osgars!
========================================================= */

class CutsceneManager {
  constructor() {
    this.active = false;
    this.currentSlide = 0;
    this.container = null;
    this.soccerJuggleTime = 0;
    this.mjPaperBallTimer = 0;
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
  }

  playEndingCutscene() {
    this.active = true;
    this.currentSlide = 0;
    if (!this.container) this.container = document.getElementById('cutscene-screen');
    if (this.container) {
      this.container.classList.remove('hidden');
      this.renderSlide();
    }
    if (window.Audio) window.Audio.play('checkpoint');
  }

  nextSlide() {
    this.currentSlide++;
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
    const slideGraphic = document.getElementById('cutscene-graphic');
    const nextBtn = document.getElementById('btn-cutscene-next');

    if (!slideTitle || !slideText || !slideGraphic) return;

    switch (this.currentSlide) {
      case 0:
        slideTitle.textContent = "THE CONFRONTATION: SHOE RETRIEVED!";
        slideText.innerHTML = `After an intense battle atop the penthouse vault, <strong>Halland</strong> overpowers the giant bully <strong>LeBrown Jameson</strong>! LeBrown drops to one knee, tears in his eyes. <em>"I'm sorry Halland... I only stole MJ's Left Shoe so I could win the MLB MVP!"</em>`;
        slideGraphic.innerHTML = `
          <div class="cs-scene">
            <div class="cs-actor halland-hero">🕷️⚽</div>
            <div class="cs-actor shoe-glow">👟✨</div>
            <div class="cs-actor lebrown-defeated">😭👑</div>
          </div>
        `;
        break;

      case 1:
        slideTitle.textContent = "MJ IS LIBERATED!";
        slideText.innerHTML = `Halland smashes the cage lock with a swift sweep kick! <strong>Michael Jordan (MJ)</strong> steps out, laces up his iconic Left Shoe, and throws down a thunderous celebratory windmill slam into the trash can! <em>"Appreciate it, Halland. It's game time."</em>`;
        slideGraphic.innerHTML = `
          <div class="cs-scene">
            <div class="cs-actor cage-broken">🔓</div>
            <div class="cs-actor mj-legend">🐐🏀</div>
            <div class="cs-actor trash-swish">🗑️💨</div>
          </div>
        `;
        break;

      case 2:
        slideTitle.textContent = "LEBROWN TRADED TO THE LAKES!";
        slideText.innerHTML = `Humbled by the defeat, <strong>LeBrown Jameson</strong> gets traded to the <strong>Lakes</strong> and changes his jersey to <strong>Number 6</strong>. LeBrown apologizes directly to MJ and asks for one last chance at greatness.`;
        slideGraphic.innerHTML = `
          <div class="cs-scene">
            <div class="cs-actor jersey-six">🟨 #6 🟪</div>
            <div class="cs-actor handshake">🤝</div>
            <div class="cs-actor trophy">🏆</div>
          </div>
        `;
        break;

      case 3:
        slideTitle.textContent = "THE UNSTOPPABLE DUO AT THE LOCAL PARK!";
        slideText.innerHTML = `<strong>LeBrown Jameson & Michael Jordan</strong> officially team up to become the undisputed greatest duo at the local park, running unstoppable alley-oops! Meanwhile on the sideline, <strong>Halland is casually juggling a soccer ball</strong>, nodding in approval.`;
        slideGraphic.innerHTML = `
          <div class="cs-scene">
            <div class="cs-actor court-hoop">🏀 ➔ ⛹️‍♂️⛹️‍♂️</div>
            <div class="cs-actor halland-juggling">⚽🤸‍♂️</div>
          </div>
        `;
        break;

      case 4:
        slideTitle.textContent = "THE BALLOON D'OOF & THE OSGARS!";
        slideText.innerHTML = `With justice restored, <strong>Halland</strong> goes on to win the prestigious <strong>Balloon d'Oof 🎈</strong> and sweeps <strong>The Osgars 🏆</strong> for his record-shattering blockbuster film: <em>"Spooderman: Brand New Suuuiiiiiiiiiit"</em>!`;
        slideGraphic.innerHTML = `
          <div class="cs-scene">
            <div class="cs-actor golden-balloon">🎈⚽</div>
            <div class="cs-actor oscar-trophy">🏆✨</div>
            <div class="cs-actor spooder-poster">🎬 "BRAND NEW SUUUUIII"</div>
          </div>
        `;
        if (nextBtn) nextBtn.textContent = "COMPLETE CAMPAIGN ➔";
        break;
    }
  }
}

window.Cutscenes = new CutsceneManager();
