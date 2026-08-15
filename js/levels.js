/* =========================================================
   INFINITE PROCEDURAL STREAMING WORLD ("HOLLAND")
   - Continuous Infinite Chunk Generator (Goes on forever!)
   - Architectural Set-Pieces: Pagoda Towers, Torii Gates,
     Sakura Blossom Trees, Hanging Lanterns & Rope Bridges
   - 24 Ranked Campaign Acts + Infinite Dynamic Endless Mode
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
      if (dist >= b.dist) {
        current = b;
      }
    }
    return current;
  }

  // -----------------------------------------------------------
  // INFINITE ENDLESS WORLD INITIALIZER
  // -----------------------------------------------------------
  createInfiniteEndlessWorld() {
    const world = {
      isInfinite: true,
      name: "ENDLESS PAGODA REALM",
      belt: "WHITE",
      beltColor: "#ffffff",
      startX: 100,
      startY: 540,
      killY: 1100,
      platforms: [],
      breakables: [],
      entities: [],
      decorations: [], // Pagodas, Torii Gates, Cherry Blossom Trees, Lanterns
      nextGenX: 0,
      lastGroundY: 540,
      milestoneX: 500, // Distance milestone counter
      chunkIndex: 0
    };

    // Starting Dojo Courtyard
    world.platforms.push({ x: 0, y: 540, w: 600, h: 60, type: 'ground' });
    world.decorations.push({
      type: 'torii_gate',
      x: 80,
      y: 540,
      w: 80,
      h: 120,
      label: 'START'
    });

    world.nextGenX = 600;

    // Generate initial 2500px forward chunks
    this.streamInfiniteWorld(world, 100, 3000);

    return world;
  }

  // -----------------------------------------------------------
  // PROCEDURAL STREAMING CHUNK GENERATOR
  // Dynamically adds pagodas, rooftops, torii gates, and enemies ahead of player
  // -----------------------------------------------------------
  streamInfiniteWorld(world, playerX, viewAhead = 2500) {
    while (world.nextGenX < playerX + viewAhead) {
      this.generateNextChunk(world);
    }

    // Garbage-collect old world elements 1600px behind player for 60fps performance
    const pruneX = playerX - 1600;
    world.platforms = world.platforms.filter(p => p.x + p.w > pruneX);
    world.breakables = world.breakables.filter(b => b.x + b.w > pruneX);
    world.decorations = world.decorations.filter(d => d.x + (d.w || 100) > pruneX);
    world.entities = world.entities.filter(e => e.x > pruneX || !e.isDead);
  }

  generateNextChunk(world) {
    const chunkIdx = world.chunkIndex++;
    const themeType = chunkIdx % 4; // 0 = Multi-Tier Pagoda, 1 = Rooftop Gauntlet, 2 = Torii Bridge, 3 = Dojo Courtyard
    let startX = world.nextGenX;
    let baseGroundY = Math.max(340, Math.min(560, world.lastGroundY));

    const enemyPool = ['brawler', 'kicker', 'ninja', 'boss'];
    const difficultyScale = 1.0 + (startX / 2500);

    if (themeType === 0) {
      // --- 1. MULTI-TIER PAGODA TOWER COMPLEX ---
      const pagodaW = 480;
      const gap = 80;
      startX += gap;

      // Base Pagoda Floor
      world.platforms.push({ x: startX, y: baseGroundY, w: pagodaW, h: 50, type: 'pagoda_base' });

      // Tier 1 Balcony
      world.platforms.push({ x: startX + 60, y: baseGroundY - 100, w: pagodaW - 120, h: 25, type: 'pagoda_roof' });

      // Tier 2 Rooftop
      world.platforms.push({ x: startX + 130, y: baseGroundY - 190, w: pagodaW - 260, h: 25, type: 'pagoda_top' });

      // Multi-Tier Pagoda Decoration
      world.decorations.push({
        type: 'pagoda_structure',
        x: startX + pagodaW / 2,
        y: baseGroundY,
        w: pagodaW,
        tiers: 3
      });

      // Spawn Enemies on Balconies
      world.entities.push({
        x: startX + 160,
        y: baseGroundY,
        w: 24,
        h: 56,
        hp: Math.floor(3 * difficultyScale),
        maxHp: Math.floor(3 * difficultyScale),
        type: 'brawler',
        name: "Pagoda Guard",
        isTarget: true,
        isDead: false
      });

      world.entities.push({
        x: startX + pagodaW / 2,
        y: baseGroundY - 190,
        w: 24,
        h: 56,
        hp: Math.floor(4 * difficultyScale),
        maxHp: Math.floor(4 * difficultyScale),
        type: 'ninja',
        name: "Pagoda Sentry",
        isTarget: true,
        isDead: false
      });

      world.nextGenX = startX + pagodaW;
      world.lastGroundY = baseGroundY;

    } else if (themeType === 1) {
      // --- 2. SAKURA TREE ROOFTOP GAUNTLET ---
      const platW = 380;
      const gap = 90;
      startX += gap;
      baseGroundY = Math.max(320, Math.min(520, baseGroundY + (Math.random() > 0.5 ? -60 : 60)));

      world.platforms.push({ x: startX, y: baseGroundY, w: platW, h: 40, type: 'roof' });

      // Cherry Blossom Tree Decoration
      world.decorations.push({
        type: 'sakura_tree',
        x: startX + 80,
        y: baseGroundY
      });

      // Wooden Breakable Gate
      world.breakables.push({
        x: startX + platW - 20,
        y: baseGroundY - 90,
        w: 18,
        h: 90,
        broken: false
      });

      // Kicking Monk on Roof
      world.entities.push({
        x: startX + 240,
        y: baseGroundY,
        w: 24,
        h: 56,
        hp: Math.floor(3 * difficultyScale),
        maxHp: Math.floor(3 * difficultyScale),
        type: 'kicker',
        name: "Sakura Duelist",
        isTarget: true,
        isDead: false
      });

      world.nextGenX = startX + platW;
      world.lastGroundY = baseGroundY;

    } else if (themeType === 2) {
      // --- 3. CRIMSON TORII MILESTONE & ROPE BRIDGE ---
      const bridgeW = 420;
      const gap = 80;
      startX += gap;

      world.platforms.push({ x: startX, y: baseGroundY, w: bridgeW, h: 30, type: 'bridge' });

      // Torii Gate Milestone
      world.decorations.push({
        type: 'torii_gate',
        x: startX + 60,
        y: baseGroundY,
        w: 80,
        h: 130,
        label: `${Math.floor(startX / 10)}m`
      });

      // Hanging Lanterns
      world.decorations.push({
        type: 'lantern',
        x: startX + 220,
        y: baseGroundY - 70
      });

      // Sentry Ninja
      world.entities.push({
        x: startX + 320,
        y: baseGroundY,
        w: 24,
        h: 56,
        hp: Math.floor(4 * difficultyScale),
        maxHp: Math.floor(4 * difficultyScale),
        type: 'ninja',
        name: "Bridge Shinobi",
        isTarget: true,
        isDead: false
      });

      world.nextGenX = startX + bridgeW;
      world.lastGroundY = baseGroundY;

    } else {
      // --- 4. DOJO ARENA & GRANDMASTER ENCOUNTER ---
      const arenaW = 540;
      const gap = 70;
      startX += gap;

      world.platforms.push({ x: startX, y: baseGroundY, w: arenaW, h: 60, type: 'ground' });

      // Hanging Dojo Banner
      world.decorations.push({
        type: 'dojo_banner',
        x: startX + 50,
        y: baseGroundY - 80
      });

      // Grandmaster / Elite Encounter
      const isBoss = chunkIdx % 8 === 0;
      const hp = Math.floor((isBoss ? 10 : 5) * difficultyScale);

      world.entities.push({
        x: startX + arenaW / 2,
        y: baseGroundY,
        w: isBoss ? 28 : 24,
        h: isBoss ? 60 : 56,
        hp: hp,
        maxHp: hp,
        type: isBoss ? 'boss' : 'brawler',
        name: isBoss ? "GRANDMASTER DUELIST" : "Elite Veteran",
        isTarget: true,
        isDead: false
      });

      world.nextGenX = startX + arenaW;
      world.lastGroundY = baseGroundY;
    }
  }

  // -----------------------------------------------------------
  // 24 CAMPAIGN ACT GENERATOR
  // -----------------------------------------------------------
  generateStage(actIndex) {
    const actNumber = actIndex + 1;
    const belt = this.getBeltForDistance(actIndex * 300);
    const difficulty = Math.min(1.0 + actIndex * 0.15, 3.5);

    const stageLength = Math.min(2200 + actIndex * 250, 4800);
    const startX = 80;
    const startY = 540;

    const platforms = [{ x: 0, y: 540, w: 420, h: 60 }];
    const breakables = [];
    const checkpoints = [];
    const entities = [];
    const decorations = [{ type: 'torii_gate', x: 70, y: 540, w: 80, h: 120, label: `ACT ${actNumber}` }];

    let curX = 400;
    let curY = 540;
    const sectionCount = Math.floor(stageLength / 380);

    for (let s = 0; s < sectionCount; s++) {
      const platW = 340 + Math.random() * 120;
      curX += 80;
      curY = Math.max(320, Math.min(540, curY + (Math.random() > 0.5 ? -60 : 60)));

      platforms.push({ x: curX, y: curY, w: platW, h: 50 });

      // Pagoda / Sakura decoration
      if (s % 2 === 0) {
        decorations.push({ type: 'pagoda_structure', x: curX + platW / 2, y: curY, w: platW, tiers: 2 });
      } else {
        decorations.push({ type: 'sakura_tree', x: curX + 60, y: curY });
      }

      // Enemies
      const entType = s === sectionCount - 1 ? 'boss' : (s % 3 === 0 ? 'ninja' : s % 2 === 0 ? 'kicker' : 'brawler');
      const hp = Math.floor((entType === 'boss' ? 8 : 3) * (1 + actIndex * 0.08));

      entities.push({
        x: curX + platW / 2,
        y: curY,
        w: 26,
        h: 56,
        hp: hp,
        maxHp: hp,
        type: entType,
        name: entType === 'boss' ? `Act ${actNumber} Grandmaster` : `Martial ${entType.toUpperCase()}`,
        isTarget: true,
        isDead: false
      });

      if (Math.random() > 0.4) {
        breakables.push({ x: curX + platW - 15, y: curY - 90, w: 18, h: 90, broken: false });
      }

      curX += platW;
    }

    // Goal Gate
    curX += 80;
    platforms.push({ x: curX, y: curY, w: 500, h: 60 });
    decorations.push({ type: 'torii_gate', x: curX + 220, y: curY, w: 80, h: 120, label: 'GOAL' });

    const goal = { x: curX + 400, y: curY - 80, w: 60, h: 80 };

    return {
      isInfinite: false,
      name: `ACT ${actNumber}: ${this.getActThemeTitle(actNumber)}`,
      belt: belt.name,
      beltColor: belt.color,
      startX: startX,
      startY: startY,
      killY: 1200,
      platforms: platforms,
      breakables: breakables,
      hazards: [],
      saws: [],
      trampolines: [],
      checkpoints: checkpoints,
      decorations: decorations,
      entities: entities,
      goal: goal
    };
  }

  getActThemeTitle(actNumber) {
    const titles = [
      "Dojo Showdown", "Rooftop Ambush", "The High Temple", "Grandmaster's Arena",
      "Neon Pagoda", "Shadow Courtyard", "Iron Bamboo Forest", "Dragon's Gate",
      "Thunder Citadel", "Midnight Pavilion", "Tiger's Den", "Wind Walker's Trial",
      "Serpent's Ridge", "Crimson Shrine", "Obsidian Sanctum", "Imperial Fortress",
      "Void Rift Dojo", "Eclipse Gauntlet", "Golden Lotus Tower", "Phantom Vanguard",
      "Demon Blade Realm", "Celestial Summit", "Immortal Champion", "Supreme Final Trial"
    ];
    return titles[(actNumber - 1) % titles.length];
  }
}

window.LevelGenerator = new LevelGenerator();

const STAGES = [];
for (let i = 0; i < 24; i++) {
  STAGES.push(window.LevelGenerator.generateStage(i));
}

window.STAGES = STAGES;
