// Complete Mega-World Country Marble Race Engine (1600px Wide x up to 65,000px Tall)
// - Fixed Canvas 2D rendering bug (ctx.measureText) + crash-proof physics loop so races NEVER freeze
// - Landscape & Portrait orientation lock/toggle + Responsive Wide-World Camera
// - 250+ Countries & Territories + 24 Giant Multi-Section Tracks + Lazy Section Streaming
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

  const STORAGE_KEY = "CMR_SAVE_V4";
  const defaultSave = {
    coins: 250,
    equippedSkin: "default",
    unlockedSkins: ["default"],
    achievements: [],
    presets: [],
    customMarbles: [],
    customTrack: [
      { type: "funnel", x: 180, y: 220, angle: 0, scale: 1.1 },
      { type: "cross", x: 115, y: 380, angle: 0, scale: 1.1 },
      { type: "cross", x: 245, y: 380, angle: 0, scale: 1.1 },
      { type: "pegGrid", x: 180, y: 560, angle: 0, scale: 1.1 },
      { type: "bowl", x: 180, y: 780, angle: 0, scale: 1.1 },
      { type: "pendulum", x: 180, y: 1020, angle: 0, scale: 1.1 },
      { type: "wheel", x: 180, y: 1280, angle: 0, scale: 1.1 },
      { type: "rampL", x: 115, y: 1540, angle: 22, scale: 1.1 },
      { type: "rampR", x: 245, y: 1700, angle: -22, scale: 1.1 },
      { type: "goal", x: 180, y: 1960, angle: 0, scale: 1.1 },
      { type: "funnel", x: 180, y: 2240, angle: 0, scale: 1.1 }
    ],
    settings: {
      lang: "en",
      maxMarbles: 150,
      colorblind: 0,
      fontScale: 1,
      orientation: "any"
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
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("CMR_SAVE_V3") || localStorage.getItem("CMR_SAVE_V2");
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
  // BIGGER WORLD (1600px WIDE x up to 65,000px TALL) & 16-OBSTACLE LIBRARY
  // ============================================================================
  const WORLD_W = 1600;
  const WALL_COLOR = "#0a0a0f";

  function createArcSegments(cx, cy, radius, startAngle, endAngle, steps, thickness, color) {
    const segs = [];
    for (let i = 0; i < steps; i++) {
      const a1 = startAngle + ((endAngle - startAngle) * i) / steps;
      const a2 = startAngle + ((endAngle - startAngle) * (i + 1)) / steps;
      const x1 = cx + Math.cos(a1) * radius;
      const y1 = cy + Math.sin(a1) * radius;
      const x2 = cx + Math.cos(a2) * radius;
      const y2 = cy + Math.sin(a2) * radius;
      segs.push({ x1, y1, x2, y2, thickness: thickness || 30, color: color || WALL_COLOR });
    }
    return segs;
  }

  const OBSTACLE_LIBRARY = {
    // 10. Giant Circular Chamber at Start with Triangle Splitter & Twin Agitators
    startCircleSplitter(sec, y0, h, accent, diff, rng) {
      const cx = WORLD_W / 2;
      const cy = y0 + 620;
      const rad = 610;
      sec.walls.push(...createArcSegments(cx, cy, rad, Math.PI * 0.61, Math.PI * 1.44, 14, 36, WALL_COLOR));
      sec.walls.push(...createArcSegments(cx, cy, rad, -Math.PI * 0.44, Math.PI * 0.39, 14, 36, WALL_COLOR));
      sec.walls.push({ x1: 45, y1: y0 + 40, x2: cx - 420, y2: cy - 440, thickness: 36, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 45, y1: y0 + 40, x2: cx + 420, y2: cy - 440, thickness: 36, color: WALL_COLOR });

      const triY = cy + 30;
      sec.polygons.push({
        points: [
          { x: cx, y: triY - 160 },
          { x: cx - 190, y: triY + 120 },
          { x: cx + 190, y: triY + 120 }
        ],
        color: accent
      });
      sec.walls.push({ x1: cx, y1: triY - 160, x2: cx - 190, y2: triY + 120, thickness: 30, color: WALL_COLOR });
      sec.walls.push({ x1: cx, y1: triY - 160, x2: cx + 190, y2: triY + 120, thickness: 30, color: WALL_COLOR });
      sec.walls.push({ x1: cx - 190, y1: triY + 120, x2: cx + 190, y2: triY + 120, thickness: 30, color: WALL_COLOR });

      sec.spinners.push({ x: cx - 230, y: y0 + h - 260, len: 230, thick: 24, speed: 0.045, color: accent, style: "cross" });
      sec.spinners.push({ x: cx + 230, y: y0 + h - 260, len: 230, thick: 24, speed: -0.045, color: accent, style: "cross" });
    },

    // 1. Pegboard: Wide staggered grid of black & accent pegs
    pegboard(sec, y0, h, accent, diff, rng) {
      const rows = 9;
      const rowH = (h - 280) / rows;
      const pegR = diff === "hard" ? 24 : 20;
      sec.walls.push({ x1: 45, y1: y0 + 40, x2: 130, y2: y0 + h - 130, thickness: 34, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 45, y1: y0 + 40, x2: WORLD_W - 130, y2: y0 + h - 130, thickness: 34, color: WALL_COLOR });

      for (let r = 0; r < rows; r++) {
        const py = y0 + 135 + r * rowH;
        const cols = r % 2 === 0 ? 10 : 9;
        const startX = r % 2 === 0 ? 200 : 265;
        const spacing = 132;
        for (let c = 0; c < cols; c++) {
          const isAccent = (r + c) % 4 === 0;
          sec.pegs.push({
            x: startX + c * spacing,
            y: py,
            r: isAccent ? pegR + 6 : pegR,
            restitution: isAccent ? 0.92 : 0.65,
            color: isAccent ? accent : WALL_COLOR
          });
        }
      }
    },

    // 2. Rotating Plus/Cross/X Spinners
    crossSpinners(sec, y0, h, accent, diff, rng) {
      const rows = 5;
      const rowSpacing = (h - 280) / rows;
      for (let r = 0; r < rows; r++) {
        const ry = y0 + 160 + r * rowSpacing;
        if (r % 2 === 0) {
          sec.walls.push({ x1: 45, y1: ry - 70, x2: 195, y2: ry + 25, thickness: 30, color: WALL_COLOR });
          sec.walls.push({ x1: WORLD_W - 45, y1: ry - 70, x2: WORLD_W - 195, y2: ry + 25, thickness: 30, color: WALL_COLOR });
          for (let c = 0; c < 4; c++) {
            const cx = 310 + c * 325;
            const dir = (r + c) % 2 === 0 ? 1 : -1;
            sec.spinners.push({
              x: cx,
              y: ry,
              len: 245,
              thick: 24,
              speed: dir * 0.045,
              color: c % 2 === 1 ? accent : WALL_COLOR,
              style: "cross"
            });
          }
        } else {
          for (let c = 0; c < 5; c++) {
            const cx = 220 + c * 290;
            const dir = (r + c) % 2 === 0 ? -1 : 1;
            sec.spinners.push({
              x: cx,
              y: ry,
              len: 215,
              thick: 22,
              speed: dir * 0.055,
              color: c % 2 === 0 ? accent : WALL_COLOR,
              style: "cross"
            });
          }
        }
      }
    },

    // 3. Zigzag Sawtooth Walls
    zigzagSawtooth(sec, y0, h, accent, diff, rng) {
      const teeth = 6;
      const stepY = (h - 260) / teeth;
      const c1 = WORLD_W * 0.36;
      const c2 = WORLD_W * 0.64;

      for (let i = 0; i < teeth; i++) {
        const ty = y0 + 115 + i * stepY;
        const toothW = diff === "hard" ? 185 : 150;
        sec.walls.push({ x1: 45, y1: ty, x2: 45 + toothW, y2: ty + stepY * 0.5, thickness: 32, color: WALL_COLOR });
        sec.walls.push({ x1: 45 + toothW, y1: ty + stepY * 0.5, x2: 45, y2: ty + stepY, thickness: 32, color: WALL_COLOR });
        sec.walls.push({ x1: WORLD_W - 45, y1: ty, x2: WORLD_W - 45 - toothW, y2: ty + stepY * 0.5, thickness: 32, color: WALL_COLOR });
        sec.walls.push({ x1: WORLD_W - 45 - toothW, y1: ty + stepY * 0.5, x2: WORLD_W - 45, y2: ty + stepY, thickness: 32, color: WALL_COLOR });

        [c1, c2].forEach(cx => {
          sec.walls.push({ x1: cx, y1: ty - 15, x2: cx - toothW * 0.75, y2: ty + stepY * 0.4, thickness: 28, color: accent });
          sec.walls.push({ x1: cx - toothW * 0.75, y1: ty + stepY * 0.4, x2: cx, y2: ty + stepY * 0.8, thickness: 28, color: accent });
          sec.walls.push({ x1: cx, y1: ty - 15, x2: cx + toothW * 0.75, y2: ty + stepY * 0.4, thickness: 28, color: accent });
          sec.walls.push({ x1: cx + toothW * 0.75, y1: ty + stepY * 0.4, x2: cx, y2: ty + stepY * 0.8, thickness: 28, color: accent });
        });
      }
    },

    // 4. Slanted Planks (Serpentine Descent)
    slantedPlanks(sec, y0, h, accent, diff, rng) {
      const levels = 5;
      const stepY = (h - 260) / levels;
      const gapWidth = diff === "hard" ? 270 : 320;

      for (let i = 0; i < levels; i++) {
        const py = y0 + 130 + i * stepY;
        if (i % 2 === 0) {
          sec.walls.push({ x1: 45, y1: py - 50, x2: WORLD_W - gapWidth, y2: py + 130, thickness: 34, color: WALL_COLOR });
          sec.pegs.push({ x: WORLD_W - gapWidth * 0.45, y: py + 145, r: 28, restitution: 0.85, color: accent });
        } else {
          sec.walls.push({ x1: WORLD_W - 45, y1: py - 50, x2: gapWidth, y2: py + 130, thickness: 34, color: WALL_COLOR });
          sec.pegs.push({ x: gapWidth * 0.45, y: py + 145, r: 28, restitution: 0.85, color: accent });
        }
      }
    },

    // 5. Capsule Chambers
    capsuleChambers(sec, y0, h, accent, diff, rng) {
      const rooms = 3;
      const roomH = (h - 240) / rooms;

      for (let r = 0; r < rooms; r++) {
        const ry = y0 + 100 + r * roomH;
        const exitRight = r % 2 === 0;
        sec.walls.push(...createArcSegments(240, ry + roomH * 0.45, 175, Math.PI * 0.55, Math.PI * 1.45, 7, 32, WALL_COLOR));
        sec.walls.push(...createArcSegments(WORLD_W - 240, ry + roomH * 0.45, 175, -Math.PI * 0.45, Math.PI * 0.45, 7, 32, WALL_COLOR));

        if (exitRight) {
          sec.walls.push({ x1: 190, y1: ry + roomH * 0.82, x2: WORLD_W - 440, y2: ry + roomH * 0.93, thickness: 32, color: WALL_COLOR });
        } else {
          sec.walls.push({ x1: WORLD_W - 190, y1: ry + roomH * 0.82, x2: 440, y2: ry + roomH * 0.93, thickness: 32, color: WALL_COLOR });
        }

        [440, 720, 1000, 1220].forEach((sx, sIdx) => {
          sec.spinners.push({
            x: sx,
            y: ry + roomH * (sIdx % 2 === 0 ? 0.4 : 0.48),
            len: 200,
            thick: 22,
            speed: sIdx % 2 === 0 ? 0.05 : -0.05,
            color: sIdx % 2 === 0 ? accent : WALL_COLOR,
            style: "cross"
          });
        });
      }
    },

    // 6. Funnels & Hourglass Pinch Points
    funnelHourglass(sec, y0, h, accent, diff, rng) {
      const cx = WORLD_W / 2;
      const pinchW = diff === "hard" ? 135 : diff === "easy" ? 185 : 155;

      const f1Y = y0 + h * 0.32;
      sec.walls.push({ x1: 45, y1: y0 + 60, x2: cx - pinchW / 2, y2: f1Y, thickness: 36, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 45, y1: y0 + 60, x2: cx + pinchW / 2, y2: f1Y, thickness: 36, color: WALL_COLOR });
      sec.walls.push({ x1: cx - pinchW / 2, y1: f1Y, x2: cx - pinchW / 2, y2: f1Y + 95, thickness: 32, color: accent });
      sec.walls.push({ x1: cx + pinchW / 2, y1: f1Y, x2: cx + pinchW / 2, y2: f1Y + 95, thickness: 32, color: accent });

      const midY = y0 + h * 0.56;
      sec.walls.push({ x1: cx, y1: midY - 80, x2: cx - 250, y2: midY + 80, thickness: 32, color: WALL_COLOR });
      sec.walls.push({ x1: cx, y1: midY - 80, x2: cx + 250, y2: midY + 80, thickness: 32, color: WALL_COLOR });
      sec.spinners.push({ x: cx - 390, y: midY + 100, len: 210, thick: 22, speed: -0.05, color: accent, style: "cross" });
      sec.spinners.push({ x: cx + 390, y: midY + 100, len: 210, thick: 22, speed: 0.05, color: accent, style: "cross" });

      const f2Y = y0 + h * 0.86;
      sec.walls.push({ x1: 45, y1: midY + 150, x2: cx - pinchW * 0.65, y2: f2Y, thickness: 36, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 45, y1: midY + 150, x2: cx + pinchW * 0.65, y2: f2Y, thickness: 36, color: WALL_COLOR });
    },

    // 7. Big Rotating Wheel with Colored Blades inside a Box
    bigWheelBox(sec, y0, h, accent, diff, rng) {
      const cx = WORLD_W / 2;
      const cy = y0 + h * 0.5;
      const boxW = 980;
      const boxH = 880;

      sec.walls.push({ x1: 45, y1: y0 + 50, x2: cx - 190, y2: cy - boxH / 2, thickness: 34, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 45, y1: y0 + 50, x2: cx + 190, y2: cy - boxH / 2, thickness: 34, color: WALL_COLOR });

      sec.walls.push({ x1: cx - boxW / 2, y1: cy - boxH / 2, x2: cx - boxW / 2, y2: cy + boxH / 2 - 140, thickness: 36, color: WALL_COLOR });
      sec.walls.push({ x1: cx + boxW / 2, y1: cy - boxH / 2, x2: cx + boxW / 2, y2: cy + boxH / 2 - 140, thickness: 36, color: WALL_COLOR });
      sec.walls.push({ x1: cx - boxW / 2, y1: cy + boxH / 2 - 140, x2: cx - 175, y2: cy + boxH / 2 + 70, thickness: 36, color: WALL_COLOR });
      sec.walls.push({ x1: cx + boxW / 2, y1: cy + boxH / 2 - 140, x2: cx + 175, y2: cy + boxH / 2 + 70, thickness: 36, color: WALL_COLOR });

      sec.spinners.push({
        x: cx,
        y: cy,
        len: 780,
        thick: 30,
        speed: 0.026 * (rng() > 0.5 ? 1 : -1),
        color: accent,
        style: "wheel6"
      });
    },

    // 8. Giant Bowl or U-Shaped Catch Basin
    giantBowlBasin(sec, y0, h, accent, diff, rng) {
      const cx = WORLD_W / 2;
      const bowl1Y = y0 + 460;
      const bowl1R = 410;
      sec.walls.push(...createArcSegments(cx, bowl1Y, bowl1R, Math.PI * 0.12, Math.PI * 0.88, 12, 34, WALL_COLOR));
      for (let i = 0; i <= 6; i++) {
        const ang = Math.PI * (0.18 + (i / 6) * 0.64);
        sec.pegs.push({
          x: cx + Math.cos(ang) * (bowl1R - 28),
          y: bowl1Y + Math.sin(ang) * (bowl1R - 28),
          r: 22,
          restitution: 0.85,
          color: accent
        });
      }
      sec.spinners.push({ x: cx, y: bowl1Y + 130, len: 290, thick: 24, speed: 0.045, color: accent, style: "cross" });

      sec.walls.push({ x1: 45, y1: bowl1Y + 90, x2: 340, y2: y0 + h - 410, thickness: 34, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 45, y1: bowl1Y + 90, x2: WORLD_W - 340, y2: y0 + h - 410, thickness: 34, color: WALL_COLOR });
      sec.walls.push(...createArcSegments(cx, y0 + h - 450, 340, Math.PI * 0.18, Math.PI * 0.82, 10, 32, WALL_COLOR));
      sec.spinners.push({ x: cx, y: y0 + h - 300, len: 250, thick: 24, speed: -0.05, color: accent, style: "cross" });
    },

    // 9. Staircase Ramps with Launcher Curve
    staircaseRamps(sec, y0, h, accent, diff, rng) {
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const sx = 70 + s * 155;
        const sy = y0 + 140 + s * 95;
        sec.walls.push({ x1: sx, y1: sy, x2: sx + 160, y2: sy + 20, thickness: 32, color: WALL_COLOR });
        sec.walls.push({ x1: sx + 160, y1: sy + 20, x2: sx + 160, y2: sy + 95, thickness: 32, color: accent });
      }
      sec.walls.push(...createArcSegments(1120, y0 + 620, 210, Math.PI * 0.1, Math.PI * 0.65, 8, 32, WALL_COLOR));

      const yMid = y0 + h * 0.52;
      for (let s = 0; s < steps; s++) {
        const sx = WORLD_W - 70 - s * 155;
        const sy = yMid + s * 95;
        sec.walls.push({ x1: sx, y1: sy, x2: sx - 160, y2: sy + 20, thickness: 32, color: WALL_COLOR });
        sec.walls.push({ x1: sx - 160, y1: sy + 20, x2: sx - 160, y2: sy + 95, thickness: 32, color: accent });
      }
      sec.walls.push(...createArcSegments(480, yMid + 480, 210, Math.PI * 0.35, Math.PI * 0.9, 8, 32, WALL_COLOR));
    },

    // 11. Half-Circle and Scalloped Bubble Walls
    scallopedBubbleWalls(sec, y0, h, accent, diff, rng) {
      const bubbles = 5;
      const stepY = (h - 240) / bubbles;
      for (let i = 0; i < bubbles; i++) {
        const by = y0 + 150 + i * stepY;
        sec.pegs.push({ x: 65, y: by, r: 165, restitution: 0.85, color: WALL_COLOR });
        sec.pegs.push({ x: WORLD_W - 65, y: by + stepY * 0.5, r: 165, restitution: 0.85, color: WALL_COLOR });
        sec.pegs.push({ x: 540, y: by + stepY * 0.25, r: 95, restitution: 0.95, color: accent });
        sec.pegs.push({ x: 1060, y: by + stepY * 0.72, r: 95, restitution: 0.95, color: accent });
      }
    },

    // 12. Mixed Field of Slanted Dashes and Large Round Bumpers
    mixedDashesBumpers(sec, y0, h, accent, diff, rng) {
      const rows = 6;
      const stepY = (h - 260) / rows;
      for (let r = 0; r < rows; r++) {
        const ry = y0 + 130 + r * stepY;
        for (let c = 0; c < 5; c++) {
          const cx = 240 + c * 280 + (r % 2 === 0 ? -45 : 45);
          if ((r + c) % 2 === 0) {
            sec.pegs.push({ x: cx, y: ry, r: 48, restitution: 1.05, color: accent });
          } else {
            const ang = ((r + c) % 3 === 0 ? 28 : -28) * (Math.PI / 180);
            const dx = Math.cos(ang) * 70;
            const dy = Math.sin(ang) * 70;
            sec.walls.push({ x1: cx - dx, y1: ry - dy, x2: cx + dx, y2: ry + dy, thickness: 26, color: WALL_COLOR });
          }
        }
      }
    },

    // 13. Swinging Pendulums and Sliding Platforms
    pendulumsAndSliders(sec, y0, h, accent, diff, rng) {
      const levels = 4;
      const stepY = (h - 260) / levels;
      for (let i = 0; i < levels; i++) {
        const ly = y0 + 170 + i * stepY;
        if (i % 2 === 0) {
          [440, 800, 1160].forEach((px, idx) => {
            sec.pendulums.push({ pivotX: px, pivotY: ly - 100, armLen: 210, bobR: 42, speed: 0.036, phase: idx * 1.4, color: accent });
          });
          sec.walls.push({ x1: 45, y1: ly - 30, x2: 240, y2: ly + 70, thickness: 30, color: WALL_COLOR });
          sec.walls.push({ x1: WORLD_W - 45, y1: ly - 30, x2: WORLD_W - 240, y2: ly + 70, thickness: 30, color: WALL_COLOR });
        } else {
          sec.sliders.push({
            centerX: WORLD_W / 2,
            y: ly,
            w: 440,
            h: 34,
            range: 380,
            speed: 0.032,
            phase: i * 1.3,
            color: WALL_COLOR
          });
          sec.pegs.push({ x: 280, y: ly - 20, r: 36, restitution: 0.9, color: accent });
          sec.pegs.push({ x: WORLD_W - 280, y: ly - 20, r: 36, restitution: 0.9, color: accent });
        }
      }
    },

    // 14. Narrow Tubes, S-Curves, and Drop Shafts
    narrowTubesSCurves(sec, y0, h, accent, diff, rng) {
      const topY = y0 + 95;
      const midY = y0 + h * 0.52;
      const botY = y0 + h - 140;

      const tubeXs = [290, 560, 800, 1040, 1310];
      tubeXs.forEach(tx => {
        sec.walls.push({ x1: tx, y1: topY, x2: tx, y2: midY - 80, thickness: 32, color: WALL_COLOR });
        sec.pegs.push({ x: tx, y: topY - 10, r: 24, restitution: 0.8, color: accent });
      });

      sec.walls.push(...createArcSegments(540, midY + 150, 360, -Math.PI * 0.35, Math.PI * 0.45, 9, 34, WALL_COLOR));
      sec.walls.push(...createArcSegments(1060, botY - 170, 360, Math.PI * 0.65, Math.PI * 1.45, 9, 34, WALL_COLOR));
      sec.spinners.push({ x: WORLD_W / 2, y: midY + 280, len: 220, thick: 24, speed: 0.05, color: accent, style: "cross" });
    },

    // 15. Soccer-Goal Qualification Gate
    soccerGoalGate(sec, y0, h, accent, diff, rng) {
      const cx = WORLD_W / 2;
      const goalY = y0 + h * 0.52;
      const goalW = 480;

      sec.walls.push({ x1: 45, y1: y0 + 80, x2: 290, y2: goalY - 160, thickness: 34, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 45, y1: y0 + 80, x2: WORLD_W - 290, y2: goalY - 160, thickness: 34, color: WALL_COLOR });

      sec.walls.push({ x1: cx - goalW / 2, y1: goalY - 95, x2: cx - goalW / 2, y2: goalY + 85, thickness: 30, color: "#ffffff" });
      sec.walls.push({ x1: cx + goalW / 2, y1: goalY - 95, x2: cx + goalW / 2, y2: goalY + 85, thickness: 30, color: "#ffffff" });

      sec.sliders.push({
        centerX: cx,
        y: goalY - 20,
        w: 165,
        h: 30,
        range: 145,
        speed: 0.055,
        phase: 0,
        color: "#ef4444"
      });

      sec.zones.push({
        x: cx - goalW / 2 + 25,
        y: goalY,
        w: goalW - 50,
        h: 115,
        kind: "goalBoost",
        label: "⚽ GOAL BOOST!"
      });

      sec.walls.push({ x1: 45, y1: goalY + 40, x2: cx - 230, y2: y0 + h - 130, thickness: 32, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 45, y1: goalY + 40, x2: cx + 230, y2: y0 + h - 130, thickness: 32, color: WALL_COLOR });
    },

    // 16. No-Collision Ghost Zone + Solid Recovery Section
    noCollisionGhostZone(sec, y0, h, accent, diff, rng) {
      const cx = WORLD_W / 2;
      sec.zones.push({
        x: 70,
        y: y0 + 70,
        w: WORLD_W - 140,
        h: h * 0.56,
        kind: "ghost",
        label: "👻 NO-COLLISION GHOST ZONE"
      });

      sec.walls.push({ x1: 70, y1: y0 + 130, x2: cx - 90, y2: y0 + h * 0.42, thickness: 30, color: WALL_COLOR });
      sec.walls.push({ x1: WORLD_W - 70, y1: y0 + 130, x2: cx + 90, y2: y0 + h * 0.42, thickness: 30, color: WALL_COLOR });

      const solidY = y0 + h * 0.72;
      sec.spinners.push({ x: cx - 290, y: solidY, len: 230, thick: 24, speed: 0.05, color: accent, style: "cross" });
      sec.spinners.push({ x: cx + 290, y: solidY, len: 230, thick: 24, speed: -0.05, color: accent, style: "cross" });
      sec.pegs.push({ x: cx, y: solidY + 60, r: 44, restitution: 0.9, color: accent });
    }
  };

  const TRACK_BUILDER = {
    buildHugeWorld(sectionTypes, difficulty, rng) {
      const sections = [];
      let currentY = 440;
      const accents = window.GAME_DATA.sectionAccents;

      sectionTypes.forEach((type, idx) => {
        const h = type === "capsuleChambers" ? 2250 : 2050;
        const accent = accents[idx % accents.length];
        const sec = {
          index: idx + 1,
          total: sectionTypes.length,
          type,
          title: type.replace(/([A-Z])/g, " $1").toUpperCase(),
          yStart: currentY,
          yEnd: currentY + h,
          accent,
          walls: [],
          pegs: [],
          spinners: [],
          pendulums: [],
          sliders: [],
          polygons: [],
          zones: [],
          gateY: currentY + h - 45,
          passedMarbles: new Set(),
          loaded: false,
          matterBodies: [],
          dynamicItems: []
        };

        const builder = OBSTACLE_LIBRARY[type] || OBSTACLE_LIBRARY.crossSpinners;
        builder(sec, currentY, h, accent, difficulty, rng);

        const exitY = currentY + h - 55;
        sec.walls.push({ x1: 45, y1: exitY - 100, x2: 230, y2: exitY, thickness: 34, color: WALL_COLOR });
        sec.walls.push({ x1: WORLD_W - 45, y1: exitY - 100, x2: WORLD_W - 230, y2: exitY, thickness: 34, color: WALL_COLOR });

        sections.push(sec);
        currentY += h;
      });

      const finishY = currentY + 140;
      const totalHeight = finishY + 1100;
      return { sections, finishY, totalHeight };
    },

    buildCustomEditorWorld(customItems, difficulty) {
      const sections = [];
      const h = 10400;
      const sec = {
        index: 1,
        total: 1,
        type: "custom",
        title: "CUSTOM PRO EDITOR TRACK",
        yStart: 440,
        yEnd: 440 + h,
        accent: "#f59e0b",
        walls: [],
        pegs: [],
        spinners: [],
        pendulums: [],
        sliders: [],
        polygons: [],
        zones: [],
        gateY: 440 + h - 45,
        passedMarbles: new Set(),
        loaded: false,
        matterBodies: [],
        dynamicItems: []
      };

      const scaleX = WORLD_W / 360;
      const scaleY = h / 2600;

      customItems.forEach(item => {
        const x = item.x * scaleX;
        const y = 440 + item.y * scaleY;
        const scl = item.scale || 1;
        const rad = ((item.angle || 0) * Math.PI) / 180;

        if (item.type === "cross") {
          sec.spinners.push({ x, y, len: 250 * scl, thick: 24, speed: 0.05 * ((item.angle || 0) >= 0 ? 1 : -1), color: "#f59e0b", style: "cross" });
        } else if (item.type === "wheel") {
          sec.spinners.push({ x, y, len: 520 * scl, thick: 28, speed: 0.03, color: "#10b981", style: "wheel6" });
        } else if (item.type === "funnel") {
          const w = 280 * scl, fh = 110 * scl, gap = 75 * scl;
          sec.walls.push({ x1: x - w, y1: y - fh, x2: x - gap, y2: y + fh, thickness: 34, color: WALL_COLOR });
          sec.walls.push({ x1: x + w, y1: y - fh, x2: x + gap, y2: y + fh, thickness: 34, color: WALL_COLOR });
        } else if (item.type === "bowl") {
          sec.walls.push(...createArcSegments(x, y, 270 * scl, Math.PI * 0.15, Math.PI * 0.85, 10, 32, WALL_COLOR));
        } else if (item.type === "pegGrid") {
          [-180, -90, 0, 90, 180].forEach(px => {
            [-55, 55].forEach(py => {
              sec.pegs.push({ x: x + (px + (py > 0 ? 35 : -35)) * scl, y: y + py * scl, r: 20 * scl, restitution: 0.75, color: WALL_COLOR });
            });
          });
        } else if (item.type === "bumper") {
          sec.pegs.push({ x, y, r: 48 * scl, restitution: 1.05, color: "#ef4444" });
        } else if (item.type === "pendulum") {
          sec.pendulums.push({ pivotX: x, pivotY: y - 100, armLen: 210 * scl, bobR: 42 * scl, speed: 0.04, phase: 0, color: "#3b82f6" });
        } else if (item.type === "goal") {
          sec.zones.push({ x: x - 180 * scl, y: y - 40, w: 360 * scl, h: 100, kind: "goalBoost", label: "⚽ GOAL BOOST" });
        } else {
          const half = 200 * scl;
          const dx = Math.cos(rad) * half;
          const dy = Math.sin(rad) * half;
          sec.walls.push({ x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy, thickness: 32, color: WALL_COLOR });
        }
      });

      sections.push(sec);
      const finishY = 440 + h + 140;
      return { sections, finishY, totalHeight: finishY + 1100 };
    }
  };

  // ============================================================================
  // UI CONTROLLER & ORIENTATION SWITCHER
  // ============================================================================
  const UI = {
    manualSelected: new Set(["DZ", "MA", "TN", "EG", "SA", "FR", "BR", "AR", "DE", "JP", "ES", "SN"]),

    init() {
      this.refreshHeader();
      this.populateDropdowns();
      this.renderCups();
      this.renderCareerBox();
      this.renderCustomMarblesList();
      this.renderShop();
      this.renderStatsScreen();
      this.onFormatChange();
      this.onTrackChange();
      this.applySettings(true);
      Editor.init();

      const badge = document.getElementById("totalCountriesBadge");
      if (badge) badge.textContent = `${getAllMarblesPool().length} Flags`;

      window.addEventListener("resize", () => {
        const canvas = document.getElementById("raceCanvas");
        if (canvas && document.getElementById("screen-race").classList.contains("active")) {
          canvas.width = canvas.clientWidth || 360;
          canvas.height = canvas.clientHeight || 640;
        }
      });
    },

    refreshHeader() {
      document.getElementById("coinCount").textContent = State.coins;
    },

    async toggleOrientation() {
      try {
        if (screen.orientation && screen.orientation.lock) {
          const cur = screen.orientation.type || "";
          if (cur.includes("portrait")) {
            await screen.orientation.lock("landscape");
          } else {
            await screen.orientation.lock("portrait");
          }
          return;
        }
      } catch (e) {}
      // If browser/WebView requires rotating the phone physically, also cycle camera to Wide Landscape View
      if (Game.session) {
        Game.cameraMode = Game.cameraMode === "wide" ? "leader" : "wide";
        Game.updateHUDButtons();
      } else {
        alert("Rotate your phone sideways for Landscape Mode (enabled in APK)! You can also use 'Landscape Wide View' camera in races.");
      }
    },

    async setOrientationPref(mode) {
      State.settings.orientation = mode;
      saveState();
      try {
        if (screen.orientation) {
          if (mode === "any" && screen.orientation.unlock) screen.orientation.unlock();
          else if (screen.orientation.lock) await screen.orientation.lock(mode);
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
      const words = ["ATLAS", "SAHARA", "ORAN", "TITAN", "OLYMPUS", "VORTEX", "NOVA", "FALCON"];
      const pick = words[Math.floor(Math.random() * words.length)] + "-" + Math.floor(1000 + Math.random() * 9000);
      document.getElementById("crTrackSeed").value = pick;
    },

    showScreen(id, btn) {
      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
      document.getElementById("screen-" + id).classList.add("active");
      if (btn) {
        document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      }
      if (id === "stats") this.renderStatsScreen();
      if (id === "shop") {
        this.renderCustomMarblesList();
        this.renderShop();
      }
      if (id === "competitions") this.renderCareerBox();
      if (id === "editor") Editor.draw();
    },

    populateDropdowns() {
      const allMarbles = getAllMarblesPool();
      const selCareer = document.getElementById("careerCountrySelect");
      const selRivalA = document.getElementById("rivalA");
      const selRivalB = document.getElementById("rivalB");
      const selProf = document.getElementById("profileCountrySelect");

      const opts = allMarbles.map(c => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join("");
      selCareer.innerHTML = opts;
      selRivalA.innerHTML = opts;
      selRivalB.innerHTML = opts;
      selProf.innerHTML = opts;

      selCareer.value = State.career.countryCode || "DZ";
      selRivalA.value = "DZ";
      selRivalB.value = "MA";
      selProf.value = "DZ";
      this.renderPresetsDropdown();
      this.updateManualCount();
    },

    createCustomMarble() {
      const name = document.getElementById("cmName").value.trim();
      const flag = document.getElementById("cmFlag").value.trim() || "⭐";
      const color = document.getElementById("cmColor").value || "#f59e0b";
      const border = document.getElementById("cmBorder").value || "#ffffff";
      const region = document.getElementById("cmRegion").value || "Custom";
      const fact = document.getElementById("cmFact").value.trim() || `${name} is a custom-built racing marble!`;

      if (!name) {
        alert("Please enter a Marble or Team Name!");
        return;
      }
      const code = "CM_" + Date.now().toString(36).toUpperCase();
      const newMarble = {
        code,
        name,
        flag,
        color,
        border,
        region: [region, "CUSTOM"],
        small: true,
        isCustom: true,
        fact
      };
      State.customMarbles.unshift(newMarble);
      this.manualSelected.add(code);
      saveState();
      this.populateDropdowns();
      this.renderCustomMarblesList();
      document.getElementById("cmName").value = "";
      document.getElementById("cmFact").value = "";
      alert(`Custom Marble "${flag} ${name}" created!`);
    },

    deleteCustomMarble(code) {
      State.customMarbles = (State.customMarbles || []).filter(m => m.code !== code);
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
        wrap.innerHTML = `<div style="font-size:0.8rem; color:var(--muted);">No custom marbles created yet. Create one above!</div>`;
        return;
      }
      wrap.innerHTML = list.map(m => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; padding:6px 10px; border-radius:8px; margin-bottom:6px; border-left:5px solid ${m.color};">
          <div>
            <strong>${m.flag} ${m.name}</strong> <span class="tag">${m.region[0]}</span>
          </div>
          <button class="btn btn-sm btn-red" onclick="UI.deleteCustomMarble('${m.code}')">Delete</button>
        </div>
      `).join("");
    },

    setQuickDerby(val) {
      if (!val) return;
      const [a, b] = val.split("-");
      document.getElementById("rivalA").value = a;
      document.getElementById("rivalB").value = b;
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
        if (q && !c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return;
        const div = document.createElement("div");
        div.className = "country-chip" + (this.manualSelected.has(c.code) ? " selected" : "");
        div.innerHTML = `<span>${c.flag}</span> <span>${c.name}</span>`;
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
      const name = prompt("Preset Name:", "Mega Race " + (State.presets.length + 1));
      if (!name) return;
      const preset = {
        name,
        count: document.getElementById("crCount").value,
        format: document.getElementById("crFormat").value,
        gpSystem: document.getElementById("crGpSystem").value,
        region: document.getElementById("crRegion").value,
        track: document.getElementById("crTrack").value,
        seed: document.getElementById("crTrackSeed").value,
        difficulty: document.getElementById("crDifficulty").value,
        length: document.getElementById("crLength").value,
        camera: document.getElementById("crCamera").value,
        physSpeed: document.getElementById("crPhysSpeed").value,
        rounds: document.getElementById("crRounds").value,
        elim: document.getElementById("crElim").value
      };
      State.presets.push(preset);
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
      if (p.seed) document.getElementById("crTrackSeed").value = p.seed;
      document.getElementById("crDifficulty").value = p.difficulty;
      document.getElementById("crLength").value = p.length;
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
        <div style="background:#0f172a; padding:10px; border-radius:8px; border:1px solid #334155;">
          <div style="font-weight:800; margin-bottom:4px;">${c.name}</div>
          <div style="font-size:0.74rem; color:var(--muted); margin-bottom:8px;">
            ${c.count} Marbles • ${c.rounds} Mega Tracks • ${c.format === "grandprix" ? "GP Points" : "Knockout"}
          </div>
          <button class="btn btn-sm btn-block" onclick="Game.startCup('${c.id}')">Start Competition</button>
        </div>
      `).join("");
    },

    renderCareerBox() {
      const stages = [
        "Stage 1/4: Regional Qualifier (Top 12 Advance - Alpine Slalom)",
        "Stage 2/4: Continental Group Stage (Top 8 Advance - Atlas Mountains)",
        "Stage 3/4: World Cup Semi-Final (Top 4 Advance - Pendulum Fortress)",
        "Stage 4/4: World Marble Cup Final (Win 1st Place - 60,000px Marathon)"
      ];
      const cObj = findMarbleByCode(State.career.countryCode);
      document.getElementById("careerStatusBox").innerHTML = `
        <div style="background:#0f172a; padding:10px; border-radius:8px; border:1px solid #10b981;">
          <strong>Racer:</strong> ${cObj.flag} ${cObj.name}<br/>
          <strong>Current Stage:</strong> ${stages[State.career.stage] || stages[0]}
        </div>
      `;
    },

    renderStatsScreen() {
      const rec = State.records;
      document.getElementById("recordsSummary").innerHTML = `
        <div class="tag">🔥 Win Streak: <strong>${rec.longestStreak.country} (${rec.longestStreak.streak})</strong></div>
        <div class="tag">🚀 Best Comeback: <strong>${rec.bestComeback.country} (+${rec.bestComeback.gained})</strong></div>
        <div class="tag">⏱️ Photo Finish: <strong>${rec.closestFinish.ms < 90000 ? rec.closestFinish.pair + " (" + rec.closestFinish.ms + "ms)" : "--"}</strong></div>
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
          <td>${r.c.flag} ${r.c.name}</td>
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
        <div style="background:#0f172a; padding:10px; border-radius:8px; border-left:5px solid ${c.color};">
          <div style="font-size:1.25rem; font-weight:800;">${c.flag} ${c.name} <span class="tag">${c.region.join(", ")}</span></div>
          <p style="font-size:0.8rem; color:var(--muted); margin:6px 0;">${c.fact}</p>
          <div class="grid-3" style="margin-top:6px;">
            <div class="tag">Races: <strong>${s.races}</strong></div>
            <div class="tag">Wins: <strong>${s.wins}</strong></div>
            <div class="tag">Podiums: <strong>${s.podiums}</strong></div>
            <div class="tag">GP Pts: <strong>${s.points}</strong></div>
            <div class="tag">Cups: <strong>${s.cups}</strong></div>
            <div class="tag">Avg Pos: <strong>${avg}</strong></div>
          </div>
          <div style="font-size:0.8rem; margin-top:6px; color:var(--accent);">Recent Finishes: ${recentStr}</div>
        </div>
      `;
    },

    renderShop() {
      const sg = document.getElementById("skinsGrid");
      sg.innerHTML = window.GAME_DATA.skins.map(sk => {
        const owned = State.unlockedSkins.includes(sk.id);
        const equipped = State.equippedSkin === sk.id;
        return `
          <div style="background:#0f172a; padding:10px; border-radius:8px; border:1px solid ${equipped ? 'var(--accent)' : '#334155'};">
            <div style="font-weight:700;">${sk.name}</div>
            <div style="font-size:0.8rem; color:var(--muted); margin:4px 0;">${owned ? "Unlocked" : "Cost: 🪙 " + sk.cost}</div>
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
          <div style="background:#0f172a; padding:8px 10px; border-radius:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${done ? '#10b981' : '#475569'};">
            <div>
              <div style="font-weight:700;">${done ? "✅" : "🔒"} ${a.name}</div>
              <div style="font-size:0.78rem; color:var(--muted);">${a.desc}</div>
            </div>
            <div class="coin-badge">+${a.reward}</div>
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
        alert("Not enough coins! Tap the +50 Ad button or win races.");
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
      document.getElementById("optOrientation").value = State.settings.orientation || "any";
      document.getElementById("optLang").value = State.settings.lang;
      document.getElementById("optMaxMarbles").value = State.settings.maxMarbles;
      document.getElementById("optColorblind").value = State.settings.colorblind;
      document.getElementById("optFontScale").value = State.settings.fontScale;
      document.getElementById("settingsModal").classList.add("active");
    },

    applySettings(fromInit) {
      if (!fromInit) {
        State.settings.lang = document.getElementById("optLang").value;
        State.settings.maxMarbles = Number(document.getElementById("optMaxMarbles").value);
        State.settings.colorblind = Number(document.getElementById("optColorblind").value);
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
        State.coins += 50;
        saveState();
        alert("+50 Coins added!");
      }
    }
  };

  // ============================================================================
  // INTERACTIVE PRO TRACK EDITOR
  // ============================================================================
  const Editor = {
    tool: "select",
    canvas: null,
    ctx: null,
    scrollY: 0,
    virtualHeight: 2600,
    selectedIndex: -1,
    isDragging: false,

    init() {
      this.canvas = document.getElementById("editorCanvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");

      const getCoords = e => {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 360);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 340 + this.scrollY);
        return { x: Math.max(24, Math.min(336, x)), y: Math.max(80, Math.min(this.virtualHeight - 90, y)) };
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
            angle: this.tool === "rampL" ? 20 : this.tool === "rampR" ? -20 : 0,
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
        title.textContent = "Selected: None (Tap any obstacle to move/rotate)";
        ang.value = 0;
        scl.value = 1;
        document.getElementById("inspAngleVal").textContent = "0°";
        document.getElementById("inspScaleVal").textContent = "1.0x";
        return;
      }
      title.textContent = `Selected: ${ob.type.toUpperCase()} at Y=${ob.y}m`;
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
      const copy = Object.assign({}, ob, { x: Math.min(330, ob.x + 25), y: Math.min(this.virtualHeight - 100, ob.y + 50) });
      State.customTrack.push(copy);
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

    loadTemplate() {
      State.customTrack = [];
      const types = ["funnel", "cross", "pegGrid", "bowl", "wheel", "pendulum", "rampL", "rampR", "goal"];
      for (let y = 180, i = 0; y < this.virtualHeight - 160; y += 230, i++) {
        State.customTrack.push({
          type: types[i % types.length],
          x: i % 2 === 0 ? 180 : (i % 4 === 1 ? 120 : 240),
          y,
          angle: types[i % types.length] === "rampL" ? 20 : types[i % types.length] === "rampR" ? -20 : 0,
          scale: 1.1
        });
      }
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
      const inp = document.getElementById("trackCodeInput");
      inp.value = code;
      if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
      alert("Track code copied!");
    },

    importCode() {
      try {
        const raw = document.getElementById("trackCodeInput").value.trim();
        const parsed = JSON.parse(atob(raw));
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
      ctx.fillStyle = "#92a8d8";
      ctx.fillRect(0, 0, 360, 340);
      ctx.save();
      ctx.translate(0, -this.scrollY);

      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.fillStyle = "#0a0a0f";
      ctx.font = "bold 10px sans-serif";
      for (let y = 0; y <= this.virtualHeight; y += 200) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(360, y);
        ctx.stroke();
        ctx.fillText(y + "m", 14, y - 4);
      }

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, 10, this.virtualHeight);
      ctx.fillRect(350, 0, 10, this.virtualHeight);

      State.customTrack.forEach((item, idx) => {
        const scl = item.scale || 1;
        const rad = ((item.angle || 0) * Math.PI) / 180;
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(rad);
        ctx.scale(scl, scl);

        if (idx === this.selectedIndex) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(-45, -30, 90, 60);
        }

        ctx.strokeStyle = "#0a0a0f";
        ctx.fillStyle = "#0a0a0f";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";

        if (item.type === "cross" || item.type === "wheel") {
          const r = item.type === "wheel" ? 38 : 26;
          ctx.beginPath();
          ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
          ctx.moveTo(0, -r); ctx.lineTo(0, r);
          ctx.stroke();
        } else if (item.type === "funnel") {
          ctx.beginPath();
          ctx.moveTo(-45, -18); ctx.lineTo(-14, 18);
          ctx.moveTo(45, -18); ctx.lineTo(14, 18);
          ctx.stroke();
        } else if (item.type === "bowl") {
          ctx.beginPath();
          ctx.arc(0, -5, 36, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        } else if (item.type === "bumper") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (item.type === "pegGrid") {
          [-22, 0, 22].forEach(px => {
            [-10, 10].forEach(py => {
              ctx.beginPath();
              ctx.arc(px + (py > 0 ? 8 : -8), py, 4.5, 0, Math.PI * 2);
              ctx.fill();
            });
          });
        } else if (item.type === "pendulum") {
          ctx.beginPath();
          ctx.moveTo(0, -22); ctx.lineTo(0, 15);
          ctx.stroke();
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(0, 15, 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === "goal") {
          ctx.fillStyle = "#10b981";
          ctx.fillRect(-35, -12, 70, 24);
          ctx.fillStyle = "#000";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText("⚽ GOAL", -20, 4);
        } else {
          ctx.beginPath();
          ctx.moveTo(-36, 0); ctx.lineTo(36, 0);
          ctx.stroke();
        }
        ctx.restore();
      });

      ctx.restore();
    }
  };

  // ============================================================================
  // CORE MEGA-WORLD MARBLE RACE ENGINE (CRASH-PROOF LOOP + NO COMPOUND NaN BUG)
  // ============================================================================
  const Game = {
    session: null,
    engine: null,
    worldData: null,
    animId: null,
    speedMult: 1,
    cameraMode: "leader",
    autoPlay: false,
    camY: 0,
    camScale: 0.25,
    lavaY: -500,
    simTick: 0,
    mediaRecorder: null,
    recordedChunks: [],
    lastRecordedBlob: null,

    pickCountries(region, count, manual) {
      let basePool = getAllMarblesPool();
      if (manual) {
        basePool = basePool.filter(c => UI.manualSelected.has(c.code));
        if (basePool.length < 2) basePool = getAllMarblesPool().slice(0, 20);
      } else if (region === "CUSTOM") {
        basePool = (State.customMarbles && State.customMarbles.length >= 2)
          ? State.customMarbles.slice()
          : getAllMarblesPool().slice(0, 20);
      } else if (region && region !== "ALL") {
        basePool = basePool.filter(c => c.region.includes(region));
        if (basePool.length < 2) basePool = getAllMarblesPool();
      }

      const cap = Math.max(2, Math.min(Number(count) || 80, State.settings.maxMarbles || 300));
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
        const list = [];
        for (let r = 0; r < totalRounds; r++) list.push(selectedTrack);
        return list;
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
      if (trackId === "custom") return "Custom Pro Editor Track";
      if (trackId === "seeded_random") return `Seeded Mega Track (${this.session?.seedStr || "RANDOM"})`;
      const found = window.GAME_DATA.tracks.find(t => t.id === trackId);
      return found ? found.name : trackId;
    },

    startFromCreator() {
      const count = Number(document.getElementById("crCount").value) || 80;
      const format = document.getElementById("crFormat").value;
      const gpSystem = document.getElementById("crGpSystem").value || "formula";
      const region = document.getElementById("crRegion").value;
      const track = document.getElementById("crTrack").value;
      const seedStr = document.getElementById("crTrackSeed").value.trim() || "ORAN-2026";
      const difficulty = document.getElementById("crDifficulty").value;
      const length = document.getElementById("crLength").value;
      const camera = document.getElementById("crCamera").value;
      const physSpeed = Number(document.getElementById("crPhysSpeed").value) || 1;
      const rounds = Math.max(1, Math.min(20, Number(document.getElementById("crRounds").value) || 1));
      const elim = Math.max(1, Number(document.getElementById("crElim").value) || 5);
      const manual = document.getElementById("crSelectMode").value === "manual";

      const entrants = this.pickCountries(region, count, manual);
      this.cameraMode = camera;

      this.session = {
        modeTitle: format === "grandprix" ? `Grand Prix (${gpSystem.toUpperCase()})` : "Mega Marble Race",
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
        isRivalry: false,
        isCareer: false,
        cupId: null
      };
      entrants.forEach(c => { this.session.seriesScores[c.code] = 0; });
      this.launchRound();
    },

    startCup(cupId) {
      const cup = window.GAME_DATA.competitions.find(x => x.id === cupId);
      if (!cup) return;
      const entrants = this.pickCountries(cup.region, cup.count, false);
      this.session = {
        modeTitle: cup.name,
        format: cup.format,
        gpSystem: cup.gpSystem || "formula",
        trackSchedule: this.buildTrackSchedule("rotate", cup.rounds),
        seedStr: cup.id.toUpperCase(),
        difficulty: "medium",
        length: "long",
        physSpeed: 1,
        totalRounds: cup.rounds,
        currentRound: 1,
        elimPerRound: Math.max(2, Math.floor(entrants.length / (cup.rounds + 1))),
        activeCountries: entrants,
        seriesScores: {},
        teamScores: {},
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
      const stageNames = ["Career Qualifier", "Career Group Stage", "Career Semi-Final", "Career World Cup Final"];
      const stageTracks = ["alpine_slalom", "atlas_mountains", "pendulum_fortress", "champions_marathon"];
      const counts = [50, 60, 40, 30];
      const st = State.career.stage || 0;
      const pool = this.pickCountries("ALL", counts[st], false).filter(c => c.code !== code);
      const entrants = [playerMarble, ...pool.slice(0, counts[st] - 1)];

      this.session = {
        modeTitle: stageNames[st],
        format: "normal",
        gpSystem: "formula",
        trackSchedule: [stageTracks[st]],
        seedStr: "CAREER-" + st,
        difficulty: st >= 2 ? "hard" : "medium",
        length: st === 3 ? "marathon" : "long",
        physSpeed: 1,
        totalRounds: 1,
        currentRound: 1,
        elimPerRound: 1,
        activeCountries: entrants,
        seriesScores: {},
        teamScores: {},
        isRivalry: false,
        isCareer: true,
        careerCode: code
      };
      entrants.forEach(c => { this.session.seriesScores[c.code] = 0; });
      this.launchRound();
    },

    resetCareer() {
      State.career.stage = 0;
      saveState();
      UI.renderCareerBox();
    },

    startRivalrySeries() {
      const codeA = document.getElementById("rivalA").value;
      const codeB = document.getElementById("rivalB").value;
      if (codeA === codeB) {
        alert("Please pick two different marbles for a Rivalry Series!");
        return;
      }
      const bestOf = Number(document.getElementById("rivalBestOf").value) || 5;
      const cA = findMarbleByCode(codeA);
      const cB = findMarbleByCode(codeB);

      this.session = {
        modeTitle: `${cA.flag} vs ${cB.flag} (Best of ${bestOf})`,
        format: "normal",
        gpSystem: "formula",
        trackSchedule: this.buildTrackSchedule("rotate", bestOf),
        seedStr: "RIVALRY",
        difficulty: "medium",
        length: "short",
        physSpeed: 1,
        totalRounds: bestOf,
        currentRound: 1,
        elimPerRound: 0,
        activeCountries: [cA, cB],
        seriesScores: { [codeA]: 0, [codeB]: 0 },
        teamScores: {},
        isRivalry: true,
        bestOf
      };
      this.launchRound();
    },

    reRunCurrentRound() {
      if (!this.session) return;
      this.launchRound();
    },

    resolveSectionList(trackId, lengthSetting, rng) {
      const countMap = { short: 10, medium: 15, long: 20, marathon: 28 };
      const targetSections = countMap[lengthSetting] || 15;
      const allObstacleKeys = Object.keys(OBSTACLE_LIBRARY).filter(k => k !== "startCircleSplitter");

      if (trackId === "seeded_random") {
        const list = ["startCircleSplitter"];
        while (list.length < targetSections) {
          const pick = allObstacleKeys[Math.floor(rng() * allObstacleKeys.length)];
          list.push(pick);
        }
        return list;
      }

      const preset = window.GAME_DATA.tracks.find(t => t.id === trackId) || window.GAME_DATA.tracks[0];
      const list = ["startCircleSplitter"];
      let idx = 1;
      while (list.length < targetSections) {
        const nextType = preset.sections[idx % preset.sections.length];
        list.push(nextType === "startCircleSplitter" ? "crossSpinners" : nextType);
        idx++;
      }
      return list;
    },

    launchRound() {
      UI.showScreen("race");
      const canvas = document.getElementById("raceCanvas");
      canvas.width = canvas.clientWidth || window.innerWidth || 360;
      canvas.height = canvas.clientHeight || window.innerHeight || 640;

      const currentTrackId = this.session.trackSchedule[(this.session.currentRound - 1) % this.session.trackSchedule.length] || "colossus_odyssey";
      this.currentTrackId = currentTrackId;

      const seedValue = currentTrackId === "seeded_random"
        ? `${this.session.seedStr}-R${this.session.currentRound}`
        : Date.now() ^ (this.session.currentRound * 99991);
      const rng = createRNG(seedValue);

      if (currentTrackId === "custom" && State.customTrack.length > 0) {
        this.worldData = TRACK_BUILDER.buildCustomEditorWorld(State.customTrack, this.session.difficulty);
      } else {
        const sectionList = this.resolveSectionList(currentTrackId, this.session.length, rng);
        this.worldData = TRACK_BUILDER.buildHugeWorld(sectionList, this.session.difficulty, rng);
      }

      this.lavaY = -500;
      this.camY = 0;
      this.camScale = canvas.width / WORLD_W;
      this.simTick = 0;

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
        velocityIterations: 4
      });
      this.engine.gravity.y = 0.95 * (this.session.physSpeed || 1);

      const H = this.worldData.totalHeight;
      const wallOpts = { isStatic: true, restitution: 0.45, friction: 0.004 };
      World.add(this.engine.world, [
        Bodies.rectangle(-30, H / 2, 150, H * 2, wallOpts),
        Bodies.rectangle(WORLD_W + 30, H / 2, 150, H * 2, wallOpts),
        Bodies.rectangle(WORLD_W / 2, -90, WORLD_W + 250, 150, wallOpts)
      ]);

      this.marbles = [];
      this.finishedOrder = [];
      this.eliminatedOrder = [];
      this.raceStartTime = performance.now();
      this.midRaceRecorded = false;

      const list = this.session.activeCountries.slice();
      const r = list.length > 180 ? 17 : list.length > 90 ? 20 : 24;
      const usableW = WORLD_W - 260;
      const cols = Math.max(10, Math.floor(usableW / (r * 2.35)));

      list.forEach((country, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const jitterX = (rng() - 0.5) * 10;
        const x = 130 + col * (usableW / Math.max(1, cols - 1)) + jitterX;
        const y = 50 + row * (r * 2.35) + (rng() - 0.5) * 6;

        const body = Bodies.circle(x, y, r, {
          restitution: 0.52,
          friction: 0.002,
          frictionAir: 0.0028,
          density: 0.0025
        });
        Body.setVelocity(body, { x: (rng() - 0.5) * 3.5, y: 2 + rng() * 2.5 });
        World.add(this.engine.world, body);

        this.marbles.push({
          country,
          body,
          r,
          x,
          y,
          lastMoveY: y,
          stuckFrames: 0,
          inGhostZone: false,
          trail: [],
          finished: false,
          eliminated: false,
          finishTimeMs: 0,
          midRank: idx + 1
        });
      });

      this.updateLazySections(0, 3200);
    },

    // Lazy Section Streaming with Independent Blade Bodies (Zero Compound Body NaN Bugs!)
    updateLazySections(minMarbleY, maxMarbleY) {
      if (!window.Matter || !this.engine || !this.worldData) return;
      const { World, Bodies } = window.Matter;
      const activeTop = minMarbleY - 1400;
      const activeBottom = maxMarbleY + 2600;

      this.worldData.sections.forEach(sec => {
        const shouldBeLoaded = sec.yEnd >= activeTop && sec.yStart <= activeBottom;

        if (shouldBeLoaded && !sec.loaded) {
          sec.loaded = true;
          sec.matterBodies = [];
          sec.dynamicItems = [];

          sec.walls.forEach(w => {
            const dx = w.x2 - w.x1;
            const dy = w.y2 - w.y1;
            const len = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            const b = Bodies.rectangle((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, len + 10, w.thickness || 30, {
              isStatic: true,
              angle: ang,
              restitution: 0.45,
              friction: 0.003
            });
            sec.matterBodies.push(b);
          });

          sec.pegs.forEach(p => {
            const b = Bodies.circle(p.x, p.y, p.r, {
              isStatic: true,
              restitution: p.restitution || 0.75,
              friction: 0.001
            });
            sec.matterBodies.push(b);
          });

          // Spinners built from individual centered static rectangles (fast & 100% crash-free)
          sec.spinners.forEach(sp => {
            const bladesCount = sp.style === "wheel6" ? 3 : 2;
            const bladeBodies = [];
            for (let k = 0; k < bladesCount; k++) {
              const bar = Bodies.rectangle(sp.x, sp.y, sp.len, sp.thick || 24, {
                isStatic: true,
                angle: (k * Math.PI) / bladesCount,
                restitution: 0.72,
                friction: 0.002
              });
              bladeBodies.push(bar);
              sec.matterBodies.push(bar);
            }
            sec.dynamicItems.push({ kind: "spinner", blades: bladeBodies, spec: sp, angle: 0 });
          });

          sec.pendulums.forEach(pd => {
            const bob = Bodies.circle(pd.pivotX, pd.pivotY + pd.armLen, pd.bobR, {
              isStatic: true,
              restitution: 0.95
            });
            sec.matterBodies.push(bob);
            sec.dynamicItems.push({ kind: "pendulum", body: bob, spec: pd, curX: pd.pivotX, curY: pd.pivotY + pd.armLen });
          });

          sec.sliders.forEach(sl => {
            const plat = Bodies.rectangle(sl.centerX, sl.y, sl.w, sl.h, {
              isStatic: true,
              restitution: 0.6
            });
            sec.matterBodies.push(plat);
            sec.dynamicItems.push({ kind: "slider", body: plat, spec: sl, curX: sl.centerX });
          });

          World.add(this.engine.world, sec.matterBodies);
        } else if (!shouldBeLoaded && sec.loaded) {
          World.remove(this.engine.world, sec.matterBodies);
          sec.matterBodies = [];
          sec.dynamicItems = [];
          sec.loaded = false;
        }
      });
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
          this.renderScene(ctx, canvas, skin);
        } catch (err) {
          console.error("Race loop recovered from error:", err);
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
        if (!sec.loaded) return;
        sec.dynamicItems.forEach(item => {
          if (item.kind === "spinner") {
            item.angle += item.spec.speed * spd;
            const n = item.blades.length;
            for (let k = 0; k < n; k++) {
              Body.setAngle(item.blades[k], item.angle + (k * Math.PI) / n);
            }
          } else if (item.kind === "pendulum") {
            const swing = Math.sin(this.simTick * item.spec.speed * spd + item.spec.phase) * 0.85;
            const bx = item.spec.pivotX + Math.sin(swing) * item.spec.armLen;
            const by = item.spec.pivotY + Math.cos(swing) * item.spec.armLen;
            Body.setPosition(item.body, { x: bx, y: by });
            item.curX = bx;
            item.curY = by;
          } else if (item.kind === "slider") {
            const nx = item.spec.centerX + Math.sin(this.simTick * item.spec.speed * spd + item.spec.phase) * item.spec.range;
            Body.setPosition(item.body, { x: nx, y: item.spec.y });
            item.curX = nx;
          }
        });
      });

      Engine.update(this.engine, 1000 / 120);

      if (this.session.format === "survival") {
        this.lavaY += 1.8 * spd;
      }

      let minActiveY = Infinity;
      let maxActiveY = 0;

      this.marbles.forEach(m => {
        if (m.finished || m.eliminated) return;

        // Guard against NaN positions
        if (!Number.isFinite(m.body.position.x) || !Number.isFinite(m.body.position.y)) {
          Body.setPosition(m.body, { x: WORLD_W / 2, y: (m.lastMoveY || 100) + 40 });
          Body.setVelocity(m.body, { x: 0, y: 4 });
        }

        if (m.body.position.x < 40 + m.r) {
          Body.setPosition(m.body, { x: 42 + m.r, y: m.body.position.y });
          Body.setVelocity(m.body, { x: Math.abs(m.body.velocity.x) * 0.5, y: m.body.velocity.y });
        } else if (m.body.position.x > WORLD_W - 40 - m.r) {
          Body.setPosition(m.body, { x: WORLD_W - 42 - m.r, y: m.body.position.y });
          Body.setVelocity(m.body, { x: -Math.abs(m.body.velocity.x) * 0.5, y: m.body.velocity.y });
        }

        const vx = m.body.velocity.x;
        const vy = m.body.velocity.y;
        const maxV = m.r * 0.85;
        const curV = Math.hypot(vx, vy);
        if (curV > maxV) {
          const scale = maxV / curV;
          Body.setVelocity(m.body, { x: vx * scale, y: vy * scale });
        }

        m.x = m.body.position.x;
        m.y = m.body.position.y;

        if (m.y < minActiveY) minActiveY = m.y;
        if (m.y > maxActiveY) maxActiveY = m.y;

        let insideGhost = false;
        const secIdx = Math.floor((m.y - 440) / 2050);
        for (let si = Math.max(0, secIdx - 1); si <= Math.min(this.worldData.sections.length - 1, secIdx + 1); si++) {
          const sec = this.worldData.sections[si];
          if (m.y >= sec.gateY && !sec.passedMarbles.has(m.country.code)) {
            sec.passedMarbles.add(m.country.code);
          }
          sec.zones.forEach(z => {
            if (m.x >= z.x && m.x <= z.x + z.w && m.y >= z.y && m.y <= z.y + z.h) {
              if (z.kind === "ghost") {
                insideGhost = true;
              } else if (z.kind === "goalBoost") {
                Body.setVelocity(m.body, { x: m.body.velocity.x * 0.8, y: Math.max(m.body.velocity.y, 13) });
              }
            }
          });
        }

        if (insideGhost !== m.inGhostZone) {
          m.inGhostZone = insideGhost;
          m.body.collisionFilter.group = insideGhost ? -2 : 0;
        }

        if (Math.abs(m.y - m.lastMoveY) < 1.8) {
          m.stuckFrames += 1;
          if (m.stuckFrames === 140) {
            Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 11, y: -7 });
          } else if (m.stuckFrames > 280) {
            Body.setPosition(m.body, {
              x: WORLD_W * 0.25 + Math.random() * (WORLD_W * 0.5),
              y: m.y + 95
            });
            Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 5, y: 6 });
            m.stuckFrames = 0;
          }
        } else {
          m.lastMoveY = m.y;
          m.stuckFrames = 0;
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
        }
      });

      if (this.simTick % 15 === 0 && minActiveY < Infinity) {
        this.updateLazySections(minActiveY, maxActiveY);
      }

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
          Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 12, y: 9 });
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

    renderScene(ctx, canvas, skin) {
      const W = canvas.width;
      const H = canvas.height;
      const finishY = this.worldData.finishY;

      ctx.fillStyle = "#92a8d8";
      ctx.fillRect(0, 0, W, H);

      const activeMarbles = this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => b.y - a.y);
      const liveRanking = [
        ...this.finishedOrder,
        ...activeMarbles,
        ...this.eliminatedOrder.slice().reverse()
      ];

      const isLandscape = W > H;
      const baseScale = W / WORLD_W;
      let targetScale = baseScale;
      let targetWorldY = 0;

      if (this.cameraMode === "overview") {
        targetScale = baseScale * (isLandscape ? 0.48 : 0.55);
        const leadY = activeMarbles[0]?.y || finishY;
        const visibleWorldH = H / targetScale;
        targetWorldY = Math.max(0, Math.min(finishY + 800 - visibleWorldH, leadY - visibleWorldH * 0.5));
      } else if (this.cameraMode === "wide") {
        targetScale = baseScale * 0.78;
        const leadY = activeMarbles[0]?.y || finishY;
        const visibleWorldH = H / targetScale;
        targetWorldY = Math.max(0, Math.min(finishY + 800 - visibleWorldH, leadY - visibleWorldH * 0.52));
      } else if (this.cameraMode === "pack") {
        const packSlice = activeMarbles.slice(0, Math.min(20, activeMarbles.length));
        const avgY = packSlice.length
          ? packSlice.reduce((s, m) => s + m.y, 0) / packSlice.length
          : finishY;
        const visibleWorldH = H / targetScale;
        targetWorldY = Math.max(0, Math.min(finishY + 800 - visibleWorldH, avgY - visibleWorldH * 0.48));
      } else {
        const leader = activeMarbles[0];
        const visibleWorldH = H / targetScale;
        const focusY = leader ? leader.y : finishY + 150;
        targetWorldY = Math.max(0, Math.min(finishY + 900 - visibleWorldH, focusY - visibleWorldH * 0.52));
      }

      this.camScale += (targetScale - this.camScale) * 0.18;
      this.camY += (targetWorldY - this.camY) * 0.18;

      const viewTop = this.camY - 350;
      const viewBottom = this.camY + (H / this.camScale) + 350;

      ctx.save();
      if (this.cameraMode === "overview" || this.cameraMode === "wide") {
        ctx.translate((W - WORLD_W * this.camScale) / 2, 0);
      }
      ctx.scale(this.camScale, this.camScale);
      ctx.translate(0, -this.camY);

      ctx.fillStyle = WALL_COLOR;
      ctx.fillRect(-40, 0, 85, finishY + 1100);
      ctx.fillRect(WORLD_W - 45, 0, 85, finishY + 1100);

      this.worldData.sections.forEach(sec => {
        if (sec.yEnd < viewTop || sec.yStart > viewBottom) return;

        ctx.fillStyle = sec.accent;
        ctx.fillRect(30, sec.yStart, 18, sec.yEnd - sec.yStart);
        ctx.fillRect(WORLD_W - 48, sec.yStart, 18, sec.yEnd - sec.yStart);

        sec.zones.forEach(z => {
          if (z.kind === "ghost") {
            ctx.fillStyle = "rgba(139, 92, 246, 0.22)";
            ctx.fillRect(z.x, z.y, z.w, z.h);
            ctx.strokeStyle = "#8b5cf6";
            ctx.lineWidth = 6;
            ctx.strokeRect(z.x, z.y, z.w, z.h);
            ctx.fillStyle = "#ffffff";
            ctx.font = "900 36px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(z.label, WORLD_W / 2, z.y + 56);
          } else if (z.kind === "goalBoost") {
            ctx.fillStyle = "rgba(16, 185, 129, 0.34)";
            ctx.fillRect(z.x, z.y, z.w, z.h);
            ctx.fillStyle = "#052e16";
            ctx.font = "900 34px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(z.label, z.x + z.w / 2, z.y + 66);
          }
        });

        sec.polygons.forEach(poly => {
          ctx.fillStyle = poly.color;
          ctx.beginPath();
          poly.points.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.closePath();
          ctx.fill();
        });

        sec.walls.forEach(w => {
          if (Math.max(w.y1, w.y2) < viewTop || Math.min(w.y1, w.y2) > viewBottom) return;
          ctx.strokeStyle = w.color || WALL_COLOR;
          ctx.lineWidth = w.thickness || 30;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(w.x1, w.y1);
          ctx.lineTo(w.x2, w.y2);
          ctx.stroke();
        });

        sec.pegs.forEach(p => {
          if (p.y + p.r < viewTop || p.y - p.r > viewBottom) return;
          ctx.fillStyle = p.color || WALL_COLOR;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          if (p.color !== WALL_COLOR) {
            ctx.lineWidth = 6;
            ctx.strokeStyle = WALL_COLOR;
            ctx.stroke();
          }
        });

        sec.dynamicItems.forEach(item => {
          if (item.kind === "spinner") {
            const sp = item.spec;
            if (sp.y + sp.len < viewTop || sp.y - sp.len > viewBottom) return;
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(item.angle);
            const blades = sp.style === "wheel6" ? 3 : 2;
            for (let k = 0; k < blades; k++) {
              ctx.save();
              ctx.rotate((k * Math.PI) / blades);
              ctx.strokeStyle = WALL_COLOR;
              ctx.lineWidth = (sp.thick || 24) + 6;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(-sp.len / 2, 0);
              ctx.lineTo(sp.len / 2, 0);
              ctx.stroke();

              ctx.strokeStyle = sp.color || WALL_COLOR;
              ctx.lineWidth = sp.thick || 24;
              ctx.beginPath();
              ctx.moveTo(-sp.len / 2, 0);
              ctx.lineTo(sp.len / 2, 0);
              ctx.stroke();
              ctx.restore();
            }
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (item.kind === "pendulum") {
            const pd = item.spec;
            ctx.strokeStyle = WALL_COLOR;
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(pd.pivotX, pd.pivotY);
            ctx.lineTo(item.curX, item.curY);
            ctx.stroke();

            ctx.fillStyle = pd.color;
            ctx.beginPath();
            ctx.arc(item.curX, item.curY, pd.bobR, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 7;
            ctx.strokeStyle = WALL_COLOR;
            ctx.stroke();
          } else if (item.kind === "slider") {
            const sl = item.spec;
            ctx.fillStyle = sl.color;
            ctx.fillRect(item.curX - sl.w / 2, sl.y - sl.h / 2, sl.w, sl.h);
            ctx.strokeStyle = WALL_COLOR;
            ctx.lineWidth = 6;
            ctx.strokeRect(item.curX - sl.w / 2, sl.y - sl.h / 2, sl.w, sl.h);
          }
        });

        if (sec.gateY >= viewTop && sec.gateY <= viewBottom) {
          ctx.fillStyle = sec.accent;
          ctx.fillRect(45, sec.gateY - 20, WORLD_W - 90, 40);
          ctx.strokeStyle = WALL_COLOR;
          ctx.lineWidth = 5;
          ctx.strokeRect(45, sec.gateY - 20, WORLD_W - 90, 40);

          ctx.fillStyle = "#0a0a0f";
          ctx.font = "900 26px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `SECTION ${sec.index}/${sec.total}: ${sec.title}  •  PASSED: ${sec.passedMarbles.size}/${this.marbles.length}`,
            WORLD_W / 2,
            sec.gateY
          );
        }
      });

      if (this.session.format === "survival" && this.lavaY > 0) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.42)";
        ctx.fillRect(0, Math.max(0, viewTop), WORLD_W, Math.max(0, this.lavaY - Math.max(0, viewTop)));
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(0, this.lavaY);
        ctx.lineTo(WORLD_W, this.lavaY);
        ctx.stroke();
      }

      if (finishY + 1000 >= viewTop && finishY - 120 <= viewBottom) {
        const sq = 40;
        for (let x = 45; x < WORLD_W - 45; x += sq) {
          ctx.fillStyle = Math.floor(x / sq) % 2 === 0 ? "#ffffff" : "#0a0a0f";
          ctx.fillRect(x, finishY, sq, 30);
          ctx.fillStyle = Math.floor(x / sq) % 2 === 0 ? "#0a0a0f" : "#ffffff";
          ctx.fillRect(x, finishY + 30, sq, 30);
        }

        const barH = 42;
        const maxBarsShown = Math.min(this.finishedOrder.length, 22);
        for (let i = 0; i < maxBarsShown; i++) {
          const finMarble = this.finishedOrder[i];
          const by = finishY + 72 + i * (barH + 5);
          ctx.fillStyle = finMarble.country.color || "#3b82f6";
          ctx.fillRect(65, by, WORLD_W - 130, barH);
          ctx.strokeStyle = WALL_COLOR;
          ctx.lineWidth = 5;
          ctx.strokeRect(65, by, WORLD_W - 130, barH);

          ctx.fillStyle = "#ffffff";
          ctx.font = "900 26px sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(`#${i + 1}  ${finMarble.country.flag}  ${finMarble.country.name}`, 90, by + barH / 2);
        }
      }

      const cbOutline = State.settings.colorblind === 1;
      const top5Set = new Set(activeMarbles.slice(0, 5));

      this.marbles.forEach(m => {
        if (m.finished || m.eliminated) return;
        if (m.y + m.r < viewTop || m.y - m.r > viewBottom) return;

        if (m.trail.length > 1) {
          ctx.strokeStyle = skin.trail || m.country.color;
          ctx.lineWidth = 8;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          m.trail.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.save();
        ctx.translate(m.x, m.y);
        if (m.inGhostZone) ctx.globalAlpha = 0.65;

        ctx.fillStyle = m.country.color || "#3b82f6";
        ctx.beginPath();
        ctx.arc(0, 0, m.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = cbOutline ? 7 : 5;
        ctx.strokeStyle = cbOutline ? "#ffff00" : WALL_COLOR;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(m.r * 1.15)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m.country.flag, 0, 1);

        // Fixed: Use standard ctx.measureText(labelTxt).width
        if (top5Set.has(m)) {
          const rankIdx = activeMarbles.indexOf(m) + this.finishedOrder.length + 1;
          const labelTxt = `#${rankIdx} ${m.country.name}`;
          ctx.font = "900 24px sans-serif";
          const tw = ctx.measureText(labelTxt).width + 20;
          ctx.fillStyle = "rgba(10, 10, 15, 0.88)";
          ctx.fillRect(-tw / 2, -m.r - 36, tw, 28);
          ctx.fillStyle = rankIdx === 1 ? "#fbbf24" : "#ffffff";
          ctx.fillText(labelTxt, 0, -m.r - 22);
        }
        ctx.restore();
      });

      ctx.restore();

      // Right-Edge Vertical Minimap Strip
      const stripW = 18;
      const stripX = W - stripW - 4;
      const stripY = 8;
      const stripH = H - 16;
      ctx.fillStyle = "rgba(10, 14, 26, 0.82)";
      ctx.fillRect(stripX, stripY, stripW, stripH);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(stripX, stripY, stripW, stripH);

      this.worldData.sections.forEach(sec => {
        const sy = stripY + (sec.yStart / finishY) * stripH;
        ctx.fillStyle = sec.accent;
        ctx.fillRect(stripX + 2, sy, stripW - 4, 2);
      });

      this.marbles.forEach(m => {
        if (m.eliminated) return;
        const pct = Math.min(1, Math.max(0, m.y / finishY));
        const my = stripY + pct * stripH;
        ctx.fillStyle = m.finished ? "#10b981" : (m.country.color || "#ffffff");
        ctx.fillRect(stripX + 4, my - 1.5, stripW - 8, 3);
      });

      document.getElementById("hudTitle").textContent =
        `${this.session.modeTitle} • Rd ${this.session.currentRound}/${this.session.totalRounds}`;
      document.getElementById("hudTrackName").textContent =
        `${this.getTrackDisplayName(this.currentTrackId)} (${this.finishedOrder.length}/${this.marbles.length} Fin)`;
      if (liveRanking[0]) {
        document.getElementById("hudSub").textContent =
          `1st: ${liveRanking[0].country.flag} ${liveRanking[0].country.name}`;
      }
      document.getElementById("hudStandings").innerHTML = liveRanking.slice(0, 5)
        .map((m, idx) => `<strong>#${idx + 1}</strong> ${m.country.flag} ${m.country.name.slice(0, 10)}`)
        .join(" &nbsp;");
    },

    skipToResult() {
      if (!this.session || !this.worldData) return;
      let guard = 0;
      while (!this.checkRaceFinished() && guard < 4000) {
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
        this.mediaRecorder.stop();
      }

      const finalOrder = [
        ...this.finishedOrder,
        ...this.eliminatedOrder.slice().reverse()
      ];
      if (!finalOrder.length) return;

      const winner = finalOrder[0];
      const isGrandPrix = this.session.format === "grandprix";

      if (finalOrder.length >= 2 && finalOrder[0].finishTimeMs && finalOrder[1].finishTimeMs) {
        const delta = Math.abs(finalOrder[1].finishTimeMs - finalOrder[0].finishTimeMs);
        if (delta <= 60) UI.unlockAchievement("photofinish");
        if (delta < State.records.closestFinish.ms) {
          State.records.closestFinish = {
            pair: `${finalOrder[0].country.flag} vs ${finalOrder[1].country.flag}`,
            ms: delta
          };
        }
      }

      const gained = (winner.midRank || 1) - 1;
      if (gained >= 10) UI.unlockAchievement("comeback");
      if (gained > State.records.bestComeback.gained) {
        State.records.bestComeback = { country: `${winner.country.flag} ${winner.country.name}`, gained };
      }

      UI.unlockAchievement("first_win");
      if (winner.country.small || winner.country.isCustom) UI.unlockAchievement("underdog");
      State.coins += 30;

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
        } else {
          if (idx === 0) {
            this.session.seriesScores[m.country.code] = (this.session.seriesScores[m.country.code] || 0) + 1;
          }
        }

        if (this.session.format === "team") {
          const reg = m.country.region[0] || "World";
          const teamPts = Math.max(1, finalOrder.length - idx);
          this.session.teamScores[reg] = (this.session.teamScores[reg] || 0) + teamPts;
        }

        if (pos === 1) {
          st.wins += 1;
          st.streak += 1;
          if (st.streak > State.records.longestStreak.streak) {
            State.records.longestStreak = { country: `${m.country.flag} ${m.country.name}`, streak: st.streak };
          }
        } else {
          st.streak = 0;
        }
        if (pos <= 3) st.podiums += 1;
      });

      let elimNote = "";
      let knockedCodes = new Set();
      if (this.session.format === "knockout" && this.session.activeCountries.length > 2) {
        const cut = Math.min(this.session.elimPerRound, this.session.activeCountries.length - 1);
        const knocked = finalOrder.slice(-cut).map(m => m.country);
        knockedCodes = new Set(knocked.map(c => c.code));
        this.session.activeCountries = this.session.activeCountries.filter(c => !knockedCodes.has(c.code));
        elimNote = `Eliminated (${cut} Marbles): ${knocked.slice(0, 6).map(c => c.flag + " " + c.name).join(", ")}${knocked.length > 6 ? "..." : ""}`;
      }

      saveState();
      this.showWinnerModal(winner.country, finalOrder, elimNote, knockedCodes);
    },

    showWinnerModal(winCountry, finalOrder, elimNote, knockedCodes) {
      const isGrandPrix = this.session.format === "grandprix";
      document.getElementById("winHeader").textContent =
        `🏆 Round ${this.session.currentRound}/${this.session.totalRounds} Winner!`;
      document.getElementById("winTrackSub").textContent =
        `Track: ${this.getTrackDisplayName(this.currentTrackId)}`;
      document.getElementById("winFlag").textContent = winCountry.flag;
      document.getElementById("winCountryName").textContent = winCountry.name;
      document.getElementById("winFunFact").textContent = "💡 " + winCountry.fact;
      document.getElementById("winTotalMarbles").textContent = finalOrder.length;

      let seriesText = elimNote;
      if (this.session.isRivalry) {
        const [cA, cB] = this.session.activeCountries;
        seriesText = `Rivalry Wins: ${cA.flag} ${this.session.seriesScores[cA.code]} - ${this.session.seriesScores[cB.code]} ${cB.flag}`;
      } else if (isGrandPrix) {
        const topGP = Object.entries(this.session.seriesScores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([code, p]) => `${findMarbleByCode(code).flag} ${p}pts`).join(" • ");
        seriesText = `GP Standings Leader: ${topGP}`;
      } else if (this.session.format === "team") {
        const topTeams = Object.entries(this.session.teamScores)
          .sort((a, b) => b[1] - a[1])
          .map(([r, p]) => `${r}: ${p}`).join(" | ");
        seriesText = `Team Standings: ${topTeams}`;
      }
      document.getElementById("winSeriesInfo").textContent = seriesText;

      document.getElementById("winColExtra").textContent = isGrandPrix ? "GP Points" : "Status";

      const leaderMs = finalOrder[0]?.finishTimeMs || 1000;

      document.getElementById("winPodiumList").innerHTML = finalOrder.map((m, idx) => {
        const isElim = m.eliminated || (knockedCodes && knockedCodes.has(m.country.code));
        const timeStr = m.eliminated
          ? "DNF (Lava)"
          : idx === 0
            ? (m.finishTimeMs / 1000).toFixed(2) + "s"
            : "+" + Math.max(0.01, (m.finishTimeMs - leaderMs) / 1000).toFixed(2) + "s";

        let extraCol = "";
        if (isGrandPrix) {
          const pts = window.GAME_DATA.getPoints(idx, this.session.gpSystem);
          const totalPts = this.session.seriesScores[m.country.code] || 0;
          extraCol = `<span style="color:var(--accent); font-weight:700;">+${pts} (${totalPts})</span>`;
        } else if (isElim) {
          extraCol = `<span style="color:var(--danger); font-weight:700;">❌ OUT</span>`;
        } else if (idx === 0) {
          extraCol = `<span style="color:var(--accent2); font-weight:700;">🥇 WIN</span>`;
        } else if (idx <= 2) {
          extraCol = `<span style="color:#38bdf8;">🏅 Podium</span>`;
        } else {
          extraCol = `<span style="color:var(--muted);">#${idx + 1}</span>`;
        }

        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td>${m.country.flag} ${m.country.name}</td>
            <td>${timeStr}</td>
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
        }, 2500);
      }
    },

    nextStepAfterModal() {
      document.getElementById("winnerModal").classList.remove("active");
      if (!this.session) return;

      if (this.session.isCareer) {
        const myRank = this.finishedOrder.findIndex(m => m.country.code === this.session.careerCode) + 1;
        const passRanks = [12, 8, 4, 1];
        const passRank = passRanks[State.career.stage] || 1;
        if (myRank > 0 && myRank <= passRank) {
          if (State.career.stage < 3) {
            State.career.stage += 1;
            saveState();
            alert(`Qualified! You finished #${myRank} (Top ${passRank}) and unlocked Stage ${State.career.stage + 1}!`);
          } else {
            State.career.stage = 0;
            ensureCountryStat(this.session.careerCode).cups += 1;
            UI.unlockAchievement("world_champ");
            saveState();
            alert("🏆 WORLD CUP CAREER CHAMPION! You conquered all 4 mega tracks!");
          }
        } else {
          alert(`Finished #${myRank} (Needed Top ${passRank}). Try this stage again!`);
        }
        UI.showScreen("competitions");
        return;
      }

      if (this.session.isRivalry) {
        const needed = Math.ceil(this.session.bestOf / 2);
        const [cA, cB] = this.session.activeCountries;
        if (this.session.seriesScores[cA.code] >= needed || this.session.seriesScores[cB.code] >= needed) {
          const champ = this.session.seriesScores[cA.code] >= needed ? cA : cB;
          alert(`⚔️ Rivalry Series Winner: ${champ.flag} ${champ.name}!`);
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
          const topCode = Object.entries(this.session.seriesScores)
            .sort((a, b) => b[1] - a[1])[0]?.[0];
          champ = findMarbleByCode(topCode);
        } else {
          champ = this.finishedOrder[0]?.country;
        }
        if (champ) {
          if (this.session.cupId || this.session.format === "grandprix") {
            ensureCountryStat(champ.code).cups += 1;
            UI.unlockAchievement("world_champ");
            saveState();
          }
          alert(`🏆 Overall Champion: ${champ.flag} ${champ.name}!`);
        }
        UI.showScreen("creator");
      }
    },

    cycleSpeed() {
      this.speedMult = this.speedMult === 1 ? 2 : this.speedMult === 2 ? 3 : 1;
      this.updateHUDButtons();
    },

    cycleCamera() {
      const modes = ["leader", "pack", "wide", "overview"];
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
        btn.textContent = "🔴 Rec";
        return;
      }
      if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
        alert("Video capture is not supported by this WebView, but you can share full race standings!");
        return;
      }
      try {
        const stream = canvas.captureStream(30);
        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
        };
        this.mediaRecorder.onstop = () => {
          this.lastRecordedBlob = new Blob(this.recordedChunks, { type: "video/webm" });
          btn.textContent = "🔴 Rec";
        };
        this.mediaRecorder.start();
        btn.textContent = "⏹️ Stop";
      } catch (e) {
        alert("Video recording could not start on this device.");
      }
    },

    async shareClipOrResult() {
      const winName = document.getElementById("winCountryName").textContent;
      const winFlag = document.getElementById("winFlag").textContent;
      const shareText = `${winFlag} ${winName} just won on ${this.getTrackDisplayName(this.currentTrackId)} in Country Marble Race! 🏆`;

      if (navigator.share) {
        try {
          if (this.lastRecordedBlob) {
            const file = new File([this.lastRecordedBlob], "marble-race.webm", { type: "video/webm" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ title: "Country Marble Race", text: shareText, files: [file] });
              return;
            }
          }
          await navigator.share({ title: "Country Marble Race", text: shareText });
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
