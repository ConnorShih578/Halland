/* =========================================================
   CAMPAIGN & PROCEDURAL WORLD ENGINE ("HALLAND")
   - Full Narrative Campaign: MJ's Left Shoe & Giant Bully LeBrown Jameson
   - Act 1: Interactive Dojo Tutorial (All controls & tactics)
   - Act 2: Cyber City Alleyways (Urban street combat)
   - Act 3: MLB Basketball Arena (Hardwood courts & bleachers)
   - Act 4: High-Rise Construction Site (Steel girders & cranes)
   - Act 5: LeBrown's Penthouse Vault (Giant LeBrown Boss + Caged MJ shooting paper balls)
   - Endless Mode: Seamlessly alternates between all 4 themes every 400m!
========================================================= */

class LevelGenerator {
  constructor() {
    this.beltRanks = [
      { name: "WHITE", color: "#ffffff", dist: 0 },
      { name: "YELLOW", color: "#eab308", dist: 400 },
      { name: "ORANGE", color: "#f97316", dist: 900 },
      { name: "GREEN", color: "#10b981", dist: 1500 },
      { name: "BLUE", color: "#3b82f6", dist: 2200 },
      { name: "PURPLE", color: "#a855f7", dist: 3000 },
      { name: "BROWN", color: "#78350f", dist: 4000 },
      { name: "RED", color: "#ef4444", dist: 5200 },
      { name: "BLACK", color: "#111827", dist: 6500 }
    ];
  }

  getBeltForDistance(dist) {
    let current = this.beltRanks[0];
    for (const b of this.beltRanks) {
      if (dist >= b.dist) current = b;
    }
    return current;
  }

  // -----------------------------------------------------------
  // 5-ACT NARRATIVE CAMPAIGN DEFINITION
  // -----------------------------------------------------------
  getCampaignStages() {
    return [
      // =======================================================
      // ACT 1: DOJO TRAINING GROUNDS (INTERACTIVE TUTORIAL)
      // =======================================================
      {
        isInfinite: false,
        name: "ACT 1: DOJO TUTORIAL",
        subtitle: "Learn the moves & smash all yellow barriers!",
        theme: 'dojo',
        belt: "WHITE",
        beltColor: "#ffffff",
        startX: 80,
        startY: 540,
        killY: 1000,
        tutorialSteps: [
          { x: 120, text: "🕹️ RUN & SPRINT: Drag left stick or use A / D. Jump with W or Space!" },
          { x: 500, text: "🥊 COMBAT: Tap on right screen or press E to combo! Swipe Right (→) to DASH PUNCH!" },
          { x: 880, text: "🚧 YELLOW BARRIERS: SMANSH ALL YELLOW WALLS! The goal stays locked until every barrier is destroyed!" },
          { x: 1280, text: "🕷️ WEB ZIP: Swipe Up (↑) to shoot a web and pull upward (1x per jump)!" },
          { x: 1680, text: "⚡ PARRY TRAINING: Hold S or touch right screen when the enemy winds up to PARRY & STUN!" }
        ],
        platforms: [
          { x: 0, y: 540, w: 450, h: 60, type: 'ground' },
          { x: 480, y: 540, w: 400, h: 60, type: 'ground' },
          { x: 920, y: 440, w: 320, h: 40, type: 'roof' },
          { x: 1280, y: 360, w: 320, h: 40, type: 'roof' },
          { x: 1640, y: 520, w: 600, h: 60, type: 'ground' }
        ],
        breakables: [
          { x: 450, y: 450, w: 22, h: 90, broken: false }, // Barrier 1
          { x: 890, y: 350, w: 22, h: 90, broken: false }, // Barrier 2
          { x: 1600, y: 430, w: 22, h: 90, broken: false }  // Barrier 3
        ],
        checkpoints: [
          { x: 940, y: 380, w: 30, h: 60, activated: false }
        ],
        decorations: [
          { type: 'torii_gate', x: 70, y: 540, w: 80, h: 120, label: 'TUTORIAL' },
          { type: 'sakura_tree', x: 1320, y: 360 }
        ],
        entities: [
          { x: 680, y: 540, w: 24, h: 56, hp: 3, maxHp: 3, type: 'brawler', name: "Practice Dummy", isTarget: true, isDead: false },
          { x: 1100, y: 440, w: 24, h: 56, hp: 3, maxHp: 3, type: 'kicker', name: "Sparring Monk", isTarget: true, isDead: false },
          { x: 1900, y: 520, w: 28, h: 60, hp: 6, maxHp: 6, type: 'boss', name: "Dojo Master", isTarget: true, isDead: false }
        ],
        goal: { x: 2150, y: 440, w: 60, h: 80 }
      },

      // =======================================================
      // ACT 2: CYBER CITY ALLEYWAYS (STREETS & NEON DUMPSTERS)
      // =======================================================
      {
        isInfinite: false,
        name: "ACT 2: CYBER CITY ALLEYWAYS",
        subtitle: "Track down LeBrown's street enforcers!",
        theme: 'city',
        belt: "YELLOW",
        beltColor: "#eab308",
        startX: 80,
        startY: 540,
        killY: 1100,
        platforms: [
          { x: 0, y: 540, w: 420, h: 60, type: 'asphalt' },
          { x: 460, y: 460, w: 320, h: 40, type: 'dumpster' },
          { x: 820, y: 380, w: 340, h: 40, type: 'neon_roof' },
          { x: 1200, y: 300, w: 360, h: 40, type: 'fire_escape' },
          { x: 1600, y: 480, w: 650, h: 60, type: 'asphalt' }
        ],
        breakables: [
          { x: 430, y: 450, w: 22, h: 90, broken: false },
          { x: 790, y: 290, w: 22, h: 90, broken: false },
          { x: 1560, y: 390, w: 22, h: 90, broken: false }
        ],
        checkpoints: [
          { x: 840, y: 320, w: 30, h: 60, activated: false }
        ],
        decorations: [
          { type: 'city_billboard', x: 200, y: 380, text: 'MLB FINALS' },
          { type: 'dumpster_prop', x: 500, y: 460 },
          { type: 'neon_sign', x: 900, y: 260, text: 'LEBROWN RULES' }
        ],
        entities: [
          { x: 300, y: 540, w: 24, h: 56, hp: 4, maxHp: 4, type: 'brawler', name: "Alley Brawler", isTarget: true, isDead: false },
          { x: 620, y: 460, w: 24, h: 56, hp: 4, maxHp: 4, type: 'ninja', name: "Cyber Thug", isTarget: true, isDead: false },
          { x: 1000, y: 380, w: 24, h: 56, hp: 5, maxHp: 5, type: 'kicker', name: "Street Acrobat", isTarget: true, isDead: false },
          { x: 1380, y: 300, w: 24, h: 56, hp: 5, maxHp: 5, type: 'brawler', name: "Enforcer", isTarget: true, isDead: false },
          { x: 1900, y: 480, w: 28, h: 60, hp: 8, maxHp: 8, type: 'boss', name: "Alley Kingpin", isTarget: true, isDead: false }
        ],
        goal: { x: 2150, y: 400, w: 60, h: 80 }
      },

      // =======================================================
      // ACT 3: MLB BASKETBALL ARENA (COURTS & HOOPS)
      // =======================================================
      {
        isInfinite: false,
        name: "ACT 3: THE MLB ARENA",
        subtitle: "Infiltrate the Major League Basketball headquarters!",
        theme: 'arena',
        belt: "BLUE",
        beltColor: "#3b82f6",
        startX: 80,
        startY: 540,
        killY: 1100,
        platforms: [
          { x: 0, y: 540, w: 480, h: 60, type: 'hardwood' },
          { x: 520, y: 450, w: 320, h: 40, type: 'bleachers' },
          { x: 880, y: 360, w: 320, h: 40, type: 'hoop_platform' },
          { x: 1240, y: 440, w: 340, h: 40, type: 'bleachers' },
          { x: 1620, y: 500, w: 650, h: 60, type: 'hardwood' }
        ],
        breakables: [
          { x: 490, y: 450, w: 22, h: 90, broken: false },
          { x: 850, y: 270, w: 22, h: 90, broken: false },
          { x: 1580, y: 410, w: 22, h: 90, broken: false }
        ],
        checkpoints: [
          { x: 920, y: 300, w: 30, h: 60, activated: false }
        ],
        decorations: [
          { type: 'basketball_hoop', x: 260, y: 540 },
          { type: 'stadium_scoreboard', x: 650, y: 240, text: 'LEBROWN: 99 | MJ: 0' },
          { type: 'basketball_hoop', x: 1040, y: 360 }
        ],
        entities: [
          { x: 320, y: 540, w: 24, h: 56, hp: 5, maxHp: 5, type: 'brawler', name: "Court Guard", isTarget: true, isDead: false },
          { x: 680, y: 450, w: 24, h: 56, hp: 5, maxHp: 5, type: 'kicker', name: "Dunk Specialist", isTarget: true, isDead: false },
          { x: 1040, y: 360, w: 24, h: 56, hp: 6, maxHp: 6, type: 'ninja', name: "Stealth Forward", isTarget: true, isDead: false },
          { x: 1400, y: 440, w: 24, h: 56, hp: 6, maxHp: 6, type: 'brawler', name: "Center Enforcer", isTarget: true, isDead: false },
          { x: 1950, y: 500, w: 28, h: 60, hp: 10, maxHp: 10, type: 'boss', name: "MLB MVP Captain", isTarget: true, isDead: false }
        ],
        goal: { x: 2180, y: 420, w: 60, h: 80 }
      },

      // =======================================================
      // ACT 4: HIGH-RISE CONSTRUCTION SITE (STEEL GIRDERS)
      // =======================================================
      {
        isInfinite: false,
        name: "ACT 4: HIGH-RISE TOWER",
        subtitle: "Climb the steel girders to LeBrown's Penthouse!",
        theme: 'construction',
        belt: "RED",
        beltColor: "#ef4444",
        startX: 80,
        startY: 540,
        killY: 1200,
        platforms: [
          { x: 0, y: 540, w: 400, h: 60, type: 'girder' },
          { x: 450, y: 440, w: 300, h: 30, type: 'crane_arm' },
          { x: 800, y: 340, w: 320, h: 30, type: 'girder' },
          { x: 1160, y: 250, w: 380, h: 30, type: 'scaffold' },
          { x: 1580, y: 460, w: 700, h: 60, type: 'concrete_roof' }
        ],
        breakables: [
          { x: 420, y: 350, w: 22, h: 90, broken: false },
          { x: 770, y: 250, w: 22, h: 90, broken: false },
          { x: 1540, y: 370, w: 22, h: 90, broken: false }
        ],
        checkpoints: [
          { x: 840, y: 280, w: 30, h: 60, activated: false }
        ],
        decorations: [
          { type: 'crane_hook', x: 550, y: 200 },
          { type: 'caution_barrier', x: 220, y: 540 },
          { type: 'penthouse_banner', x: 1750, y: 360, text: 'LEBROWN TOWER' }
        ],
        entities: [
          { x: 280, y: 540, w: 24, h: 56, hp: 6, maxHp: 6, type: 'brawler', name: "Hardhat Enforcer", isTarget: true, isDead: false },
          { x: 600, y: 440, w: 24, h: 56, hp: 6, maxHp: 6, type: 'kicker', name: "Girder Acrobat", isTarget: true, isDead: false },
          { x: 960, y: 340, w: 24, h: 56, hp: 7, maxHp: 7, type: 'ninja', name: "Crane Shinobi", isTarget: true, isDead: false },
          { x: 1350, y: 250, w: 24, h: 56, hp: 7, maxHp: 7, type: 'brawler', name: "Heavy Riveter", isTarget: true, isDead: false },
          { x: 1920, y: 460, w: 28, h: 60, hp: 12, maxHp: 12, type: 'boss', name: "Tower General", isTarget: true, isDead: false }
        ],
        goal: { x: 2180, y: 380, w: 60, h: 80 }
      },

      // =======================================================
      // ACT 5: LEBROWN'S PENTHOUSE VAULT & MJ'S CAGE (FINAL BOSS)
      // =======================================================
      {
        isInfinite: false,
        name: "ACT 5: LEBROWN'S VAULT (FINAL BOSS)",
        subtitle: "Defeat LeBrown Jameson & Rescue Michael Jordan!",
        theme: 'vault',
        belt: "BLACK",
        beltColor: "#111827",
        startX: 100,
        startY: 540,
        killY: 1200,
        isFinalBoss: true,
        platforms: [
          { x: 0, y: 540, w: 420, h: 60, type: 'gold_floor' },
          { x: 460, y: 440, w: 280, h: 35, type: 'gold_balcony' },
          { x: 780, y: 540, w: 950, h: 60, type: 'boss_arena' } // Giant final boss arena
        ],
        breakables: [
          { x: 430, y: 450, w: 22, h: 90, broken: false },
          { x: 750, y: 450, w: 22, h: 90, broken: false }
        ],
        checkpoints: [
          { x: 480, y: 380, w: 30, h: 60, activated: false }
        ],
        decorations: [
          // Michael Jordan in his cage shooting paper balls into a trash can!
          {
            type: 'mj_cage_scene',
            x: 1050,
            y: 540,
            w: 120,
            h: 110
          },
          { type: 'shoe_shrine', x: 1250, y: 540, label: "MJ'S LEFT SHOE" }
        ],
        entities: [
          { x: 280, y: 540, w: 24, h: 56, hp: 6, maxHp: 6, type: 'ninja', name: "Vault Guard", isTarget: true, isDead: false },
          { x: 580, y: 440, w: 24, h: 56, hp: 6, maxHp: 6, type: 'kicker', name: "Elite Sentry", isTarget: true, isDead: false },
          // GIANT FINAL BOSS: LEBROWN JAMESON!
          {
            x: 1450,
            y: 540,
            w: 36,
            h: 76,
            hp: 22,
            maxHp: 22,
            type: 'boss',
            name: "GIANT LEBROWN JAMESON",
            isGiantLeBrown: true,
            isTarget: true,
            isDead: false
          }
        ],
        goal: { x: 1650, y: 460, w: 60, h: 80 }
      }
    ];
  }

  // -----------------------------------------------------------
  // INFINITE PROCEDURAL ENDLESS WORLD GENERATOR
  // Dynamically cycles through 4 distinct visual themes every 400m
  // -----------------------------------------------------------
  createInfiniteEndlessWorld() {
    const world = {
      isInfinite: true,
      name: "INFINITE GAUNTLET",
      belt: "WHITE",
      beltColor: "#ffffff",
      startX: 100,
      startY: 540,
      killY: 1100,
      platforms: [],
      breakables: [],
      entities: [],
      decorations: [],
      nextGenX: 0,
      lastGroundY: 540,
      chunkIndex: 0
    };

    world.platforms.push({ x: 0, y: 540, w: 600, h: 60, type: 'ground' });
    world.decorations.push({ type: 'torii_gate', x: 80, y: 540, w: 80, h: 120, label: 'START' });
    world.nextGenX = 600;

    this.streamInfiniteWorld(world, 100, 3000);
    return world;
  }

  streamInfiniteWorld(world, playerX, viewAhead = 2500) {
    while (world.nextGenX < playerX + viewAhead) {
      this.generateNextChunk(world);
    }

    const pruneX = playerX - 1600;
    world.platforms = world.platforms.filter(p => p.x + p.w > pruneX);
    world.breakables = world.breakables.filter(b => b.x + b.w > pruneX);
    world.decorations = world.decorations.filter(d => d.x + (d.w || 100) > pruneX);
    world.entities = world.entities.filter(e => e.x > pruneX || !e.isDead);
  }

  generateNextChunk(world) {
    const chunkIdx = world.chunkIndex++;
    // Theme cycles: 0 = Pagoda, 1 = Cyber City, 2 = Basketball Arena, 3 = Highrise Construction
    const themeIndex = Math.floor((world.nextGenX / 400)) % 4;
    let startX = world.nextGenX;
    let baseGroundY = Math.max(340, Math.min(540, world.lastGroundY));

    const difficultyScale = 1.0 + (startX / 2400);

    if (themeIndex === 0) {
      // --- THEME 1: JAPANESE PAGODA REALM ---
      const pagodaW = 480;
      startX += 80;
      world.platforms.push({ x: startX, y: baseGroundY, w: pagodaW, h: 50, theme: 'dojo' });
      world.platforms.push({ x: startX + 60, y: baseGroundY - 100, w: pagodaW - 120, h: 25, theme: 'dojo' });

      world.decorations.push({ type: 'pagoda_structure', x: startX + pagodaW / 2, y: baseGroundY, w: pagodaW, tiers: 2 });
      world.entities.push({
        x: startX + pagodaW / 2,
        y: baseGroundY,
        w: 24,
        h: 56,
        hp: Math.floor(4 * difficultyScale),
        maxHp: Math.floor(4 * difficultyScale),
        type: 'brawler',
        name: "Pagoda Guard",
        isTarget: true,
        isDead: false
      });

      world.nextGenX = startX + pagodaW;
      world.lastGroundY = baseGroundY;

    } else if (themeIndex === 1) {
      // --- THEME 2: CYBER CITY ALLEY ---
      const platW = 420;
      startX += 80;
      baseGroundY = Math.max(320, Math.min(520, baseGroundY + (Math.random() > 0.5 ? -60 : 60)));
      world.platforms.push({ x: startX, y: baseGroundY, w: platW, h: 45, theme: 'city' });

      world.decorations.push({ type: 'city_billboard', x: startX + 120, y: baseGroundY - 160, text: 'CYBER ALLEY' });
      world.decorations.push({ type: 'dumpster_prop', x: startX + 60, y: baseGroundY });
      world.breakables.push({ x: startX + platW - 20, y: baseGroundY - 90, w: 20, h: 90, broken: false });

      world.entities.push({
        x: startX + 220,
        y: baseGroundY,
        w: 24,
        h: 56,
        hp: Math.floor(4 * difficultyScale),
        maxHp: Math.floor(4 * difficultyScale),
        type: 'ninja',
        name: "Cyber Shinobi",
        isTarget: true,
        isDead: false
      });

      world.nextGenX = startX + platW;
      world.lastGroundY = baseGroundY;

    } else if (themeIndex === 2) {
      // --- THEME 3: MLB BASKETBALL COURT ---
      const courtW = 500;
      startX += 80;
      world.platforms.push({ x: startX, y: baseGroundY, w: courtW, h: 50, theme: 'arena' });
      world.decorations.push({ type: 'basketball_hoop', x: startX + 100, y: baseGroundY });
      world.decorations.push({ type: 'stadium_scoreboard', x: startX + courtW / 2, y: baseGroundY - 140, text: 'MLB LEAGUE' });

      world.entities.push({
        x: startX + courtW / 2,
        y: baseGroundY,
        w: 26,
        h: 58,
        hp: Math.floor(5 * difficultyScale),
        maxHp: Math.floor(5 * difficultyScale),
        type: 'kicker',
        name: "Court Veteran",
        isTarget: true,
        isDead: false
      });

      world.nextGenX = startX + courtW;
      world.lastGroundY = baseGroundY;

    } else {
      // --- THEME 4: HIGH-RISE CONSTRUCTION SITE ---
      const towerW = 520;
      startX += 80;
      world.platforms.push({ x: startX, y: baseGroundY, w: towerW, h: 50, theme: 'construction' });
      world.decorations.push({ type: 'crane_hook', x: startX + 200, y: baseGroundY - 180 });
      world.decorations.push({ type: 'torii_gate', x: startX + 60, y: baseGroundY, w: 80, h: 120, label: `${Math.floor(startX / 10)}m` });

      const isBoss = chunkIdx % 6 === 0;
      world.entities.push({
        x: startX + towerW / 2,
        y: baseGroundY,
        w: isBoss ? 28 : 24,
        h: isBoss ? 62 : 56,
        hp: Math.floor((isBoss ? 10 : 5) * difficultyScale),
        maxHp: Math.floor((isBoss ? 10 : 5) * difficultyScale),
        type: isBoss ? 'boss' : 'brawler',
        name: isBoss ? "TOWER CHAMPION" : "Construction Guard",
        isTarget: true,
        isDead: false
      });

      world.nextGenX = startX + towerW;
      world.lastGroundY = baseGroundY;
    }
  }
}

window.LevelGenerator = new LevelGenerator();
window.STAGES = window.LevelGenerator.getCampaignStages();
