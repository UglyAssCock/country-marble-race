// Complete Upgraded Country Marble Race Engine:
// - Interactive Drag/Rotate/Scale Full-Length Track Editor
// - 12 Built-in Tracks + Automatic Multi-Round Track Rotation
// - Points Restricted Strictly to Grand Prix Mode (Formula & NASCAR Systems)
// - Custom Marble Creator + Full Standings (1st to Last)
(function () {
  function createRNG(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const STORAGE_KEY = "CMR_SAVE_V2";
  const defaultSave = {
    coins: 200,
    equippedSkin: "default",
    unlockedSkins: ["default"],
    achievements: [],
    presets: [],
    customMarbles: [],
    customTrack: [
      { type: "funnel", x: 180, y: 180, angle: 0, scale: 1 },
      { type: "spinner", x: 180, y: 310, angle: 0, scale: 1.2 },
      { type: "booster", x: 100, y: 430, angle: 15, scale: 1 },
      { type: "booster", x: 260, y: 430, angle: -15, scale: 1 },
      { type: "pegGrid", x: 180, y: 580, angle: 0, scale: 1.1 },
      { type: "seesaw", x: 180, y: 760, angle: 0, scale: 1.2 },
      { type: "bumper", x: 120, y: 920, angle: 0, scale: 1.2 },
      { type: "bumper", x: 240, y: 920, angle: 0, scale: 1.2 },
      { type: "funnel", x: 180, y: 1120, angle: 0, scale: 1.1 },
      { type: "spinner", x: 180, y: 1320, angle: 0, scale: 1.3 },
      { type: "booster", x: 180, y: 1520, angle: 0, scale: 1.2 }
    ],
    settings: {
      lang: "en",
      maxMarbles: 100,
      colorblind: 0,
      fontScale: 1
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
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("CMR_SAVE_V1");
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
    return getAllMarblesPool().find(c => c.code === code) || window.GAME_DATA.countries[0];
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
      this.renderCustomMarblesList();
      this.renderShop();
      this.renderStatsScreen();
      this.onFormatChange();
      this.applySettings(true);
      Editor.init();
    },

    refreshHeader() {
      document.getElementById("coinCount").textContent = State.coins;
    },

    onFormatChange() {
      const fmt = document.getElementById("crFormat").value;
      document.getElementById("gpSystemWrap").style.display = fmt === "grandprix" ? "block" : "none";
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
        region: [region, " CUSTOM"],
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
      alert(`Custom Marble "${flag} ${name}" created and added to your roster!`);
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
      const grid = document.getElementById("countryPickerGrid");
      grid.innerHTML = "";
      getAllMarblesPool().forEach(c => {
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
      if (flag) getAllMarblesPool().forEach(c => this.manualSelected.add(c.code));
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
      const name = prompt("Preset Name:", "My Race Setup " + (State.presets.length + 1));
      if (!name) return;
      const preset = {
        name,
        count: document.getElementById("crCount").value,
        format: document.getElementById("crFormat").value,
        gpSystem: document.getElementById("crGpSystem").value,
        region: document.getElementById("crRegion").value,
        track: document.getElementById("crTrack").value,
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
      document.getElementById("crDifficulty").value = p.difficulty;
      document.getElementById("crLength").value = p.length;
      document.getElementById("crCamera").value = p.camera;
      document.getElementById("crPhysSpeed").value = p.physSpeed;
      document.getElementById("crRounds").value = p.rounds;
      document.getElementById("crElim").value = p.elim;
      this.onFormatChange();
    },

    renderCups() {
      const wrap = document.getElementById("cupsList");
      wrap.innerHTML = window.GAME_DATA.competitions.map(c => `
        <div style="background:#0f172a; padding:10px; border-radius:8px; border:1px solid #334155;">
          <div style="font-weight:800; margin-bottom:4px;">${c.name}</div>
          <div style="font-size:0.74rem; color:var(--muted); margin-bottom:8px;">
            ${c.count} Marbles • ${c.rounds} Tracks • ${c.format === "grandprix" ? "GP Points" : "Knockout"}
          </div>
          <button class="btn btn-sm btn-block" onclick="Game.startCup('${c.id}')">Start Competition</button>
        </div>
      `).join("");
    },

    renderCareerBox() {
      const stages = [
        "Stage 1/4: Regional Qualifier (Top 5 Advance - Classic Funnel)",
        "Stage 2/4: Continental Group Stage (Top 4 Advance - Mega Plinko)",
        "Stage 3/4: World Cup Semi-Final (Top 3 Advance - Twin Reactor)",
        "Stage 4/4: World Marble Cup Final (Win 1st Place - Marathon Colosseum)"
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

  // Upgraded Interactive Pro Track Editor (Virtual Height 1800px, Drag/Select/Rotate/Scale)
  const Editor = {
    tool: "select",
    canvas: null,
    ctx: null,
    scrollY: 0,
    virtualHeight: 1800,
    selectedIndex: -1,
    isDragging: false,

    init() {
      this.canvas = document.getElementById("editorCanvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");

      const getCoords = e => {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 360);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 360 + this.scrollY);
        return { x: Math.max(20, Math.min(340, x)), y: Math.max(80, Math.min(this.virtualHeight - 90, y)) };
      };

      this.canvas.addEventListener("pointerdown", e => {
        const pt = getCoords(e);
        // Check if user tapped an existing obstacle
        let hitIdx = -1;
        for (let i = State.customTrack.length - 1; i >= 0; i--) {
          const ob = State.customTrack[i];
          if (Math.hypot(ob.x - pt.x, ob.y - pt.y) < 34 * (ob.scale || 1)) {
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
          // Place new obstacle and immediately select it for dragging/tuning
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
      const copy = Object.assign({}, ob, { x: Math.min(330, ob.x + 25), y: Math.min(this.virtualHeight - 100, ob.y + 40) });
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

    undo() {
      State.customTrack.pop();
      this.selectedIndex = State.customTrack.length - 1;
      this.syncInspector();
      this.draw();
    },

    loadTemplate() {
      State.customTrack = [];
      for (let y = 160; y < this.virtualHeight - 140; y += 160) {
        State.customTrack.push({ type: "funnel", x: 180, y, angle: 0, scale: 1.1 });
        State.customTrack.push({ type: "spinner", x: 120, y: y + 70, angle: 0, scale: 1 });
        State.customTrack.push({ type: "spinner", x: 240, y: y + 70, angle: 0, scale: 1 });
        State.customTrack.push({ type: "booster", x: 180, y: y + 115, angle: 0, scale: 1 });
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
      alert("Custom track saved! Select 'Custom Editor Track' or 'Test Race' to play it.");
    },

    exportCode() {
      const code = btoa(JSON.stringify(State.customTrack));
      const inp = document.getElementById("trackCodeInput");
      inp.value = code;
      if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
      alert("Track code generated & copied!");
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
      saveState();
      document.getElementById("crTrack").value = "custom";
      Game.startFromCreator();
    },

    draw() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, 360, 360);
      ctx.save();
      ctx.translate(0, -this.scrollY);

      // Grid & height markers
      ctx.strokeStyle = "#1e293b";
      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      for (let y = 0; y <= this.virtualHeight; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(360, y);
        ctx.stroke();
        ctx.fillText(y + "m", 14, y - 4);
      }

      // Start & Finish Zones
      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
      ctx.fillRect(10, 10, 340, 60);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("🏁 MARBLE SPAWN GATE (0m - 70m)", 80, 42);

      const finY = this.virtualHeight - 60;
      ctx.fillStyle = "#10b981";
      ctx.fillRect(10, finY, 340, 14);
      ctx.fillText("🏆 FINISH LINE (" + finY + "m)", 105, finY - 8);

      // Draw all placed obstacles
      State.customTrack.forEach((item, idx) => {
        const scl = item.scale || 1;
        const rad = ((item.angle || 0) * Math.PI) / 180;
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(rad);
        ctx.scale(scl, scl);

        if (idx === this.selectedIndex) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(-42, -26, 84, 52);
          ctx.setLineDash([]);
        }

        if (item.type === "bumper") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === "spinner") {
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(-30, 0);
          ctx.lineTo(30, 0);
          ctx.stroke();
        } else if (item.type === "seesaw") {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(-36, 0);
          ctx.lineTo(36, 0);
          ctx.stroke();
        } else if (item.type === "funnel") {
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-45, -18);
          ctx.lineTo(-14, 18);
          ctx.moveTo(45, -18);
          ctx.lineTo(14, 18);
          ctx.stroke();
        } else if (item.type === "booster") {
          ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
          ctx.fillRect(-18, -18, 36, 36);
          ctx.fillStyle = "#10b981";
          ctx.font = "16px sans-serif";
          ctx.fillText("⚡", -8, 6);
        } else if (item.type === "slowPad") {
          ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
          ctx.fillRect(-22, -16, 44, 32);
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "15px sans-serif";
          ctx.fillText("🕸️", -8, 6);
        } else if (item.type === "pegGrid") {
          ctx.fillStyle = "#c084fc";
          [-20, 0, 20].forEach(px => {
            [-10, 10].forEach(py => {
              ctx.beginPath();
              ctx.arc(px + (py > 0 ? 8 : -8), py, 4, 0, Math.PI * 2);
              ctx.fill();
            });
          });
        } else {
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(-35, 0);
          ctx.lineTo(35, 0);
          ctx.stroke();
        }
        ctx.restore();
      });

      ctx.restore();
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
      let pool = getAllMarblesPool();
      if (manual) {
        pool = pool.filter(c => UI.manualSelected.has(c.code));
        if (pool.length < 2) pool = getAllMarblesPool().slice(0, 12);
      } else if (region === "CUSTOM") {
        pool = (State.customMarbles && State.customMarbles.length >= 2)
          ? State.customMarbles.slice()
          : getAllMarblesPool().slice(0, 12);
      } else if (region && region !== "ALL") {
        pool = pool.filter(c => c.region.includes(region));
      }
      const rng = createRNG(Date.now() ^ (Math.random() * 0xffffffff));
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const cap = Math.min(Number(count) || 20, State.settings.maxMarbles || 100, pool.length);
      return pool.slice(0, Math.max(2, cap));
    },

    buildTrackSchedule(selectedTrack, totalRounds) {
      const allIds = window.GAME_DATA.tracks.map(t => t.id);
      if (selectedTrack !== "rotate" && selectedTrack) {
        // Even if user chose a specific starting track, if totalRounds > 1, rotate subsequent rounds so multi-round never repeats the same track!
        const startIdx = Math.max(0, allIds.indexOf(selectedTrack));
        const schedule = [];
        for (let r = 0; r < totalRounds; r++) {
          if (selectedTrack === "custom" && r === 0) {
            schedule.push("custom");
          } else {
            schedule.push(allIds[(startIdx + r) % allIds.length]);
          }
        }
        return schedule;
      }
      // Shuffle all 12 tracks for rotation
      const shuffled = allIds.slice().sort(() => Math.random() - 0.5);
      const schedule = [];
      for (let r = 0; r < totalRounds; r++) {
        schedule.push(shuffled[r % shuffled.length]);
      }
      return schedule;
    },

    getTrackDisplayName(trackId) {
      if (trackId === "custom") return "Custom Editor Track";
      const found = window.GAME_DATA.tracks.find(t => t.id === trackId);
      return found ? found.name : trackId;
    },

    startFromCreator() {
      const count = Number(document.getElementById("crCount").value) || 20;
      const format = document.getElementById("crFormat").value;
      const gpSystem = document.getElementById("crGpSystem").value || "formula";
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
        modeTitle: format === "grandprix" ? `Grand Prix (${gpSystem.toUpperCase()})` : "Marble Race",
        format,
        gpSystem,
        trackSchedule: this.buildTrackSchedule(track, rounds),
        difficulty,
        length,
        physSpeed,
        totalRounds: rounds,
        currentRound: 1,
        elimPerRound: elim,
        activeCountries: entrants,
        seriesScores: {}, // GP Points (only in grandprix) OR Round Wins (in other multi-round modes)
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
        difficulty: "medium",
        length: "long",
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
      const playerMarble = findMarbleByCode(code);
      const stageNames = ["Career Qualifier", "Career Group Stage", "Career Semi-Final", "Career World Cup Final"];
      const stageTracks = ["classic", "plinko", "chaosReactor", "endurance"];
      const counts = [16, 20, 14, 10];
      const st = State.career.stage || 0;
      const pool = this.pickCountries("ALL", counts[st], false).filter(c => c.code !== code);
      const entrants = [playerMarble, ...pool.slice(0, counts[st] - 1)];

      this.session = {
        modeTitle: stageNames[st],
        format: "normal",
        gpSystem: "formula",
        trackSchedule: [stageTracks[st]],
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
        difficulty: "medium",
        length: "long",
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
      // Upgraded Longer Track Multipliers
      const lenMap = { short: 4.0, medium: 6.5, long: 9.5, marathon: 13.5 };
      const lenMult = lenMap[this.session.length] || 6.5;
      const trackHeight = Math.round(canvas.height * lenMult);
      const finishY = trackHeight - 120;
      this.lavaY = -140;
      this.camY = 0;

      const currentTrackId = this.session.trackSchedule[(this.session.currentRound - 1) % this.session.trackSchedule.length] || "classic";
      this.currentTrackId = currentTrackId;

      const rng = createRNG(Date.now() ^ (this.session.currentRound * 99991));
      this.setupPhysicsWorld(W, trackHeight, finishY, rng, currentTrackId);
      this.updateHUDButtons();
      this.startLoop(canvas, W, trackHeight, finishY);
    },

    setupPhysicsWorld(W, trackHeight, finishY, rng, trackId) {
      const hasMatter = typeof window.Matter !== "undefined";
      this.obstacles = [];
      this.spinners = [];
      this.seesaws = [];
      this.zones = []; // Boosters & slow pads
      this.marbles = [];
      this.finishedOrder = [];
      this.eliminatedOrder = [];
      this.raceStartTime = performance.now();
      this.midRaceRecorded = false;

      if (!hasMatter) return;
      const { Engine, World, Bodies, Body, Constraint } = window.Matter;
      if (this.engine) World.clear(this.engine.world);
      this.engine = Engine.create();
      this.engine.gravity.y = 0.85 * (this.session.physSpeed || 1);

      const wallOpts = { isStatic: true, restitution: 0.5, friction: 0.01 };
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
          restitution: 0.45,
          friction: 0.003
        });
        World.add(this.engine.world, b);
        this.obstacles.push({ kind: "seg", x1, y1, x2, y2, color: color || "#475569" });
      };

      const addBumper = (x, y, r, color) => {
        const b = Bodies.circle(x, y, r, { isStatic: true, restitution: 1.2, friction: 0 });
        World.add(this.engine.world, b);
        this.obstacles.push({ kind: "bumper", x, y, r, color: color || "#ef4444" });
      };

      const addSpinner = (x, y, len, dir) => {
        const b = Bodies.rectangle(x, y, len, 8, { isStatic: true, restitution: 0.7 });
        World.add(this.engine.world, b);
        this.spinners.push({ body: b, x, y, len, angle: rng() * Math.PI, speed: 0.05 * dir });
      };

      const addSeesaw = (x, y, len) => {
        const plank = Bodies.rectangle(x, y, len, 8, { density: 0.004, friction: 0.01 });
        const pivot = Constraint.create({ pointA: { x, y }, bodyB: plank, stiffness: 1, length: 0 });
        World.add(this.engine.world, [plank, pivot]);
        this.seesaws.push({ body: plank, x, y, len });
      };

      const addZone = (x, y, r, kind, angleRad) => {
        this.zones.push({ x, y, r, kind, angle: angleRad || 0 });
      };

      this.buildTrackGeometry(W, trackHeight, finishY, rng, trackId, addSeg, addBumper, addSpinner, addSeesaw, addZone);

      // Spawn Marbles fairly
      const list = this.session.activeCountries.slice();
      const r = list.length > 45 ? 8.5 : list.length > 25 ? 10 : 12;
      list.forEach((country, idx) => {
        const cols = Math.max(5, Math.floor((W - 50) / (r * 2.3)));
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const jitter = (rng() - 0.5) * 6;
        const x = 30 + col * ((W - 60) / Math.max(1, cols - 1)) + jitter;
        const y = 26 + row * (r * 2.4) + (rng() - 0.5) * 4;

        const body = Bodies.circle(x, y, r, {
          restitution: 0.55,
          friction: 0.002,
          frictionAir: 0.0035,
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
    },

    buildTrackGeometry(W, trackHeight, finishY, rng, trackId, addSeg, addBumper, addSpinner, addSeesaw, addZone) {
      if (trackId === "custom" && State.customTrack.length > 0) {
        const scaleX = W / 360;
        const scaleY = (finishY - 140) / 1680;
        State.customTrack.forEach(item => {
          const x = item.x * scaleX;
          const y = 110 + item.y * scaleY;
          const scl = item.scale || 1;
          const rad = ((item.angle || 0) * Math.PI) / 180;

          if (item.type === "bumper") {
            addBumper(x, y, 14 * scl);
          } else if (item.type === "spinner") {
            addSpinner(x, y, 66 * scl, (item.angle || 0) >= 0 ? 1 : -1);
          } else if (item.type === "seesaw") {
            addSeesaw(x, y, 82 * scl);
          } else if (item.type === "funnel") {
            const w = 55 * scl, h = 22 * scl, gap = 16 * scl;
            addSeg(x - w, y - h, x - gap, y + h, "#a855f7");
            addSeg(x + w, y - h, x + gap, y + h, "#a855f7");
          } else if (item.type === "booster") {
            addZone(x, y, 22 * scl, "booster", rad);
          } else if (item.type === "slowPad") {
            addZone(x, y, 24 * scl, "slowPad", 0);
          } else if (item.type === "pegGrid") {
            [-24, 0, 24].forEach(px => {
              [-14, 14].forEach(py => {
                addBumper(x + (px + (py > 0 ? 10 : -10)) * scl, y + py * scl, 5.5 * scl, "#c084fc");
              });
            });
          } else {
            const half = 42 * scl;
            const dx = Math.cos(rad) * half;
            const dy = Math.sin(rad) * half;
            addSeg(x - dx, y - dy, x + dx, y + dy, "#38bdf8");
          }
        });
        return;
      }

      const diffMult = this.session.difficulty === "hard" ? 1.25 : this.session.difficulty === "easy" ? 0.8 : 1;
      const step = Math.round(180 / diffMult);
      let idx = 0;

      for (let y = 160; y < finishY - 130; y += step) {
        idx++;
        const gap = 33;

        if (trackId === "plinko" || (trackId === "endurance" && idx % 5 === 0)) {
          const cols = 6;
          for (let c = 1; c < cols; c++) {
            addBumper((W / cols) * c + (idx % 2 === 0 ? 14 : -14), y, 6.5, "#c084fc");
            addBumper((W / cols) * c, y + 48, 6.5, "#c084fc");
          }
        } else if (trackId === "zigzag" || (trackId === "swissAlps" && idx % 2 === 0)) {
          if (idx % 2 === 0) {
            addSeg(10, y - 25, W * 0.68, y + 30, "#38bdf8");
            addZone(W * 0.82, y + 35, 20, "booster", 0.3);
          } else {
            addSeg(W - 10, y - 25, W * 0.32, y + 30, "#38bdf8");
            addZone(W * 0.18, y + 35, 20, "booster", -0.3);
          }
        } else if (trackId === "hyperSpeed") {
          addSeg(10, y - 25, W / 2 - gap, y + 20, "#10b981");
          addSeg(W - 10, y - 25, W / 2 + gap, y + 20, "#10b981");
          addZone(W * 0.25, y + 60, 22, "booster", 0);
          addZone(W * 0.75, y + 60, 22, "booster", 0);
          addSpinner(W * 0.5, y + 60, 62, idx % 2 === 0 ? 1 : -1);
        } else if (trackId === "saharaDunes") {
          addSeg(8, y - 35, W / 2 - gap, y + 25, "#f59e0b");
          addSeg(W - 8, y - 35, W / 2 + gap, y + 25, "#f59e0b");
          addZone(W * 0.5, y + 60, 24, "slowPad", 0);
          addBumper(W * 0.28, y + 70, 12, "#eab308");
          addBumper(W * 0.72, y + 70, 12, "#eab308");
        } else if (trackId === "chaosReactor" || trackId === "spinnerMayhem") {
          addSpinner(W * 0.28, y, 72, 1);
          addSpinner(W * 0.72, y, 72, -1);
          addSpinner(W * 0.5, y + 58, 68, idx % 2 === 0 ? 1 : -1);
        } else if (trackId === "bumperPinball") {
          for (let k = 0; k < 4; k++) addBumper(W * (0.2 + k * 0.2), y - 15, 13);
          for (let k = 0; k < 3; k++) addBumper(W * (0.3 + k * 0.2), y + 40, 15);
        } else if (trackId === "seesawDrop") {
          addSeesaw(W * 0.33, y, 88);
          addSeesaw(W * 0.67, y + 36, 88);
          addSeg(0, y - 25, W * 0.2, y + 10, "#38bdf8");
          addSeg(W, y - 25, W * 0.8, y + 10, "#38bdf8");
        } else {
          // Classic / Gauntlet / Endurance mix
          const mod = idx % 4;
          if (mod === 0) {
            addSeg(10, y - 30, W / 2 - gap, y + 22, "#f59e0b");
            addSeg(W - 10, y - 30, W / 2 + gap, y + 22, "#f59e0b");
            addSpinner(W / 2, y + 60, 58, rng() > 0.5 ? 1 : -1);
          } else if (mod === 1) {
            addSpinner(W * 0.3, y, 66, 1);
            addSpinner(W * 0.7, y, 66, -1);
            addZone(W * 0.5, y + 45, 20, "booster", 0);
          } else if (mod === 2) {
            for (let k = 0; k < 4; k++) addBumper(W * (0.2 + k * 0.2), y, 12);
            addSeesaw(W * 0.5, y + 55, 92);
          } else {
            addSeg(0, y - 20, W * 0.36, y + 22, "#a855f7");
            addSeg(W, y - 20, W * 0.64, y + 22, "#a855f7");
            addBumper(W * 0.5, y + 45, 14);
          }
        }
      }
    },

    startLoop(canvas, W, trackHeight, finishY) {
      if (this.animId) cancelAnimationFrame(this.animId);
      const ctx = canvas.getContext("2d");
      const skin = window.GAME_DATA.skins.find(s => s.id === State.equippedSkin) || window.GAME_DATA.skins[0];

      const stepFrame = () => {
        for (let s = 0; s < this.speedMult; s++) {
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

      this.spinners.forEach(sp => {
        sp.angle += sp.speed * (this.session.physSpeed || 1);
        Body.setAngle(sp.body, sp.angle);
      });

      Engine.update(this.engine, 1000 / 60);

      if (this.session.format === "survival") {
        this.lavaY += 1.05 * (this.session.physSpeed || 1);
      }

      this.marbles.forEach(m => {
        m.x = m.body.position.x;
        m.y = m.body.position.y;

        if (!m.finished && !m.eliminated) {
          // Check Booster / Slow Pad zones
          this.zones.forEach(z => {
            if (Math.hypot(m.x - z.x, m.y - z.y) < z.r + m.r) {
              if (z.kind === "booster") {
                Body.setVelocity(m.body, {
                  x: m.body.velocity.x + Math.sin(z.angle) * 3.5,
                  y: Math.max(m.body.velocity.y, 7.5)
                });
              } else if (z.kind === "slowPad") {
                Body.setVelocity(m.body, {
                  x: m.body.velocity.x * 0.78,
                  y: m.body.velocity.y * 0.78
                });
              }
            }
          });

          // Anti-stuck nudge
          if (Math.hypot(m.body.velocity.x, m.body.velocity.y) < 0.15) {
            Body.applyForce(m.body, m.body.position, {
              x: (Math.random() - 0.5) * 0.0005,
              y: 0.0006
            });
          }

          m.trail.push({ x: m.x, y: m.y });
          if (m.trail.length > 8) m.trail.shift();

          if (this.session.format === "survival" && m.y < this.lavaY) {
            m.eliminated = true;
            m.finishTimeMs = Math.round(performance.now() - this.raceStartTime);
            this.eliminatedOrder.push(m);
          } else if (m.y >= finishY) {
            m.finished = true;
            m.finishTimeMs = Math.round(performance.now() - this.raceStartTime);
            this.finishedOrder.push(m);
          }
        }
      });

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

      const liveRanking = [
        ...this.finishedOrder,
        ...this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => b.y - a.y),
        ...this.eliminatedOrder.slice().reverse()
      ];

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
        const leader = this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => b.y - a.y)[0]
          || this.finishedOrder[0];
        if (leader) {
          targetY = Math.max(0, Math.min(trackHeight - canvas.height, leader.y - canvas.height * 0.55));
        }
      }
      this.camY += (targetY - this.camY) * 0.14;

      ctx.save();
      if (this.cameraMode === "overview") {
        ctx.scale(scale, scale);
      } else {
        ctx.translate(0, -this.camY);
      }

      // Distance grid lines
      ctx.strokeStyle = "#162032";
      ctx.fillStyle = "#334155";
      ctx.font = "10px sans-serif";
      for (let y = 200; y < trackHeight; y += 200) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.fillText(y + "m", 8, y - 4);
      }

      // Zones (Boosters & Slow Mud)
      this.zones.forEach(z => {
        ctx.save();
        ctx.translate(z.x, z.y);
        if (z.kind === "booster") {
          ctx.fillStyle = "rgba(16, 185, 129, 0.28)";
          ctx.beginPath();
          ctx.arc(0, 0, z.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#10b981";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⚡", 0, 0);
        } else {
          ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
          ctx.beginPath();
          ctx.arc(0, 0, z.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#94a3b8";
          ctx.font = "15px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🕸️", 0, 0);
        }
        ctx.restore();
      });

      // Finish line banner
      for (let x = 0; x < W; x += 20) {
        ctx.fillStyle = (x / 20) % 2 === 0 ? "#ffffff" : "#10b981";
        ctx.fillRect(x, finishY, 20, 16);
      }

      // Survival Lava Zone
      if (this.session.format === "survival" && this.lavaY > 0) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.36)";
        ctx.fillRect(0, 0, W, this.lavaY);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, this.lavaY);
        ctx.lineTo(W, this.lavaY);
        ctx.stroke();
      }

      // Obstacles
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
          ctx.fillStyle = ob.color || "#ef4444";
          ctx.beginPath();
          ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

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

      const cbOutline = State.settings.colorblind === 1;
      this.marbles.forEach(m => {
        if (m.eliminated) return;

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

        ctx.lineWidth = cbOutline ? 3 : 2;
        ctx.strokeStyle = cbOutline ? "#ffff00" : (m.country.border || "#ffffff");
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(m.r * 1.05)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m.country.flag, 0, 1);
        ctx.restore();
      });

      ctx.restore();

      // Update Top HUD
      document.getElementById("hudTitle").textContent =
        `${this.session.modeTitle} • Rd ${this.session.currentRound}/${this.session.totalRounds}`;
      document.getElementById("hudTrackName").textContent =
        `Track: ${this.getTrackDisplayName(this.currentTrackId)} (${this.finishedOrder.length}/${this.marbles.length} finished)`;
      if (liveRanking[0]) {
        document.getElementById("hudSub").textContent =
          `Leader: ${liveRanking[0].country.flag} ${liveRanking[0].country.name}`;
      }
      document.getElementById("hudStandings").innerHTML = liveRanking.slice(0, 6)
        .map((m, idx) => `${idx + 1}. ${m.country.flag} ${m.country.name.slice(0, 9)}`)
        .join(" • ");
    },

    skipToResult() {
      if (!this.session) return;
      const canvas = document.getElementById("raceCanvas");
      const W = canvas.width || 360;
      const lenMap = { short: 4.0, medium: 6.5, long: 9.5, marathon: 13.5 };
      const trackHeight = Math.round((canvas.height || 640) * (lenMap[this.session.length] || 6.5));
      const finishY = trackHeight - 120;
      let guard = 0;
      while (!this.checkRaceFinished() && guard < 5500) {
        this.stepPhysics(W, trackHeight, finishY);
        guard++;
      }
      const rem = this.marbles.filter(m => !m.finished && !m.eliminated).sort((a, b) => b.y - a.y);
      rem.forEach((m, idx) => {
        m.finished = true;
        m.finishTimeMs = Math.round(performance.now() - this.raceStartTime) + idx * 55;
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

      // Check closest finish record
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
      if (gained >= 5) UI.unlockAchievement("comeback");
      if (gained > State.records.bestComeback.gained) {
        State.records.bestComeback = { country: `${winner.country.flag} ${winner.country.name}`, gained };
      }

      UI.unlockAchievement("first_win");
      if (winner.country.small || winner.country.isCustom) UI.unlockAchievement("underdog");
      State.coins += 25;

      // Update stats: GP Points ONLY added in Grand Prix mode!
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
          // Non-GP modes track round victories (1st place = 1 win)
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

      // Knockout Elimination handling
      let elimNote = "";
      let knockedCodes = new Set();
      if (this.session.format === "knockout" && this.session.activeCountries.length > 2) {
        const cut = Math.min(this.session.elimPerRound, this.session.activeCountries.length - 1);
        const knocked = finalOrder.slice(-cut).map(m => m.country);
        knockedCodes = new Set(knocked.map(c => c.code));
        this.session.activeCountries = this.session.activeCountries.filter(c => !knockedCodes.has(c.code));
        elimNote = `Eliminated (${cut}): ${knocked.map(c => c.flag + " " + c.name).join(", ")}`;
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

      // Render 100% of all marbles in the race (No top-10 slice!)
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
          extraCol = `<span style="color:var(--muted);">Finished</span>`;
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

      // Career check
      if (this.session.isCareer) {
        const myRank = this.finishedOrder.findIndex(m => m.country.code === this.session.careerCode) + 1;
        const passRanks = [5, 4, 3, 1];
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
            alert("🏆 WORLD CUP CAREER CHAMPION! You conquered all 4 tracks!");
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

      // Advance to next round on a new track
      if (this.session.currentRound < this.session.totalRounds && this.session.activeCountries.length >= 2) {
        this.session.currentRound += 1;
        this.launchRound();
      } else {
        // Crown overall winner
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
