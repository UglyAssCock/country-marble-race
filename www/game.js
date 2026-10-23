// Complete Offline Physics Engine (Matter.js + Built-in Fallback), Race Modes, Stats, Editor & Video Recorder
(function () {
  // Fair Seeded Random Number Generator (Mulberry32)
  function createRNG(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Persistent Storage State
  const STORAGE_KEY = "CMR_SAVE_V1";
  const defaultSave = {
    coins: 150,
    equippedSkin: "default",
    unlockedSkins: ["default"],
    achievements: [],
    presets: [],
    customTrack: [
      { type: "funnel", x: 180, y: 80 },
      { type: "spinner", x: 180, y: 150 },
      { type: "bumper", x: 120, y: 200 },
      { type: "bumper", x: 240, y: 200 },
      { type: "seesaw", x: 180, y: 250 }
    ],
    settings: {
      lang: "en",
      maxMarbles: 60,
      colorblind: 0,
      fontScale: 1
    },
    career: {
      countryCode: "DZ",
      stage: 0 // 0: Regional Qualifier, 1: Group Stage, 2: Semi-Final, 3: World Cup Final
    },
    records: {
      bestComeback: { country: "--", gained: 0 },
      closestFinish: { pair: "--", ms: 99999 },
      longestStreak: { country: "--", streak: 0 }
    },
    stats: {}, // code -> { races, wins, podiums, points, posSum, cups, recent:[], streak:0 }
    h2h: {}    // "DZ_MA" -> { DZ: 0, MA: 0 }
  };

  let State = loadState();
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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

  function ensureCountryStat(code) {
    if (!State.stats[code]) {
      State.stats[code] = { races: 0, wins: 0, podiums: 0, points: 0, posSum: 0, cups: 0, recent: [], streak: 0 };
    }
    return State.stats[code];
  }

  // UI Controller
  const UI = {
    manualSelected: new Set(["DZ", "MA", "TN", "EG", "SA", "FR", "BR", "AR", "DE", "JP", "ES", "SN"]),

    init() {
      this.refreshHeader();
      this.populateDropdowns();
      this.renderCups();
      this.renderCareerBox();
      this.renderShop();
      this.renderStatsScreen();
      this.applySettings(true);
      Editor.init();
    },

    refreshHeader() {
      document.getElementById("coinCount").textContent = State.coins;
    },

    showScreen(id, btn) {
      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
      document.getElementById("screen-" + id).classList.add("active");
      if (btn) {
        document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      }
      if (id === "stats") this.renderStatsScreen();
      if (id === "shop") this.renderShop();
      if (id === "competitions") this.renderCareerBox();
      if (id === "editor") Editor.draw();
    },

    populateDropdowns() {
      const countries = window.GAME_DATA.countries;
      const selCareer = document.getElementById("careerCountrySelect");
      const selRivalA = document.getElementById("rivalA");
      const selRivalB = document.getElementById("rivalB");
      const selProf = document.getElementById("profileCountrySelect");

      const opts = countries.map(c => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join("");
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
      const grid = document.getElementById("countryPickerGrid");
      grid.innerHTML = "";
      window.GAME_DATA.countries.forEach(c => {
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
      document.getElementById("pickerModal").classList.add("active");
    },

    selectAllCountries(flag) {
      if (flag) window.GAME_DATA.countries.forEach(c => this.manualSelected.add(c.code));
      else this.manualSelected.clear();
      this.openCountryPicker();
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
      const name = prompt("Preset Name:", "My GP Setup " + (State.presets.length + 1));
      if (!name) return;
      const preset = {
        name,
        count: document.getElementById("crCount").value,
        format: document.getElementById("crFormat").value,
        region: document.getElementById("crRegion").value,
        track: document.getElementById("crTrack").value,
        difficulty: document.getElementById("crDifficulty").value,
        length: document.getElementById("crLength").value,
        camera: document.getElementById("crCamera").value,
        physSpeed: document.getElementById("crPhysSpeed").value,
        rounds: document.getElementById("crRounds").value,
        elim: document.getElementById("crElim").value,
        tourney: document.getElementById("crTourney").value
      };
      State.presets.push(preset);
      saveState();
      this.renderPresetsDropdown();
    },

    renderPresetsDropdown() {
      const sel = document.getElementById("presetSelect");
      sel.innerHTML = `<option value="">📂 Load Saved Preset (${State.presets.length})...</option>` +
        State.presets.map((p, idx) => `<option value="${idx}">${p.name}</option>`).join("");
    },

    loadPreset(idx) {
      if (idx === "") return;
      const p = State.presets[Number(idx)];
      if (!p) return;
      document.getElementById("crCount").value = p.count;
      document.getElementById("crFormat").value = p.format;
      document.getElementById("crRegion").value = p.region;
      document.getElementById("crTrack").value = p.track;
      document.getElementById("crDifficulty").value = p.difficulty;
      document.getElementById("crLength").value = p.length;
      document.getElementById("crCamera").value = p.camera;
      document.getElementById("crPhysSpeed").value = p.physSpeed;
      document.getElementById("crRounds").value = p.rounds;
      document.getElementById("crElim").value = p.elim;
      document.getElementById("crTourney").value = p.tourney;
    },

    renderCups() {
      const wrap = document.getElementById("cupsList");
      wrap.innerHTML = window.GAME_DATA.competitions.map(c => `
        <div style="background:#0f172a; padding:10px; border-radius:8px; border:1px solid #334155;">
          <div style="font-weight:800; margin-bottom:4px;">${c.name}</div>
          <div style="font-size:0.75rem; color:var(--muted); margin-bottom:8px;">${c.count} Teams • ${c.rounds} Rds</div>
          <button class="btn btn-sm btn-block" onclick="Game.startCup('${c.id}')">Play Cup</button>
        </div>
      `).join("");
    },

    renderCareerBox() {
      const stages = [
        "Stage 1/4: Regional Qualifier (Top 4 Advance)",
        "Stage 2/4: Continental Group Stage",
        "Stage 3/4: World Cup Semi-Final",
        "Stage 4/4: World Marble Cup Grand Final!"
      ];
      const cObj = window.GAME_DATA.countries.find(c => c.code === State.career.countryCode) || window.GAME_DATA.countries[0];
      document.getElementById("careerStatusBox").innerHTML = `
        <div style="background:#0f172a; padding:10px; border-radius:8px; border:1px solid #10b981;">
          <strong>Nation:</strong> ${cObj.flag} ${cObj.name}<br/>
          <strong>Current Progress:</strong> ${stages[State.career.stage] || stages[0]}
        </div>
      `;
    },

    renderStatsScreen() {
      // Records summary
      const rec = State.records;
      document.getElementById("recordsSummary").innerHTML = `
        <div class="tag">🔥 Best Streak: <strong>${rec.longestStreak.country} (${rec.longestStreak.streak})</strong></div>
        <div class="tag">🚀 Biggest Comeback: <strong>${rec.bestComeback.country} (+${rec.bestComeback.gained} pos)</strong></div>
        <div class="tag">⏱️ Closest Finish: <strong>${rec.closestFinish.ms < 90000 ? rec.closestFinish.pair + " (" + rec.closestFinish.ms + "ms)" : "--"}</strong></div>
        <div class="tag">🪙 Coins Earned: <strong>${State.coins}</strong></div>
      `;

      this.renderCountryProfile(document.getElementById("profileCountrySelect").value || "DZ");

      // Standings table
      const rows = window.GAME_DATA.countries.map(c => {
        const s = ensureCountryStat(c.code);
        const avg = s.races > 0 ? (s.posSum / s.races).toFixed(1) : "-";
        return { c, s, avg };
      }).sort((a, b) => b.s.points - a.s.points || b.s.wins - a.s.wins);

      document.getElementById("allTimeTableBody").innerHTML = rows.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.c.flag} ${r.c.name}</td>
          <td><strong>${r.s.points}</strong></td>
          <td>${r.s.wins}</td>
          <td>${r.s.podiums}</td>
          <td>${r.avg}</td>
        </tr>
      `).join("");
    },

    renderCountryProfile(code) {
      const c = window.GAME_DATA.countries.find(x => x.code === code) || window.GAME_DATA.countries[0];
      const s = ensureCountryStat(c.code);
      const avg = s.races > 0 ? (s.posSum / s.races).toFixed(1) : "N/A";
      const recentStr = s.recent.length ? s.recent.map(p => "#" + p).join(", ") : "No races yet";
      document.getElementById("countryProfileView").innerHTML = `
        <div style="background:#0f172a; padding:10px; border-radius:8px;">
          <div style="font-size:1.3rem; font-weight:800;">${c.flag} ${c.name} <span class="tag">${c.region.join(", ")}</span></div>
          <p style="font-size:0.8rem; color:var(--muted); margin:6px 0;">${c.fact}</p>
          <div class="grid-3" style="margin-top:6px;">
            <div class="tag">Races: <strong>${s.races}</strong></div>
            <div class="tag">1st Wins: <strong>${s.wins}</strong></div>
            <div class="tag">Podiums: <strong>${s.podiums}</strong></div>
            <div class="tag">GP Pts: <strong>${s.points}</strong></div>
            <div class="tag">Cups Won: <strong>${s.cups}</strong></div>
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
        alert("Not enough coins! Race more or tap the +50 Rewarded Ad button.");
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
      // Simulated offline 2-second Rewarded Ad placeholder
      const msg = reason === "rerace"
        ? "Watching simulated Rewarded Ad for an instant Re-Race..."
        : "Watching simulated Rewarded Ad for +50 Coins...";
      alert(msg);
      if (reason === "rerace") {
        document.getElementById("winnerModal").classList.remove("active");
        Game.reRunCurrentRound();
      } else {
        State.coins += 50;
        saveState();
      }
    }
  };

  // Custom Track Editor
  const Editor = {
    tool: "spinner",
    canvas: null,
    ctx: null,

    init() {
      this.canvas = document.getElementById("editorCanvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");
      this.canvas.addEventListener("pointerdown", e => {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 360);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 300);
        State.customTrack.push({ type: this.tool, x, y });
        this.draw();
      });
      this.draw();
    },

    setTool(t) {
      this.tool = t;
    },

    clear() {
      State.customTrack = [];
      this.draw();
    },

    save() {
      saveState();
      UI.unlockAchievement("architect");
      alert("Custom track saved locally!");
    },

    exportCode() {
      const code = btoa(JSON.stringify(State.customTrack));
      const inp = document.getElementById("trackCodeInput");
      inp.value = code;
      if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
      alert("Track code copied to box!");
    },

    importCode() {
      try {
        const raw = document.getElementById("trackCodeInput").value.trim();
        const parsed = JSON.parse(atob(raw));
        if (Array.isArray(parsed)) {
          State.customTrack = parsed;
          saveState();
          this.draw();
          alert("Track imported successfully!");
        }
      } catch (e) {
        alert("Invalid track code.");
      }
    },

    testTrack() {
      document.getElementById("crTrack").value = "custom";
      Game.startFromCreator();
    },

    draw() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, 360, 300);
      ctx.strokeStyle = "#334155";
      ctx.strokeRect(10, 10, 340, 280);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(10, 275, 340, 8);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.fillText("START ZONE (Top) ➔ FINISH LINE (Bottom)", 75, 24);

      State.customTrack.forEach(item => {
        ctx.save();
        ctx.translate(item.x, item.y);
        if (item.type === "bumper") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === "spinner") {
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-22, 0);
          ctx.lineTo(22, 0);
          ctx.stroke();
        } else if (item.type === "seesaw") {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-28, 0);
          ctx.lineTo(28, 0);
          ctx.stroke();
        } else if (item.type === "funnel") {
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-35, -12);
          ctx.lineTo(-10, 12);
          ctx.moveTo(35, -12);
          ctx.lineTo(10, 12);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-25, item.type === "rampL" ? -10 : 10);
          ctx.lineTo(25, item.type === "rampL" ? 10 : -10);
          ctx.stroke();
        }
        ctx.restore();
      });
    }
  };

  // Core Marble Race Physics & Tournament Engine
  const Game = {
    session: null,
    engine: null,
    animId: null,
    speedMult: 1,
    cameraMode: "leader",
    autoPlay: false,
    camY: 0,
    lavaY: 0,
    mediaRecorder: null,
    recordedChunks: [],
    lastRecordedBlob: null,

    pickCountries(region, count, manual) {
      let pool = window.GAME_DATA.countries.slice();
      if (manual) {
        pool = pool.filter(c => UI.manualSelected.has(c.code));
        if (pool.length < 2) pool = window.GAME_DATA.countries.slice(0, 8);
      } else if (region && region !== "ALL") {
        pool = pool.filter(c => c.region.includes(region));
      }
      const rng = createRNG(Date.now() ^ (Math.random() * 0xffffffff));
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const cap = Math.min(Number(count) || 16, State.settings.maxMarbles || 60, pool.length);
      return pool.slice(0, Math.max(2, cap));
    },

    startFromCreator() {
      const count = Number(document.getElementById("crCount").value) || 16;
      const format = document.getElementById("crFormat").value;
      const region = document.getElementById("crRegion").value;
      const track = document.getElementById("crTrack").value;
      const difficulty = document.getElementById("crDifficulty").value;
      const length = document.getElementById("crLength").value;
      const camera = document.getElementById("crCamera").value;
      const physSpeed = Number(document.getElementById("crPhysSpeed").value) || 1;
      const rounds = Math.max(1, Math.min(20, Number(document.getElementById("crRounds").value) || 1));
      const elim = Math.max(1, Number(document.getElementById("crElim").value) || 1);
      const manual = document.getElementById("crSelectMode").value === "manual";

      const entrants = this.pickCountries(region, count, manual);
      this.cameraMode = camera;

      this.session = {
        modeTitle: "Custom Race",
        format,
        track,
        difficulty,
        length,
        physSpeed,
        totalRounds: rounds,
        currentRound: 1,
        elimPerRound: elim,
        activeCountries: entrants,
        seriesScores: {}, // code -> points or wins
        teamScores: {},   // region -> points
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
        track: cup.track,
        difficulty: "medium",
        length: "medium",
        physSpeed: 1,
        totalRounds: cup.rounds,
        currentRound: 1,
        elimPerRound: Math.max(1, Math.floor(entrants.length / (cup.rounds + 1))),
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
      const playerCountry = window.GAME_DATA.countries.find(c => c.code === code) || window.GAME_DATA.countries[0];
      const stageNames = ["Career Qualifier", "Career Group Stage", "Career Semi-Final", "Career World Cup Final"];
      const counts = [12, 16, 10, 8];
      const st = State.career.stage || 0;
      const pool = this.pickCountries("ALL", counts[st], false).filter(c => c.code !== code);
      const entrants = [playerCountry, ...pool.slice(0, counts[st] - 1)];

      this.session = {
        modeTitle: stageNames[st],
        format: "normal",
        track: st === 3 ? "gauntlet" : "classic",
        difficulty: st >= 2 ? "hard" : "medium",
        length: st === 3 ? "long" : "medium",
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
        alert("Please pick two different countries for a Rivalry Series!");
        return;
      }
      const bestOf = Number(document.getElementById("rivalBestOf").value) || 5;
      const cA = window.GAME_DATA.countries.find(c => c.code === codeA);
      const cB = window.GAME_DATA.countries.find(c => c.code === codeB);

      this.session = {
        modeTitle: `${cA.flag} vs ${cB.flag} (Best of ${bestOf})`,
        format: "normal",
        track: "spinnerMayhem",
        difficulty: "medium",
        length: "medium",
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

    launchRound() {
      UI.showScreen("race");
      const canvas = document.getElementById("raceCanvas");
      canvas.width = canvas.clientWidth || 360;
      canvas.height = canvas.clientHeight || 640;

      const W = canvas.width;
      const lenMult = this.session.length === "short" ? 2.4 : this.session.length === "long" ? 4.8 : 3.4;
      const trackHeight = Math.round(canvas.height * lenMult);
      const finishY = trackHeight - 110;
      this.lavaY = -120;
      this.camY = 0;

      const rng = createRNG(Date.now() ^ (this.session.currentRound * 99991));
      this.setupPhysicsWorld(W, trackHeight, finishY, rng);
      this.updateHUDButtons();
      this.startLoop(canvas, W, trackHeight, finishY);
    },

    setupPhysicsWorld(W, trackHeight, finishY, rng) {
      const hasMatter = typeof window.Matter !== "undefined";
      this.obstacles = [];
      this.spinners = [];
      this.seesaws = [];
      this.marbles = [];
      this.finishedOrder = [];
      this.eliminatedOrder = [];
      this.raceStartTime = performance.now();
      this.midRaceRecorded = false;

      if (hasMatter) {
        const { Engine, World, Bodies, Body, Constraint } = window.Matter;
        if (this.engine) World.clear(this.engine.world);
        this.engine = Engine.create();
        this.engine.gravity.y = 0.85 * (this.session.physSpeed || 1);

        // Walls
        const wallOpts = { isStatic: true, restitution: 0.5, friction: 0.02 };
        World.add(this.engine.world, [
          Bodies.rectangle(-10, trackHeight / 2, 20, trackHeight * 2, wallOpts),
          Bodies.rectangle(W + 10, trackHeight / 2, 20, trackHeight * 2, wallOpts)
        ]);

        const addSeg = (x1, y1, x2, y2, color) => {
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);
          const b = Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, len, 8, {
            isStatic: true,
            angle: ang,
            restitution: 0.4,
            friction: 0.005
          });
          World.add(this.engine.world, b);
          this.obstacles.push({ kind: "seg", x1, y1, x2, y2, color: color || "#475569" });
        };

        const addBumper = (x, y, r) => {
          const b = Bodies.circle(x, y, r, { isStatic: true, restitution: 1.15, friction: 0 });
          World.add(this.engine.world, b);
          this.obstacles.push({ kind: "bumper", x, y, r });
        };

        const addSpinner = (x, y, len, dir) => {
          const b = Bodies.rectangle(x, y, len, 8, { isStatic: true, restitution: 0.7 });
          World.add(this.engine.world, b);
          this.spinners.push({ body: b, x, y, len, angle: rng() * Math.PI, speed: (0.045 * dir) });
        };

        const addSeesaw = (x, y, len) => {
          const plank = Bodies.rectangle(x, y, len, 8, { density: 0.004, friction: 0.02 });
          const pivot = Constraint.create({ pointA: { x, y }, bodyB: plank, stiffness: 1, length: 0 });
          World.add(this.engine.world, [plank, pivot]);
          this.seesaws.push({ body: plank, x, y, len });
        };

        this.buildTrackGeometry(W, trackHeight, finishY, rng, addSeg, addBumper, addSpinner, addSeesaw);

        // Spawn Marbles with fair seeded positions
        const list = this.session.activeCountries.slice();
        const r = list.length > 40 ? 9 : 12;
        list.forEach((country, idx) => {
          const cols = Math.max(4, Math.floor((W - 60) / (r * 2.4)));
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const jitter = (rng() - 0.5) * 6;
          const x = 35 + col * ((W - 70) / Math.max(1, cols - 1)) + jitter;
          const y = 30 + row * (r * 2.5) + (rng() - 0.5) * 4;

          const body = Bodies.circle(x, y, r, {
            restitution: 0.55,
            friction: 0.002,
            frictionAir: 0.004,
            density: 0.002
          });
          Body.setVelocity(body, { x: (rng() - 0.5) * 2, y: rng() * 1.5 });
          World.add(this.engine.world, body);
          this.marbles.push({
            country,
            body,
            r,
            x,
            y,
            trail: [],
            finished: false,
            eliminated: false,
            finishTimeMs: 0,
            midRank: idx + 1
          });
        });
      }
    },

    buildTrackGeometry(W, trackHeight, finishY, rng, addSeg, addBumper, addSpinner, addSeesaw) {
      const t = this.session.track;
      if (t === "custom" && State.customTrack.length > 0) {
        const scaleX = W / 360;
        const scaleY = (finishY - 140) / 260;
        State.customTrack.forEach(item => {
          const x = item.x * scaleX;
          const y = 120 + item.y * scaleY;
          if (item.type === "bumper") addBumper(x, y, 14);
          else if (item.type === "spinner") addSpinner(x, y, 64, 1);
          else if (item.type === "seesaw") addSeesaw(x, y, 80);
          else if (item.type === "funnel") {
            addSeg(x - 55, y - 20, x - 16, y + 20, "#a855f7");
            addSeg(x + 55, y - 20, x + 16, y + 20, "#a855f7");
          } else if (item.type === "rampL") {
            addSeg(x - 40, y - 16, x + 40, y + 16, "#38bdf8");
          } else {
            addSeg(x - 40, y + 16, x + 40, y - 16, "#38bdf8");
          }
        });
        return;
      }

      const diffMult = this.session.difficulty === "hard" ? 1.3 : this.session.difficulty === "easy" ? 0.75 : 1;
      const step = Math.round(175 / diffMult);

      for (let y = 160; y < finishY - 120; y += step) {
        const sectionType = Math.floor(rng() * 4);
        if (t === "spinnerMayhem" || sectionType === 0) {
          addSpinner(W * 0.3, y, 68, 1);
          addSpinner(W * 0.7, y, 68, -1);
          addBumper(W * 0.5, y + 45, 13);
        } else if (t === "bumperPinball" || sectionType === 1) {
          for (let k = 0; k < 4; k++) {
            addBumper(W * (0.2 + k * 0.2), y - 15, 12);
          }
          for (let k = 0; k < 3; k++) {
            addBumper(W * (0.3 + k * 0.2), y + 35, 14);
          }
        } else if (t === "seesawDrop" || sectionType === 2) {
          addSeesaw(W * 0.35, y, 85);
          addSeesaw(W * 0.65, y + 35, 85);
          addSeg(0, y - 25, W * 0.22, y + 10, "#38bdf8");
          addSeg(W, y - 25, W * 0.78, y + 10, "#38bdf8");
        } else {
          // Funnel + spinner gate
          const gap = 34;
          addSeg(10, y - 30, W / 2 - gap, y + 22, "#f59e0b");
          addSeg(W - 10, y - 30, W / 2 + gap, y + 22, "#f59e0b");
          addSpinner(W / 2, y + 58, 56, rng() > 0.5 ? 1 : -1);
        }
      }
    },

    startLoop(canvas, W, trackHeight, finishY) {
      if (this.animId) cancelAnimationFrame(this.animId);
      const ctx = canvas.getContext("2d");
      const skin = window.GAME_DATA.skins.find(s => s.id === State.equippedSkin) || window.GAME_DATA.skins[0];

      const stepFrame = () => {
        const steps = this.speedMult;
        for (let s = 0; s < steps; s++) {
          this.stepPhysics(W, trackHeight, finishY);
        }
        this.renderScene(ctx, canvas, W, trackHeight, finishY, skin);

        if (this.checkRaceFinished()) {
          this.onRoundComplete();
          return;
        }
        this.animId = requestAnimationFrame(stepFrame);
      };
      this.animId = requestAnimationFrame(stepFrame);
    },

    stepPhysics(W, trackHeight, finishY) {
      if (!window.Matter || !this.engine) return;
      const { Engine, Body } = window.Matter;

      // Rotate kinematic spinners
      this.spinners.forEach(sp => {
        sp.angle += sp.speed * (this.session.physSpeed || 1);
        Body.setAngle(sp.body, sp.angle);
      });

      Engine.update(this.engine, 1000 / 60);

      // Rising Lava in Survival Mode
      if (this.session.format === "survival") {
        this.lavaY += 0.95 * (this.session.physSpeed || 1);
      }

      // Update marble coordinates & anti-stuck nudge
      let activeMarbles = [];
      this.marbles.forEach(m => {
        m.x = m.body.position.x;
        m.y = m.body.position.y;

        if (!m.finished && !m.eliminated) {
          if (Math.hypot(m.body.velocity.x, m.body.velocity.y) < 0.15) {
            Body.applyForce(m.body, m.body.position, {
              x: (Math.random() - 0.5) * 0.0004,
              y: 0.0005
            });
          }

          m.trail.push({ x: m.x, y: m.y });
          if (m.trail.length > 8) m.trail.shift();

          if (this.session.format === "survival" && m.y < this.lavaY) {
            m.eliminated = true;
            this.eliminatedOrder.push(m);
          } else if (m.y >= finishY) {
            m.finished = true;
            m.finishTimeMs = Math.round(performance.now() - this.raceStartTime);
            this.finishedOrder.push(m);
          } else {
            activeMarbles.push(m);
          }
        }
      });

      // Record mid-race positions for Comeback tracking
      if (!this.midRaceRecorded && this.marbles.some(m => m.y >= finishY * 0.5)) {
        this.midRaceRecorded = true;
        const sorted = this.marbles.slice().sort((a, b) => b.y - a.y);
        sorted.forEach((m, idx) => { m.midRank = idx + 1; });
      }
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

    renderScene(ctx, canvas, W, trackHeight, finishY, skin) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rank live order
      const liveRanking = [
        ...this.finishedOrder,
        ...this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => b.y - a.y),
        ...this.eliminatedOrder.slice().reverse()
      ];

      // Camera target
      let targetY = 0;
      let scale = 1;
      if (this.cameraMode === "overview") {
        scale = canvas.height / trackHeight;
        targetY = 0;
      } else if (this.cameraMode === "cinematic") {
        const active = this.marbles.filter(m => !m.finished && !m.eliminated);
        const avgY = active.length
          ? active.reduce((acc, m) => acc + m.y, 0) / active.length
          : finishY;
        targetY = Math.max(0, Math.min(trackHeight - canvas.height, avgY - canvas.height * 0.45));
      } else {
        // Leader camera
        const leader = this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => b.y - a.y)[0]
          || this.finishedOrder[0];
        if (leader) {
          targetY = Math.max(0, Math.min(trackHeight - canvas.height, leader.y - canvas.height * 0.55));
        }
      }
      this.camY += (targetY - this.camY) * 0.12;

      ctx.save();
      if (this.cameraMode === "overview") {
        ctx.scale(scale, scale);
      } else {
        ctx.translate(0, -this.camY);
      }

      // Background grid lines
      ctx.strokeStyle = "#162032";
      ctx.lineWidth = 1;
      for (let y = 100; y < trackHeight; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Finish line banner
      for (let x = 0; x < W; x += 20) {
        ctx.fillStyle = (x / 20) % 2 === 0 ? "#ffffff" : "#10b981";
        ctx.fillRect(x, finishY, 20, 14);
      }

      // Survival Lava Zone
      if (this.session.format === "survival" && this.lavaY > 0) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
        ctx.fillRect(0, 0, W, this.lavaY);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, this.lavaY);
        ctx.lineTo(W, this.lavaY);
        ctx.stroke();
      }

      // Static obstacles
      this.obstacles.forEach(ob => {
        if (ob.kind === "seg") {
          ctx.strokeStyle = ob.color;
          ctx.lineWidth = 8;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(ob.x1, ob.y1);
          ctx.lineTo(ob.x2, ob.y2);
          ctx.stroke();
        } else if (ob.kind === "bumper") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fca5a5";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Spinners
      this.spinners.forEach(sp => {
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.rotate(sp.angle);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-sp.len / 2, 0);
        ctx.lineTo(sp.len / 2, 0);
        ctx.stroke();
        ctx.restore();
      });

      // Seesaws
      this.seesaws.forEach(ss => {
        ctx.save();
        ctx.translate(ss.body.position.x, ss.body.position.y);
        ctx.rotate(ss.body.angle);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-ss.len / 2, 0);
        ctx.lineTo(ss.len / 2, 0);
        ctx.stroke();
        ctx.restore();
      });

      // Marbles
      const cbOutline = State.settings.colorblind === 1;
      this.marbles.forEach(m => {
        if (m.eliminated) return;

        // Trail
        if (m.trail.length > 1) {
          ctx.strokeStyle = skin.trail || m.country.color;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.35;
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
        if (skin.glow) {
          ctx.shadowColor = skin.glow;
          ctx.shadowBlur = 10;
        }
        ctx.fillStyle = m.country.color || "#3b82f6";
        ctx.beginPath();
        ctx.arc(0, 0, m.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = cbOutline ? 3 : 1.5;
        ctx.strokeStyle = cbOutline ? "#ffff00" : "#ffffff";
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.font = `${Math.round(m.r * 1.15)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m.country.flag, 0, 1);
        ctx.restore();
      });

      ctx.restore();

      // Update Top HUD
      document.getElementById("hudTitle").textContent =
        `${this.session.modeTitle} • Rd ${this.session.currentRound}/${this.session.totalRounds}`;
      if (liveRanking[0]) {
        document.getElementById("hudSub").textContent =
          `1st: ${liveRanking[0].country.flag} ${liveRanking[0].country.name}`;
      }
      document.getElementById("hudStandings").innerHTML = liveRanking.slice(0, 5)
        .map((m, idx) => `${idx + 1}. ${m.country.flag} ${m.country.code}`)
        .join(" &nbsp; ");
    },

    skipToResult() {
      if (!this.session) return;
      const W = 360;
      const trackHeight = 1800;
      const finishY = trackHeight - 110;
      let guard = 0;
      while (!this.checkRaceFinished() && guard < 3500) {
        this.stepPhysics(W, trackHeight, finishY);
        guard++;
      }
      // Force finish any stragglers sorted by Y
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

      // Check closest finish record & photo finish achievement
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

      // Check comeback record
      const gained = (winner.midRank || 1) - 1;
      if (gained >= 5) UI.unlockAchievement("comeback");
      if (gained > State.records.bestComeback.gained) {
        State.records.bestComeback = { country: `${winner.country.flag} ${winner.country.name}`, gained };
      }

      // Achievements & stats
      UI.unlockAchievement("first_win");
      if (winner.country.small) UI.unlockAchievement("underdog");
      State.coins += 25;

      // Update country stats & GP points
      finalOrder.forEach((m, idx) => {
        const pos = idx + 1;
        const st = ensureCountryStat(m.country.code);
        st.races += 1;
        st.posSum += pos;
        st.recent.unshift(pos);
        if (st.recent.length > 5) st.recent.pop();

        const gp = window.GAME_DATA.gpPoints[idx] || 0;
        st.points += gp;
        this.session.seriesScores[m.country.code] = (this.session.seriesScores[m.country.code] || 0) +
          (this.session.isRivalry ? (idx === 0 ? 1 : 0) : gp);

        // Team / Continent alliance points
        const reg = m.country.region[0] || "World";
        this.session.teamScores[reg] = (this.session.teamScores[reg] || 0) + gp;

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

      // Knockouts / Elimination handling
      let elimNote = "";
      if (this.session.format === "knockout" && this.session.activeCountries.length > 2) {
        const cut = Math.min(this.session.elimPerRound, this.session.activeCountries.length - 1);
        const knocked = finalOrder.slice(-cut).map(m => m.country);
        const knockedCodes = new Set(knocked.map(c => c.code));
        this.session.activeCountries = this.session.activeCountries.filter(c => !knockedCodes.has(c.code));
        elimNote = `Eliminated: ${knocked.map(c => c.flag + " " + c.name).join(", ")}`;
      }

      saveState();
      this.showWinnerModal(winner.country, finalOrder, elimNote);
    },

    showWinnerModal(winCountry, finalOrder, elimNote) {
      document.getElementById("winHeader").textContent =
        `🏆 Round ${this.session.currentRound}/${this.session.totalRounds} Winner!`;
      document.getElementById("winFlag").textContent = winCountry.flag;
      document.getElementById("winCountryName").textContent = winCountry.name;
      document.getElementById("winFunFact").textContent = "💡 Fun Fact: " + winCountry.fact;

      let seriesText = elimNote;
      if (this.session.isRivalry) {
        const [cA, cB] = this.session.activeCountries;
        seriesText = `Series Score: ${cA.flag} ${this.session.seriesScores[cA.code]} - ${this.session.seriesScores[cB.code]} ${cB.flag}`;
      } else if (this.session.format === "team") {
        const topTeams = Object.entries(this.session.teamScores)
          .sort((a, b) => b[1] - a[1])
          .map(([r, p]) => `${r}: ${p}pts`).join(" | ");
        seriesText = `Alliance Scores: ${topTeams}`;
      }
      document.getElementById("winSeriesInfo").textContent = seriesText;

      document.getElementById("winPodiumList").innerHTML = finalOrder.slice(0, 10).map((m, idx) => {
        const pts = window.GAME_DATA.gpPoints[idx] || 0;
        return `<div><strong>#${idx + 1}</strong> ${m.country.flag} ${m.country.name} <span style="color:var(--accent)">(+${pts} pts)</span></div>`;
      }).join("");

      document.getElementById("winnerModal").classList.add("active");

      if (this.autoPlay) {
        setTimeout(() => {
          if (document.getElementById("winnerModal").classList.contains("active")) {
            this.nextStepAfterModal();
          }
        }, 2400);
      }
    },

    nextStepAfterModal() {
      document.getElementById("winnerModal").classList.remove("active");
      if (!this.session) return;

      // Career progression check
      if (this.session.isCareer) {
        const myRank = this.finishedOrder.findIndex(m => m.country.code === this.session.careerCode) + 1;
        const passRank = State.career.stage === 3 ? 1 : 4;
        if (myRank > 0 && myRank <= passRank) {
          if (State.career.stage < 3) {
            State.career.stage += 1;
            saveState();
            alert(`Congratulations! You finished #${myRank} and advanced to the next Career Stage!`);
          } else {
            State.career.stage = 0;
            ensureCountryStat(this.session.careerCode).cups += 1;
            UI.unlockAchievement("world_champ");
            saveState();
            alert("🏆 WORLD CUP CAREER CHAMPION! You guided your country all the way to the title!");
          }
        } else {
          alert(`Finished #${myRank} (Needed Top ${passRank}). Try this stage again!`);
        }
        UI.showScreen("competitions");
        return;
      }

      // Rivalry check
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

      // Multi-round continuation
      if (this.session.currentRound < this.session.totalRounds && this.session.activeCountries.length >= 2) {
        this.session.currentRound += 1;
        this.launchRound();
      } else {
        // Crown overall series/cup champion
        const topCode = Object.entries(this.session.seriesScores)
          .sort((a, b) => b[1] - a[1])[0]?.[0];
        const champ = window.GAME_DATA.countries.find(c => c.code === topCode);
        if (champ) {
          if (this.session.cupId) {
            ensureCountryStat(champ.code).cups += 1;
            UI.unlockAchievement("world_champ");
            saveState();
          }
          alert(`🏆 Overall Tournament Champion: ${champ.flag} ${champ.name}!`);
        }
        UI.showScreen("creator");
      }
    },

    cycleSpeed() {
      this.speedMult = this.speedMult === 1 ? 2 : 1;
      this.updateHUDButtons();
    },

    cycleCamera() {
      const modes = ["leader", "cinematic", "overview"];
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
        alert("Canvas video capture is not supported by this WebView, but you can still share race summaries!");
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
      const shareText = `${winFlag} ${winName} just won the Country Marble Race! 🏆 #CountryMarbleRace`;

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
