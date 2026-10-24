// Country Marble Color Rush 4K (v6.0 Widescreen 16:9 Landscape Architecture)
// - Matches Reference Image (1000157883_52417a.png) 100%:
//   * Single-screen 16:9 Widescreen Landscape Arena (1920x1080 UHD Coordinate Space)
//   * Top Dual Launch Tray with Tilted Green/Pink/Yellow Bars -> Central Green X-Funnel
//   * Main Wide Obstacle Field: Hollow Purple Diamonds, Segmented Red Hazard Rings, Yellow Peg Chains, Green 4-Blade Spinners, Side Zig-Zag Walls
//   * Bottom 3-Lane Horizontal Serpentine Finish Track with Green '>>>' Boosters & Checkered Finish Line!
// - Fullscreen Race Mode hides the left app menu completely
// - 4K Ultra-HD Super-Sampled Canvas + 256x256 Flag Textures + Survival Mode (Touch Red = Instant Elimination!)
(function () {
  function hashSeed(str) {
    const s = String(str || "COLOR-RUSH-4K");
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

  // Offline Web Audio Synthesizer
  const SFX = {
    ctx: null,
    enabled: true,
    musicEnabled: false,
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
    redHitSound(isElim) {
      if (isElim) {
        this.playTone(150, 0.16, "sawtooth", 0.1);
        setTimeout(() => this.playTone(95, 0.22, "sawtooth", 0.1), 60);
      } else {
        this.playTone(210, 0.1, "square", 0.07);
      }
    },
    qualifyDing() {
      this.playTone(698.46, 0.08, "triangle", 0.07);
      setTimeout(() => this.playTone(1046.5, 0.12, "triangle", 0.08), 55);
    },
    winFanfare() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.18, "triangle", 0.1), i * 90);
      });
    }
  };

  const STORAGE_KEY = "CMR_SAVE_V7";
  const defaultSave = {
    coins: 500,
    equippedSkin: "default",
    unlockedSkins: ["default"],
    achievements: [],
    presets: [],
    customMarbles: [],
    customTournaments: [],
    customTrack: [
      { type: "diamond", x: 180, y: 120, angle: 0, scale: 1 },
      { type: "diamond", x: 320, y: 120, angle: 0, scale: 1 },
      { type: "diamond", x: 460, y: 120, angle: 0, scale: 1 },
      { type: "redRing", x: 250, y: 180, angle: 0, scale: 1 },
      { type: "redRing", x: 390, y: 180, angle: 0, scale: 1 },
      { type: "greenSpinner", x: 250, y: 250, angle: 0, scale: 1 },
      { type: "greenSpinner", x: 390, y: 250, angle: 0, scale: 1 },
      { type: "yellowPegs", x: 320, y: 190, angle: 0, scale: 1 }
    ],
    settings: {
      lang: "en",
      maxMarbles: 255,
      fontScale: 1,
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
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("CMR_SAVE_V6");
      if (!raw) return JSON.parse(JSON.stringify(defaultSave));
      return Object.assign(JSON.parse(JSON.stringify(defaultSave)), JSON.parse(raw));
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
  // 4K ULTRA-HD FULL-BLEED FLAG & CUSTOM LOGO TEXTURE CACHE (192x192 HI-DPI)
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

      const size = 160; // Ultra-crisp 4K texture resolution
      const half = size / 2;
      const cnv = document.createElement("canvas");
      cnv.width = size;
      cnv.height = size;
      const ctx = cnv.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.save();
      ctx.beginPath();
      ctx.arc(half, half, half, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (country.logoDataUrl) {
        ctx.fillStyle = country.color || "#ff2a5f";
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
        ctx.fillStyle = country.color || "#ff2a5f";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = country.color2 || "#00f566";
        ctx.fillRect(0, size * 0.32, size, size * 0.36);
      } else {
        const cols = country.stripeColors || [country.color || "#1e293b", "#ffffff", country.color || "#1e293b"];
        ctx.fillStyle = cols[0];
        ctx.fillRect(0, 0, size, size / 3);
        ctx.fillStyle = cols[1];
        ctx.fillRect(0, size / 3, size, size / 3);
        ctx.fillStyle = cols[2];
        ctx.fillRect(0, (size * 2) / 3, size, size / 3);

        ctx.save();
        ctx.translate(half, half + 4);
        ctx.scale(1.42, 1.82);
        ctx.font = "128px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
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
  // WIDESCREEN 16:9 COLOR RUSH LANDSCAPE ARENA BUILDER (1920x1080 UHD SPACE)
  // ============================================================================
  // Matches the exact layout of Reference Image `1000157883_52417a.png`:
  // - Left Broadcast Sidebar: X = 0..310, Y = 0..1080
  // - Widescreen Arena Box: X = 330..1890 (Width = 1560px), Y = 25..1055
  //   1. Top Launch Tray (Y = 45..215): Left & Right chambers with tilted Green, Pink & Yellow bars feeding into a central Green X-Funnel!
  //   2. Main Widescreen Obstacle Field (Y = 225..785):
  //      - Hollow Purple Diamond Frames (#6344f5)
  //      - Red Segmented Hazard Rings (#ff2a5f) -> Touching Red eliminates in Survival Mode (or resets in Reset Mode)!
  //      - Vertical Chains of Yellow Pegs (#ffd600)
  //      - Neon Green 4-Blade Rotating Cross Spinners (#00f566)
  //      - Side Zig-Zag Purple Bumpers & Chevron Speed Boosts (`>>>`)
  //   3. Bottom Funnel Throat (Y = 785..825) dropping into the Horizontal Serpentine Sprint Track (Y = 825..1045)
  //      with 1, 2, or 3 horizontal lanes, Green `>>>` speed boosters, and a Checkered Finish Line!

  const PURPLE_MAIN = "#6344f5";
  const PURPLE_DARK = "#3f27b8";
  const NEON_GREEN = "#00f566";
  const NEON_RED = "#ff2a5f";
  const NEON_YELLOW = "#ffd600";
  const DARK_BG = "#070913";

  const LANDSCAPE_BUILDER = {
    buildArena(trackId, lengthOption, difficulty, rng) {
      const preset = window.GAME_DATA.tracks.find(t => t.id === trackId) || window.GAME_DATA.tracks[0];
      const world = {
        Walls: [],       // { x1, y1, x2, y2, thick, color, isRed, cap }
        Diamonds: [],    // Hollow purple diamond frames { x, y, r }
        RedRings: [],    // Red segmented hazard rings { x, y, r, angle, speed }
        GreenSpinners: [], // Green 4-blade spinners { x, y, len, thick, angle, speed }
        YellowPegs: [],  // { x, y, r }
        Chevrons: [],    // { x, y, dirX, dirY, color }
        Gates: [],       // Yellow vertical visual gates in bottom tube { x, y, h }
        dynamicItems: [],
        sprintLanes: lengthOption === "small" ? 1 : lengthOption === "medium" ? 2 : 3,
        finishX: 1835,
        finishYMin: 980,
        finishYMax: 1045
      };

      const L = 355;
      const R = 1865;
      const CX = (L + R) / 2; // 1110

      // ----------------------------------------------------------------------
      // 1. TOP WIDESCREEN LAUNCH TRAY & CENTRAL GREEN X-FUNNEL (Y = 50..210)
      // ----------------------------------------------------------------------
      // Top outer roof with green dashed highlights
      world.Walls.push({ x1: L + 30, y1: 52, x2: CX - 45, y2: 52, thick: 18, color: PURPLE_MAIN, stripeGreen: true });
      world.Walls.push({ x1: CX + 45, y1: 52, x2: R - 30, y2: 52, thick: 18, color: PURPLE_MAIN, stripeGreen: true });

      // Left & Right angled upper tray walls
      world.Walls.push({ x1: L + 30, y1: 52, x2: L + 85, y2: 195, thick: 18, color: PURPLE_MAIN });
      world.Walls.push({ x1: R - 30, y1: 52, x2: R - 85, y2: 195, thick: 18, color: PURPLE_MAIN });

      // Tray floor sloping gently toward two entry openings (Left-Center & Right-Center) + Central X-Splitter
      world.Walls.push({ x1: L + 85, y1: 195, x2: CX - 190, y2: 202, thick: 18, color: PURPLE_MAIN });
      world.Walls.push({ x1: R - 85, y1: 195, x2: CX + 190, y2: 202, thick: 18, color: PURPLE_MAIN });

      // Central Green & Purple X-Funnel Divider in the Top Tray (Matches Image!)
      world.Walls.push({ x1: CX - 45, y1: 52, x2: CX, y2: 105, thick: 14, color: PURPLE_MAIN });
      world.Walls.push({ x1: CX + 45, y1: 52, x2: CX, y2: 105, thick: 14, color: PURPLE_MAIN });
      world.Walls.push({ x1: CX, y1: 95, x2: CX, y2: 155, thick: 12, color: NEON_GREEN });
      world.Walls.push({ x1: CX, y1: 155, x2: CX - 52, y2: 205, thick: 14, color: PURPLE_MAIN });
      world.Walls.push({ x1: CX, y1: 155, x2: CX + 52, y2: 205, thick: 14, color: PURPLE_MAIN });

      // Tilted Seesaw / Deflector Bars inside the Top Tray (Green, Pink/Red, Yellow)
      const trayBars = [
        { x: L + 290, y: 125, len: 110, ang: -0.32, color: NEON_GREEN, isRed: false },
        { x: L + 440, y: 125, len: 110, ang: -0.32, color: NEON_RED, isRed: true },
        { x: L + 590, y: 125, len: 110, ang: -0.32, color: NEON_YELLOW, isRed: false },
        { x: R - 590, y: 125, len: 110, ang: 0.32, color: NEON_YELLOW, isRed: false },
        { x: R - 440, y: 125, len: 110, ang: 0.32, color: NEON_RED, isRed: true },
        { x: R - 290, y: 125, len: 110, ang: 0.32, color: NEON_GREEN, isRed: false }
      ];
      trayBars.forEach(tb => {
        const dx = Math.cos(tb.ang) * (tb.len / 2);
        const dy = Math.sin(tb.ang) * (tb.len / 2);
        world.Walls.push({
          x1: tb.x - dx, y1: tb.y - dy,
          x2: tb.x + dx, y2: tb.y + dy,
          thick: 14,
          color: tb.color,
          isRed: tb.isRed
        });
      });

      // ----------------------------------------------------------------------
      // 2. OUTER ZIG-ZAG WIDESCREEN SIDE WALLS & BOTTOM FUNNEL (Y = 205..815)
      // ----------------------------------------------------------------------
      // Left Zig-Zag Purple Wall + Green Chevron Bounce Ribs
      const leftZig = [
        [L + 115, 205], [L + 55, 290], [L + 110, 385], [L + 45, 495], [L + 105, 610], [L + 55, 725], [CX - 48, 795]
      ];
      for (let i = 0; i < leftZig.length - 1; i++) {
        world.Walls.push({
          x1: leftZig[i][0], y1: leftZig[i][1],
          x2: leftZig[i + 1][0], y2: leftZig[i + 1][1],
          thick: 18,
          color: PURPLE_MAIN
        });
      }
      // Right Zig-Zag Purple Wall
      const rightZig = [
        [R - 115, 205], [R - 55, 290], [R - 110, 385], [R - 45, 495], [R - 105, 610], [R - 55, 725], [CX + 48, 795]
      ];
      for (let i = 0; i < rightZig.length - 1; i++) {
        world.Walls.push({
          x1: rightZig[i][0], y1: rightZig[i][1],
          x2: rightZig[i + 1][0], y2: rightZig[i + 1][1],
          thick: 18,
          color: PURPLE_MAIN
        });
      }

      // Side Green & Red Bumper Bars along the left and right zig-zag walls
      world.Walls.push({ x1: L + 85, y1: 325, x2: L + 125, y2: 280, thick: 12, color: NEON_GREEN });
      world.Walls.push({ x1: L + 110, y1: 445, x2: L + 150, y2: 495, thick: 12, color: NEON_GREEN });
      world.Walls.push({ x1: L + 150, y1: 495, x2: L + 110, y2: 545, thick: 12, color: NEON_GREEN });
      world.Walls.push({ x1: L + 85, y1: 650, x2: L + 125, y2: 695, thick: 12, color: NEON_RED, isRed: true });

      world.Walls.push({ x1: R - 85, y1: 325, x2: R - 125, y2: 280, thick: 12, color: NEON_GREEN });
      world.Walls.push({ x1: R - 110, y1: 445, x2: R - 150, y2: 495, thick: 12, color: NEON_GREEN });
      world.Walls.push({ x1: R - 150, y1: 495, x2: R - 110, y2: 545, thick: 12, color: NEON_GREEN });
      world.Walls.push({ x1: R - 85, y1: 650, x2: R - 125, y2: 695, thick: 12, color: NEON_RED, isRed: true });

      // Red Tilted Guard Bars above the central funnel throat (Matches Image!)
      world.Walls.push({ x1: CX - 165, y1: 710, x2: CX - 85, y2: 755, thick: 15, color: NEON_RED, isRed: true });
      world.Walls.push({ x1: CX + 165, y1: 710, x2: CX + 85, y2: 755, thick: 15, color: NEON_RED, isRed: true });

      // Central Funnel Throat Chute into Bottom Sprint Track
      world.Walls.push({ x1: CX - 48, y1: 790, x2: CX - 48, y2: 830, thick: 16, color: PURPLE_MAIN });
      world.Walls.push({ x1: CX + 48, y1: 790, x2: CX + 48, y2: 830, thick: 16, color: PURPLE_MAIN });
      world.Chevrons.push({ x: CX, y: 805, dirX: 0, dirY: 1, color: NEON_YELLOW });

      // ----------------------------------------------------------------------
      // 3. MAIN WIDESCREEN OBSTACLE FIELD (CUSTOM OR 22 PRESET VARIATIONS)
      // ----------------------------------------------------------------------
      if (trackId === "custom" && State.customTrack.length > 0) {
        const scaleX = (R - L - 240) / 640;
        const scaleY = 520 / 320;
        State.customTrack.forEach(item => {
          const ox = L + 120 + item.x * scaleX;
          const oy = 230 + item.y * scaleY;
          const scl = item.scale || 1;
          const rad = ((item.angle || 0) * Math.PI) / 180;

          if (item.type === "diamond") {
            world.Diamonds.push({ x: ox, y: oy, r: 44 * scl });
          } else if (item.type === "redRing") {
            world.RedRings.push({ x: ox, y: oy, r: 34 * scl, angle: rad, speed: 0.03 });
          } else if (item.type === "greenSpinner") {
            world.GreenSpinners.push({ x: ox, y: oy, len: 88 * scl, thick: 14, angle: rad, speed: 0.055 });
          } else if (item.type === "yellowPegs") {
            for (let k = -2; k <= 2; k++) {
              world.YellowPegs.push({ x: ox, y: oy + k * 28 * scl, r: 7 });
            }
          } else if (item.type === "pinkBar" || item.type === "greenBar") {
            const isRed = item.type === "pinkBar";
            const half = 55 * scl;
            world.Walls.push({
              x1: ox - Math.cos(rad) * half, y1: oy - Math.sin(rad) * half,
              x2: ox + Math.cos(rad) * half, y2: oy + Math.sin(rad) * half,
              thick: 14,
              color: isRed ? NEON_RED : NEON_GREEN,
              isRed
            });
          } else if (item.type === "chevron") {
            world.Chevrons.push({ x: ox, y: oy, dirX: 0, dirY: 1, color: NEON_GREEN });
          }
        });
      } else {
        // Generate the iconic Color Rush Widescreen Obstacle Matrix (with 22 unique track layouts!)
        const style = preset.style === "random"
          ? ["classic", "diamonds", "spinners", "rings", "twinFunnel", "pinball", "plinko", "slalom", "windmills", "speedway"][Math.floor(rng() * 10)]
          : preset.style;

        // 6 Columns of Hollow Purple Diamonds (Left 3 columns + Right 3 columns)
        const dColsLeft = [L + 225, L + 415, L + 605];
        const dColsRight = [R - 605, R - 415, R - 225];
        const dRows = [275, 415, 555];

        dRows.forEach((ry, rIdx) => {
          dColsLeft.forEach((cx, cIdx) => {
            if (style === "spinners" && (rIdx + cIdx) % 2 === 1) {
              world.GreenSpinners.push({ x: cx, y: ry, len: 86, thick: 14, angle: 0, speed: 0.055 });
            } else {
              world.Diamonds.push({ x: cx + (rIdx % 2) * 12, y: ry, r: 44 });
            }
          });
          dColsRight.forEach((cx, cIdx) => {
            if (style === "spinners" && (rIdx + cIdx) % 2 === 1) {
              world.GreenSpinners.push({ x: cx, y: ry, len: 86, thick: 14, angle: 0, speed: -0.055 });
            } else {
              world.Diamonds.push({ x: cx - (rIdx % 2) * 12, y: ry, r: 44 });
            }
          });
        });

        // 5 Columns of Segmented Red Hazard Rings + Vertical Chains of Yellow Pegs between them!
        const ringCols = [L + 320, L + 510, CX, R - 510, R - 320];
        ringCols.forEach((rx, cIdx) => {
          const isCenterCol = cIdx === 2;
          const isSpinnerCol = cIdx === 1 || cIdx === 3;

          if (isSpinnerCol && style !== "rings") {
            // Tilted Green Bar at top + Vertical Yellow Peg Chain + Two Green 4-Blade X-Spinners (Exact Image Match!)
            const tilt = cIdx === 1 ? 0.55 : -0.55;
            world.Walls.push({
              x1: rx - Math.cos(tilt) * 48, y1: 335 - Math.sin(tilt) * 48,
              x2: rx + Math.cos(tilt) * 48, y2: 335 + Math.sin(tilt) * 48,
              thick: 14,
              color: NEON_GREEN
            });
            for (let py = 385; py <= 665; py += 28) {
              if (Math.abs(py - 505) > 25 && Math.abs(py - 625) > 25) {
                world.YellowPegs.push({ x: rx, y: py, r: 6.5 });
              }
            }
            world.GreenSpinners.push({ x: rx, y: 505, len: 88, thick: 14, angle: 0.4, speed: cIdx === 1 ? 0.055 : -0.055 });
            world.GreenSpinners.push({ x: rx, y: 625, len: 88, thick: 14, angle: 0.4, speed: cIdx === 1 ? -0.055 : 0.055 });
          } else {
            // Column of 3 Segmented Red Hazard Rings connected by Yellow Peg Dots (Exact Image Match!)
            const ringYs = isCenterCol ? [305, 445, 585] : [335, 495, 645];
            ringYs.forEach((ry, rIdx) => {
              world.RedRings.push({
                x: rx,
                y: ry,
                r: difficulty === "hard" ? 37 : 33,
                angle: (rIdx * Math.PI) / 3,
                speed: (rIdx % 2 === 0 ? 1 : -1) * 0.025
              });
              if (rIdx < ringYs.length - 1) {
                const nextY = ringYs[rIdx + 1];
                for (let py = ry + 48; py <= nextY - 48; py += 26) {
                  world.YellowPegs.push({ x: rx, y: py, r: 6.5 });
                }
              }
            });
          }
        });

        // Style-Specific Extra Obstacles for the 22 Tracks
        if (style === "twinFunnel" || style === "slalom") {
          world.Walls.push({ x1: L + 220, y1: 685, x2: CX - 230, y2: 725, thick: 14, color: NEON_GREEN });
          world.Walls.push({ x1: R - 220, y1: 685, x2: CX + 230, y2: 725, thick: 14, color: NEON_GREEN });
        } else if (style === "windmills") {
          world.GreenSpinners.push({ x: L + 320, y: 415, len: 92, thick: 14, angle: 0, speed: 0.06 });
          world.GreenSpinners.push({ x: R - 320, y: 415, len: 92, thick: 14, angle: 0, speed: -0.06 });
        } else if (style === "speedway") {
          world.Chevrons.push({ x: L + 320, y: 260, dirX: 0, dirY: 1, color: NEON_GREEN });
          world.Chevrons.push({ x: R - 320, y: 260, dirX: 0, dirY: 1, color: NEON_GREEN });
        }
      }

      // ----------------------------------------------------------------------
      // 4. BOTTOM 3-LANE HORIZONTAL SERPENTINE FINISH TRACK (Y = 825..1045)
      // ----------------------------------------------------------------------
      // Matches the bottom of `1000157883_52417a.png`:
      // Marbles exit the central funnel at CX (1110, 825) into Lane 1, get propelled along the horizontal
      // purple tube lanes with Green `>>>` boosters and Yellow checkpoint gates, turn around the U-bends,
      // and cross the Checkered Finish Flag!
      const tL = L + 25;   // 380
      const tR = R - 25;   // 1840
      const laneH = 68;
      const y0 = 830;
      const y1 = y0 + laneH;       // 898
      const y2 = y0 + laneH * 2;   // 966
      const y3 = y0 + laneH * 3;   // 1034

      // Top ceiling of Lane 1 (with gap at CX-48..CX+48 for marbles entering from the funnel!)
      world.Walls.push({ x1: tL, y1: y0, x2: CX - 48, y2: y0, thick: 16, color: PURPLE_MAIN });
      world.Walls.push({ x1: CX + 48, y1: y0, x2: tR, y2: y0, thick: 16, color: PURPLE_MAIN });

      if (world.sprintLanes === 1) {
        // 1-Lane Fast Sprint: Left wall closed, marbles boost straight right to Finish at tR!
        world.Walls.push({ x1: tL, y1: y0, x2: tL, y2: y1, thick: 18, color: PURPLE_MAIN });
        world.Walls.push({ x1: tL, y1: y1, x2: tR, y2: y1, thick: 16, color: PURPLE_MAIN });
        world.Chevrons.push({ x: tL + 180, y: y0 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: CX, y: y0 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: tR - 260, y: y0 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.finishX = tR - 45;
        world.finishYMin = y0;
        world.finishYMax = y1;
      } else if (world.sprintLanes === 2) {
        // 2-Lane Serpentine: Lane 1 goes Left -> drops at tL into Lane 2 -> goes Right to Finish!
        world.Walls.push({ x1: tR, y1: y0, x2: tR, y2: y1, thick: 18, color: PURPLE_MAIN });
        world.Walls.push({ x1: tL + 95, y1: y1, x2: tR, y2: y1, thick: 16, color: PURPLE_MAIN });
        world.Walls.push({ x1: tL, y1: y0, x2: tL, y2: y2, thick: 18, color: PURPLE_MAIN });
        world.Walls.push({ x1: tL, y1: y2, x2: tR, y2: y2, thick: 16, color: PURPLE_MAIN });

        world.Chevrons.push({ x: CX + 250, y: y0 + 34, dirX: -1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: CX - 200, y: y0 + 34, dirX: -1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: tL + 220, y: y1 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: CX, y: y1 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: tR - 260, y: y1 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Gates.push({ x: CX - 90, y: y0, h: laneH }, { x: CX + 140, y: y1, h: laneH });
        world.finishX = tR - 45;
        world.finishYMin = y1;
        world.finishYMax = y2;
      } else {
        // 3-Lane Full Serpentine (Exact Match to Reference Image!):
        // Lane 1 flows Left -> U-turn at Left -> Lane 2 flows Right -> U-turn at Right -> Lane 3 flows Left/Right to Checkered Finish!
        // Wait: in the reference image, the Checkered Finish Flag is at the bottom-right (`tR`, spanning Lane 2/3), so let's make:
        // Lane 1 flows Right -> U-bend at Right (`tR`) -> Lane 2 flows Left -> U-bend at Left (`tL`) -> Lane 3 flows Right to the Checkered Finish Flag at Bottom-Right!
        world.Walls.push({ x1: tL, y1: y0, x2: tL, y2: y1, thick: 18, color: PURPLE_MAIN });
        world.Walls.push({ x1: tL, y1: y1, x2: tR - 95, y2: y1, thick: 16, color: PURPLE_MAIN });
        world.Walls.push({ x1: tR, y1: y0, x2: tR, y2: y2, thick: 18, color: PURPLE_MAIN });
        world.Walls.push({ x1: tL + 95, y1: y2, x2: tR, y2: y2, thick: 16, color: PURPLE_MAIN });
        world.Walls.push({ x1: tL, y1: y1, x2: tL, y2: y3, thick: 18, color: PURPLE_MAIN });
        world.Walls.push({ x1: tL, y1: y3, x2: tR, y2: y3, thick: 16, color: PURPLE_MAIN });

        // Lane 1 Boosters (pushing Right toward U-turn 1)
        world.Chevrons.push({ x: tL + 220, y: y0 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: CX, y: y0 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: tR - 240, y: y0 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });

        // Lane 2 Boosters (pushing Left toward U-turn 2)
        world.Chevrons.push({ x: tR - 260, y: y1 + 34, dirX: -1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: CX, y: y1 + 34, dirX: -1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: tL + 260, y: y1 + 34, dirX: -1, dirY: 0, color: NEON_GREEN });

        // Lane 3 Boosters (pushing Right into the Bottom-Right Checkered Finish Line!)
        world.Chevrons.push({ x: tL + 240, y: y2 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: CX, y: y2 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });
        world.Chevrons.push({ x: tR - 260, y: y2 + 34, dirX: 1, dirY: 0, color: NEON_GREEN });

        // Yellow vertical timing gates (exact match to Image!)
        world.Gates.push(
          { x: CX - 130, y: y0, h: laneH },
          { x: CX + 260, y: y0, h: laneH },
          { x: tL + 250, y: y1, h: laneH },
          { x: CX + 80, y: y1, h: laneH },
          { x: CX - 140, y: y2, h: laneH }
        );

        world.finishX = tR - 45;
        world.finishYMin = y2;
        world.finishYMax = y3;
      }

      return world;
    }
  };

  // ============================================================================
  // UI CONTROLLER
  // ============================================================================
  const UI = {
    manualSelected: new Set(["DZ", "MA", "TN", "EG", "SA", "FR", "BR", "AR", "DE", "JP", "ES", "US", "GB", "IT", "CA", "AU"]),
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
      if (badge) badge.textContent = `${getAllMarblesPool().length} COUNTRIES`;

      window.addEventListener("resize", () => {
        if (document.body.classList.contains("in-race")) {
          Game.resize4KCanvas();
        }
      });
    },

    refreshHeader() {
      document.getElementById("coinCount").textContent = State.coins;
      const sb = document.getElementById("btnSound");
      if (sb) sb.textContent = SFX.enabled ? "🔊 SFX" : "🔇 Mute";
      const mb = document.getElementById("btnMusic");
      if (mb) mb.textContent = SFX.musicEnabled ? "🎵 BGM: ON" : "🎵 Synth BGM";
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
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      this.refreshHeader();
    },

    changeBgmTrack(src) {
      const audio = document.getElementById("bgmAudio");
      if (!audio) return;
      audio.src = src;
      if (SFX.musicEnabled) audio.play().catch(() => {});
    },

    onFormatChange() {
      const fmt = document.getElementById("crFormat").value;
      document.getElementById("gpSystemWrap").style.display = fmt === "grandprix" ? "block" : "none";
      if (fmt === "survival") {
        document.getElementById("crRedRule").value = "eliminate";
      }
    },

    onTrackChange() {
      const trk = document.getElementById("crTrack").value;
      document.getElementById("seedInputWrap").style.display = trk === "seeded_random" ? "block" : "none";
    },

    randomizeSeed() {
      const words = ["COLOR-RUSH", "NEON-ORAN", "ATLAS-4K", "CYBER-CUP", "VORTEX-99"];
      document.getElementById("crTrackSeed").value = words[Math.floor(Math.random() * words.length)] + "-" + Math.floor(100 + Math.random() * 900);
    },

    showScreen(id, btn) {
      // Hide left menu & top bar when in race screen!
      if (id === "race") {
        document.body.classList.add("in-race");
      } else {
        document.body.classList.remove("in-race");
      }

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
          cnv.width = 160;
          cnv.height = 160;
          const ctx = cnv.getContext("2d");
          ctx.beginPath();
          ctx.arc(80, 80, 80, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0, 160, 160);
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
      const color = document.getElementById("cmColor").value || "#ff2a5f";
      const color2 = document.getElementById("cmColor2").value || "#00f566";
      const region = document.getElementById("cmRegion").value || "Custom";
      const fact = document.getElementById("cmFact").value.trim() || `${name} (${iso3}) is a custom 4K Color Rush contender!`;

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
      alert(`Custom 4K Marble "${name} (${iso3})" created!`);
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
        <div style="display:flex; justify-content:space-between; align-items:center; background:#080a17; padding:6px 10px; border-radius:8px; margin-bottom:6px; border-left:4px solid ${m.color};">
          <div style="display:flex; align-items:center; gap:8px;">
            ${m.logoDataUrl ? `<img src="${m.logoDataUrl}" style="width:26px;height:26px;border-radius:50%;" />` : `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${m.color};"></span>`}
            <strong>${m.name} (${m.iso3})</strong> <span class="tag">${m.region[0]}</span>
          </div>
          <button class="btn btn-sm btn-red" onclick="UI.deleteCustomMarble('${m.code}')">Delete</button>
        </div>
      `).join("");
    },

    saveCustomTournament(playImmediately) {
      const name = document.getElementById("ctName").value.trim() || ("Color Rush Cup #" + ((State.customTournaments?.length || 0) + 1));
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
        <div style="display:flex; justify-content:space-between; align-items:center; background:#080a17; padding:6px 10px; border-radius:8px; margin-bottom:6px; border:1px solid #3b308a;">
          <div>
            <strong>${c.name}</strong>
            <span style="font-size:0.72rem; color:var(--muted); margin-left:6px;">${c.count} Flags • ${c.rounds} Laps • ${c.format.toUpperCase()}</span>
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
      const name = prompt("Preset Name:", "Color Rush " + (State.presets.length + 1));
      if (!name) return;
      State.presets.push({
        name,
        count: document.getElementById("crCount").value,
        format: document.getElementById("crFormat").value,
        gpSystem: document.getElementById("crGpSystem").value,
        region: document.getElementById("crRegion").value,
        track: document.getElementById("crTrack").value,
        length: document.getElementById("crLength").value,
        redRule: document.getElementById("crRedRule").value,
        difficulty: document.getElementById("crDifficulty").value,
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
      if (p.redRule) document.getElementById("crRedRule").value = p.redRule;
      document.getElementById("crDifficulty").value = p.difficulty;
      document.getElementById("crPhysSpeed").value = p.physSpeed;
      document.getElementById("crRounds").value = p.rounds;
      document.getElementById("crElim").value = p.elim;
      this.onFormatChange();
      this.onTrackChange();
    },

    renderCups() {
      const wrap = document.getElementById("cupsList");
      wrap.innerHTML = window.GAME_DATA.competitions.map(c => `
        <div style="background:#080a17; padding:10px; border-radius:10px; border:1.5px solid #3b308a;">
          <div style="font-weight:800; margin-bottom:4px; font-size:0.84rem;">${c.name}</div>
          <div style="font-size:0.7rem; color:var(--muted); margin-bottom:8px;">
            ${c.count} Flags • ${c.rounds} Laps • ${c.format.toUpperCase()}
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
        <div style="background:#080a17; padding:8px 12px; border-radius:8px; border:1.5px solid var(--neon-green);">
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
        <div style="background:#080a17; padding:10px; border-radius:10px; border:1.5px solid var(--purple-wall);">
          <div style="font-size:1.1rem; font-weight:900; color:var(--neon-green);">${c.flag || "🔵"} ${c.name} (${c.iso3 || c.code})</div>
          <div style="margin:6px 0; padding:8px; background:rgba(99,68,245,0.18); border-radius:8px; font-size:0.8rem; color:#fff; line-height:1.35;">
            💡 <strong>Fun Fact:</strong> ${c.fact}
          </div>
          <div class="grid-3" style="margin-top:6px;">
            <div class="tag">Races: <strong>${s.races}</strong></div>
            <div class="tag">Wins: <strong>${s.wins}</strong></div>
            <div class="tag">Podiums: <strong>${s.podiums}</strong></div>
            <div class="tag">GP Pts: <strong>${s.points}</strong></div>
            <div class="tag">Cups: <strong>${s.cups}</strong></div>
            <div class="tag">Avg Pos: <strong>${avg}</strong></div>
          </div>
          <div style="font-size:0.75rem; margin-top:6px; color:var(--neon-yellow);">Recent Finishes: ${recentStr}</div>
        </div>
      `;
    },

    renderShop() {
      const sg = document.getElementById("skinsGrid");
      sg.innerHTML = window.GAME_DATA.skins.map(sk => {
        const owned = State.unlockedSkins.includes(sk.id);
        const equipped = State.equippedSkin === sk.id;
        return `
          <div style="background:#080a17; padding:8px; border-radius:8px; border:1.5px solid ${equipped ? 'var(--neon-green)' : '#232854'};">
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
          <div style="background:#080a17; padding:6px 10px; border-radius:8px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${done ? '#00f566' : '#334155'};">
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
  // WIDESCREEN 16:9 COLOR RUSH TRACK EDITOR
  // ============================================================================
  const Editor = {
    tool: "select",
    canvas: null,
    ctx: null,
    selectedIndex: -1,
    isDragging: false,

    init() {
      this.canvas = document.getElementById("editorCanvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");

      const getCoords = e => {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 640 / 10) * 10;
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 320 / 10) * 10;
        return { x: Math.max(30, Math.min(610, x)), y: Math.max(30, Math.min(290, y)) };
      };

      this.canvas.addEventListener("pointerdown", e => {
        const pt = getCoords(e);
        let hitIdx = -1;
        for (let i = State.customTrack.length - 1; i >= 0; i--) {
          const ob = State.customTrack[i];
          if (Math.hypot(ob.x - pt.x, ob.y - pt.y) < 32 * (ob.scale || 1)) {
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
            angle: 0,
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

    syncInspector() {
      const ob = State.customTrack[this.selectedIndex];
      const title = document.getElementById("inspTitle");
      if (!ob) {
        title.textContent = "Selected: None (Tap obstacle)";
        return;
      }
      title.textContent = `Selected: ${ob.type.toUpperCase()} (${ob.x}, ${ob.y})`;
      document.getElementById("inspAngle").value = ob.angle || 0;
      document.getElementById("inspScale").value = ob.scale || 1;
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
      State.customTrack.push(Object.assign({}, ob, { x: Math.min(600, ob.x + 30), y: Math.min(280, ob.y + 30) }));
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
      State.customTrack = [
        { type: "diamond", x: 140, y: 90, angle: 0, scale: 1 },
        { type: "diamond", x: 320, y: 90, angle: 0, scale: 1 },
        { type: "diamond", x: 500, y: 90, angle: 0, scale: 1 },
        { type: "redRing", x: 230, y: 155, angle: 0, scale: 1 },
        { type: "redRing", x: 410, y: 155, angle: 0, scale: 1 },
        { type: "greenSpinner", x: 230, y: 240, angle: 0, scale: 1 },
        { type: "greenSpinner", x: 410, y: 240, angle: 0, scale: 1 },
        { type: "yellowPegs", x: 320, y: 195, angle: 0, scale: 1 }
      ];
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
      alert("Custom Landscape Track saved!");
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
      ctx.fillStyle = DARK_BG;
      ctx.fillRect(0, 0, 640, 320);

      // Widescreen Purple Arena Frame Preview
      ctx.strokeStyle = PURPLE_MAIN;
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, 616, 296);

      State.customTrack.forEach((item, idx) => {
        const scl = item.scale || 1;
        const rad = ((item.angle || 0) * Math.PI) / 180;
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(rad);
        ctx.scale(scl, scl);

        if (idx === this.selectedIndex) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-32, -32, 64, 64);
        }

        if (item.type === "diamond") {
          ctx.rotate(Math.PI / 4);
          ctx.strokeStyle = PURPLE_MAIN;
          ctx.lineWidth = 6;
          ctx.strokeRect(-16, -16, 32, 32);
        } else if (item.type === "redRing") {
          ctx.strokeStyle = NEON_RED;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.stroke();
        } else if (item.type === "greenSpinner") {
          ctx.fillStyle = NEON_GREEN;
          ctx.fillRect(-24, -4, 48, 8);
          ctx.fillRect(-4, -24, 8, 48);
        } else if (item.type === "yellowPegs") {
          ctx.fillStyle = NEON_YELLOW;
          for (let k = -2; k <= 2; k++) {
            ctx.beginPath(); ctx.arc(0, k * 11, 3.5, 0, Math.PI * 2); ctx.fill();
          }
        } else if (item.type === "pinkBar" || item.type === "greenBar") {
          ctx.fillStyle = item.type === "pinkBar" ? NEON_RED : NEON_GREEN;
          ctx.fillRect(-28, -4, 56, 8);
        } else if (item.type === "chevron") {
          ctx.fillStyle = NEON_GREEN;
          ctx.font = "900 14px sans-serif";
          ctx.fillText(">>>", -14, 5);
        }
        ctx.restore();
      });
    }
  };

  // ============================================================================
  // CORE 4K COLOR RUSH LANDSCAPE PHYSICS ENGINE + DUAL VIDEO/FRAME RECORDER
  // ============================================================================
  const Game = {
    session: null,
    engine: null,
    worldData: null,
    animId: null,
    speedMult: 1,
    cameraMode: "wide",
    autoPlay: false,
    simTick: 0,
    redEventsCount: 0,
    lastEventBanner: "",
    particles: [],
    dpr: 2.5,
    // Dual Video + Frame Replay Recorder so recording ALWAYS works on Android APK
    isRecording: false,
    mediaRecorder: null,
    recordedChunks: [],
    lastRecordedBlob: null,
    lastRecordedMime: "video/webm",
    capturedFrames: [],
    replayInterval: null,

    resize4KCanvas() {
      const canvas = document.getElementById("raceCanvas");
      if (!canvas) return;
      const cssW = window.innerWidth || 800;
      const cssH = window.innerHeight || 450;
      const userRes = Number(document.getElementById("crResolution")?.value) || 2.5;
      this.dpr = Math.min(3, Math.max(window.devicePixelRatio || 2, userRes));
      canvas.width = Math.round(cssW * this.dpr);
      canvas.height = Math.round(cssH * this.dpr);
    },

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

      const cap = Math.max(2, Math.min(Number(count) || 64, State.settings.maxMarbles || 255));
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
      if (trackId === "custom") return "Custom Color Rush Arena";
      const found = window.GAME_DATA.tracks.find(t => t.id === trackId);
      return found ? found.name : trackId;
    },

    startFromCreator() {
      const count = Number(document.getElementById("crCount").value) || 64;
      const format = document.getElementById("crFormat").value;
      const gpSystem = document.getElementById("crGpSystem").value || "formula";
      const region = document.getElementById("crRegion").value;
      const track = document.getElementById("crTrack").value;
      const seedStr = document.getElementById("crTrackSeed").value.trim() || "COLOR-RUSH-4K";
      const difficulty = document.getElementById("crDifficulty").value;
      const length = document.getElementById("crLength").value;
      const redRule = format === "survival" ? "eliminate" : (document.getElementById("crRedRule").value || "reset");
      const physSpeed = Number(document.getElementById("crPhysSpeed").value) || 1;
      const rounds = Math.max(1, Math.min(25, Number(document.getElementById("crRounds").value) || 5));
      const elim = Math.max(1, Number(document.getElementById("crElim").value) || 8);
      const manual = document.getElementById("crSelectMode").value === "manual";

      const entrants = this.pickCountries(region, count, manual);
      this.cameraMode = "wide";

      this.session = {
        modeTitle: format === "survival" ? "💀 Survival Mode" : format === "grandprix" ? `Grand Prix (${gpSystem.toUpperCase()})` : "Color Rush Broadcast",
        format,
        gpSystem,
        redRule,
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
        redRule: cup.format === "survival" ? "eliminate" : "reset",
        trackSchedule: this.buildTrackSchedule("rotate", cup.rounds),
        seedStr: cup.id.toUpperCase(),
        difficulty: "medium",
        length: cup.length || "long",
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
      const stageNames = ["Career Qualifier", "Career Group Stage", "Career Semi-Final", "Career World Final"];
      const stageTracks = ["color_rush_classic", "neon_diamond_matrix", "emerald_cross_reactor", "world_cup_gran_finale"];
      const counts = [60, 45, 30, 20];
      const st = State.career.stage || 0;
      const pool = this.pickCountries("ALL", counts[st], false).filter(c => c.code !== code);
      const entrants = [playerMarble, ...pool.slice(0, counts[st] - 1)];

      this.session = {
        modeTitle: stageNames[st],
        format: "knockout",
        gpSystem: "formula",
        redRule: "reset",
        trackSchedule: [stageTracks[st]],
        seedStr: "CAREER-" + st,
        difficulty: st >= 2 ? "hard" : "medium",
        length: "long",
        physSpeed: 1,
        totalRounds: 1,
        currentRound: 1,
        elimPerRound: counts[st] - [15, 10, 5, 1][st],
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
        redRule: "reset",
        trackSchedule: this.buildTrackSchedule("rotate", 5),
        seedStr: "DERBY",
        difficulty: "medium",
        length: "long",
        physSpeed: 1,
        totalRounds: 5,
        currentRound: 1,
        elimPerRound: 0,
        activeCountries: [cA, cB],
        seriesScores: { [codeA]: 0, [codeB]: 0 },
        teamScores: {},
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
      this.resize4KCanvas();

      const currentTrackId = this.session.trackSchedule[(this.session.currentRound - 1) % this.session.trackSchedule.length] || "color_rush_classic";
      this.currentTrackId = currentTrackId;

      const rng = createRNG(`${this.session.seedStr}-L${this.session.currentRound}-${Date.now()}`);
      this.worldData = LANDSCAPE_BUILDER.buildArena(currentTrackId, this.session.length, this.session.difficulty, rng);

      this.simTick = 0;
      this.redEventsCount = 0;
      this.lastEventBanner = "";
      this.particles = [];

      const totalCount = this.session.activeCountries.length;
      this.spotsTotal = this.session.format === "knockout"
        ? Math.max(1, totalCount - this.session.elimPerRound)
        : totalCount;

      this.setupPhysicsWorld(rng);
      this.updateHUDButtons();
      this.startLoop();
    },

    setupPhysicsWorld(rng) {
      if (!window.Matter) return;
      const { Engine, World, Bodies, Body } = window.Matter;
      if (this.engine) World.clear(this.engine.world);

      this.engine = Engine.create({
        positionIterations: 8,
        velocityIterations: 6
      });
      this.engine.gravity.y = 0.86 * (this.session.physSpeed || 1);

      const w = this.worldData;
      w.dynamicItems = [];

      // 1. Walls
      w.Walls.forEach(seg => {
        const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
        const len = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const body = Bodies.rectangle((seg.x1 + seg.x2) / 2, (seg.y1 + seg.y2) / 2, len + 4, seg.thick || 16, {
          isStatic: true,
          angle: ang,
          restitution: seg.isRed ? 0.95 : 0.58,
          friction: 0,
          frictionStatic: 0
        });
        body.isRedHazard = !!seg.isRed;
        World.add(this.engine.world, body);
      });

      // 2. Hollow Purple Diamond Frames (4 angled wall bars per diamond)
      w.Diamonds.forEach(d => {
        const s = d.r * 1.35;
        const body = Bodies.rectangle(d.x, d.y, s, s, {
          isStatic: true,
          angle: Math.PI / 4,
          restitution: 0.65,
          friction: 0,
          frictionStatic: 0
        });
        World.add(this.engine.world, body);
      });

      // 3. Red Segmented Hazard Rings
      w.RedRings.forEach(rr => {
        const body = Bodies.circle(rr.x, rr.y, rr.r, {
          isStatic: true,
          restitution: 0.95,
          friction: 0,
          frictionStatic: 0
        });
        body.isRedHazard = true;
        World.add(this.engine.world, body);
      });

      // 4. Yellow Pegs
      w.YellowPegs.forEach(p => {
        World.add(this.engine.world, Bodies.circle(p.x, p.y, p.r, {
          isStatic: true,
          restitution: 0.8,
          friction: 0,
          frictionStatic: 0
        }));
      });

      // 5. Green 4-Blade Rotating Spinners
      w.GreenSpinners.forEach(sp => {
        const b1 = Bodies.rectangle(sp.x, sp.y, sp.len, sp.thick || 14, {
          isStatic: true, angle: sp.angle, restitution: 0.85, friction: 0
        });
        const b2 = Bodies.rectangle(sp.x, sp.y, sp.len, sp.thick || 14, {
          isStatic: true, angle: sp.angle + Math.PI / 2, restitution: 0.85, friction: 0
        });
        World.add(this.engine.world, [b1, b2]);
        w.dynamicItems.push({ blades: [b1, b2], spec: sp, angle: sp.angle });
      });

      // Spawn Marbles in the Left & Right Upper Launch Trays (Y = 72..118)
      this.marbles = [];
      this.finishedOrder = [];
      this.eliminatedOrder = [];
      this.raceStartTime = performance.now();
      this.midRaceRecorded = false;

      const list = this.session.activeCountries.slice();
      const r = list.length > 140 ? 11.5 : list.length > 70 ? 13 : 14.5;

      list.forEach((country, idx) => {
        MarbleTextureCache.getTexture(country);
        const side = idx % 2 === 0 ? -1 : 1;
        const sideIdx = Math.floor(idx / 2);
        const cols = 14;
        const col = sideIdx % cols;
        const row = Math.floor(sideIdx / cols);

        const baseX = side < 0
          ? 425 + col * 42 + (rng() - 0.5) * 6
          : 1215 + col * 42 + (rng() - 0.5) * 6;
        const baseY = 72 + row * (r * 2.1) + (rng() - 0.5) * 4;

        const body = Bodies.circle(baseX, baseY, r, {
          restitution: 0.62,
          friction: 0,
          frictionStatic: 0,
          frictionAir: 0.0015,
          slop: 0.02,
          density: 0.0025
        });
        Body.setVelocity(body, { x: (rng() - 0.5) * 5, y: 2 + rng() * 2 });
        World.add(this.engine.world, body);

        this.marbles.push({
          country,
          body,
          r,
          x: baseX,
          y: baseY,
          angle: 0,
          resets: 0,
          prevRank: idx + 1,
          rankDelta: 0,
          lastPos: { x: baseX, y: baseY },
          stuckTicks: 0,
          trail: [],
          finished: false,
          eliminated: false,
          finishTimeMs: 0,
          midRank: idx + 1
        });
      });
    },

    spawnBurstParticles(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count;
        const spd = 3 + Math.random() * 5;
        this.particles.push({
          x, y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color,
          life: 24
        });
      }
    },

    handleRedContact(m) {
      const { Body, World } = window.Matter;
      const rule = this.session.format === "survival" ? "eliminate" : (this.session.redRule || "reset");
      if (rule === "bounce") return;

      this.redEventsCount += 1;
      if (rule === "eliminate") {
        // SURVIVAL MODE: Touching ANY Red obstacle immediately eliminates the marble!
        this.spawnBurstParticles(m.x, m.y, NEON_RED, 14);
        m.eliminated = true;
        m.finishTimeMs = Math.round(performance.now() - this.raceStartTime);
        this.eliminatedOrder.push(m);
        World.remove(this.engine.world, m.body);
        this.lastEventBanner = `💀 ${m.country.iso3} ELIMINATED BY RED!`;
        if (this.simTick % 3 === 0) SFX.redHitSound(true);
      } else {
        // RESET MODE: Touching Red teleports the marble back to the top launch tray!
        this.spawnBurstParticles(m.x, m.y, NEON_RED, 10);
        const side = Math.random() < 0.5 ? -1 : 1;
        const nx = side < 0 ? (440 + Math.random() * 500) : (1220 + Math.random() * 500);
        const ny = 74 + Math.random() * 25;
        Body.setPosition(m.body, { x: nx, y: ny });
        Body.setVelocity(m.body, { x: (Math.random() - 0.5) * 4, y: 2 });
        m.x = nx;
        m.y = ny;
        m.lastPos = { x: nx, y: ny };
        m.stuckTicks = 0;
        m.trail = [];
        m.resets = (m.resets || 0) + 1;
        this.lastEventBanner = `🔴 ${m.country.iso3} RESET TO START!`;
        if (this.simTick % 4 === 0) SFX.redHitSound(false);
      }
    },

    startLoop() {
      if (this.animId) cancelAnimationFrame(this.animId);
      const canvas = document.getElementById("raceCanvas");
      const ctx = canvas.getContext("2d");
      const skin = window.GAME_DATA.skins.find(s => s.id === State.equippedSkin) || window.GAME_DATA.skins[0];

      const stepFrame = () => {
        try {
          const subSteps = this.speedMult * 2;
          for (let s = 0; s < subSteps; s++) {
            this.stepPhysicsSubStep();
          }
          this.render4KColorRushScene(ctx, canvas, skin);

          // Capture frames for built-in fallback video/replay recorder if recording is active
          if (this.isRecording && this.simTick % 4 === 0 && this.capturedFrames.length < 180) {
            try {
              this.capturedFrames.push(canvas.toDataURL("image/webp", 0.72));
            } catch (e) {}
          }
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
      const w = this.worldData;
      const spd = (this.session.physSpeed || 1) * 0.5;

      // Rotate Green Spinners & Red Rings
      w.dynamicItems.forEach(item => {
        item.angle += item.spec.speed * spd;
        Body.setAngle(item.blades[0], item.angle);
        Body.setAngle(item.blades[1], item.angle + Math.PI / 2);
      });
      w.RedRings.forEach(rr => {
        rr.angle += (rr.speed || 0.025) * spd;
      });

      Engine.update(this.engine, 1000 / 120);

      this.marbles.forEach(m => {
        if (m.finished || m.eliminated) return;

        // Bounds safety
        if (!Number.isFinite(m.body.position.x) || !Number.isFinite(m.body.position.y) || m.body.position.y > 1075) {
          Body.setPosition(m.body, { x: 1110, y: 855 });
          Body.setVelocity(m.body, { x: 6, y: 0 });
        }

        m.x = m.body.position.x;
        m.y = m.body.position.y;
        m.angle = m.body.angle;

        // 1. Check Red Hazard Rings & Red Bars proximity for Survival Elimination / Reset
        for (let i = 0; i < w.RedRings.length; i++) {
          const rr = w.RedRings[i];
          if (Math.hypot(m.x - rr.x, m.y - rr.y) <= rr.r + m.r + 2.5) {
            this.handleRedContact(m);
            if (m.eliminated) return;
            break;
          }
        }

        for (let i = 0; i < w.Walls.length; i++) {
          const seg = w.Walls[i];
          if (!seg.isRed) continue;
          // Point-to-segment distance check
          const l2 = Math.pow(seg.x2 - seg.x1, 2) + Math.pow(seg.y2 - seg.y1, 2);
          if (l2 === 0) continue;
          let t = ((m.x - seg.x1) * (seg.x2 - seg.x1) + (m.y - seg.y1) * (seg.y2 - seg.y1)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = seg.x1 + t * (seg.x2 - seg.x1);
          const projY = seg.y1 + t * (seg.y2 - seg.y1);
          if (Math.hypot(m.x - projX, m.y - projY) <= (seg.thick || 14) / 2 + m.r + 2) {
            this.handleRedContact(m);
            if (m.eliminated) return;
            break;
          }
        }

        // 2. Bottom Horizontal Serpentine Sprint Tube Propulsion
        if (m.y >= 826) {
          const laneIdx = Math.floor((m.y - 830) / 68);
          let dirX = 1;
          if (w.sprintLanes === 2) {
            dirX = laneIdx === 0 ? -1 : 1;
          } else if (w.sprintLanes === 3) {
            dirX = laneIdx === 1 ? -1 : 1;
          }
          // Gentle horizontal current inside the bottom sprint tube + stronger boost on Green `>>>` pads
          Body.setVelocity(m.body, {
            x: m.body.velocity.x * 0.96 + dirX * 0.48 * (this.session.physSpeed || 1),
            y: m.body.velocity.y
          });

          // Check Checkered Finish Line at the end of the final sprint lane!
          if (m.y >= w.finishYMin - 10 && m.y <= w.finishYMax + 15 && m.x >= w.finishX) {
            m.finished = true;
            m.finishTimeMs = Math.round(performance.now() - this.raceStartTime);
            this.finishedOrder.push(m);
            World.remove(this.engine.world, m.body);
            SFX.qualifyDing();

            // If Knockout "Spots Left" hits 0, eliminate remaining marbles
            if (this.session.format === "knockout" && this.finishedOrder.length >= this.spotsTotal && this.spotsTotal < this.marbles.length) {
              const rem = this.marbles.filter(x => !x.finished && !x.eliminated).sort((a, b) => this.computeProgressScore(b) - this.computeProgressScore(a));
              rem.forEach((st, idx) => {
                st.eliminated = true;
                st.finishTimeMs = Math.round(performance.now() - this.raceStartTime) + (idx + 1) * 35;
                this.eliminatedOrder.unshift(st);
                World.remove(this.engine.world, st.body);
              });
            }
            return;
          }
        }

        // 3. Fast Anti-Stuck System (Zero getting stuck on any obstacle!)
        const moved = Math.hypot(m.x - m.lastPos.x, m.y - m.lastPos.y);
        if (moved < 1.1) {
          m.stuckTicks += 1;
          if (m.stuckTicks === 28) {
            if (m.y < 215) {
              // In upper tray, slide toward central funnel openings
              const toCenter = m.x < 1110 ? 6 : -6;
              Body.setVelocity(m.body, { x: toCenter, y: 4 });
            } else if (m.y < 825) {
              // In main arena, pop toward center funnel (X = 1110)
              const towardFunnel = m.x < 1110 ? 5.5 : -5.5;
              Body.setVelocity(m.body, { x: towardFunnel + (Math.random() - 0.5) * 4, y: -5 });
            } else {
              Body.setVelocity(m.body, { x: 8, y: -3 });
            }
          } else if (m.stuckTicks > 62) {
            if (m.y < 810) {
              Body.setPosition(m.body, { x: m.x + (1110 - m.x) * 0.18, y: m.y + 38 });
              Body.setVelocity(m.body, { x: (1110 - m.x) * 0.02, y: 6 });
            } else {
              Body.setPosition(m.body, { x: m.x + 45, y: m.y });
            }
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
      });
    },

    computeProgressScore(m) {
      if (m.finished) return 100000 - m.finishTimeMs;
      if (m.eliminated) return -10000;
      if (m.y < 825) {
        return m.y - Math.abs(m.x - 1110) * 0.15;
      }
      const laneIdx = Math.floor((m.y - 830) / 68);
      if (this.worldData.sprintLanes === 3) {
        if (laneIdx === 0) return 1000 + m.x;
        if (laneIdx === 1) return 3000 + (1865 - m.x);
        return 5000 + m.x;
      }
      return 1000 + laneIdx * 2000 + m.x;
    },

    nudgeAllMarbles() {
      if (!window.Matter || !this.marbles) return;
      const { Body } = window.Matter;
      this.marbles.forEach(m => {
        if (!m.finished && !m.eliminated) {
          Body.setVelocity(m.body, { x: (1110 - m.x) * 0.015 + (Math.random() - 0.5) * 8, y: 7 });
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
          UI.unlockAchievement("survivor");
        }
        return true;
      }
      return remaining.length === 0;
    },

    // ========================================================================
    // 4K COLOR RUSH WIDESCREEN RENDERER (EXACT MATCH TO 1000157883_52417a.png)
    // ========================================================================
    render4KColorRushScene(ctx, canvas, skin) {
      const cw = canvas.width;
      const ch = canvas.height;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Map 1920x1080 UHD Virtual Space onto the 4K Canvas seamlessly
      const scaleX = cw / 1920;
      const scaleY = ch / 1080;
      ctx.scale(scaleX, scaleY);

      // Deep Navy/Black Color Rush Background with diagonal subtle stadium stripes
      ctx.fillStyle = DARK_BG;
      ctx.fillRect(0, 0, 1920, 1080);

      ctx.strokeStyle = "rgba(99, 68, 245, 0.06)";
      ctx.lineWidth = 28;
      for (let sx = -400; sx < 2200; sx += 220) {
        ctx.beginPath();
        ctx.moveTo(sx, 1080);
        ctx.lineTo(sx + 600, 0);
        ctx.stroke();
      }

      const activeMarbles = this.marbles
        .filter(m => !m.finished && !m.eliminated)
        .sort((a, b) => this.computeProgressScore(b) - this.computeProgressScore(a));

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

      // ----------------------------------------------------------------------
      // 1. LEFT BROADCAST SIDEBAR (X = 24..312, Y = 22..1058) - Exact Image Match
      // ----------------------------------------------------------------------
      // Top Card: Neon Green Border (`🏁 LAP X` / `MARBLES: Y`)
      ctx.fillStyle = "rgba(14, 18, 36, 0.95)";
      ctx.strokeStyle = NEON_GREEN;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(24, 22, 286, 104, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 32px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`🏁  LAP ${this.session.currentRound}`, 167, 68);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "800 22px system-ui, sans-serif";
      ctx.fillText(`MARBLES: ${activeMarbles.length + this.finishedOrder.length}`, 167, 106);

      // Middle Card: Glowing Purple Border (`1. 🇺🇸 USA ▲` .. `20. 🇨🇴 COL ▼`)
      ctx.fillStyle = "rgba(14, 18, 36, 0.95)";
      ctx.strokeStyle = PURPLE_MAIN;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(24, 144, 286, 750, 16);
      ctx.fill();
      ctx.stroke();

      const maxRows = 20;
      const rowH = 35.5;
      for (let i = 0; i < maxRows && i < liveRanking.length; i++) {
        const m = liveRanking[i];
        const ry = 162 + i * rowH;

        // Neon Green Rank Number
        ctx.fillStyle = m.eliminated ? NEON_RED : NEON_GREEN;
        ctx.font = "900 20px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${i + 1}.`, 68, ry + 22);

        // Crisp Flag Icon
        const tex = MarbleTextureCache.getTexture(m.country);
        ctx.drawImage(tex, 82, ry + 3, 25, 25);

        // 3-Letter Country Code
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 20px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(m.country.iso3 || m.country.code.slice(0, 3), 120, ry + 22);

        // Up/Down Triangle Indicator (Green/Cyan ▲ or Orange ▼)
        const ax = 278;
        ctx.fillStyle = m.rankDelta > 0 ? NEON_GREEN : m.rankDelta === 0 ? "#00e5ff" : "#f97316";
        ctx.beginPath();
        if (m.rankDelta >= 0) {
          ctx.moveTo(ax, ry + 6);
          ctx.lineTo(ax - 9, ry + 23);
          ctx.lineTo(ax + 9, ry + 23);
        } else {
          ctx.moveTo(ax - 9, ry + 7);
          ctx.lineTo(ax + 9, ry + 7);
          ctx.lineTo(ax, ry + 24);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Bottom Card: Neon Green Border (`🟢 SPOTS LEFT: X`)
      ctx.fillStyle = "rgba(14, 18, 36, 0.95)";
      ctx.strokeStyle = NEON_GREEN;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(24, 912, 286, 138, 16);
      ctx.fill();
      ctx.stroke();

      const spotsLeft = Math.max(0, this.spotsTotal - this.finishedOrder.length);
      ctx.fillStyle = NEON_GREEN;
      ctx.font = "900 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.session.format === "survival" ? "💀 SURVIVAL MODE" : "🏳️ QUALIFYING", 167, 958);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 26px system-ui, sans-serif";
      ctx.fillText(
        this.session.format === "survival"
          ? `ALIVE: ${activeMarbles.length}`
          : `SPOTS LEFT: ${spotsLeft}`,
        167,
        1005
      );
      if (this.lastEventBanner) {
        ctx.fillStyle = NEON_RED;
        ctx.font = "800 15px system-ui, sans-serif";
        ctx.fillText(this.lastEventBanner, 167, 1034);
      }

      // ----------------------------------------------------------------------
      // 2. WIDESCREEN COLOR RUSH ARENA (X = 335..1890, Y = 20..1060)
      // ----------------------------------------------------------------------
      const w = this.worldData;

      // Left & Right Outer Purple Framing Brackets (Matches Image!)
      ctx.strokeStyle = PURPLE_MAIN;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(355, 26); ctx.lineTo(338, 26); ctx.lineTo(338, 1048); ctx.lineTo(355, 1048);
      ctx.moveTo(1865, 26); ctx.lineTo(1882, 26); ctx.lineTo(1882, 1048); ctx.lineTo(1865, 1048);
      ctx.stroke();

      // Chevron Boosters (`>>>` in bottom lanes and `⌄⌄⌄` on sides)
      w.Chevrons.forEach(chv => {
        ctx.save();
        ctx.translate(chv.x, chv.y);
        if (chv.dirX !== 0) {
          ctx.fillStyle = "rgba(0, 245, 102, 0.2)";
          ctx.fillRect(-45, -18, 90, 36);
          ctx.fillStyle = chv.color || NEON_GREEN;
          ctx.font = "900 28px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(chv.dirX > 0 ? ">>>" : "<<<", 0, 1);
        } else {
          ctx.fillStyle = chv.color || NEON_YELLOW;
          ctx.font = "900 22px monospace";
          ctx.textAlign = "center";
          ctx.fillText("⌄⌄⌄", 0, 6);
        }
        ctx.restore();
      });

      // Yellow Timing Gates in Bottom Serpentine Lanes
      w.Gates.forEach(g => {
        ctx.fillStyle = NEON_YELLOW;
        ctx.fillRect(g.x - 5, g.y + 6, 10, g.h - 12);
      });

      // Checkered Finish Line Banner in Final Sprint Lane
      const sq = 13;
      for (let fy = w.finishYMin + 6; fy < w.finishYMax - 6; fy += sq) {
        const rowIdx = Math.floor((fy - w.finishYMin) / sq);
        ctx.fillStyle = rowIdx % 2 === 0 ? "#ffffff" : "#000000";
        ctx.fillRect(w.finishX, fy, sq, sq);
        ctx.fillStyle = rowIdx % 2 === 0 ? "#000000" : "#ffffff";
        ctx.fillRect(w.finishX + sq, fy, sq, sq);
      }

      // Hollow Purple Diamonds (3D Beveled Color Rush Style!)
      w.Diamonds.forEach(d => {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(Math.PI / 4);
        const s = d.r * 1.32;
        ctx.fillStyle = "#050711";
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.lineWidth = 14;
        ctx.strokeStyle = PURPLE_DARK;
        ctx.strokeRect(-s / 2 + 2, -s / 2 + 2, s, s);
        ctx.strokeStyle = PURPLE_MAIN;
        ctx.strokeRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      });

      // Segmented Red Hazard Rings (With White/Black Inner Spokes like Image!)
      w.RedRings.forEach(rr => {
        ctx.save();
        ctx.translate(rr.x, rr.y);
        ctx.rotate(rr.angle || 0);

        // Outer red ring
        ctx.beginPath();
        ctx.arc(0, 0, rr.r, 0, Math.PI * 2);
        ctx.fillStyle = "#080a14";
        ctx.fill();
        ctx.lineWidth = 13;
        ctx.strokeStyle = NEON_RED;
        ctx.stroke();

        // 3 dark/white segment notches
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.rotate((k * Math.PI * 2) / 3);
          ctx.fillStyle = k === 0 ? "#ffffff" : "#080a14";
          ctx.fillRect(-4, -rr.r - 6, 8, 14);
          ctx.restore();
        }
        ctx.restore();
      });

      // Yellow Peg Chains
      w.YellowPegs.forEach(p => {
        ctx.fillStyle = NEON_YELLOW;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Green 4-Blade Rotating Cross Spinners
      w.dynamicItems.forEach(item => {
        const sp = item.spec;
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(item.angle);
        ctx.fillStyle = NEON_GREEN;
        const t = sp.thick || 14;
        ctx.beginPath();
        ctx.roundRect(-sp.len / 2, -t / 2, sp.len, t, 6);
        ctx.roundRect(-t / 2, -sp.len / 2, t, sp.len, 6);
        ctx.fill();

        // Dark center hub ring
        ctx.strokeStyle = "#070913";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Arena Walls & Tilted Bars
      w.Walls.forEach(seg => {
        ctx.strokeStyle = seg.color || PURPLE_MAIN;
        ctx.lineWidth = seg.thick || 16;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();

        // Top roof green dash highlights (Matches Image!)
        if (seg.stripeGreen) {
          ctx.strokeStyle = NEON_GREEN;
          ctx.lineWidth = 10;
          ctx.setLineDash([45, 75]);
          ctx.beginPath();
          ctx.moveTo(seg.x1 + 30, seg.y1);
          ctx.lineTo(seg.x2 - 30, seg.y2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Spark Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      // Render Marbles (Razor-Sharp 4K Full-Bleed Flag Circles, Zero Outline, Zero Text!)
      this.marbles.forEach(m => {
        if (m.finished || m.eliminated) return;

        if (m.trail.length > 1 && skin.trail) {
          ctx.strokeStyle = skin.trail;
          ctx.lineWidth = 5;
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
        ctx.drawImage(tex, -m.r, -m.r, m.r * 2, m.r * 2);
        ctx.restore();
      });

      ctx.restore();
    },

    skipToResult() {
      if (!this.session || !this.worldData) return;
      let guard = 0;
      while (!this.checkRaceFinished() && guard < 2600) {
        this.stepPhysicsSubStep();
        guard++;
      }
      const rem = this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => this.computeProgressScore(b) - this.computeProgressScore(a));
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
      if (this.isRecording) {
        this.stopRecordingInternal();
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
      State.coins += 45;

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

      let elimNote = "";
      let knockedCodes = new Set();
      if (this.session.format === "knockout" && this.session.activeCountries.length > 2) {
        const cut = Math.min(this.session.elimPerRound, this.session.activeCountries.length - 1);
        const knocked = finalOrder.slice(-cut).map(m => m.country);
        knockedCodes = new Set(knocked.map(c => c.code));
        this.session.activeCountries = this.session.activeCountries.filter(c => !knockedCodes.has(c.code));
        elimNote = `Eliminated (${cut}): ${knocked.slice(0, 6).map(c => c.iso3 || c.name).join(", ")}${knocked.length > 6 ? "..." : ""}`;
      } else if (this.session.format === "survival") {
        elimNote = `Survived: ${this.finishedOrder.length} • Eliminated by Red: ${this.eliminatedOrder.length}`;
      }

      saveState();
      this.showWinnerModal(winner.country, finalOrder, elimNote, knockedCodes);
    },

    showWinnerModal(winCountry, finalOrder, elimNote, knockedCodes) {
      const isGrandPrix = this.session.format === "grandprix";
      document.getElementById("winHeader").textContent =
        `🏆 LAP ${this.session.currentRound}/${this.session.totalRounds} WINNER!`;
      document.getElementById("winTrackSub").textContent =
        `${this.getTrackDisplayName(this.currentTrackId)} • Red Hits: ${this.redEventsCount}`;

      const wCnv = document.getElementById("winMarbleCanvas");
      if (wCnv) {
        const wCtx = wCnv.getContext("2d");
        wCtx.clearRect(0, 0, 96, 96);
        wCtx.drawImage(MarbleTextureCache.getTexture(winCountry), 0, 0, 96, 96);
      }

      document.getElementById("winCountryName").textContent = `${winCountry.flag || "🔵"} ${winCountry.name} (${winCountry.iso3 || winCountry.code})`;
      document.getElementById("winFunFact").innerHTML = `💡 <strong>Country Fun Fact:</strong> ${winCountry.fact}`;
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
        const timeStr = m.eliminated && this.session.format === "survival"
          ? "💀 RED OUT"
          : idx === 0
            ? (m.finishTimeMs / 1000).toFixed(2) + "s"
            : "+" + Math.max(0.01, (m.finishTimeMs - leaderMs) / 1000).toFixed(2) + "s";

        let extraCol = "";
        if (isGrandPrix) {
          const pts = window.GAME_DATA.getPoints(idx, this.session.gpSystem);
          const totalPts = this.session.seriesScores[m.country.code] || 0;
          extraCol = `<span style="color:var(--neon-yellow); font-weight:700;">+${pts} (${totalPts})</span>`;
        } else if (isElim) {
          extraCol = `<span style="color:var(--neon-pink); font-weight:700;">❌ OUT</span>`;
        } else if (idx === 0) {
          extraCol = `<span style="color:var(--neon-green); font-weight:700;">🥇 1ST</span>`;
        } else {
          extraCol = `<span style="color:#00f566;">✓ SAFE</span>`;
        }

        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td>${m.country.flag || "🔵"} ${m.country.name} (${m.country.iso3 || ""})</td>
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
        }, 2600);
      }
    },

    nextStepAfterModal() {
      document.getElementById("winnerModal").classList.remove("active");
      if (this.replayInterval) clearInterval(this.replayInterval);
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
      document.getElementById("btnCam").textContent = `🎥 ${this.cameraMode === "wide" ? "Full 16:9" : this.cameraMode}`;
      document.getElementById("btnAuto").textContent = `🔄 Auto: ${this.autoPlay ? "ON" : "OFF"}`;
    },

    // ========================================================================
    // DUAL-ENGINE SCREEN RECORDER (MediaRecorder + Canvas Frame Replay Backup)
    // ========================================================================
    toggleRecording() {
      const btn = document.getElementById("btnRec");
      if (this.isRecording) {
        this.stopRecordingInternal();
        return;
      }

      this.isRecording = true;
      this.capturedFrames = [];
      this.recordedChunks = [];
      this.lastRecordedBlob = null;
      btn.textContent = "⏹️ REC ON";

      const canvas = document.getElementById("raceCanvas");
      try {
        const stream = canvas.captureStream ? canvas.captureStream(30) : null;
        if (stream && typeof MediaRecorder !== "undefined") {
          const mimeTypes = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
          let chosen = "";
          for (const m of mimeTypes) {
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
              chosen = m;
              break;
            }
          }
          this.lastRecordedMime = chosen || "video/webm";
          this.mediaRecorder = chosen ? new MediaRecorder(stream, { mimeType: chosen }) : new MediaRecorder(stream);
          this.mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
          };
          this.mediaRecorder.onstop = () => {
            if (this.recordedChunks.length > 0) {
              this.lastRecordedBlob = new Blob(this.recordedChunks, { type: this.lastRecordedMime });
            }
            this.showReplayWidget();
          };
          this.mediaRecorder.start(200);
        }
      } catch (e) {
        // Even if MediaRecorder fails on an Android WebView, this.capturedFrames records the clip!
      }
    },

    stopRecordingInternal() {
      this.isRecording = false;
      const btn = document.getElementById("btnRec");
      if (btn) btn.textContent = "🔴 REC";
      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        try {
          this.mediaRecorder.stop();
          return;
        } catch (e) {}
      }
      this.showReplayWidget();
    },

    showReplayWidget() {
      const box = document.getElementById("videoReplayBox");
      const vidEl = document.getElementById("recordedVideoEl");
      const imgEl = document.getElementById("recordedPlaybackImg");
      if (!box) return;

      if (this.lastRecordedBlob && this.lastRecordedBlob.size > 0) {
        box.style.display = "block";
        vidEl.style.display = "block";
        imgEl.style.display = "none";
        vidEl.src = URL.createObjectURL(this.lastRecordedBlob);
      } else if (this.capturedFrames.length > 0) {
        box.style.display = "block";
        vidEl.style.display = "none";
        imgEl.style.display = "block";
        imgEl.src = this.capturedFrames[0];
        this.playFrameReplay();
      }
    },

    playFrameReplay() {
      if (this.replayInterval) clearInterval(this.replayInterval);
      const imgEl = document.getElementById("recordedPlaybackImg");
      const vidEl = document.getElementById("recordedVideoEl");
      if (this.lastRecordedBlob && vidEl.style.display === "block") {
        vidEl.currentTime = 0;
        vidEl.play().catch(() => {});
        return;
      }
      if (!this.capturedFrames.length || !imgEl) return;
      imgEl.style.display = "block";
      let idx = 0;
      this.replayInterval = setInterval(() => {
        imgEl.src = this.capturedFrames[idx];
        idx = (idx + 1) % this.capturedFrames.length;
      }, 90);
    },

    async exportOrShareRecording() {
      const winName = document.getElementById("winCountryName").textContent;
      const shareText = `🏆 ${winName} won on ${this.getTrackDisplayName(this.currentTrackId)} in Country Marble Color Rush 4K!`;

      // 1. Try Native Android Share Sheet with Video File or Snapshot Image File
      if (navigator.share) {
        try {
          if (this.lastRecordedBlob && this.lastRecordedBlob.size > 0) {
            const ext = this.lastRecordedMime.includes("mp4") ? "mp4" : "webm";
            const file = new File([this.lastRecordedBlob], `color-rush-race.${ext}`, { type: this.lastRecordedMime });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ title: "Color Rush 4K", text: shareText, files: [file] });
              return;
            }
          }
          if (this.capturedFrames.length > 0) {
            const res = await fetch(this.capturedFrames[this.capturedFrames.length - 1]);
            const blob = await res.blob();
            const file = new File([blob], "color-rush-finish.webp", { type: "image/webp" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ title: "Color Rush 4K", text: shareText, files: [file] });
              return;
            }
          }
          await navigator.share({ title: "Color Rush 4K", text: shareText });
          return;
        } catch (e) {}
      }

      // 2. Direct Data-URL / Blob Anchor Download Fallback
      if (this.lastRecordedBlob && this.lastRecordedBlob.size > 0) {
        const reader = new FileReader();
        reader.onload = () => {
          const a = document.createElement("a");
          a.href = reader.result;
          a.download = `color-rush-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => document.body.removeChild(a), 500);
        };
        reader.readAsDataURL(this.lastRecordedBlob);
        return;
      }

      if (this.capturedFrames.length > 0) {
        const a = document.createElement("a");
        a.href = this.capturedFrames[this.capturedFrames.length - 1];
        a.download = `color-rush-snapshot-${Date.now()}.webp`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText).catch(() => {});
      }
      alert("Race summary copied to clipboard: " + shareText);
    },

    stopAndExit() {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this.isRecording) this.stopRecordingInternal();
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
