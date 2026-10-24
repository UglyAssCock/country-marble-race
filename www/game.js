// Country Marble Race Pro (v5.0 Landscape Widescreen Edition)
// - 100% Passable Widescreen Arenas (Sloped Floors + Wide 110px+ Chutes = Zero Impossible Barriers!)
// - RED ZONE TELEPORT RULE: Any marble touching a Red Zone (#ff1e42) flashes red, spawns particles, and restarts from the top!
// - Full-Bleed Borderless Vector + Emoji Flag Marbles & Custom Logo Marbles
(function () {
  function hashSeed(str) {
    const s = String(str || "MARBLE-2026");
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function createRNG(seed) {
    let t = (typeof seed === "string" ? hashSeed(seed) : seed) >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Offline Web Audio Synthesizer + Stadium BGM Controller
  const SFX = {
    ctx: null,
    enabled: true,
    musicEnabled: false,
    trackIdx: 1,
    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const Actx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Actx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    },
    playTone(freq, dur, type, vol) {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol || 0.07, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
      } catch (e) {}
    },
    redZoneBuzzer() {
      this.playTone(190, 0.11, "sawtooth", 0.08);
      setTimeout(() => this.playTone(135, 0.14, "sawtooth", 0.08), 50);
    },
    qualifyDing() {
      this.playTone(660, 0.09, "triangle", 0.07);
      setTimeout(() => this.playTone(880, 0.12, "triangle", 0.07), 55);
    },
    winFanfare() {
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.18, "triangle", 0.1), i * 95);
      });
    }
  };

  const STORAGE_KEY = "CMR_SAVE_V6";
  const defaultSave = {
    coins: 400,
    equippedSkin: "default",
    unlockedSkins: ["default"],
    achievements: [],
    presets: [],
    customMarbles: [],
    customTournaments: [],
    customTrack: [
      { type: "diamond", x: 140, y: 160, angle: 45, scale: 1 },
      { type: "diamond", x: 260, y: 160, angle: 45, scale: 1 },
      { type: "diamond", x: 380, y: 160, angle: 45, scale: 1 },
      { type: "redReset", x: 200, y: 280, angle: 0, scale: 1 },
      { type: "redReset", x: 320, y: 280, angle: 0, scale: 1 },
      { type: "circleNode", x: 180, y: 420, angle: 0, scale: 1.1 },
      { type: "circleNode", x: 340, y: 420, angle: 0, scale: 1.1 },
      { type: "star", x: 260, y: 600, angle: 0, scale: 1.2 },
      { type: "halfMoon", x: 160, y: 780, angle: 25, scale: 1.1 },
      { type: "halfMoon", x: 360, y: 780, angle: -25, scale: 1.1 },
      { type: "ghostZone", x: 260, y: 960, angle: 0, scale: 1.1 },
      { type: "redReset", x: 260, y: 1140, angle: 0, scale: 1.2 }
    ],
    settings: {
      lang: "en",
      maxMarbles: 256,
      fontScale: 1,
      orientation: "landscape",
      sound: 1,
      music: 0
    },
    career: {
      countryCode: "DZ",
      stage: 0
    },
    records: {
      bestComeback: { country: "--", gained: 0 },
      closestFinish: { pair: "--", ms: 99999 },
      longestStreak: { country: "--", streak: 0 }
    },
    stats: {}
  };

  let State = loadState();
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("CMR_SAVE_V5");
      if (!raw) return JSON.parse(JSON.stringify(defaultSave));
      const parsed = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(defaultSave)), parsed);
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultSave));
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(State));
    } catch (e) {}
    UI.refreshHeader();
  }

  function getAllMarblesPool() {
    return [...(State.customMarbles || []), ...window.GAME_DATA.countries];
  }

  function findMarbleByCode(code) {
    const baseCode = String(code || "DZ").split("#")[0];
    return getAllMarblesPool().find(c => c.code === baseCode) || window.GAME_DATA.countries[0];
  }

  function ensureCountryStat(code) {
    const baseCode = String(code || "DZ").split("#")[0];
    if (!State.stats[baseCode]) {
      State.stats[baseCode] = { races: 0, wins: 0, podiums: 0, points: 0, posSum: 0, cups: 0, recent: [], streak: 0 };
    }
    return State.stats[baseCode];
  }

  // ============================================================================
  // FULL-BLEED BORDERLESS FLAG & CUSTOM LOGO TEXTURE CACHE
  // ============================================================================
  const MarbleTextureCache = {
    cache: {},
    clear(code) {
      if (code) delete this.cache[code];
      else this.cache = {};
    },
    getTexture(country) {
      const key = country.code.split("#")[0];
      if (this.cache[key]) return this.cache[key];

      const size = 80;
      const half = size / 2;
      const cnv = document.createElement("canvas");
      cnv.width = size;
      cnv.height = size;
      const ctx = cnv.getContext("2d");

      ctx.save();
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (country.logoDataUrl) {
        ctx.fillStyle = country.color || "#ef4444";
        ctx.fillRect(0, 0, size, size);
        const img = new Image();
        img.onload = () => {
          const c2 = cnv.getContext("2d");
          c2.save();
          c2.beginPath();
          c2.arc(half, half, half, 0, Math.PI * 2);
          c2.closePath();
          c2.clip();
          c2.drawImage(img, 0, 0, size, size);
          c2.restore();
        };
        img.src = country.logoDataUrl;
      } else if (country.isCustom && !country.flag) {
        ctx.fillStyle = country.color || "#ef4444";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = country.color2 || "#ffffff";
        ctx.fillRect(0, size * 0.32, size, size * 0.36);
      } else {
        // Draw crisp vector tri-band flag base so zero background gaps ever appear,
        // then overlay edge-to-edge stretched flag emoji!
        const cols = country.stripeColors || [country.color || "#1e293b", "#ffffff", country.color || "#1e293b"];
        ctx.fillStyle = cols[0];
        ctx.fillRect(0, 0, size, size / 3);
        ctx.fillStyle = cols[1];
        ctx.fillRect(0, size / 3, size, size / 3);
        ctx.fillStyle = cols[2];
        ctx.fillRect(0, (size * 2) / 3, size, size / 3);

        ctx.save();
        ctx.translate(half, half + 2);
        ctx.scale(1.42, 1.82);
        ctx.font = "64px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(country.flag || "🏳️", 0, 0);
        ctx.restore();
      }

      ctx.restore();
      this.cache[key] = cnv;
      return cnv;
    }
  };

  // ============================================================================
  // 100% PASSABLE WIDESCREEN ARENA BUILDERS + RED RESET ZONES (ARENA_W = 1280px)
  // ============================================================================
  // Every single gap is >= 105px wide (marbles are 28px-32px wide) and all horizontal
  // floors are sloped downward toward the exit so NO marble can ever get blocked!
  // Red Reset Zones (sec.RedZones) immediately teleport any touching marble back to Start!
  const ARENA_W = 1280;
  const PERIWINKLE = "#798eff";
  const BLACK = "#000000";
  const RED_RESET = "#ff1111";
  const GREEN_SAFE = "#00ff22";

  function buildArcWalls(cx, cy, r, aStart, aEnd, steps, thick, color) {
    const list = [];
    for (let i = 0; i < steps; i++) {
      const a1 = aStart + ((aEnd - aStart) * i) / steps;
      const a2 = aStart + ((aEnd - aStart) * (i + 1)) / steps;
      list.push({
        x1: cx + Math.cos(a1) * r,
        y1: cy + Math.sin(a1) * r,
        x2: cx + Math.cos(a2) * r,
        y2: cy + Math.sin(a2) * r,
        thick: thick || 22,
        color: color || BLACK
      });
    }
    return list;
  }

  function addRedZonesByDifficulty(sec, y0, h, diff, customSpots) {
    const count = diff === "hard" ? customSpots.length : diff === "easy" ? Math.max(1, Math.floor(customSpots.length * 0.45)) : Math.max(2, Math.floor(customSpots.length * 0.75));
    for (let i = 0; i < count; i++) {
      const sp = customSpots[i];
      sec.RedZones.push({
        x: sp.x,
        y: sp.y,
        w: sp.w || 64,
        h: sp.h || 22
      });
    }
  }

  const ARENA_BUILDERS = {
    // 1. Diamond Plinko Lattice (Wide 145px spacing so marbles flow smoothly + Red Reset Diamonds)
    diamondGrid(sec, y0, h, diff) {
      const cx = ARENA_W / 2;
      sec.Banners.push({ x: 30, y: y0 + 20, w: cx - 70, h: 18, color: GREEN_SAFE });
      sec.Banners.push({ x: cx + 40, y: y0 + 20, w: cx - 70, h: 18, color: GREEN_SAFE });

      const rows = 8;
      const startY = y0 + 135;
      const spacingY = (h - 270) / rows;
      const spacingX = 148;
      const diamondSize = 52; // Leaves 96px+ diagonal channel everywhere!

      const redCandidates = [];
      for (let r = 0; r < rows; r++) {
        const ry = startY + r * spacingY;
        const isOdd = r % 2 === 1;
        const cols = isOdd ? 7 : 8;
        const offsetX = isOdd ? 195 : 122;

        if (!isOdd) {
          sec.Polys.push({ pts: [{ x: 25, y: ry - 55 }, { x: 80, y: ry }, { x: 25, y: ry + 55 }], color: BLACK });
          sec.Polys.push({ pts: [{ x: ARENA_W - 25, y: ry - 55 }, { x: ARENA_W - 80, y: ry }, { x: ARENA_W - 25, y: ry + 55 }], color: BLACK });
        }

        for (let c = 0; c < cols; c++) {
          const dx = offsetX + c * spacingX;
          if (r === 0 && (c === 3 || c === 4)) continue;

          // Red Reset trap blocks on lower rows
          if (r >= 2 && (r + c) % 6 === 0) {
            redCandidates.push({ x: dx - 24, y: ry - 12, w: 48, h: 24 });
            continue;
          }

          const isBlue = (r + c) % 5 === 0;
          sec.Boxes.push({
            x: dx,
            y: ry,
            w: isBlue ? diamondSize * 0.72 : diamondSize,
            h: isBlue ? diamondSize * 0.72 : diamondSize,
            angle: Math.PI / 4,
            color: isBlue ? "#0018ff" : BLACK,
            restitution: isBlue ? 0.95 : 0.55
          });
        }
      }
      addRedZonesByDifficulty(sec, y0, h, diff, redCandidates);
    },

    // 2. Circular Gear Matrix & Red Reset Bottom Gates (Matches Screenshot 2 & 6!)
    circleGearMatrix(sec, y0, h, diff) {
      const rows = 5;
      const cols = 8;
      const startY = y0 + 145;
      const stepY = (h - 310) / rows;
      const stepX = 142; // Wide 142px spacing so marbles never jam between gears!
      const startX = 142;

      sec.Walls.push({ x1: 25, y1: y0 + 45, x2: 105, y2: startY, thick: 32, color: BLACK });
      sec.Walls.push({ x1: ARENA_W - 25, y1: y0 + 45, x2: ARENA_W - 105, y2: startY, thick: 32, color: BLACK });

      for (let r = 0; r < rows; r++) {
        const ry = startY + r * stepY;
        for (let c = 0; c < cols; c++) {
          const cx = startX + c * stepX;
          sec.Pegs.push({ x: cx, y: ry, r: 18, color: BLACK, restitution: 0.75 });

          if (c < cols - 1 && r < rows - 1) {
            const midX = cx + stepX / 2;
            const midY = ry + stepY / 2;
            sec.Boxes.push({
              x: midX,
              y: midY,
              w: 32,
              h: 32,
              angle: Math.PI / 4,
              color: BLACK,
              restitution: 0.65
            });
          }
        }
      }

      // Bottom Alternating GREEN (Pass) & RED (Reset to Start!) Gates from Screenshot 2 & 6
      const gateY = y0 + h - 95;
      const redGates = [];
      for (let c = 0; c < cols; c++) {
        const gx = startX + c * stepX;
        const isGreen = c % 2 === 0 || (diff === "easy" && c !== 3);
        if (isGreen) {
          sec.Banners.push({ x: gx - 22, y: gateY, w: 44, h: 24, color: GREEN_SAFE });
        } else {
          redGates.push({ x: gx - 24, y: gateY, w: 48, h: 24 });
        }
      }
      addRedZonesByDifficulty(sec, y0, h, diff, redGates);
    },

    // 3. Curved Chutes, Musical Note Hammers & Red Reset Hazards (Matches Screenshot 3!)
    musicalHammers(sec, y0, h, diff) {
      const cx = ARENA_W / 2;

      sec.Banners.push({ x: cx - 10, y: y0 + 40, w: 20, h: (h - 160) * 0.5, color: GREEN_SAFE });
      sec.Banners.push({ x: cx - 10, y: y0 + 40 + (h - 160) * 0.5, w: 20, h: (h - 160) * 0.45, color: "#eeff00" });

      for (let i = 0; i < 3; i++) {
        const sy = y0 + 230 + i * ((h - 460) / 3);
        sec.Boxes.push({ x: cx, y: sy, w: 48, h: 48, angle: Math.PI / 4, color: BLACK });
      }

      // Wide Curved Side Chutes (110px wide lanes so marbles never jam!)
      for (let i = 0; i < 3; i++) {
        const chuteY = y0 + 220 + i * 310;
        sec.Walls.push(...buildArcWalls(210, chuteY, 130, Math.PI * 0.45, Math.PI * 0.92, 6, 18, BLACK));
        sec.Walls.push(...buildArcWalls(ARENA_W - 210, chuteY, 130, Math.PI * 0.08, Math.PI * 0.55, 6, 18, BLACK));
      }

      // Musical Note Hammers
      const notes = [
        { x: 420, y: y0 + 270, dir: -1 }, { x: 860, y: y0 + 270, dir: 1 },
        { x: 330, y: y0 + 520, dir: -1 }, { x: 490, y: y0 + 520, dir: -1 },
        { x: 790, y: y0 + 520, dir: 1 },  { x: 950, y: y0 + 520, dir: 1 },
        { x: 350, y: y0 + 780, dir: -1 }, { x: 500, y: y0 + 780, dir: -1 },
        { x: 780, y: y0 + 780, dir: 1 },  { x: 930, y: y0 + 780, dir: 1 }
      ];
      notes.forEach(nc => {
        const tilt = nc.dir * 0.28;
        sec.Walls.push({
          x1: nc.x - Math.cos(tilt) * 36,
          y1: nc.y - Math.sin(tilt) * 36,
          x2: nc.x + Math.cos(tilt) * 36,
          y2: nc.y + Math.sin(tilt) * 36,
          thick: 14,
          color: BLACK
        });
        sec.Pegs.push({ x: nc.x - nc.dir * 22, y: nc.y + 36, r: 13, color: BLACK, restitution: 0.85 });
      });

      // Red Reset Laser Segments at the bottom flanks
      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 180, y: y0 + h - 105, w: 95, h: 20 },
        { x: ARENA_W - 275, y: y0 + h - 105, w: 95, h: 20 },
        { x: cx - 180, y: y0 + 640, w: 65, h: 20 },
        { x: cx + 115, y: y0 + 640, w: 65, h: 20 }
      ]);
    },

    // 4. 3-Tier Sloped Star Maze & Side Elevators (FIXED: Sloped floors + 160px center gaps so 100% passable!)
    starConveyorMaze(sec, y0, h, diff) {
      const tiers = 3;
      const tierH = (h - 180) / tiers;
      const cx = ARENA_W / 2;

      for (let t = 0; t < tiers; t++) {
        const ty = y0 + 60 + t * tierH;
        const botY = ty + tierH;

        // Angled Sloped Floors (12° downward slope toward a wide 190px center opening!)
        if (t < tiers - 1) {
          sec.Walls.push({ x1: 110, y1: botY - 55, x2: cx - 95, y2: botY + 15, thick: 26, color: BLACK });
          sec.Walls.push({ x1: ARENA_W - 110, y1: botY - 55, x2: cx + 95, y2: botY + 15, thick: 26, color: BLACK });
        }

        // Rotating 4-Point Black Stars with plenty of clearance
        const starCols = t % 2 === 0 ? [310, 640, 970] : [260, 510, 770, 1020];
        starCols.forEach((sx, idx) => {
          sec.Spinners.push({
            x: sx,
            y: ty + tierH * 0.45,
            len: 105,
            thick: 20,
            speed: (idx % 2 === 0 ? 1 : -1) * 0.05,
            color: BLACK,
            style: "star4"
          });
        });

        // Side Boost Tubes
        sec.Zones.push({
          x: 35,
          y: ty + 15,
          w: 58,
          h: tierH - 30,
          kind: "conveyorDown",
          color: "#22242a",
          arrowColor: t === 0 ? GREEN_SAFE : "#ec4899"
        });
        sec.Zones.push({
          x: ARENA_W - 93,
          y: ty + 15,
          w: 58,
          h: tierH - 30,
          kind: "conveyorDown",
          color: "#22242a",
          arrowColor: t === 2 ? "#eab308" : "#00f2fe"
        });
      }

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 200, y: y0 + tierH * 0.82, w: 68, h: 20 },
        { x: ARENA_W - 268, y: y0 + tierH * 0.82, w: 68, h: 20 },
        { x: cx - 35, y: y0 + tierH * 1.85, w: 70, h: 20 }
      ]);
    },

    // 5. Wide Triple Pinball Flipper Chambers (FIXED: Open bottom chutes so no marble is ever trapped!)
    triplePinballLaunchers(sec, y0, h, diff) {
      const chambers = 3;
      const chW = (ARENA_W - 120) / chambers;

      for (let i = 0; i < chambers; i++) {
        const cx = 60 + chW * (i + 0.5);
        const topY = y0 + 70;
        const midY = y0 + h * 0.55;
        const rad = chW * 0.42;

        // Wide 140px entry funnel into each pinball chamber
        sec.Walls.push({ x1: cx - rad, y1: topY, x2: cx - 75, y2: topY + 180, thick: 24, color: BLACK });
        sec.Walls.push({ x1: cx + rad, y1: topY, x2: cx + 75, y2: topY + 180, thick: 24, color: BLACK });

        // Curved outer chamber walls with a wide 140px bottom exit chute
        sec.Walls.push(...buildArcWalls(cx, midY, rad, Math.PI * 0.62, Math.PI * 1.38, 7, 24, BLACK));
        sec.Walls.push(...buildArcWalls(cx, midY, rad, -Math.PI * 0.38, Math.PI * 0.38, 7, 24, BLACK));

        // Rotating pinball flipper paddle in the center of each chamber
        sec.Spinners.push({ x: cx, y: midY + 20, len: 155, thick: 20, speed: (i % 2 === 0 ? 1 : -1) * 0.055, color: BLACK, style: "bar" });
        sec.Banners.push({ x: cx - 50, y: midY + rad + 10, w: 100, h: 18, color: GREEN_SAFE });
      }

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 240, y: y0 + h - 120, w: 65, h: 20 },
        { x: ARENA_W / 2 - 32, y: y0 + h - 120, w: 65, h: 20 },
        { x: ARENA_W - 305, y: y0 + h - 120, w: 65, h: 20 }
      ]);
    },

    // 6. 4-Story Sloped Cross Capsules & Scalloped Basin (FIXED: Sloped floors & 180px exit gaps!)
    capsuleScallopBowl(sec, y0, h, diff) {
      const stories = 4;
      const capH = 190;
      const startY = y0 + 80;

      for (let s = 0; s < stories; s++) {
        const cy = startY + s * capH;
        const gapOnRight = s % 2 === 0;

        // Sloped capsule floor (tilted 50px downward toward the 220px wide exit gap!)
        if (gapOnRight) {
          sec.Walls.push({ x1: 120, y1: cy + capH - 35, x2: ARENA_W - 340, y2: cy + capH + 15, thick: 22, color: BLACK });
        } else {
          sec.Walls.push({ x1: ARENA_W - 120, y1: cy + capH - 35, x2: 340, y2: cy + capH + 15, thick: 22, color: BLACK });
        }

        // Row of 5 rotating X spinners inside each capsule
        for (let c = 0; c < 5; c++) {
          const sx = 240 + c * 200;
          sec.Spinners.push({
            x: sx,
            y: cy + capH * 0.45,
            len: 125,
            thick: 18,
            speed: ((s + c) % 2 === 0 ? 1 : -1) * 0.05,
            color: BLACK,
            style: "cross"
          });
        }
      }

      // Scalloped Basin below with wide 190px center drain + spinner agitator
      const bowlY = startY + stories * capH + 150;
      const bowlR = 460;
      sec.Walls.push(...buildArcWalls(ARENA_W / 2, bowlY - 90, bowlR, Math.PI * 0.14, Math.PI * 0.41, 6, 30, BLACK));
      sec.Walls.push(...buildArcWalls(ARENA_W / 2, bowlY - 90, bowlR, Math.PI * 0.59, Math.PI * 0.86, 6, 30, BLACK));
      sec.Spinners.push({ x: ARENA_W / 2, y: bowlY + 260, len: 170, thick: 20, speed: 0.05, color: BLACK, style: "cross" });

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 180, y: bowlY + 110, w: 68, h: 22 },
        { x: ARENA_W - 248, y: bowlY + 110, w: 68, h: 22 }
      ]);
    },

    // 7. Tilted Half-Moons & Brown No-Collision Zone (Matches Screenshot 8!)
    halfMoonGhostZone(sec, y0, h, diff) {
      const drawRow = (ry, dir) => {
        for (let c = 0; c < 4; c++) {
          const hx = 230 + c * 270 + (dir > 0 ? -30 : 30);
          sec.HalfMoons.push({ x: hx, y: ry, r: 54, angle: dir * 0.65, color: BLACK });
        }
      };
      drawRow(y0 + 170, 1);
      drawRow(y0 + 350, -1);
      drawRow(y0 + 530, 1);

      sec.Zones.push({
        x: 40,
        y: y0 + 660,
        w: ARENA_W - 80,
        h: 210,
        kind: "ghost",
        label: "NO COLLISION ZONE"
      });

      drawRow(y0 + 1000, -1);
      drawRow(y0 + 1180, 1);

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 350, y: y0 + 1290, w: 75, h: 22 },
        { x: ARENA_W - 425, y: y0 + 1290, w: 75, h: 22 }
      ]);
    },

    // 8. Triple Vertical Oval Peg Lanes (Wide 400px lanes so marbles flow freely!)
    ovalPegChain(sec, y0, h, diff) {
      const laneW = ARENA_W / 3;
      sec.Walls.push({ x1: laneW, y1: y0 + 110, x2: laneW, y2: y0 + h - 150, thick: 24, color: BLACK });
      sec.Walls.push({ x1: laneW * 2, y1: y0 + 110, x2: laneW * 2, y2: y0 + h - 150, thick: 24, color: BLACK });
      // Splitter triangles on top of dividing walls so no marble sits on top of a vertical wall!
      sec.Boxes.push({ x: laneW, y: y0 + 110, w: 36, h: 36, angle: Math.PI / 4, color: BLACK });
      sec.Boxes.push({ x: laneW * 2, y: y0 + 110, w: 36, h: 36, angle: Math.PI / 4, color: BLACK });

      for (let lane = 0; lane < 3; lane++) {
        const lx = lane * laneW + laneW / 2;
        for (let r = 0; r < 6; r++) {
          const py = y0 + 220 + r * 180;
          sec.Pegs.push({ x: lx - 75, y: py, r: 16, color: BLACK, restitution: 0.8 });
          sec.Pegs.push({ x: lx + 75, y: py, r: 16, color: BLACK, restitution: 0.8 });
          sec.Spinners.push({ x: lx, y: py + 90, len: 115, thick: 16, speed: ((lane + r) % 2 === 0 ? 1 : -1) * 0.05, color: BLACK, style: "cross" });
        }
      }

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: laneW * 0.5 - 30, y: y0 + h - 105, w: 60, h: 22 },
        { x: laneW * 1.5 - 30, y: y0 + h - 105, w: 60, h: 22 },
        { x: laneW * 2.5 - 30, y: y0 + h - 105, w: 60, h: 22 }
      ]);
    },

    // 9. Giant Pinwheel & Wide Funnel Drop (FIXED: Open wheel housing with 160px side channels!)
    wheelFunnelDrop(sec, y0, h, diff) {
      const cx = ARENA_W / 2;
      sec.Spinners.push({
        x: cx,
        y: y0 + 260,
        len: 320,
        thick: 24,
        speed: 0.038,
        color: "#ff00aa",
        style: "pinwheel"
      });

      // Wide angled funnel ramps guiding marbles into a 210px wide throat
      sec.Walls.push({ x1: 40, y1: y0 + 380, x2: cx - 105, y2: y0 + 680, thick: 28, color: BLACK });
      sec.Walls.push({ x1: ARENA_W - 40, y1: y0 + 380, x2: cx + 105, y2: y0 + 680, thick: 28, color: BLACK });

      // Lower Dash & Spinner Field
      for (let r = 0; r < 4; r++) {
        const ry = y0 + 820 + r * 140;
        for (let c = 0; c < 5; c++) {
          const dx = 220 + c * 210 + (r % 2) * 55;
          sec.Walls.push({ x1: dx - 32, y1: ry - 12, x2: dx + 32, y2: ry + 12, thick: 14, color: BLACK });
        }
      }

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 180, y: y0 + 960, w: 75, h: 22 },
        { x: ARENA_W - 255, y: y0 + 960, w: 75, h: 22 }
      ]);
    },

    // 10. Serpentine Slanted Planks (Wide 195px drop gaps + steep 15° slope!)
    serpentinePlanks(sec, y0, h, diff) {
      const planks = 7;
      const stepY = (h - 220) / planks;
      const gap = 215;

      for (let i = 0; i < planks; i++) {
        const py = y0 + 110 + i * stepY;
        if (i % 2 === 0) {
          sec.Walls.push({ x1: 30, y1: py - 35, x2: ARENA_W - gap, y2: py + 55, thick: 22, color: BLACK });
        } else {
          sec.Walls.push({ x1: ARENA_W - 30, y1: py - 35, x2: gap, y2: py + 55, thick: 22, color: BLACK });
        }
      }

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: ARENA_W - 160, y: y0 + 110 + stepY * 1.4, w: 58, h: 20 },
        { x: 100, y: y0 + 110 + stepY * 4.4, w: 58, h: 20 }
      ]);
    },

    // 11. Twin Sawtooth Canyons & Star Wheel
    zigzagSawtooth(sec, y0, h, diff) {
      const teeth = 8;
      const stepY = (h - 240) / teeth;
      for (let i = 0; i < teeth; i++) {
        const ty = y0 + 100 + i * stepY;
        sec.Polys.push({ pts: [{ x: 25, y: ty }, { x: 135, y: ty + stepY * 0.5 }, { x: 25, y: ty + stepY }], color: BLACK });
        sec.Polys.push({ pts: [{ x: ARENA_W - 25, y: ty }, { x: ARENA_W - 135, y: ty + stepY * 0.5 }, { x: ARENA_W - 25, y: ty + stepY }], color: BLACK });
      }
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 6; c++) {
          sec.Pegs.push({ x: 260 + c * 150 + (r % 2) * 55, y: y0 + 180 + r * 185, r: 18, color: BLACK, restitution: 0.8 });
        }
      }
      sec.Spinners.push({ x: ARENA_W / 2, y: y0 + h - 220, len: 230, thick: 24, speed: 0.048, color: BLACK, style: "star4" });

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 280, y: y0 + h - 110, w: 72, h: 22 },
        { x: ARENA_W - 352, y: y0 + h - 110, w: 72, h: 22 }
      ]);
    },

    // 12. Stadium Goal Qualification Arena (Pass goal mouth or avoid Red Side Penalties!)
    soccerGoalArena(sec, y0, h, diff) {
      const cx = ARENA_W / 2;
      ARENA_BUILDERS.diamondGrid(sec, y0, h * 0.65, diff);
      const goalY = y0 + h * 0.78;
      sec.Walls.push({ x1: cx - 250, y1: goalY - 70, x2: cx - 250, y2: goalY + 70, thick: 24, color: "#ffffff" });
      sec.Walls.push({ x1: cx + 250, y1: goalY - 70, x2: cx + 250, y2: goalY + 70, thick: 24, color: "#ffffff" });
      sec.Spinners.push({ x: cx, y: goalY, len: 170, thick: 22, speed: 0.055, color: BLACK, style: "bar" });
      sec.Banners.push({ x: cx - 230, y: goalY + 45, w: 460, h: 22, color: GREEN_SAFE });

      // Red Reset Penalty Zones outside the goalposts!
      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 90, y: goalY + 45, w: 120, h: 22 },
        { x: ARENA_W - 210, y: goalY + 45, w: 120, h: 22 }
      ]);
    },

    // 13. Triple Hourglass & Red Reset Bumpers
    hourglassArena(sec, y0, h, diff) {
      const cx = ARENA_W / 2;
      const gap = 165; // Wide 165px hourglass throat!
      [0.28, 0.58, 0.85].forEach((pct, idx) => {
        const py = y0 + h * pct;
        sec.Walls.push({ x1: 30, y1: py - 180, x2: cx - gap / 2, y2: py, thick: 30, color: BLACK });
        sec.Walls.push({ x1: ARENA_W - 30, y1: py - 180, x2: cx + gap / 2, y2: py, thick: 30, color: BLACK });
        sec.Spinners.push({ x: cx, y: py + 95, len: 190, thick: 20, speed: (idx % 2 === 0 ? 1 : -1) * 0.05, color: BLACK, style: "cross" });
      });

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: cx - 240, y: y0 + h * 0.44, w: 70, h: 22 },
        { x: cx + 170, y: y0 + h * 0.44, w: 70, h: 22 },
        { x: cx - 240, y: y0 + h * 0.72, w: 70, h: 22 },
        { x: cx + 170, y: y0 + h * 0.72, w: 70, h: 22 }
      ]);
    },

    // 14. Swinging Hammers & Red Reset Traps
    pendulumArena(sec, y0, h, diff) {
      for (let r = 0; r < 4; r++) {
        const ry = y0 + 210 + r * 310;
        [320, 640, 960].forEach((px, i) => {
          sec.Spinners.push({
            x: px,
            y: ry,
            len: 215,
            thick: 22,
            speed: ((r + i) % 2 === 0 ? 1 : -1) * 0.048,
            color: BLACK,
            style: "cross"
          });
        });
        sec.Pegs.push({ x: 480, y: ry + 145, r: 30, color: BLACK, restitution: 0.9 });
        sec.Pegs.push({ x: 800, y: ry + 145, r: 30, color: BLACK, restitution: 0.9 });
      }

      addRedZonesByDifficulty(sec, y0, h, diff, [
        { x: 140, y: y0 + 520, w: 75, h: 22 },
        { x: ARENA_W - 215, y: y0 + 520, w: 75, h: 22 },
        { x: ARENA_W / 2 - 40, y: y0 + 1140, w: 80, h: 22 }
      ]);
    }
  };

  const WORLD_BUILDER = {
    buildWorld(trackId, lengthOption, difficulty, rng) {
      const numArenas = lengthOption === "small" ? 1 : lengthOption === "long" ? 4 : 2;
      const arenaKeys = Object.keys(ARENA_BUILDERS);
      let chosenTypes = [];

      if (trackId === "custom" && State.customTrack.length > 0) {
        return this.buildCustomWorld(State.customTrack);
      } else if (trackId === "seeded_random") {
        for (let i = 0; i < numArenas; i++) {
          chosenTypes.push(arenaKeys[Math.floor(rng() * arenaKeys.length)]);
        }
      } else {
        const preset = window.GAME_DATA.tracks.find(t => t.id === trackId) || window.GAME_DATA.tracks[0];
        for (let i = 0; i < numArenas; i++) {
          chosenTypes.push(preset.arenas[i % preset.arenas.length]);
        }
      }

      const sections = [];
      let curY = 250;
      const arenaH = 1480;

      chosenTypes.forEach((type, idx) => {
        const sec = {
          index: idx + 1,
          total: chosenTypes.length,
          type,
          yStart: curY,
          yEnd: curY + arenaH,
          Walls: [],
          Boxes: [],
          Pegs: [],
          Polys: [],
          HalfMoons: [],
          Spinners: [],
          Banners: [],
          Zones: [],
          RedZones: [],
          dynamicItems: []
        };
        const fn = ARENA_BUILDERS[type] || ARENA_BUILDERS.diamondGrid;
        fn(sec, curY, arenaH, difficulty);

        const exitY = curY + arenaH - 35;
        sec.Walls.push({ x1: 25, y1: exitY - 85, x2: 145, y2: exitY, thick: 30, color: BLACK });
        sec.Walls.push({ x1: ARENA_W - 25, y1: exitY - 85, x2: ARENA_W - 145, y2: exitY, thick: 30, color: BLACK });

        sections.push(sec);
        curY += arenaH;
      });

      const finishY = curY + 40;
      const totalHeight = finishY + 240;
      return { sections, finishY, totalHeight };
    },

    buildCustomWorld(customItems) {
      const h = 1600;
      const sec = {
        index: 1,
        total: 1,
        type: "custom",
        yStart: 250,
        yEnd: 250 + h,
        Walls: [],
        Boxes: [],
        Pegs: [],
        Polys: [],
        HalfMoons: [],
        Spinners: [],
        Banners: [],
        Zones: [],
        RedZones: [],
        dynamicItems: []
      };

      const scaleX = ARENA_W / 520;
      customItems.forEach(item => {
        const x = item.x * scaleX;
        const y = 250 + item.y;
        const scl = item.scale || 1;
        const rad = ((item.angle || 0) * Math.PI) / 180;

        if (item.type === "redReset") {
          sec.RedZones.push({ x: x - 55 * scl, y: y - 12 * scl, w: 110 * scl, h: 24 * scl });
        } else if (item.type === "diamond") {
          sec.Boxes.push({ x, y, w: 58 * scl, h: 58 * scl, angle: rad || Math.PI / 4, color: BLACK });
        } else if (item.type === "circleNode") {
          sec.Pegs.push({ x, y, r: 20 * scl, color: BLACK, restitution: 0.75 });
          sec.Boxes.push({ x: x - 65 * scl, y, w: 28 * scl, h: 28 * scl, angle: Math.PI / 4, color: BLACK });
          sec.Boxes.push({ x: x + 65 * scl, y, w: 28 * scl, h: 28 * scl, angle: Math.PI / 4, color: BLACK });
        } else if (item.type === "hammer") {
          sec.Walls.push({
            x1: x - Math.cos(rad) * 48 * scl,
            y1: y - Math.sin(rad) * 48 * scl,
            x2: x + Math.cos(rad) * 48 * scl,
            y2: y + Math.sin(rad) * 48 * scl,
            thick: 16 * scl,
            color: BLACK
          });
          sec.Pegs.push({ x, y: y + 36 * scl, r: 15 * scl, color: BLACK, restitution: 0.85 });
        } else if (item.type === "star") {
          sec.Spinners.push({ x, y, len: 120 * scl, thick: 20 * scl, speed: 0.05, color: BLACK, style: "star4" });
        } else if (item.type === "halfMoon") {
          sec.HalfMoons.push({ x, y, r: 54 * scl, angle: rad, color: BLACK });
        } else if (item.type === "cross") {
          sec.Spinners.push({ x, y, len: 160 * scl, thick: 20 * scl, speed: 0.05, color: BLACK, style: "cross" });
        } else if (item.type === "funnel") {
          sec.Walls.push({ x1: x - 190 * scl, y1: y - 70 * scl, x2: x - 75 * scl, y2: y + 70 * scl, thick: 26, color: BLACK });
          sec.Walls.push({ x1: x + 190 * scl, y1: y - 70 * scl, x2: x + 75 * scl, y2: y + 70 * scl, thick: 26, color: BLACK });
        } else if (item.type === "ghostZone") {
          sec.Zones.push({ x: x - 220 * scl, y: y - 60 * scl, w: 440 * scl, h: 120 * scl, kind: "ghost", label: "NO COLLISION ZONE" });
        } else {
          const half = 140 * scl;
          sec.Walls.push({
            x1: x - Math.cos(rad) * half,
            y1: y - Math.sin(rad) * half,
            x2: x + Math.cos(rad) * half,
            y2: y + Math.sin(rad) * half,
            thick: 22,
            color: BLACK
          });
        }
      });

      const finishY = 250 + h + 40;
      return { sections: [sec], finishY, totalHeight: finishY + 240 };
    }
  };

  // ============================================================================
  // UI CONTROLLER
  // ============================================================================
  const UI = {
    manualSelected: new Set(["DZ", "MA", "TN", "EG", "SA", "FR", "BR", "AR", "DE", "JP", "ES", "SN"]),
    uploadedLogoDataUrl: null,

    init() {
      SFX.enabled = State.settings.sound !== 0;
      this.refreshHeader();
      this.populateDropdowns();
      this.renderCups();
      this.renderCustomTournaments();
      this.renderCareerBox();
      this.renderCustomMarblesList();
      this.renderShop();
      this.renderStatsScreen();
      this.onFormatChange();
      this.onTrackChange();
      this.applySettings(true);
      Editor.init();

      const badge = document.getElementById("totalCountriesBadge");
      if (badge) badge.textContent = `${getAllMarblesPool().length} FLAGS`;

      window.addEventListener("resize", () => {
        const canvas = document.getElementById("raceCanvas");
        if (canvas && document.getElementById("screen-race").classList.contains("active")) {
          canvas.width = canvas.clientWidth || window.innerWidth || 640;
          canvas.height = canvas.clientHeight || window.innerHeight || 360;
        }
      });
    },

    refreshHeader() {
      document.getElementById("coinCount").textContent = State.coins;
      const sb = document.getElementById("btnSound");
      if (sb) sb.textContent = SFX.enabled ? "🔊 SFX" : "🔇 Mute";
      const mb = document.getElementById("btnMusic");
      if (mb) mb.textContent = SFX.musicEnabled ? "🎵 BGM: ON" : "🎵 BGM";
    },

    toggleSound() {
      SFX.enabled = !SFX.enabled;
      State.settings.sound = SFX.enabled ? 1 : 0;
      saveState();
      if (SFX.enabled) SFX.qualifyDing();
    },

    toggleMusic() {
      const audio = document.getElementById("bgmAudio");
      if (!audio) return;
      SFX.musicEnabled = !SFX.musicEnabled;
      if (SFX.musicEnabled) {
        audio.volume = 0.28;
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      this.refreshHeader();
    },

    async setOrientationPref(mode) {
      State.settings.orientation = mode;
      saveState();
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock(mode === "any" ? "landscape" : mode);
        }
      } catch (e) {}
    },

    onFormatChange() {
      const fmt = document.getElementById("crFormat").value;
      document.getElementById("gpSystemWrap").style.display = fmt === "grandprix" ? "block" : "none";
    },

    onTrackChange() {
      const trk = document.getElementById("crTrack").value;
      document.getElementById("seedInputWrap").style.display = trk === "seeded_random" ? "block" : "none";
    },

    randomizeSeed() {
      const words = ["ALGERIA", "ORAN", "ATLAS", "SAHARA", "TITAN", "VORTEX", "OLYMPUS"];
      document.getElementById("crTrackSeed").value = words[Math.floor(Math.random() * words.length)] + "-" + Math.floor(100 + Math.random() * 900);
    },

    showScreen(id, btn) {
      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
      document.getElementById("screen-" + id).classList.add("active");
      if (btn) {
        document.querySelectorAll(".rail-nav button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      }
      if (id === "stats") this.renderStatsScreen();
      if (id === "shop") {
        this.renderCustomMarblesList();
        this.renderShop();
      }
      if (id === "competitions") {
        this.renderCustomTournaments();
        this.renderCareerBox();
      }
      if (id === "editor") Editor.draw();
    },

    populateDropdowns() {
      const allMarbles = getAllMarblesPool();
      const opts = allMarbles.map(c => `<option value="${c.code}">${c.flag || "🔵"} ${c.name} (${c.iso3 || c.code.slice(0, 3)})</option>`).join("");
      ["careerCountrySelect", "rivalA", "rivalB", "profileCountrySelect"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = opts;
      });
      const betEl = document.getElementById("crBetCountry");
      if (betEl) {
        betEl.innerHTML = `<option value="">-- Optional: Pick Podium Bet (+200 🪙) --</option>` + opts;
      }

      document.getElementById("careerCountrySelect").value = State.career.countryCode || "DZ";
      document.getElementById("rivalA").value = "DZ";
      document.getElementById("rivalB").value = "MA";
      document.getElementById("profileCountrySelect").value = "DZ";
      this.renderPresetsDropdown();
      this.updateManualCount();
    },

    handleLogoUpload(input) {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const cnv = document.createElement("canvas");
          cnv.width = 80;
          cnv.height = 80;
          const ctx = cnv.getContext("2d");
          ctx.beginPath();
          ctx.arc(40, 40, 40, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0, 80, 80);
          this.uploadedLogoDataUrl = cnv.toDataURL("image/png");
          document.getElementById("cmLogoPreview").src = this.uploadedLogoDataUrl;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    clearUploadedLogo() {
      this.uploadedLogoDataUrl = null;
      document.getElementById("cmLogoInput").value = "";
      document.getElementById("cmLogoPreview").src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    },

    createCustomMarble() {
      const name = document.getElementById("cmName").value.trim();
      const iso3 = (document.getElementById("cmCode3").value.trim() || "CUS").toUpperCase().slice(0, 3);
      const color = document.getElementById("cmColor").value || "#ef4444";
      const color2 = document.getElementById("cmColor2").value || "#ffffff";
      const region = document.getElementById("cmRegion").value || "Custom";
      const fact = document.getElementById("cmFact").value.trim() || `${name} (${iso3}) is a custom contender!`;

      if (!name) {
        alert("Please enter a Team or Country Name!");
        return;
      }
      const code = "CM_" + Date.now().toString(36).toUpperCase();
      const newMarble = {
        code,
        iso3,
        name,
        flag: "",
        color,
        color2,
        stripeColors: [color, color2, color],
        logoDataUrl: this.uploadedLogoDataUrl || null,
        region: [region, "CUSTOM"],
        small: true,
        isCustom: true,
        fact
      };
      State.customMarbles.unshift(newMarble);
      MarbleTextureCache.clear(code);
      this.manualSelected.add(code);
      saveState();
      this.populateDropdowns();
      this.renderCustomMarblesList();
      document.getElementById("cmName").value = "";
      this.clearUploadedLogo();
      alert(`Custom Marble "${name} (${iso3})" created!`);
    },

    deleteCustomMarble(code) {
      State.customMarbles = (State.customMarbles || []).filter(m => m.code !== code);
      MarbleTextureCache.clear(code);
      this.manualSelected.delete(code);
      saveState();
      this.populateDropdowns();
      this.renderCustomMarblesList();
    },

    renderCustomMarblesList() {
      const wrap = document.getElementById("customMarblesList");
      if (!wrap) return;
      const list = State.customMarbles || [];
      if (!list.length) {
        wrap.innerHTML = `<div style="font-size:0.76rem; color:var(--muted);">No custom marbles yet. Upload a 2D logo above!</div>`;
        return;
      }
      wrap.innerHTML = list.map(m => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#070b16; padding:6px 10px; border-radius:8px; margin-bottom:6px; border-left:4px solid ${m.color};">
          <div style="display:flex; align-items:center; gap:8px;">
            ${m.logoDataUrl ? `<img src="${m.logoDataUrl}" style="width:26px;height:26px;border-radius:50%;" />` : `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${m.color};"></span>`}
            <strong>${m.name} (${m.iso3})</strong> <span class="tag">${m.region[0]}</span>
          </div>
          <button class="btn btn-sm btn-red" onclick="UI.deleteCustomMarble('${m.code}')">Delete</button>
        </div>
      `).join("");
    },

    saveCustomTournament(playImmediately) {
      const name = document.getElementById("ctName").value.trim() || ("Custom Cup #" + ((State.customTournaments?.length || 0) + 1));
      const rawFmt = document.getElementById("ctFormat").value;
      const format = (rawFmt === "grandprix" || rawFmt === "nascar") ? "grandprix" : rawFmt;
      const gpSystem = rawFmt === "nascar" ? "nascar" : "formula";
      const region = document.getElementById("ctRegion").value;
      const length = document.getElementById("ctLength").value;
      const count = Math.max(4, Math.min(255, Number(document.getElementById("ctCount").value) || 64));
      const rounds = Math.max(1, Math.min(20, Number(document.getElementById("ctRounds").value) || 5));

      const cupObj = {
        id: "ct_" + Date.now().toString(36),
        name: "🏆 " + name,
        region,
        count,
        rounds,
        format,
        gpSystem,
        length
      };
      if (!State.customTournaments) State.customTournaments = [];
      State.customTournaments.unshift(cupObj);
      saveState();
      this.renderCustomTournaments();
      document.getElementById("ctName").value = "";
      if (playImmediately) {
        Game.startCustomCupObj(cupObj);
      }
    },

    deleteCustomTournament(id) {
      State.customTournaments = (State.customTournaments || []).filter(c => c.id !== id);
      saveState();
      this.renderCustomTournaments();
    },

    renderCustomTournaments() {
      const wrap = document.getElementById("customTournamentsList");
      if (!wrap) return;
      const list = State.customTournaments || [];
      if (!list.length) {
        wrap.innerHTML = "";
        return;
      }
      wrap.innerHTML = list.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#070b16; padding:6px 10px; border-radius:8px; margin-bottom:6px; border:1px solid #334155;">
          <div>
            <strong>${c.name}</strong>
            <span style="font-size:0.72rem; color:var(--muted); margin-left:6px;">${c.count} Flags • ${c.rounds} Laps • ${c.length.toUpperCase()}</span>
          </div>
          <div style="display:flex; gap:5px;">
            <button class="btn btn-sm btn-green" onclick="Game.startCup('${c.id}')">▶ Play</button>
            <button class="btn btn-sm btn-red" onclick="UI.deleteCustomTournament('${c.id}')">🗑️</button>
          </div>
        </div>
      `).join("");
    },

    toggleManualPicker() {
      const mode = document.getElementById("crSelectMode").value;
      document.getElementById("manualPickerWrap").style.display = mode === "manual" ? "block" : "none";
    },

    openCountryPicker() {
      document.getElementById("pickerSearch").value = "";
      this.filterCountryPicker("");
      document.getElementById("pickerModal").classList.add("active");
    },

    filterCountryPicker(query) {
      const q = (query || "").toLowerCase().trim();
      const grid = document.getElementById("countryPickerGrid");
      grid.innerHTML = "";
      getAllMarblesPool().forEach(c => {
        if (q && !c.name.toLowerCase().includes(q) && !(c.iso3 || "").toLowerCase().includes(q)) return;
        const div = document.createElement("div");
        div.className = "country-chip" + (this.manualSelected.has(c.code) ? " selected" : "");
        div.innerHTML = `<span>${c.flag || "🔵"}</span> <span>${c.name} (${c.iso3 || c.code.slice(0, 3)})</span>`;
        div.onclick = () => {
          if (this.manualSelected.has(c.code)) this.manualSelected.delete(c.code);
          else this.manualSelected.add(c.code);
          div.classList.toggle("selected");
          this.updateManualCount();
        };
        grid.appendChild(div);
      });
    },

    selectAllCountries(flag) {
      if (flag) getAllMarblesPool().forEach(c => this.manualSelected.add(c.code));
      else this.manualSelected.clear();
      this.filterCountryPicker(document.getElementById("pickerSearch").value);
      this.updateManualCount();
    },

    closeCountryPicker() {
      document.getElementById("pickerModal").classList.remove("active");
    },

    updateManualCount() {
      const el = document.getElementById("manualPickedCount");
      if (el) el.textContent = this.manualSelected.size;
    },

    savePreset() {
      const name = prompt("Preset Name:", "Widescreen Setup " + (State.presets.length + 1));
      if (!name) return;
      State.presets.push({
        name,
        count: document.getElementById("crCount").value,
        format: document.getElementById("crFormat").value,
        gpSystem: document.getElementById("crGpSystem").value,
        region: document.getElementById("crRegion").value,
        track: document.getElementById("crTrack").value,
        length: document.getElementById("crLength").value,
        difficulty: document.getElementById("crDifficulty").value,
        camera: document.getElementById("crCamera").value,
        physSpeed: document.getElementById("crPhysSpeed").value,
        rounds: document.getElementById("crRounds").value,
        elim: document.getElementById("crElim").value
      });
      saveState();
      this.renderPresetsDropdown();
    },

    renderPresetsDropdown() {
      const sel = document.getElementById("presetSelect");
      sel.innerHTML = `<option value="">📂 Load Preset (${State.presets.length})...</option>` +
        State.presets.map((p, idx) => `<option value="${idx}">${p.name}</option>`).join("");
    },

    loadPreset(idx) {
      if (idx === "") return;
      const p = State.presets[Number(idx)];
      if (!p) return;
      document.getElementById("crCount").value = p.count;
      document.getElementById("crFormat").value = p.format;
      if (p.gpSystem) document.getElementById("crGpSystem").value = p.gpSystem;
      document.getElementById("crRegion").value = p.region;
      document.getElementById("crTrack").value = p.track;
      document.getElementById("crLength").value = p.length;
      document.getElementById("crDifficulty").value = p.difficulty;
      document.getElementById("crCamera").value = p.camera;
      document.getElementById("crPhysSpeed").value = p.physSpeed;
      document.getElementById("crRounds").value = p.rounds;
      document.getElementById("crElim").value = p.elim;
      this.onFormatChange();
      this.onTrackChange();
    },

    renderCups() {
      const wrap = document.getElementById("cupsList");
      wrap.innerHTML = window.GAME_DATA.competitions.map(c => `
        <div style="background:#070b16; padding:10px; border-radius:10px; border:1px solid #1e293b;">
          <div style="font-weight:800; margin-bottom:4px; font-size:0.84rem;">${c.name}</div>
          <div style="font-size:0.7rem; color:var(--muted); margin-bottom:8px;">
            ${c.count} Flags • ${c.rounds} Laps • ${c.length.toUpperCase()}
          </div>
          <button class="btn btn-sm btn-block" onclick="Game.startCup('${c.id}')">Start Cup</button>
        </div>
      `).join("");
    },

    renderCareerBox() {
      const stages = [
        "Stage 1/4: Regional Qualifier (Top 15 Advance)",
        "Stage 2/4: Continental Group Stage (Top 10 Advance)",
        "Stage 3/4: World Cup Semi-Final (Top 5 Advance)",
        "Stage 4/4: World Marble Cup Final (Win 1st Place!)"
      ];
      const cObj = findMarbleByCode(State.career.countryCode);
      document.getElementById("careerStatusBox").innerHTML = `
        <div style="background:#070b16; padding:8px 12px; border-radius:8px; border:1px solid var(--neon-green);">
          <strong>Nation:</strong> ${cObj.flag || "🔵"} ${cObj.name} (${cObj.iso3}) &nbsp;|&nbsp;
          <strong>${stages[State.career.stage] || stages[0]}</strong>
        </div>
      `;
    },

    renderStatsScreen() {
      const rec = State.records;
      document.getElementById("recordsSummary").innerHTML = `
        <div class="tag">🔥 Streak: <strong>${rec.longestStreak.country} (${rec.longestStreak.streak})</strong></div>
        <div class="tag">🚀 Comeback: <strong>${rec.bestComeback.country} (+${rec.bestComeback.gained})</strong></div>
        <div class="tag">⏱️ Closest: <strong>${rec.closestFinish.ms < 90000 ? rec.closestFinish.pair + " (" + rec.closestFinish.ms + "ms)" : "--"}</strong></div>
        <div class="tag">🪙 Coins: <strong>${State.coins}</strong></div>
      `;

      this.renderCountryProfile(document.getElementById("profileCountrySelect").value || "DZ");

      const rows = getAllMarblesPool().map(c => {
        const s = ensureCountryStat(c.code);
        const avg = s.races > 0 ? (s.posSum / s.races).toFixed(1) : "-";
        return { c, s, avg };
      }).sort((a, b) => b.s.wins - a.s.wins || b.s.points - a.s.points || b.s.podiums - a.s.podiums);

      document.getElementById("allTimeTableBody").innerHTML = rows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.c.flag || "🔵"} ${r.c.name} (${r.c.iso3 || r.c.code.slice(0, 3)})</td>
          <td><strong>${r.s.wins}</strong></td>
          <td>${r.s.podiums}</td>
          <td>${r.s.points}</td>
          <td>${r.avg}</td>
        </tr>
      `).join("");
    },

    renderCountryProfile(code) {
      const c = findMarbleByCode(code);
      const s = ensureCountryStat(c.code);
      const avg = s.races > 0 ? (s.posSum / s.races).toFixed(1) : "N/A";
      const recentStr = s.recent.length ? s.recent.map(p => "#" + p).join(", ") : "No races yet";
      document.getElementById("countryProfileView").innerHTML = `
        <div style="background:#070b16; padding:10px; border-radius:8px; border-left:4px solid ${c.color};">
          <div style="font-size:1.05rem; font-weight:800;">${c.flag || "🔵"} ${c.name} (${c.iso3 || c.code})</div>
          <div class="grid-3" style="margin-top:6px;">
            <div class="tag">Races: <strong>${s.races}</strong></div>
            <div class="tag">Wins: <strong>${s.wins}</strong></div>
            <div class="tag">Podiums: <strong>${s.podiums}</strong></div>
            <div class="tag">GP Pts: <strong>${s.points}</strong></div>
            <div class="tag">Cups: <strong>${s.cups}</strong></div>
            <div class="tag">Avg Pos: <strong>${avg}</strong></div>
          </div>
          <div style="font-size:0.75rem; margin-top:6px; color:var(--gold);">Recent Finishes: ${recentStr}</div>
        </div>
      `;
    },

    renderShop() {
      const sg = document.getElementById("skinsGrid");
      sg.innerHTML = window.GAME_DATA.skins.map(sk => {
        const owned = State.unlockedSkins.includes(sk.id);
        const equipped = State.equippedSkin === sk.id;
        return `
          <div style="background:#070b16; padding:8px; border-radius:8px; border:1px solid ${equipped ? 'var(--neon-cyan)' : '#1e293b'};">
            <div style="font-weight:700; font-size:0.8rem;">${sk.name}</div>
            <div style="font-size:0.72rem; color:var(--muted); margin:3px 0;">${owned ? "Unlocked" : "Cost: 🪙 " + sk.cost}</div>
            <button class="btn btn-sm btn-block ${equipped ? 'btn-green' : ''}" onclick="UI.buyOrEquipSkin('${sk.id}')">
              ${equipped ? "✓ Equipped" : owned ? "Equip" : "Unlock"}
            </button>
          </div>
        `;
      }).join("");

      const al = document.getElementById("achievementsList");
      al.innerHTML = window.GAME_DATA.achievements.map(a => {
        const done = State.achievements.includes(a.id);
        return `
          <div style="background:#070b16; padding:6px 10px; border-radius:8px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${done ? '#00ff66' : '#334155'};">
            <div>
              <div style="font-weight:700; font-size:0.78rem;">${done ? "✅" : "🔒"} ${a.name}</div>
              <div style="font-size:0.7rem; color:var(--muted);">${a.desc}</div>
            </div>
            <div class="coin-pill">+${a.reward}</div>
          </div>
        `;
      }).join("");
    },

    buyOrEquipSkin(id) {
      const sk = window.GAME_DATA.skins.find(x => x.id === id);
      if (!sk) return;
      if (State.unlockedSkins.includes(id)) {
        State.equippedSkin = id;
      } else if (State.coins >= sk.cost) {
        State.coins -= sk.cost;
        State.unlockedSkins.push(id);
        State.equippedSkin = id;
      } else {
        alert("Not enough coins!");
        return;
      }
      saveState();
      this.renderShop();
    },

    unlockAchievement(id) {
      if (State.achievements.includes(id)) return;
      const ach = window.GAME_DATA.achievements.find(x => x.id === id);
      if (!ach) return;
      State.achievements.push(id);
      State.coins += ach.reward;
      saveState();
    },

    openSettings() {
      document.getElementById("optOrientation").value = State.settings.orientation || "landscape";
      document.getElementById("optLang").value = State.settings.lang;
      document.getElementById("optMaxMarbles").value = State.settings.maxMarbles;
      document.getElementById("optFontScale").value = State.settings.fontScale;
      document.getElementById("settingsModal").classList.add("active");
    },

    applySettings(fromInit) {
      if (!fromInit) {
        State.settings.lang = document.getElementById("optLang").value;
        State.settings.maxMarbles = Number(document.getElementById("optMaxMarbles").value);
        State.settings.fontScale = Number(document.getElementById("optFontScale").value);
        saveState();
      }
      const lang = State.settings.lang || "en";
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.style.setProperty("--font-scale", State.settings.fontScale || 1);

      const dict = window.GAME_DATA.i18n[lang] || window.GAME_DATA.i18n.en;
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const k = el.getAttribute("data-i18n");
        if (dict[k]) el.textContent = dict[k];
      });
    },

    WatchRewardedAd(reason) {
      if (reason === "rerace") {
        document.getElementById("winnerModal").classList.remove("active");
        Game.reRunCurrentRound();
      } else {
        State.coins += 100;
        saveState();
        alert("+100 Coins added!");
      }
    }
  };

  // ============================================================================
  // WIDESCREEN VECTOR TRACK EDITOR (WITH RED RESET ZONE PLACEMENT!)
  // ============================================================================
  const Editor = {
    tool: "select",
    canvas: null,
    ctx: null,
    scrollY: 0,
    virtualHeight: 1600,
    selectedIndex: -1,
    isDragging: false,
    snapGrid: true,

    init() {
      this.canvas = document.getElementById("editorCanvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");

      const getCoords = e => {
        const rect = this.canvas.getBoundingClientRect();
        let x = Math.round(((e.clientX - rect.left) / rect.width) * 520);
        let y = Math.round(((e.clientY - rect.top) / rect.height) * 290 + this.scrollY);
        if (this.snapGrid) {
          x = Math.round(x / 20) * 20;
          y = Math.round(y / 20) * 20;
        }
        return { x: Math.max(24, Math.min(496, x)), y: Math.max(60, Math.min(this.virtualHeight - 80, y)) };
      };

      this.canvas.addEventListener("pointerdown", e => {
        const pt = getCoords(e);
        let hitIdx = -1;
        for (let i = State.customTrack.length - 1; i >= 0; i--) {
          const ob = State.customTrack[i];
          if (Math.hypot(ob.x - pt.x, ob.y - pt.y) < 38 * (ob.scale || 1)) {
            hitIdx = i;
            break;
          }
        }

        if (this.tool === "select") {
          this.selectedIndex = hitIdx;
          if (hitIdx !== -1) this.isDragging = true;
          this.syncInspector();
          this.draw();
        } else {
          const newItem = {
            type: this.tool,
            x: pt.x,
            y: pt.y,
            angle: this.tool === "diamond" ? 45 : this.tool === "rampL" ? 18 : 0,
            scale: 1
          };
          State.customTrack.push(newItem);
          this.selectedIndex = State.customTrack.length - 1;
          this.isDragging = true;
          this.syncInspector();
          this.draw();
        }
      });

      this.canvas.addEventListener("pointermove", e => {
        if (!this.isDragging || this.selectedIndex < 0) return;
        const pt = getCoords(e);
        const ob = State.customTrack[this.selectedIndex];
        if (ob) {
          ob.x = pt.x;
          ob.y = pt.y;
          this.draw();
        }
      });

      window.addEventListener("pointerup", () => {
        this.isDragging = false;
      });

      this.syncInspector();
      this.draw();
    },

    toggleSnap() {
      this.snapGrid = !this.snapGrid;
      document.getElementById("btnSnap").textContent = `🧲 Snap: ${this.snapGrid ? "ON" : "OFF"}`;
      this.draw();
    },

    setTool(t) {
      this.tool = t;
      document.querySelectorAll("[id^='tool_']").forEach(b => b.classList.remove("active-tool"));
      const btn = document.getElementById("tool_" + t);
      if (btn) btn.classList.add("active-tool");
    },

    setScroll(val) {
      this.scrollY = Number(val) || 0;
      this.draw();
    },

    syncInspector() {
      const ob = State.customTrack[this.selectedIndex];
      const title = document.getElementById("inspTitle");
      const ang = document.getElementById("inspAngle");
      const scl = document.getElementById("inspScale");
      if (!ob) {
        title.textContent = "Selected: None (Tap an obstacle)";
        return;
      }
      title.textContent = `Selected: ${ob.type.toUpperCase()} (${ob.x}, ${ob.y})`;
      ang.value = ob.angle || 0;
      scl.value = ob.scale || 1;
      document.getElementById("inspAngleVal").textContent = (ob.angle || 0) + "°";
      document.getElementById("inspScaleVal").textContent = Number(ob.scale || 1).toFixed(1) + "x";
    },

    updateSelectedProp(prop, val) {
      const ob = State.customTrack[this.selectedIndex];
      if (!ob) return;
      ob[prop] = Number(val);
      this.syncInspector();
      this.draw();
    },

    duplicateSelected() {
      const ob = State.customTrack[this.selectedIndex];
      if (!ob) return;
      State.customTrack.push(Object.assign({}, ob, { x: Math.min(480, ob.x + 40), y: Math.min(this.virtualHeight - 80, ob.y + 40) }));
      this.selectedIndex = State.customTrack.length - 1;
      this.syncInspector();
      this.draw();
    },

    deleteSelected() {
      if (this.selectedIndex < 0) return;
      State.customTrack.splice(this.selectedIndex, 1);
      this.selectedIndex = -1;
      this.syncInspector();
      this.draw();
    },

    loadPresetIntoEditor() {
      State.customTrack = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          State.customTrack.push({ type: "diamond", x: 100 + c * 105 + (r % 2) * 35, y: 140 + r * 110, angle: 45, scale: 1 });
        }
      }
      State.customTrack.push({ type: "redReset", x: 180, y: 500, angle: 0, scale: 1 });
      State.customTrack.push({ type: "redReset", x: 340, y: 500, angle: 0, scale: 1 });
      State.customTrack.push({ type: "star", x: 170, y: 660, angle: 0, scale: 1.2 });
      State.customTrack.push({ type: "star", x: 350, y: 660, angle: 0, scale: 1.2 });
      State.customTrack.push({ type: "ghostZone", x: 260, y: 860, angle: 0, scale: 1.1 });
      State.customTrack.push({ type: "halfMoon", x: 160, y: 1060, angle: 25, scale: 1.1 });
      State.customTrack.push({ type: "halfMoon", x: 360, y: 1060, angle: -25, scale: 1.1 });
      this.selectedIndex = -1;
      this.syncInspector();
      this.draw();
    },

    clear() {
      State.customTrack = [];
      this.selectedIndex = -1;
      this.syncInspector();
      this.draw();
    },

    save() {
      saveState();
      UI.unlockAchievement("architect");
      alert("Custom track saved!");
    },

    exportCode() {
      const code = btoa(JSON.stringify(State.customTrack));
      document.getElementById("trackCodeInput").value = code;
      if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
      alert("Track code copied!");
    },

    importCode() {
      try {
        const parsed = JSON.parse(atob(document.getElementById("trackCodeInput").value.trim()));
        if (Array.isArray(parsed)) {
          State.customTrack = parsed;
          saveState();
          this.draw();
          alert("Track imported!");
        }
      } catch (e) {
        alert("Invalid track code.");
      }
    },

    testTrack() {
      saveState();
      document.getElementById("crTrack").value = "custom";
      Game.startFromCreator();
    },

    draw() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      ctx.fillStyle = PERIWINKLE;
      ctx.fillRect(0, 0, 520, 290);
      ctx.save();
      ctx.translate(0, -this.scrollY);

      if (this.snapGrid) {
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1;
        for (let x = 20; x < 520; x += 20) {
          ctx.beginPath(); ctx.moveTo(x, this.scrollY); ctx.lineTo(x, this.scrollY + 290); ctx.stroke();
        }
        for (let y = Math.floor(this.scrollY / 20) * 20; y < this.scrollY + 290; y += 20) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(520, y); ctx.stroke();
        }
      }

      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, 12, this.virtualHeight);
      ctx.fillRect(508, 0, 12, this.virtualHeight);

      State.customTrack.forEach((item, idx) => {
        const scl = item.scale || 1;
        const rad = ((item.angle || 0) * Math.PI) / 180;
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(rad);
        ctx.scale(scl, scl);

        if (idx === this.selectedIndex) {
          ctx.strokeStyle = GREEN_SAFE;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-45, -28, 90, 56);
        }

        ctx.fillStyle = BLACK;
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 6;

        if (item.type === "redReset") {
          ctx.fillStyle = RED_RESET;
          ctx.fillRect(-36, -8, 72, 16);
          ctx.fillStyle = "#fff";
          ctx.font = "900 9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("RESET", 0, 3);
        } else if (item.type === "diamond") {
          ctx.fillRect(-18, -18, 36, 36);
        } else if (item.type === "circleNode") {
          ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeRect(-22, -22, 44, 44);
        } else if (item.type === "star" || item.type === "cross") {
          ctx.fillRect(-26, -5, 52, 10);
          ctx.fillRect(-5, -26, 10, 52);
        } else if (item.type === "halfMoon") {
          ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI * 0.5, Math.PI * 0.5); ctx.closePath(); ctx.fill();
        } else if (item.type === "ghostZone") {
          ctx.fillStyle = "rgba(120, 65, 18, 0.85)";
          ctx.fillRect(-65, -20, 130, 40);
        } else {
          ctx.fillRect(-35, -4, 70, 8);
        }
        ctx.restore();
      });

      ctx.restore();
    }
  };

  // ============================================================================
  // CORE WIDESCREEN PHYSICS ENGINE (WITH RED ZONE TELEPORT TO START & SPARKS!)
  // ============================================================================
  const Game = {
    session: null,
    engine: null,
    worldData: null,
    animId: null,
    speedMult: 1,
    cameraMode: "wide",
    autoPlay: false,
    camY: 0,
    lavaY: -400,
    simTick: 0,
    totalRedResets: 0,
    lastResetBanner: "",
    resetParticles: [],
    mediaRecorder: null,
    recordedChunks: [],
    lastRecordedBlob: null,
    lastRecordedMime: "video/webm",

    pickCountries(region, count, manual) {
      let basePool = getAllMarblesPool();
      if (manual) {
        basePool = basePool.filter(c => UI.manualSelected.has(c.code));
        if (basePool.length < 2) basePool = getAllMarblesPool().slice(0, 24);
      } else if (region === "CUSTOM") {
        basePool = (State.customMarbles && State.customMarbles.length >= 2)
          ? State.customMarbles.slice()
          : getAllMarblesPool().slice(0, 24);
      } else if (region && region !== "ALL") {
        basePool = basePool.filter(c => c.region.includes(region));
        if (basePool.length < 2) basePool = getAllMarblesPool();
      }

      const cap = Math.max(2, Math.min(Number(count) || 120, State.settings.maxMarbles || 256));
      const rng = createRNG(Date.now() ^ (Math.random() * 0xffffffff));
      const result = [];

      let pass = 0;
      while (result.length < cap) {
        const copy = basePool.slice();
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        for (let i = 0; i < copy.length && result.length < cap; i++) {
          const item = copy[i];
          if (pass === 0) {
            result.push(item);
          } else {
            result.push(Object.assign({}, item, {
              code: `${item.code}#${pass + 1}`,
              name: `${item.name} ${pass + 1}`
            }));
          }
        }
        pass++;
      }
      return result;
    },

    buildTrackSchedule(selectedTrack, totalRounds) {
      const allIds = window.GAME_DATA.tracks.map(t => t.id);
      if (selectedTrack === "seeded_random" || selectedTrack === "custom") {
        return Array(totalRounds).fill(selectedTrack);
      }
      if (selectedTrack !== "rotate" && selectedTrack) {
        const startIdx = Math.max(0, allIds.indexOf(selectedTrack));
        const schedule = [];
        for (let r = 0; r < totalRounds; r++) {
          schedule.push(allIds[(startIdx + r) % allIds.length]);
        }
        return schedule;
      }
      const shuffled = allIds.slice().sort(() => Math.random() - 0.5);
      const schedule = [];
      for (let r = 0; r < totalRounds; r++) {
        schedule.push(shuffled[r % shuffled.length]);
      }
      return schedule;
    },

    getTrackDisplayName(trackId) {
      if (trackId === "custom") return "Custom Vector Track";
      if (trackId === "seeded_random") return `Procedural Track (${this.session?.seedStr || "SEED"})`;
      const found = window.GAME_DATA.tracks.find(t => t.id === trackId);
      return found ? found.name : trackId;
    },

    startFromCreator() {
      const count = Number(document.getElementById("crCount").value) || 120;
      const format = document.getElementById("crFormat").value;
      const gpSystem = document.getElementById("crGpSystem").value || "formula";
      const region = document.getElementById("crRegion").value;
      const track = document.getElementById("crTrack").value;
      const seedStr = document.getElementById("crTrackSeed").value.trim() || "ORAN-PRO-2026";
      const difficulty = document.getElementById("crDifficulty").value;
      const length = document.getElementById("crLength").value;
      const camera = document.getElementById("crCamera").value;
      const physSpeed = Number(document.getElementById("crPhysSpeed").value) || 1;
      const rounds = Math.max(1, Math.min(25, Number(document.getElementById("crRounds").value) || 5));
      const elim = Math.max(1, Number(document.getElementById("crElim").value) || 15);
      const manual = document.getElementById("crSelectMode").value === "manual";
      const betCode = document.getElementById("crBetCountry").value || "";

      const entrants = this.pickCountries(region, count, manual);
      this.cameraMode = camera;

      this.session = {
        modeTitle: format === "grandprix" ? `Grand Prix (${gpSystem.toUpperCase()})` : "World Marble Broadcast",
        format,
        gpSystem,
        trackSchedule: this.buildTrackSchedule(track, rounds),
        seedStr,
        difficulty,
        length,
        physSpeed,
        totalRounds: rounds,
        currentRound: 1,
        elimPerRound: elim,
        activeCountries: entrants,
        seriesScores: {},
        teamScores: {},
        betCode,
        isRivalry: false,
        isCareer: false,
        cupId: null
      };
      entrants.forEach(c => { this.session.seriesScores[c.code] = 0; });
      this.launchRound();
    },

    startCup(cupId) {
      const cup = window.GAME_DATA.competitions.find(x => x.id === cupId) ||
                  (State.customTournaments || []).find(x => x.id === cupId);
      if (!cup) return;
      this.startCustomCupObj(cup);
    },

    startCustomCupObj(cup) {
      const entrants = this.pickCountries(cup.region, cup.count, false);
      this.session = {
        modeTitle: cup.name,
        format: cup.format,
        gpSystem: cup.gpSystem || "formula",
        trackSchedule: this.buildTrackSchedule("rotate", cup.rounds),
        seedStr: cup.id.toUpperCase(),
        difficulty: "medium",
        length: cup.length || "medium",
        physSpeed: 1,
        totalRounds: cup.rounds,
        currentRound: 1,
        elimPerRound: Math.max(2, Math.floor(entrants.length / (cup.rounds + 1))),
        activeCountries: entrants,
        seriesScores: {},
        teamScores: {},
        betCode: "",
        isRivalry: false,
        isCareer: false,
        cupId: cup.id
      };
      entrants.forEach(c => { this.session.seriesScores[c.code] = 0; });
      this.launchRound();
    },

    startOrContinueCareer() {
      const code = document.getElementById("careerCountrySelect").value || "DZ";
      State.career.countryCode = code;
      saveState();
      const playerMarble = findMarbleByCode(code);
      const stageNames = ["Career Qualifier", "Career Group Stage", "Career Semi-Final", "Career World Final"];
      const stageTracks = ["diamond_grid", "circle_gear_matrix", "star_conveyor_maze", "algodoo_mega_mix"];
      const counts = [60, 45, 30, 20];
      const st = State.career.stage || 0;
      const pool = this.pickCountries("ALL", counts[st], false).filter(c => c.code !== code);
      const entrants = [playerMarble, ...pool.slice(0, counts[st] - 1)];

      this.session = {
        modeTitle: stageNames[st],
        format: "knockout",
        gpSystem: "formula",
        trackSchedule: [stageTracks[st]],
        seedStr: "CAREER-" + st,
        difficulty: st >= 2 ? "hard" : "medium",
        length: st === 3 ? "long" : "medium",
        physSpeed: 1,
        totalRounds: 1,
        currentRound: 1,
        elimPerRound: counts[st] - [15, 10, 5, 1][st],
        activeCountries: entrants,
        seriesScores: {},
        teamScores: {},
        betCode: code,
        isRivalry: false,
        isCareer: true,
        careerCode: code
      };
      entrants.forEach(c => { this.session.seriesScores[c.code] = 0; });
      this.launchRound();
    },

    startRivalrySeries() {
      const codeA = document.getElementById("rivalA").value;
      const codeB = document.getElementById("rivalB").value;
      if (codeA === codeB) {
        alert("Pick two different countries!");
        return;
      }
      const cA = findMarbleByCode(codeA);
      const cB = findMarbleByCode(codeB);

      this.session = {
        modeTitle: `${cA.iso3} vs ${cB.iso3} (Best of 5)`,
        format: "normal",
        gpSystem: "formula",
        trackSchedule: this.buildTrackSchedule("rotate", 5),
        seedStr: "DERBY",
        difficulty: "medium",
        length: "small",
        physSpeed: 1,
        totalRounds: 5,
        currentRound: 1,
        elimPerRound: 0,
        activeCountries: [cA, cB],
        seriesScores: { [codeA]: 0, [codeB]: 0 },
        teamScores: {},
        betCode: "",
        isRivalry: true,
        bestOf: 5
      };
      this.launchRound();
    },

    reRunCurrentRound() {
      if (!this.session) return;
      this.launchRound();
    },

    launchRound() {
      UI.showScreen("race");
      const canvas = document.getElementById("raceCanvas");
      canvas.width = canvas.clientWidth || window.innerWidth || 640;
      canvas.height = canvas.clientHeight || window.innerHeight || 360;

      const currentTrackId = this.session.trackSchedule[(this.session.currentRound - 1) % this.session.trackSchedule.length] || "diamond_grid";
      this.currentTrackId = currentTrackId;

      const rng = createRNG(`${this.session.seedStr}-L${this.session.currentRound}-${Date.now()}`);
      this.worldData = WORLD_BUILDER.buildWorld(currentTrackId, this.session.length, this.session.difficulty, rng);

      this.lavaY = -400;
      this.camY = 0;
      this.simTick = 0;
      this.totalRedResets = 0;
      this.lastResetBanner = "";
      this.resetParticles = [];

      const totalCount = this.session.activeCountries.length;
      this.spotsTotal = this.session.format === "knockout"
        ? Math.max(1, totalCount - this.session.elimPerRound)
        : totalCount;

      this.setupPhysicsWorld(rng);
      this.updateHUDButtons();
      this.startLoop(canvas);
    },

    setupPhysicsWorld(rng) {
      if (!window.Matter) return;
      const { Engine, World, Bodies, Body } = window.Matter;
      if (this.engine) World.clear(this.engine.world);

      this.engine = Engine.create({
        positionIterations: 6,
        velocityIterations: 5
      });
      this.engine.gravity.y = 0.94 * (this.session.physSpeed || 1);

      const H = this.worldData.totalHeight;
      const wallOpts = { isStatic: true, restitution: 0.58, friction: 0, frictionStatic: 0 };
      World.add(this.engine.world, [
        Bodies.rectangle(0, H / 2, 50, H * 2, wallOpts),
        Bodies.rectangle(ARENA_W, H / 2, 50, H * 2, wallOpts),
        Bodies.rectangle(ARENA_W / 2, -80, ARENA_W + 200, 140, wallOpts)
      ]);

      this.worldData.sections.forEach(sec => {
        sec.dynamicItems = [];

        sec.Walls.forEach(w => {
          const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
          const len = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          World.add(this.engine.world, Bodies.rectangle((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, len + 6, w.thick || 22, {
            isStatic: true,
            angle: ang,
            restitution: 0.55,
            friction: 0,
            frictionStatic: 0
          }));
        });

        sec.Boxes.forEach(bx => {
          World.add(this.engine.world, Bodies.rectangle(bx.x, bx.y, bx.w, bx.h, {
            isStatic: true,
            angle: bx.angle || 0,
            restitution: bx.restitution || 0.6,
            friction: 0,
            frictionStatic: 0
          }));
        });

        sec.Pegs.forEach(p => {
          World.add(this.engine.world, Bodies.circle(p.x, p.y, p.r, {
            isStatic: true,
            restitution: p.restitution || 0.78,
            friction: 0,
            frictionStatic: 0
          }));
        });

        sec.Polys.forEach(poly => {
          for (let i = 0; i < poly.pts.length; i++) {
            const p1 = poly.pts[i];
            const p2 = poly.pts[(i + 1) % poly.pts.length];
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            World.add(this.engine.world, Bodies.rectangle((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, Math.hypot(dx, dy), 16, {
              isStatic: true,
              angle: Math.atan2(dy, dx),
              restitution: 0.55,
              friction: 0,
              frictionStatic: 0
            }));
          }
        });

        sec.HalfMoons.forEach(hm => {
          const arcWalls = buildArcWalls(hm.x, hm.y, hm.r * 0.75, hm.angle - Math.PI * 0.45, hm.angle + Math.PI * 0.45, 5, 20, BLACK);
          arcWalls.forEach(w => {
            const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
            World.add(this.engine.world, Bodies.rectangle((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, Math.hypot(dx, dy), 18, {
              isStatic: true,
              angle: Math.atan2(dy, dx),
              restitution: 0.68,
              friction: 0,
              frictionStatic: 0
            }));
          });
        });

        sec.Spinners.forEach(sp => {
          const bladesCount = sp.style === "bar" ? 1 : 2;
          const bladeBodies = [];
          for (let k = 0; k < bladesCount; k++) {
            const b = Bodies.rectangle(sp.x, sp.y, sp.len, sp.thick || 20, {
              isStatic: true,
              angle: (k * Math.PI) / bladesCount,
              restitution: 0.78,
              friction: 0,
              frictionStatic: 0
            });
            bladeBodies.push(b);
            World.add(this.engine.world, b);
          }
          sec.dynamicItems.push({ blades: bladeBodies, spec: sp, angle: rng() * Math.PI });
        });
      });

      this.marbles = [];
      this.finishedOrder = [];
      this.eliminatedOrder = [];
      this.raceStartTime = performance.now();
      this.midRaceRecorded = false;

      const list = this.session.activeCountries.slice();
      const r = list.length > 180 ? 13 : list.length > 90 ? 15.5 : 18;
      const usableW = ARENA_W - 180;
      const cols = Math.max(12, Math.floor(usableW / (r * 2.25)));

      list.forEach((country, idx) => {
        MarbleTextureCache.getTexture(country);
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = 90 + col * (usableW / Math.max(1, cols - 1)) + (rng() - 0.5) * 8;
        const y = 35 + row * (r * 2.2) + (rng() - 0.5) * 5;

        const body = Bodies.circle(x, y, r, {
          restitution: 0.6,
          friction: 0,
          frictionStatic: 0,
          frictionAir: 0.0018,
          slop: 0.02,
          density: 0.0025
        });
        Body.setVelocity(body, { x: (rng() - 0.5) * 4.5, y: 2.8 + rng() * 2 });
        World.add(this.engine.world, body);

        this.marbles.push({
          country,
          body,
          r,
          x,
          y,
          angle: 0,
          resets: 0,
          prevRank: idx + 1,
          rankDelta: 0,
          lastPos: { x, y },
          stuckTicks: 0,
          inGhostZone: false,
          trail: [],
          finished: false,
          eliminated: false,
          finishTimeMs: 0,
          midRank: idx + 1
        });
      });
    },

    // Spawns red spark burst & teleports marble back to the very beginning of the race!
    teleportMarbleToStart(m) {
      const { Body } = window.Matter;
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI * 2 * i) / 10;
        this.resetParticles.push({
          x: m.x,
          y: m.y,
          vx: Math.cos(ang) * (4 + Math.random() * 4),
          vy: Math.sin(ang) * (4 + Math.random() * 4),
          life: 24
        });
      }
      const newX = 110 + Math.random() * (ARENA_W - 220);
      const newY = 40 + Math.random() * 45;
      Body.setPosition(m.body, { x: newX, y: newY });
      Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 4, y: 2.5 });
      m.x = newX;
      m.y = newY;
      m.lastPos = { x: newX, y: newY };
      m.stuckTicks = 0;
      m.trail = [];
      m.resets = (m.resets || 0) + 1;
      this.totalRedResets += 1;
      this.lastResetBanner = `🔴 ${m.country.iso3} RESET TO START!`;
      if (this.simTick % 4 === 0) SFX.redZoneBuzzer();
    },

    startLoop(canvas) {
      if (this.animId) cancelAnimationFrame(this.animId);
      const ctx = canvas.getContext("2d");
      const skin = window.GAME_DATA.skins.find(s => s.id === State.equippedSkin) || window.GAME_DATA.skins[0];

      const stepFrame = () => {
        try {
          const subSteps = this.speedMult * 2;
          for (let s = 0; s < subSteps; s++) {
            this.stepPhysicsSubStep();
          }
          this.renderBroadcastScene(ctx, canvas, skin);
        } catch (err) {
          console.error("Frame recovery:", err);
        }

        if (this.checkRaceFinished()) {
          this.onRoundComplete();
          return;
        }
        this.animId = requestAnimationFrame(stepFrame);
      };
      this.animId = requestAnimationFrame(stepFrame);
    },

    stepPhysicsSubStep() {
      if (!window.Matter || !this.engine || !this.worldData) return;
      const { Engine, Body, World } = window.Matter;
      this.simTick += 1;
      const finishY = this.worldData.finishY;
      const spd = (this.session.physSpeed || 1) * 0.5;

      this.worldData.sections.forEach(sec => {
        sec.dynamicItems.forEach(item => {
          item.angle += item.spec.speed * spd;
          const n = item.blades.length;
          for (let k = 0; k < n; k++) {
            Body.setAngle(item.blades[k], item.angle + (k * Math.PI) / n);
          }
        });
      });

      Engine.update(this.engine, 1000 / 120);

      if (this.session.format === "survival") {
        this.lavaY += 1.5 * spd;
      }

      let maxActiveY = 0;

      this.marbles.forEach(m => {
        if (m.finished || m.eliminated) return;

        if (!Number.isFinite(m.body.position.x) || !Number.isFinite(m.body.position.y)) {
          Body.setPosition(m.body, { x: ARENA_W / 2, y: 50 });
          Body.setVelocity(m.body, { x: 0, y: 4 });
        }

        if (m.body.position.x < 28 + m.r) {
          Body.setPosition(m.body, { x: 30 + m.r, y: m.body.position.y });
          Body.setVelocity(m.body, { x: Math.abs(m.body.velocity.x) + 2, y: m.body.velocity.y });
        } else if (m.body.position.x > ARENA_W - 28 - m.r) {
          Body.setPosition(m.body, { x: ARENA_W - 30 - m.r, y: m.body.position.y });
          Body.setVelocity(m.body, { x: -Math.abs(m.body.velocity.x) - 2, y: m.body.velocity.y });
        }

        const vx = m.body.velocity.x, vy = m.body.velocity.y;
        const maxV = m.r * 0.88;
        const curV = Math.hypot(vx, vy);
        if (curV > maxV) {
          Body.setVelocity(m.body, { x: (vx / curV) * maxV, y: (vy / curV) * maxV });
        }

        m.x = m.body.position.x;
        m.y = m.body.position.y;
        m.angle = m.body.angle;
        if (m.y > maxActiveY) maxActiveY = m.y;

        // Check RED RESET ZONES & Special Zones
        let insideGhost = false;
        let hitRedReset = false;

        for (let si = 0; si < this.worldData.sections.length; si++) {
          const sec = this.worldData.sections[si];
          if (m.y + m.r < sec.yStart || m.y - m.r > sec.yEnd) continue;

          // Check Red Reset Zones: If marble touches any Red Zone, restart from the beginning!
          for (let ri = 0; ri < sec.RedZones.length; ri++) {
            const rz = sec.RedZones[ri];
            if (m.x + m.r >= rz.x && m.x - m.r <= rz.x + rz.w && m.y + m.r >= rz.y && m.y - m.r <= rz.y + rz.h) {
              hitRedReset = true;
              break;
            }
          }
          if (hitRedReset) break;

          sec.Zones.forEach(z => {
            if (m.x >= z.x && m.x <= z.x + z.w && m.y >= z.y && m.y <= z.y + z.h) {
              if (z.kind === "ghost") insideGhost = true;
              else if (z.kind === "conveyorDown") {
                Body.setVelocity(m.body, { x: 0, y: 10 });
              }
            }
          });
        }

        if (hitRedReset) {
          this.teleportMarbleToStart(m);
          return;
        }

        if (insideGhost !== m.inGhostZone) {
          m.inGhostZone = insideGhost;
          m.body.collisionFilter.group = insideGhost ? -2 : 0;
        }

        // Fast Anti-Stuck System
        const movedDist = Math.hypot(m.x - m.lastPos.x, m.y - m.lastPos.y);
        if (movedDist < 1.3) {
          m.stuckTicks += 1;
          if (m.stuckTicks === 30) {
            Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 10, y: -6 });
          } else if (m.stuckTicks === 65) {
            Body.setPosition(m.body, { x: m.x + (Math.random() - 0.5) * 45, y: m.y + 48 });
            Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 8, y: 7 });
          } else if (m.stuckTicks > 105) {
            Body.setPosition(m.body, { x: ARENA_W * 0.2 + Math.random() * (ARENA_W * 0.6), y: m.y + 90 });
            Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 5, y: 7.5 });
            m.stuckTicks = 0;
          }
        } else {
          m.lastPos.x = m.x;
          m.lastPos.y = m.y;
          m.stuckTicks = 0;
        }

        if (this.simTick % 3 === 0 && State.equippedSkin !== "default") {
          m.trail.push({ x: m.x, y: m.y });
          if (m.trail.length > 6) m.trail.shift();
        }

        if (this.session.format === "survival" && m.y < this.lavaY) {
          m.eliminated = true;
          m.finishTimeMs = Math.round(performance.now() - this.raceStartTime);
          this.eliminatedOrder.push(m);
          World.remove(this.engine.world, m.body);
        } else if (m.y >= finishY) {
          m.finished = true;
          m.finishTimeMs = Math.round(performance.now() - this.raceStartTime);
          this.finishedOrder.push(m);
          World.remove(this.engine.world, m.body);
          if (this.finishedOrder.length <= 5 || this.finishedOrder.length === this.spotsTotal) {
            SFX.qualifyDing();
          }

          if (this.session.format === "knockout" && this.finishedOrder.length >= this.spotsTotal && this.spotsTotal < this.marbles.length) {
            const stragglers = this.marbles.filter(x => !x.finished && !x.eliminated).sort((a, b) => b.y - a.y);
            stragglers.forEach((st, idx) => {
              st.eliminated = true;
              st.finishTimeMs = Math.round(performance.now() - this.raceStartTime) + (idx + 1) * 35;
              this.eliminatedOrder.unshift(st);
              World.remove(this.engine.world, st.body);
            });
          }
        }
      });

      if (!this.midRaceRecorded && maxActiveY >= finishY * 0.5) {
        this.midRaceRecorded = true;
        const sorted = this.marbles.slice().sort((a, b) => b.y - a.y);
        sorted.forEach((m, idx) => { m.midRank = idx + 1; });
      }
    },

    nudgeAllMarbles() {
      if (!window.Matter || !this.marbles) return;
      const { Body } = window.Matter;
      this.marbles.forEach(m => {
        if (!m.finished && !m.eliminated) {
          Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 12, y: 8.5 });
        }
      });
    },

    checkRaceFinished() {
      const remaining = this.marbles.filter(m => !m.finished && !m.eliminated);
      if (this.session.format === "survival" && remaining.length <= 1 && this.finishedOrder.length === 0) {
        if (remaining.length === 1) {
          remaining[0].finished = true;
          remaining[0].finishTimeMs = Math.round(performance.now() - this.raceStartTime);
          this.finishedOrder.push(remaining[0]);
        }
        return true;
      }
      return remaining.length === 0;
    },

    renderBroadcastScene(ctx, canvas, skin) {
      const W = canvas.width;
      const H = canvas.height;
      const finishY = this.worldData.finishY;

      ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      const activeMarbles = this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => b.y - a.y);
      const liveRanking = [
        ...this.finishedOrder,
        ...activeMarbles,
        ...this.eliminatedOrder.slice().reverse()
      ];

      if (this.simTick % 25 === 0) {
        liveRanking.forEach((m, idx) => {
          const curRank = idx + 1;
          if (curRank < m.prevRank) m.rankDelta = 1;
          else if (curRank > m.prevRank) m.rankDelta = -1;
          m.prevRank = curRank;
        });
      }

      const sidebarW = Math.max(125, Math.min(200, Math.round(W * 0.19)));
      const arenaViewX = sidebarW + 4;
      const arenaViewW = W - arenaViewX - 18;
      const holdingTubeH = 48;
      const arenaViewH = H - holdingTubeH - 4;

      // 1. RENDER MAIN ARENA
      ctx.save();
      ctx.beginPath();
      ctx.rect(arenaViewX, 0, arenaViewW, arenaViewH);
      ctx.clip();

      const scaleX = arenaViewW / ARENA_W;
      let camScale = scaleX;
      if (this.cameraMode === "leader" || this.cameraMode === "pack") {
        camScale = Math.max(scaleX, (arenaViewW / ARENA_W) * 1.25);
      }

      const visibleWorldH = arenaViewH / camScale;
      let focusY = finishY * 0.5;
      if (this.cameraMode === "pack" && activeMarbles.length) {
        const slice = activeMarbles.slice(0, Math.min(20, activeMarbles.length));
        focusY = slice.reduce((s, m) => s + m.y, 0) / slice.length;
      } else if (activeMarbles[0]) {
        focusY = activeMarbles[0].y;
      } else {
        focusY = finishY - visibleWorldH * 0.3;
      }

      const targetCamY = Math.max(0, Math.min(Math.max(0, finishY + 60 - visibleWorldH), focusY - visibleWorldH * 0.5));
      this.camY += (targetCamY - this.camY) * 0.16;

      ctx.translate(arenaViewX, 0);
      ctx.scale(camScale, camScale);
      ctx.translate(0, -this.camY);

      const viewTop = this.camY - 200;
      const viewBot = this.camY + visibleWorldH + 200;

      ctx.fillStyle = PERIWINKLE;
      ctx.fillRect(22, 0, ARENA_W - 44, finishY);

      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, 25, finishY + 300);
      ctx.fillRect(ARENA_W - 25, 0, 25, finishY + 300);

      this.worldData.sections.forEach(sec => {
        if (sec.yEnd < viewTop || sec.yStart > viewBot) return;

        sec.Zones.forEach(z => {
          if (z.kind === "ghost") {
            ctx.fillStyle = "#6e3b0c";
            ctx.fillRect(z.x, z.y, z.w, z.h);
            ctx.strokeStyle = "#3d1e04";
            ctx.lineWidth = 3;
            for (let gx = z.x; gx <= z.x + z.w; gx += 80) {
              ctx.beginPath(); ctx.moveTo(gx, z.y); ctx.lineTo(gx, z.y + z.h); ctx.stroke();
            }
            for (let gy = z.y; gy <= z.y + z.h; gy += 70) {
              ctx.beginPath(); ctx.moveTo(z.x, gy); ctx.lineTo(z.x + z.w, gy); ctx.stroke();
            }
            ctx.fillStyle = "#111827";
            ctx.font = "900 30px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(z.label, ARENA_W / 2, z.y + z.h + 36);
          } else if (z.kind === "conveyorDown") {
            ctx.fillStyle = z.color;
            ctx.fillRect(z.x, z.y, z.w, z.h);
            ctx.fillStyle = z.arrowColor;
            ctx.font = "900 26px sans-serif";
            ctx.textAlign = "center";
            for (let ay = z.y + 40; ay < z.y + z.h - 20; ay += 52) {
              ctx.fillText("↓↓", z.x + z.w / 2, ay);
            }
          }
        });

        sec.Banners.forEach(b => {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
        });

        // Glowing RED RESET ZONES (Touch = Teleport back to Start!)
        sec.RedZones.forEach(rz => {
          ctx.fillStyle = RED_RESET;
          ctx.fillRect(rz.x, rz.y, rz.w, rz.h);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.strokeRect(rz.x, rz.y, rz.w, rz.h);
        });

        sec.Polys.forEach(poly => {
          ctx.fillStyle = poly.color;
          ctx.beginPath();
          poly.pts.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.closePath();
          ctx.fill();
        });

        sec.Boxes.forEach(bx => {
          if (bx.y + bx.h < viewTop || bx.y - bx.h > viewBot) return;
          ctx.save();
          ctx.translate(bx.x, bx.y);
          ctx.rotate(bx.angle || 0);
          ctx.fillStyle = bx.color || BLACK;
          ctx.fillRect(-bx.w / 2, -bx.h / 2, bx.w, bx.h);
          ctx.restore();
        });

        sec.HalfMoons.forEach(hm => {
          ctx.save();
          ctx.translate(hm.x, hm.y);
          ctx.rotate(hm.angle || 0);
          ctx.fillStyle = hm.color || BLACK;
          ctx.beginPath();
          ctx.arc(0, 0, hm.r, -Math.PI * 0.5, Math.PI * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });

        sec.Walls.forEach(w => {
          if (Math.max(w.y1, w.y2) < viewTop || Math.min(w.y1, w.y2) > viewBot) return;
          ctx.strokeStyle = w.color || BLACK;
          ctx.lineWidth = w.thick || 22;
          ctx.lineCap = "butt";
          ctx.beginPath();
          ctx.moveTo(w.x1, w.y1);
          ctx.lineTo(w.x2, w.y2);
          ctx.stroke();
        });

        sec.Pegs.forEach(p => {
          if (p.y + p.r < viewTop || p.y - p.r > viewBot) return;
          ctx.fillStyle = p.color || BLACK;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });

        sec.dynamicItems.forEach(item => {
          const sp = item.spec;
          if (sp.y + sp.len < viewTop || sp.y - sp.len > viewBot) return;
          ctx.save();
          ctx.translate(sp.x, sp.y);
          ctx.rotate(item.angle);

          if (sp.style === "pinwheel") {
            const slices = 16;
            const rad = sp.len / 2;
            for (let s = 0; s < slices; s++) {
              ctx.fillStyle = s % 2 === 0 ? "#ff00aa" : "#1d4ed8";
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.arc(0, 0, rad, (s * Math.PI * 2) / slices, ((s + 1) * Math.PI * 2) / slices);
              ctx.closePath();
              ctx.fill();
            }
          } else if (sp.style === "star4") {
            ctx.fillStyle = sp.color || BLACK;
            const rOuter = sp.len / 2;
            const rInner = rOuter * 0.34;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const r = i % 2 === 0 ? rOuter : rInner;
              const a = (i * Math.PI) / 4;
              if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = sp.color || BLACK;
            const t = sp.thick || 20;
            ctx.fillRect(-sp.len / 2, -t / 2, sp.len, t);
            if (sp.style !== "bar") {
              ctx.fillRect(-t / 2, -sp.len / 2, t, sp.len);
            }
          }
          ctx.restore();
        });
      });

      ctx.fillStyle = "#0018ff";
      ctx.fillRect(25, finishY, ARENA_W - 50, 24);

      // Render Red Zone Teleport Spark Particles
      for (let i = this.resetParticles.length - 1; i >= 0; i--) {
        const pt = this.resetParticles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
        ctx.fillStyle = pt.life % 2 === 0 ? "#ff1111" : "#fbbf24";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fill();
        if (pt.life <= 0) this.resetParticles.splice(i, 1);
      }

      // Render Marbles: Pure Full-Bleed Flag Circle (Zero Outline, Zero Floating Text)
      this.marbles.forEach(m => {
        if (m.finished || m.eliminated) return;
        if (m.y + m.r < viewTop || m.y - m.r > viewBot) return;

        if (m.trail.length > 1 && skin.trail) {
          ctx.strokeStyle = skin.trail;
          ctx.lineWidth = 6;
          ctx.globalAlpha = 0.45;
          ctx.beginPath();
          m.trail.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        const tex = MarbleTextureCache.getTexture(m.country);
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle);
        if (m.inGhostZone) ctx.globalAlpha = 0.65;
        ctx.drawImage(tex, -m.r, -m.r, m.r * 2, m.r * 2);
        ctx.restore();
      });

      ctx.restore();

      // 2. BOTTOM QUALIFICATION HOLDING TUBE
      const tubeY = arenaViewH + 2;
      ctx.fillStyle = BLACK;
      ctx.fillRect(arenaViewX, tubeY, arenaViewW, holdingTubeH);

      const lane1Y = tubeY + 5;
      const lane2Y = tubeY + 26;
      ctx.fillStyle = PERIWINKLE;
      ctx.fillRect(arenaViewX + 8, lane1Y, arenaViewW - 16, 17);
      ctx.fillRect(arenaViewX + 8, lane2Y, arenaViewW - 16, 17);

      const maxPerLane = Math.floor((arenaViewW - 28) / 17);
      this.finishedOrder.slice(0, maxPerLane * 2).forEach((m, idx) => {
        const tex = MarbleTextureCache.getTexture(m.country);
        const lane = idx < maxPerLane ? 0 : 1;
        const col = lane === 0 ? idx : idx - maxPerLane;
        const mx = arenaViewX + 18 + col * 17;
        const my = (lane === 0 ? lane1Y : lane2Y) + 8.5;
        ctx.drawImage(tex, mx - 7.5, my - 7.5, 15, 15);
      });

      // 3. LEFT BROADCAST SIDEBAR
      ctx.fillStyle = "#0e1117";
      ctx.fillRect(0, 0, sidebarW, H);
      ctx.strokeStyle = PERIWINKLE;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sidebarW + 2, 0);
      ctx.lineTo(sidebarW + 2, H);
      ctx.stroke();

      ctx.fillStyle = "#1c212b";
      ctx.fillRect(6, 6, sidebarW - 12, 46);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, sidebarW - 12, 46);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`LAP ${this.session.currentRound} • ${this.marbles.length} FLAGS`, sidebarW / 2, 23);
      ctx.fillStyle = "#ff4d6d";
      ctx.font = "800 10px sans-serif";
      ctx.fillText(this.lastResetBanner || `🔴 RESETS: ${this.totalRedResets}`, sidebarW / 2, 42);

      const listTop = 58;
      const listBot = H - 58;
      const listH = listBot - listTop;
      ctx.fillStyle = "#161a22";
      ctx.fillRect(6, listTop, sidebarW - 12, listH);

      const rowH = 19;
      const visibleRows = Math.max(4, Math.floor((listH - 6) / rowH));
      const startRankIdx = Math.max(0, Math.min(liveRanking.length - visibleRows, Math.max(0, this.finishedOrder.length - Math.floor(visibleRows * 0.6))));

      for (let i = 0; i < visibleRows && (startRankIdx + i) < liveRanking.length; i++) {
        const rankIdx = startRankIdx + i;
        const m = liveRanking[rankIdx];
        const ry = listTop + 3 + i * rowH;

        ctx.fillStyle = m.eliminated ? "#ef4444" : "#00ff66";
        ctx.font = "900 11.5px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`${rankIdx + 1}.`, 10, ry + 13);

        const tex = MarbleTextureCache.getTexture(m.country);
        ctx.drawImage(tex, 42, ry + 2, 14, 14);

        ctx.fillStyle = "#ffffff";
        ctx.font = "800 11.5px sans-serif";
        ctx.fillText(m.country.iso3 || m.country.code.slice(0, 3), 62, ry + 13);

        const arrowX = sidebarW - 18;
        ctx.fillStyle = m.rankDelta >= 0 ? "#00f2fe" : "#f97316";
        ctx.beginPath();
        if (m.rankDelta >= 0) {
          ctx.moveTo(arrowX, ry + 4);
          ctx.lineTo(arrowX - 4.5, ry + 13);
          ctx.lineTo(arrowX + 4.5, ry + 13);
        } else {
          ctx.moveTo(arrowX - 4.5, ry + 4);
          ctx.lineTo(arrowX + 4.5, ry + 4);
          ctx.lineTo(arrowX, ry + 13);
        }
        ctx.closePath();
        ctx.fill();
      }

      const botBoxY = H - 52;
      ctx.fillStyle = "#1c212b";
      ctx.fillRect(6, botBoxY, sidebarW - 12, 46);
      ctx.strokeStyle = GREEN_SAFE;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(6, botBoxY, sidebarW - 12, 46);

      const latestFin = this.finishedOrder[this.finishedOrder.length - 1] || liveRanking[0];
      if (latestFin) {
        const tex = MarbleTextureCache.getTexture(latestFin.country);
        ctx.drawImage(tex, sidebarW / 2 - 28, botBoxY + 5, 15, 15);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 11.5px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(latestFin.country.iso3 || latestFin.country.code.slice(0, 3), sidebarW / 2 - 8, botBoxY + 17);
      }

      const spotsLeft = Math.max(0, this.spotsTotal - this.finishedOrder.length);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 10.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`SPOTS LEFT: ${spotsLeft}`, sidebarW / 2, botBoxY + 38);

      const stripX = W - 12;
      ctx.fillStyle = "#16181d";
      ctx.fillRect(stripX, 4, 10, H - 8);
      this.marbles.forEach(m => {
        if (m.eliminated) return;
        const my = 6 + Math.min(1, Math.max(0, m.y / finishY)) * (H - 12);
        const tex = MarbleTextureCache.getTexture(m.country);
        ctx.drawImage(tex, stripX + 1, my - 4, 8, 8);
      });
    },

    skipToResult() {
      if (!this.session || !this.worldData) return;
      let guard = 0;
      while (!this.checkRaceFinished() && guard < 3000) {
        this.stepPhysicsSubStep();
        guard++;
      }
      const rem = this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => b.y - a.y);
      rem.forEach((m, idx) => {
        m.finished = true;
        m.finishTimeMs = Math.round(performance.now() - this.raceStartTime) + idx * 45;
        this.finishedOrder.push(m);
      });
      if (this.animId) cancelAnimationFrame(this.animId);
      this.onRoundComplete();
    },

    onRoundComplete() {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        try { this.mediaRecorder.stop(); } catch (e) {}
      }

      const finalOrder = [
        ...this.finishedOrder,
        ...this.eliminatedOrder.slice().reverse()
      ];
      if (!finalOrder.length) return;

      SFX.winFanfare();
      const winner = finalOrder[0];
      const isGrandPrix = this.session.format === "grandprix";

      if (finalOrder.length >= 2 && finalOrder[0].finishTimeMs && finalOrder[1].finishTimeMs) {
        const delta = Math.abs(finalOrder[1].finishTimeMs - finalOrder[0].finishTimeMs);
        if (delta <= 60) UI.unlockAchievement("photofinish");
        if (delta < State.records.closestFinish.ms) {
          State.records.closestFinish = {
            pair: `${finalOrder[0].country.iso3} vs ${finalOrder[1].country.iso3}`,
            ms: delta
          };
        }
      }

      const gained = (winner.midRank || 1) - 1;
      if (gained > State.records.bestComeback.gained) {
        State.records.bestComeback = { country: `${winner.country.name} (${winner.country.iso3})`, gained };
      }

      UI.unlockAchievement("first_win");
      if (winner.country.small || winner.country.isCustom) UI.unlockAchievement("underdog");
      State.coins += 40;

      let betMsg = "";
      if (this.session.betCode) {
        const top3Codes = finalOrder.slice(0, 3).map(m => m.country.code.split("#")[0]);
        if (top3Codes.includes(this.session.betCode)) {
          State.coins += 200;
          UI.unlockAchievement("bet_win");
          betMsg = "🎯 Podium Bet Won! +200 Coins! ";
        }
      }

      finalOrder.forEach((m, idx) => {
        const pos = idx + 1;
        const st = ensureCountryStat(m.country.code);
        st.races += 1;
        st.posSum += pos;
        st.recent.unshift(pos);
        if (st.recent.length > 5) st.recent.pop();

        if (isGrandPrix) {
          const gp = window.GAME_DATA.getPoints(idx, this.session.gpSystem);
          st.points += gp;
          this.session.seriesScores[m.country.code] = (this.session.seriesScores[m.country.code] || 0) + gp;
        } else if (idx === 0) {
          this.session.seriesScores[m.country.code] = (this.session.seriesScores[m.country.code] || 0) + 1;
        }

        if (this.session.format === "team") {
          const reg = m.country.region[0] || "World";
          this.session.teamScores[reg] = (this.session.teamScores[reg] || 0) + Math.max(1, finalOrder.length - idx);
        }

        if (pos === 1) {
          st.wins += 1;
          st.streak += 1;
          if (st.streak > State.records.longestStreak.streak) {
            State.records.longestStreak = { country: `${m.country.name} (${m.country.iso3})`, streak: st.streak };
          }
        } else {
          st.streak = 0;
        }
        if (pos <= 3) st.podiums += 1;
      });

      let elimNote = betMsg;
      let knockedCodes = new Set();
      if (this.session.format === "knockout" && this.session.activeCountries.length > 2) {
        const cut = Math.min(this.session.elimPerRound, this.session.activeCountries.length - 1);
        const knocked = finalOrder.slice(-cut).map(m => m.country);
        knockedCodes = new Set(knocked.map(c => c.code));
        this.session.activeCountries = this.session.activeCountries.filter(c => !knockedCodes.has(c.code));
        elimNote += `Eliminated (${cut}): ${knocked.slice(0, 6).map(c => c.iso3 || c.name).join(", ")}${knocked.length > 6 ? "..." : ""}`;
      }

      saveState();
      this.showWinnerModal(winner.country, finalOrder, elimNote, knockedCodes);
    },

    showWinnerModal(winCountry, finalOrder, elimNote, knockedCodes) {
      const isGrandPrix = this.session.format === "grandprix";
      document.getElementById("winHeader").textContent =
        `🏆 LAP ${this.session.currentRound}/${this.session.totalRounds} WINNER!`;
      document.getElementById("winTrackSub").textContent =
        `${this.getTrackDisplayName(this.currentTrackId)} • Red Resets: ${this.totalRedResets}`;

      const wCnv = document.getElementById("winMarbleCanvas");
      if (wCnv) {
        const wCtx = wCnv.getContext("2d");
        wCtx.clearRect(0, 0, 76, 76);
        wCtx.drawImage(MarbleTextureCache.getTexture(winCountry), 0, 0, 76, 76);
      }

      document.getElementById("winCountryName").textContent = `${winCountry.name} (${winCountry.iso3 || winCountry.code})`;
      document.getElementById("winFunFact").textContent = "💡 " + winCountry.fact;
      document.getElementById("winTotalMarbles").textContent = finalOrder.length;

      let seriesText = elimNote;
      if (this.session.isRivalry) {
        const [cA, cB] = this.session.activeCountries;
        seriesText = `Derby Score: ${cA.iso3} ${this.session.seriesScores[cA.code]} - ${this.session.seriesScores[cB.code]} ${cB.iso3}`;
      } else if (isGrandPrix) {
        const topGP = Object.entries(this.session.seriesScores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([code, p]) => `${findMarbleByCode(code).iso3}: ${p}pts`).join(" • ");
        seriesText = `GP Standings: ${topGP}`;
      }
      document.getElementById("winSeriesInfo").textContent = seriesText;
      document.getElementById("winColExtra").textContent = isGrandPrix ? "GP Points" : "Status";

      const leaderMs = finalOrder[0]?.finishTimeMs || 1000;
      document.getElementById("winPodiumList").innerHTML = finalOrder.map((m, idx) => {
        const isElim = m.eliminated || (knockedCodes && knockedCodes.has(m.country.code));
        const timeStr = idx === 0
          ? (m.finishTimeMs / 1000).toFixed(2) + "s"
          : "+" + Math.max(0.01, (m.finishTimeMs - leaderMs) / 1000).toFixed(2) + "s";

        let extraCol = "";
        if (isGrandPrix) {
          const pts = window.GAME_DATA.getPoints(idx, this.session.gpSystem);
          const totalPts = this.session.seriesScores[m.country.code] || 0;
          extraCol = `<span style="color:var(--gold); font-weight:700;">+${pts} (${totalPts})</span>`;
        } else if (isElim) {
          extraCol = `<span style="color:var(--neon-red); font-weight:700;">❌ OUT</span>`;
        } else if (idx === 0) {
          extraCol = `<span style="color:var(--neon-green); font-weight:700;">🥇 1ST</span>`;
        } else {
          extraCol = `<span style="color:#00ff66;">✓ SAFE</span>`;
        }

        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td>${m.country.flag || "🔵"} ${m.country.name} (${m.country.iso3 || ""})</td>
            <td>${timeStr}</td>
            <td>${m.resets || 0}</td>
            <td>${extraCol}</td>
          </tr>
        `;
      }).join("");

      document.getElementById("winnerModal").classList.add("active");

      if (this.autoPlay) {
        setTimeout(() => {
          if (document.getElementById("winnerModal").classList.contains("active")) {
            this.nextStepAfterModal();
          }
        }, 2600);
      }
    },

    nextStepAfterModal() {
      document.getElementById("winnerModal").classList.remove("active");
      if (!this.session) return;

      if (this.session.isCareer) {
        const myRank = this.finishedOrder.findIndex(m => m.country.code === this.session.careerCode) + 1;
        const passRanks = [15, 10, 5, 1];
        const passRank = passRanks[State.career.stage] || 1;
        if (myRank > 0 && myRank <= passRank) {
          if (State.career.stage < 3) {
            State.career.stage += 1;
            saveState();
            alert(`Qualified (#${myRank})! Advancing to Career Stage ${State.career.stage + 1}!`);
          } else {
            State.career.stage = 0;
            ensureCountryStat(this.session.careerCode).cups += 1;
            UI.unlockAchievement("world_champ");
            saveState();
            alert("🏆 WORLD CUP CAREER CHAMPION!");
          }
        } else {
          alert(`Eliminated at #${myRank} (Needed Top ${passRank}). Try again!`);
        }
        UI.showScreen("competitions");
        return;
      }

      if (this.session.isRivalry) {
        const needed = 3;
        const [cA, cB] = this.session.activeCountries;
        if (this.session.seriesScores[cA.code] >= needed || this.session.seriesScores[cB.code] >= needed) {
          const champ = this.session.seriesScores[cA.code] >= needed ? cA : cB;
          alert(`⚔️ Derby Winner: ${champ.name} (${champ.iso3})!`);
          UI.showScreen("competitions");
          return;
        }
      }

      if (this.session.currentRound < this.session.totalRounds && this.session.activeCountries.length >= 2) {
        this.session.currentRound += 1;
        this.launchRound();
      } else {
        let champ = null;
        if (this.session.format === "grandprix") {
          const topCode = Object.entries(this.session.seriesScores).sort((a, b) => b[1] - a[1])[0]?.[0];
          champ = findMarbleByCode(topCode);
        } else {
          champ = this.finishedOrder[0]?.country;
        }
        if (champ) {
          ensureCountryStat(champ.code).cups += 1;
          UI.unlockAchievement("world_champ");
          saveState();
          alert(`🏆 Overall Champion: ${champ.name} (${champ.iso3})!`);
        }
        UI.showScreen("creator");
      }
    },

    cycleSpeed() {
      this.speedMult = this.speedMult === 1 ? 2 : this.speedMult === 2 ? 3 : 1;
      this.updateHUDButtons();
    },

    cycleCamera() {
      const modes = ["wide", "leader", "pack"];
      const idx = (modes.indexOf(this.cameraMode) + 1) % modes.length;
      this.cameraMode = modes[idx];
      this.updateHUDButtons();
    },

    toggleAutoPlay() {
      this.autoPlay = !this.autoPlay;
      this.updateHUDButtons();
    },

    updateHUDButtons() {
      document.getElementById("btnSpeed").textContent = `⏩ ${this.speedMult}x`;
      document.getElementById("btnCam").textContent = `🎥 ${this.cameraMode}`;
      document.getElementById("btnAuto").textContent = `🔄 Auto: ${this.autoPlay ? "ON" : "OFF"}`;
    },

    toggleRecording() {
      const canvas = document.getElementById("raceCanvas");
      const btn = document.getElementById("btnRec");

      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        this.mediaRecorder.stop();
        btn.textContent = "🔴 REC Video";
        return;
      }

      const stream = canvas.captureStream ? canvas.captureStream(30) : (canvas.mozCaptureStream ? canvas.mozCaptureStream(30) : null);
      if (!stream || typeof MediaRecorder === "undefined") {
        alert("This Android WebView does not support MediaRecorder video capture.");
        return;
      }

      const mimeTypes = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm", "video/mp4"];
      let chosenMime = "";
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
          chosenMime = m;
          break;
        }
      }

      try {
        this.recordedChunks = [];
        this.lastRecordedMime = chosenMime || "video/webm";
        this.mediaRecorder = chosenMime
          ? new MediaRecorder(stream, { mimeType: chosenMime, videoBitsPerSecond: 2500000 })
          : new MediaRecorder(stream);

        this.mediaRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
          btn.textContent = "🔴 REC Video";
          if (!this.recordedChunks.length) return;
          this.lastRecordedBlob = new Blob(this.recordedChunks, { type: this.lastRecordedMime });
          const url = URL.createObjectURL(this.lastRecordedBlob);
          const vidEl = document.getElementById("recordedVideoEl");
          const boxEl = document.getElementById("videoReplayBox");
          if (vidEl && boxEl) {
            vidEl.src = url;
            boxEl.style.display = "block";
          }
        };

        this.mediaRecorder.start(250);
        btn.textContent = "⏹️ STOP REC";
      } catch (e) {
        alert("Could not start video recorder: " + e.message);
      }
    },

    downloadRecordedVideo() {
      if (!this.lastRecordedBlob) {
        alert("No recorded video yet! Tap 🔴 REC Video during a race.");
        return;
      }
      const ext = this.lastRecordedMime.includes("mp4") ? "mp4" : "webm";
      const url = URL.createObjectURL(this.lastRecordedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `country-marble-race-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 500);
    },

    async shareClipOrResult() {
      const winName = document.getElementById("winCountryName").textContent;
      const shareText = `🏆 ${winName} just won in Country Marble Race Pro! #CountryMarbleRace`;

      if (navigator.share) {
        try {
          if (this.lastRecordedBlob) {
            const ext = this.lastRecordedMime.includes("mp4") ? "mp4" : "webm";
            const file = new File([this.lastRecordedBlob], `marble-race.${ext}`, { type: this.lastRecordedMime });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ title: "Country Marble Race Pro", text: shareText, files: [file] });
              return;
            }
          }
          await navigator.share({ title: "Country Marble Race Pro", text: shareText });
          return;
        } catch (e) {}
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText).catch(() => {});
      }
      alert("Result copied to clipboard: " + shareText);
    },

    stopAndExit() {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        try { this.mediaRecorder.stop(); } catch (e) {}
      }
      UI.showScreen("creator");
    }
  };

  window.UI = UI;
  window.Editor = Editor;
  window.Game = Game;

  window.addEventListener("DOMContentLoaded", () => {
    UI.init();
  });
})();
