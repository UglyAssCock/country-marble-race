// UN-Recognized Countries + 12 Huge Multi-Section Track Presets + Scoring & Accent Palettes
window.GAME_DATA = {
  formulaPoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],

  getPoints(rankIndex, system) {
    if (system === "nascar") {
      if (rankIndex === 0) return 40;
      return Math.max(1, 36 - rankIndex);
    }
    return this.formulaPoints[rankIndex] || 0;
  },

  // Distinct bright flat colors for section headers, blades, and finish bars
  sectionAccents: [
    "#ef4444", "#f97316", "#f59e0b", "#10b981",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
    "#eab308", "#14b8a6", "#6366f1", "#f43f5e"
  ],

  // 12 Preset Huge Multi-Section Tracks (All 16 Obstacle Types Represented)
  tracks: [
    {
      id: "colossus_odyssey",
      name: "Colossus 16-Section Odyssey",
      difficulty: "medium",
      length: "long",
      sections: [
        "startCircleSplitter", "pegboard", "crossSpinners", "zigzagSawtooth",
        "slantedPlanks", "capsuleChambers", "funnelHourglass", "bigWheelBox",
        "giantBowlBasin", "staircaseRamps", "scallopedBubbleWalls", "mixedDashesBumpers",
        "pendulumsAndSliders", "narrowTubesSCurves", "soccerGoalGate", "noCollisionGhostZone"
      ]
    },
    {
      id: "serpent_citadel",
      name: "Serpentine Citadel & Capsules",
      difficulty: "medium",
      length: "medium",
      sections: [
        "startCircleSplitter", "slantedPlanks", "capsuleChambers", "crossSpinners",
        "zigzagSawtooth", "slantedPlanks", "capsuleChambers", "funnelHourglass",
        "bigWheelBox", "staircaseRamps", "mixedDashesBumpers", "giantBowlBasin"
      ]
    },
    {
      id: "hourglass_jam",
      name: "Hourglass Traffic Jam & Bowls",
      difficulty: "hard",
      length: "medium",
      sections: [
        "startCircleSplitter", "funnelHourglass", "giantBowlBasin", "pegboard",
        "funnelHourglass", "scallopedBubbleWalls", "giantBowlBasin", "crossSpinners",
        "funnelHourglass", "narrowTubesSCurves", "mixedDashesBumpers", "giantBowlBasin"
      ]
    },
    {
      id: "pendulum_fortress",
      name: "Pendulum & Slider Fortress",
      difficulty: "hard",
      length: "long",
      sections: [
        "startCircleSplitter", "pendulumsAndSliders", "staircaseRamps", "crossSpinners",
        "pendulumsAndSliders", "capsuleChambers", "bigWheelBox", "zigzagSawtooth",
        "pendulumsAndSliders", "slantedPlanks", "funnelHourglass", "soccerGoalGate"
      ]
    },
    {
      id: "stadion_cup",
      name: "Stadium Goal Qualification Gauntlet",
      difficulty: "medium",
      length: "medium",
      sections: [
        "startCircleSplitter", "pegboard", "soccerGoalGate", "slantedPlanks",
        "crossSpinners", "soccerGoalGate", "giantBowlBasin", "mixedDashesBumpers",
        "noCollisionGhostZone", "soccerGoalGate", "funnelHourglass", "staircaseRamps"
      ]
    },
    {
      id: "reactor_core",
      name: "Big Wheel & Cross Spinner Reactor",
      difficulty: "hard",
      length: "long",
      sections: [
        "startCircleSplitter", "crossSpinners", "bigWheelBox", "funnelHourglass",
        "crossSpinners", "capsuleChambers", "bigWheelBox", "narrowTubesSCurves",
        "crossSpinners", "giantBowlBasin", "bigWheelBox", "mixedDashesBumpers"
      ]
    },
    {
      id: "alpine_slalom",
      name: "Alpine S-Curve & Staircase Drop",
      difficulty: "easy",
      length: "medium",
      sections: [
        "startCircleSplitter", "slantedPlanks", "staircaseRamps", "narrowTubesSCurves",
        "scallopedBubbleWalls", "giantBowlBasin", "slantedPlanks", "staircaseRamps",
        "pegboard", "narrowTubesSCurves", "mixedDashesBumpers", "funnelHourglass"
      ]
    },
    {
      id: "ghost_phantom",
      name: "Phantom No-Collision Ghost Run",
      difficulty: "medium",
      length: "medium",
      sections: [
        "startCircleSplitter", "noCollisionGhostZone", "funnelHourglass", "crossSpinners",
        "noCollisionGhostZone", "capsuleChambers", "giantBowlBasin", "noCollisionGhostZone",
        "zigzagSawtooth", "bigWheelBox", "pendulumsAndSliders", "funnelHourglass"
      ]
    },
    {
      id: "bubble_basin",
      name: "Scalloped Bubble & Basin Cascade",
      difficulty: "easy",
      length: "short",
      sections: [
        "startCircleSplitter", "scallopedBubbleWalls", "giantBowlBasin", "pegboard",
        "scallopedBubbleWalls", "mixedDashesBumpers", "giantBowlBasin", "capsuleChambers",
        "scallopedBubbleWalls", "funnelHourglass"
      ]
    },
    {
      id: "sawtooth_canyon",
      name: "Sawtooth & Narrow Tube Canyon",
      difficulty: "hard",
      length: "long",
      sections: [
        "startCircleSplitter", "zigzagSawtooth", "narrowTubesSCurves", "funnelHourglass",
        "zigzagSawtooth", "pendulumsAndSliders", "capsuleChambers", "narrowTubesSCurves",
        "zigzagSawtooth", "bigWheelBox", "staircaseRamps", "giantBowlBasin"
      ]
    },
    {
      id: "champions_marathon",
      name: "40,000px Grand World Marathon",
      difficulty: "hard",
      length: "marathon",
      sections: [
        "startCircleSplitter", "pegboard", "crossSpinners", "funnelHourglass",
        "slantedPlanks", "capsuleChambers", "bigWheelBox", "zigzagSawtooth",
        "giantBowlBasin", "staircaseRamps", "scallopedBubbleWalls", "pendulumsAndSliders",
        "narrowTubesSCurves", "soccerGoalGate", "noCollisionGhostZone", "mixedDashesBumpers",
        "capsuleChambers", "bigWheelBox", "giantBowlBasin", "funnelHourglass"
      ]
    },
    {
      id: "pinball_matrix",
      name: "Giant Pegboard & Bumper Matrix",
      difficulty: "medium",
      length: "medium",
      sections: [
        "startCircleSplitter", "pegboard", "mixedDashesBumpers", "scallopedBubbleWalls",
        "giantBowlBasin", "pegboard", "crossSpinners", "mixedDashesBumpers",
        "funnelHourglass", "bigWheelBox", "pegboard", "staircaseRamps"
      ]
    }
  ],

  i18n: {
    en: {
      title: "Country Marble Race",
      customCreator: "Huge Track Marble Race Creator",
      numCountries: "Marbles (2-300)",
      raceFormat: "Game Mode",
      regionFilter: "Region / Pool",
      trackSelect: "Huge Track Preset (1200x15,000-40,000px)",
      difficulty: "Obstacle Difficulty",
      raceLength: "World Height (Sections)",
      cameraMode: "Default Camera",
      physicsSpeed: "Physics Speed",
      numRounds: "Number of Rounds (1-20)",
      elimCount: "Knockout Cut / Round",
      countrySelection: "Selection Mode",
      competitions: "Major Cups & Grand Prix Leagues",
      navRace: "Race",
      navCups: "Cups",
      navStats: "Stats",
      navEditor: "Editor",
      navShop: "Custom",
      navConfig: "Options"
    },
    ar: {
      title: "سباق كرات الدول العملاق",
      customCreator: "إنشاء سباق مضمار عملاق",
      numCountries: "عدد الكرات (2-300)",
      raceFormat: "نظام اللعب",
      regionFilter: "المنطقة / الفئة",
      trackSelect: "المضمار العملاق",
      difficulty: "صعوبة العوائق",
      raceLength: "طول العالم (الأقسام)",
      cameraMode: "الكاميرا",
      physicsSpeed: "سرعة الفيزياء",
      numRounds: "عدد الجولات (1-20)",
      elimCount: "الإقصاء في كل جولة",
      countrySelection: "اختيار الكرات",
      competitions: "البطولات والجائزة الكبرى",
      navRace: "سباق",
      navCups: "بطولات",
      navStats: "الترتيب",
      navEditor: "مضماري",
      navShop: "تصميم",
      navConfig: "إعدادات"
    },
    fr: {
      title: "Course de Billes Géante",
      customCreator: "Créateur de Piste Géante",
      numCountries: "Billes (2-300)",
      raceFormat: "Mode de Jeu",
      regionFilter: "Région / Pool",
      trackSelect: "Piste Géante",
      difficulty: "Difficulté",
      raceLength: "Hauteur du Monde",
      cameraMode: "Caméra",
      physicsSpeed: "Vitesse Physique",
      numRounds: "Manches (1-20)",
      elimCount: "Éliminés / Manche",
      countrySelection: "Sélection",
      competitions: "Coupes et Grands Prix",
      navRace: "Course",
      navCups: "Coupes",
      navStats: "Stats",
      navEditor: "Éditeur",
      navShop: "Custom",
      navConfig: "Options"
    },
    es: {
      title: "Carrera de Canicas Gigante",
      customCreator: "Creador de Pista Gigante",
      numCountries: "Canicas (2-300)",
      raceFormat: "Modo de Juego",
      regionFilter: "Región / Grupo",
      trackSelect: "Pista Gigante",
      difficulty: "Dificultad",
      raceLength: "Altura del Mundo",
      cameraMode: "Cámara",
      physicsSpeed: "Velocidad Física",
      numRounds: "Rondas (1-20)",
      elimCount: "Eliminados / Ronda",
      countrySelection: "Selección",
      competitions: "Copas y Grandes Premios",
      navRace: "Carrera",
      navCups: "Copas",
      navStats: "Récords",
      navEditor: "Editor",
      navShop: "Crear",
      navConfig: "Ajustes"
    }
  },

  competitions: [
    { id: "wmc", name: "🌍 World 100-Marble Knockout Cup", region: "ALL", count: 100, rounds: 4, format: "knockout", track: "rotate" },
    { id: "f1gp", name: "🏎️ Formula World Grand Prix", region: "ALL", count: 40, rounds: 5, format: "grandprix", gpSystem: "formula", track: "rotate" },
    { id: "nascar", name: "🏁 NASCAR 80-Marble Cup Series", region: "ALL", count: 80, rounds: 5, format: "grandprix", gpSystem: "nascar", track: "rotate" },
    { id: "afcon", name: "🦁 African Giant Marble Cup", region: "Africa", count: 40, rounds: 4, format: "knockout", track: "rotate" },
    { id: "euro", name: "🏰 European Giant Marble Cup", region: "Europe", count: 40, rounds: 4, format: "knockout", track: "rotate" },
    { id: "asian", name: "🐉 Asian Giant Marble Cup", region: "Asia", count: 40, rounds: 4, format: "knockout", track: "rotate" },
    { id: "arab", name: "🌙 Arab Marble Champions Cup", region: "Arab", count: 32, rounds: 4, format: "knockout", track: "rotate" },
    { id: "copa", name: "☀️ South American GP", region: "SouthAmerica", count: 30, rounds: 4, format: "grandprix", gpSystem: "formula", track: "rotate" }
  ],

  skins: [
    { id: "default", name: "Classic Flag Sphere", cost: 0, glow: false, trail: null },
    { id: "gold", name: "Golden Aura", cost: 100, glow: "#fbbf24", trail: "#f59e0b" },
    { id: "neon", name: "Cyber Neon Trail", cost: 200, glow: "#06b6d4", trail: "#22d3ee" },
    { id: "emerald", name: "Emerald Flame", cost: 300, glow: "#10b981", trail: "#34d399" },
    { id: "crimson", name: "Supernova Red", cost: 450, glow: "#ef4444", trail: "#f87171" }
  ],

  achievements: [
    { id: "first_win", name: "First Podium Gold", desc: "Complete your first huge marble race.", reward: 50 },
    { id: "underdog", name: "Giant Slayer", desc: "Win a race with a small or custom marble.", reward: 100 },
    { id: "comeback", name: "Miracle Comeback", desc: "Win after being outside the top 10 mid-race.", reward: 120 },
    { id: "photofinish", name: "Photo Finish!", desc: "Finish 1st and 2nd within 60 milliseconds.", reward: 100 },
    { id: "architect", name: "Track Architect", desc: "Save an interactive custom track.", reward: 80 },
    { id: "world_champ", name: "Cup Champion", desc: "Win any Major Cup or Grand Prix Series.", reward: 200 }
  ],

  countries: [
    { code: "DZ", name: "Algeria", flag: "🇩🇿", region: ["Africa", "Arab"], color: "#16a34a", small: false, fact: "Algeria is the largest country in Africa by land area, covering over 2.38 million sq km." },
    { code: "MA", name: "Morocco", flag: "🇲🇦", region: ["Africa", "Arab"], color: "#dc2626", small: false, fact: "Morocco is home to the University of Al Quaraouiyine, founded in 859 AD in Fez." },
    { code: "TN", name: "Tunisia", flag: "🇹🇳", region: ["Africa", "Arab"], color: "#ef4444", small: false, fact: "Tunisia was home to the ancient city of Carthage and the northernmost point of Africa." },
    { code: "EG", name: "Egypt", flag: "🇪🇬", region: ["Africa", "Arab"], color: "#b91c1c", small: false, fact: "The Great Pyramid of Giza is the oldest of the Seven Wonders of the Ancient World." },
    { code: "LY", name: "Libya", flag: "🇱🇾", region: ["Africa", "Arab"], color: "#15803d", small: false, fact: "Libya features Leptis Magna, one of the best-preserved Roman cities in the Mediterranean." },
    { code: "MR", name: "Mauritania", flag: "🇲🇷", region: ["Africa", "Arab"], color: "#16a34a", small: false, fact: "Mauritania contains the Richat Structure, known as the Eye of the Sahara, visible from space." },
    { code: "SD", name: "Sudan", flag: "🇸🇩", region: ["Africa", "Arab"], color: "#dc2626", small: false, fact: "Sudan has more ancient Nubian pyramids in Meroë than exist in all of Egypt." },
    { code: "SN", name: "Senegal", flag: "🇸🇳", region: ["Africa"], color: "#22c55e", small: false, fact: "Senegal's Lake Retba is famous for its vivid pink waters caused by salt-loving algae." },
    { code: "NG", name: "Nigeria", flag: "🇳🇬", region: ["Africa"], color: "#15803d", small: false, fact: "Nigeria is the most populous country in Africa and home to the Nollywood film industry." },
    { code: "GH", name: "Ghana", flag: "🇬🇭", region: ["Africa"], color: "#eab308", small: false, fact: "Ghana is home to Lake Volta, the largest artificial reservoir in the world by surface area." },
    { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", region: ["Africa"], color: "#f97316", small: false, fact: "Côte d'Ivoire is the world's largest producer and exporter of cocoa beans." },
    { code: "CM", name: "Cameroon", flag: "🇨🇲", region: ["Africa"], color: "#16a34a", small: false, fact: "Cameroon is often called 'Africa in Miniature' for its geological and cultural diversity." },
    { code: "ZA", name: "South Africa", flag: "🇿🇦", region: ["Africa"], color: "#15803d", small: false, fact: "South Africa has three capital cities: Pretoria, Cape Town, and Bloemfontein." },
    { code: "KE", name: "Kenya", flag: "🇰🇪", region: ["Africa"], color: "#b91c1c", small: false, fact: "Kenya's Great Rift Valley is renowned for producing the world's fastest distance runners." },
    { code: "ET", name: "Ethiopia", flag: "🇪🇹", region: ["Africa"], color: "#22c55e", small: false, fact: "Ethiopia follows a unique 13-month calendar that is roughly seven years behind the Gregorian calendar." },
    { code: "ML", name: "Mali", flag: "🇲🇱", region: ["Africa"], color: "#eab308", small: false, fact: "Timbuktu in Mali was a legendary center of medieval scholarship during Mansa Musa's era." },
    { code: "AO", name: "Angola", flag: "🇦🇴", region: ["Africa"], color: "#dc2626", small: false, fact: "Angola's Kalandula Falls are among the largest waterfalls by volume in Africa." },
    { code: "TZ", name: "Tanzania", flag: "🇹🇿", region: ["Africa"], color: "#0284c7", small: false, fact: "Mount Kilimanjaro in Tanzania is the highest free-standing mountain in the world." },
    { code: "CD", name: "DR Congo", flag: "🇨🇩", region: ["Africa"], color: "#2563eb", small: false, fact: "The Congo River is the deepest recorded river in the world, reaching depths over 220 meters." },
    { code: "UG", name: "Uganda", flag: "🇺🇬", region: ["Africa"], color: "#eab308", small: false, fact: "Uganda is called the Pearl of Africa and contains the source of the White Nile." },
    { code: "KM", name: "Comoros", flag: "🇰🇲", region: ["Africa", "Arab"], color: "#16a34a", small: true, fact: "Comoros is a volcanic island nation known as the 'Perfume Islands' for its ylang-ylang." },
    { code: "DJ", name: "Djibouti", flag: "🇩🇯", region: ["Africa", "Arab"], color: "#38bdf8", small: true, fact: "Lake Assal in Djibouti is the lowest point on land in Africa and one of the saltiest lakes on Earth." },
    { code: "SO", name: "Somalia", flag: "🇸🇴", region: ["Africa", "Arab"], color: "#3b82f6", small: false, fact: "Somalia possesses the longest coastline on the African mainland, stretching over 3,000 km." },
    { code: "CV", name: "Cabo Verde", flag: "🇨🇻", region: ["Africa"], color: "#1d4ed8", small: true, fact: "Cabo Verde is an Atlantic archipelago of 10 volcanic islands off West Africa." },
    { code: "MU", name: "Mauritius", flag: "🇲🇺", region: ["Africa"], color: "#ef4444", small: true, fact: "Mauritius was the only known habitat of the extinct flightless Dodo bird." },
    { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: ["Asia", "Arab"], color: "#15803d", small: false, fact: "Saudi Arabia contains the Rub' al Khali, the largest contiguous sand desert in the world." },
    { code: "QA", name: "Qatar", flag: "🇶🇦", region: ["Asia", "Arab"], color: "#881337", small: true, fact: "Qatar's flag is the only national flag with a width more than twice its height." },
    { code: "AE", name: "UAE", flag: "🇦🇪", region: ["Asia", "Arab"], color: "#16a34a", small: false, fact: "The UAE is home to the Burj Khalifa, the tallest structure ever built by humans at 828m." },
    { code: "KW", name: "Kuwait", flag: "🇰🇼", region: ["Asia", "Arab"], color: "#0284c7", small: true, fact: "The Kuwait Towers are an iconic symbol of modern architecture in the Gulf." },
    { code: "OM", name: "Oman", flag: "🇴🇲", region: ["Asia", "Arab"], color: "#dc2626", small: false, fact: "Oman is known for its ancient falaj irrigation channels and historic shipbuilding." },
    { code: "BH", name: "Bahrain", flag: "🇧🇭", region: ["Asia", "Arab"], color: "#e11d48", small: true, fact: "Bahrain is an archipelago of more than 30 islands famous for ancient Dilmun pearls." },
    { code: "IQ", name: "Iraq", flag: "🇮🇶", region: ["Asia", "Arab"], color: "#b91c1c", small: false, fact: "Mesopotamia in modern Iraq was the cradle of writing, mathematics, and the wheel." },
    { code: "JO", name: "Jordan", flag: "🇯🇴", region: ["Asia", "Arab"], color: "#15803d", small: false, fact: "Petra in Jordan was carved directly into rose-red sandstone cliffs over 2,000 years ago." },
    { code: "LB", name: "Lebanon", flag: "🇱🇧", region: ["Asia", "Arab"], color: "#ef4444", small: true, fact: "Byblos in Lebanon is one of the oldest continuously inhabited cities in the world." },
    { code: "SY", name: "Syria", flag: "🇸🇾", region: ["Asia", "Arab"], color: "#dc2626", small: false, fact: "Damascus and Aleppo are among the oldest continuously inhabited cities in history." },
    { code: "YE", name: "Yemen", flag: "🇾🇪", region: ["Asia", "Arab"], color: "#b91c1c", small: false, fact: "Socotra Island in Yemen is famous for its surreal Dragon's Blood trees found nowhere else." },
    { code: "PS", name: "Palestine", flag: "🇵🇸", region: ["Asia", "Arab"], color: "#16a34a", small: true, fact: "Jericho is one of the oldest inhabited cities and lowest permanently inhabited sites on Earth." },
    { code: "JP", name: "Japan", flag: "🇯🇵", region: ["Asia"], color: "#ef4444", small: false, fact: "Japan consists of over 6,800 islands and operates the ultra-punctual Shinkansen bullet trains." },
    { code: "KR", name: "South Korea", flag: "🇰🇷", region: ["Asia"], color: "#2563eb", small: false, fact: "Hangul, the Korean alphabet, was scientifically designed in 1443 to maximize literacy." },
    { code: "CN", name: "China", flag: "🇨🇳", region: ["Asia"], color: "#dc2626", small: false, fact: "Paper, printing, the compass, and gunpowder were the Four Great Inventions of ancient China." },
    { code: "IN", name: "India", flag: "🇮🇳", region: ["Asia"], color: "#f97316", small: false, fact: "The concept of zero as a number and the game of chess both originated in ancient India." },
    { code: "PK", name: "Pakistan", flag: "🇵🇰", region: ["Asia"], color: "#15803d", small: false, fact: "Pakistan is home to K2, the second-highest peak on Earth, and the ancient Indus Valley civilization." },
    { code: "ID", name: "Indonesia", flag: "🇮🇩", region: ["Asia"], color: "#ef4444", small: false, fact: "Indonesia is the world's largest archipelagic state, spanning over 17,000 islands." },
    { code: "MY", name: "Malaysia", flag: "🇲🇾", region: ["Asia"], color: "#1d4ed8", small: false, fact: "The Petronas Twin Towers in Kuala Lumpur remain the tallest twin towers in the world." },
    { code: "TH", name: "Thailand", flag: "🇹🇭", region: ["Asia"], color: "#2563eb", small: false, fact: "Bangkok's ceremonial Thai name holds the world record as the longest city name at 168 letters." },
    { code: "VN", name: "Vietnam", flag: "🇻🇳", region: ["Asia"], color: "#dc2626", small: false, fact: "Son Doong Cave in Vietnam is the largest natural cave passage by volume on Earth." },
    { code: "PH", name: "Philippines", flag: "🇵🇭", region: ["Asia"], color: "#2563eb", small: false, fact: "The Philippines comprises 7,641 islands in the western Pacific Ocean." },
    { code: "TR", name: "Türkiye", flag: "🇹🇷", region: ["Asia", "Europe"], color: "#e11d48", small: false, fact: "Istanbul is the only major city in the world that straddles two continents: Europe and Asia." },
    { code: "IR", name: "Iran", flag: "🇮🇷", region: ["Asia"], color: "#16a34a", small: false, fact: "Iran is home to 27 UNESCO World Heritage Sites, including ancient Persepolis." },
    { code: "UZ", name: "Uzbekistan", flag: "🇺🇿", region: ["Asia"], color: "#0284c7", small: false, fact: "Samarkand in Uzbekistan was a jewel of the ancient Silk Road trade network." },
    { code: "SG", name: "Singapore", flag: "🇸🇬", region: ["Asia"], color: "#ef4444", small: true, fact: "Singapore is one of only three surviving sovereign city-states in the modern world." },
    { code: "MV", name: "Maldives", flag: "🇲🇻", region: ["Asia"], color: "#16a34a", small: true, fact: "Maldives has the lowest average ground elevation of any country in the world at 1.5 meters." },
    { code: "FR", name: "France", flag: "🇫🇷", region: ["Europe"], color: "#2563eb", small: false, fact: "France spans 12 different time zones thanks to its overseas territories across the globe." },
    { code: "DE", name: "Germany", flag: "🇩🇪", region: ["Europe"], color: "#eab308", small: false, fact: "Johannes Gutenberg introduced movable-type printing in Mainz, Germany around 1450." },
    { code: "ES", name: "Spain", flag: "🇪🇸", region: ["Europe"], color: "#dc2626", small: false, fact: "Spain produces nearly half of the world's olive oil supply." },
    { code: "IT", name: "Italy", flag: "🇮🇹", region: ["Europe"], color: "#16a34a", small: false, fact: "Italy holds more UNESCO World Heritage cultural sites than any other nation." },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: ["Europe"], color: "#1d4ed8", small: false, fact: "The London Underground, opened in 1863, is the oldest rapid transit railway in the world." },
    { code: "PT", name: "Portugal", flag: "🇵🇹", region: ["Europe"], color: "#b91c1c", small: false, fact: "Lisbon is older than Rome and home to the world's oldest operating bookstore (1732)." },
    { code: "NL", name: "Netherlands", flag: "🇳🇱", region: ["Europe"], color: "#f97316", small: false, fact: "Over a quarter of the Netherlands lies below sea level and is protected by dikes." },
    { code: "BE", name: "Belgium", flag: "🇧🇪", region: ["Europe"], color: "#eab308", small: false, fact: "Belgium produces over 220,000 tons of chocolate every single year." },
    { code: "CH", name: "Switzerland", flag: "🇨🇭", region: ["Europe"], color: "#ef4444", small: false, fact: "Switzerland's Gotthard Base Tunnel is the longest and deepest railway tunnel in the world (57 km)." },
    { code: "HR", name: "Croatia", flag: "🇭🇷", region: ["Europe"], color: "#dc2626", small: false, fact: "The modern necktie originated from Croatian cravat scarves worn in the 17th century." },
    { code: "SE", name: "Sweden", flag: "🇸🇪", region: ["Europe"], color: "#0284c7", small: false, fact: "Sweden has more than 267,570 islands, the highest documented island count of any country." },
    { code: "NO", name: "Norway", flag: "🇳🇴", region: ["Europe"], color: "#dc2626", small: false, fact: "Norway's Lærdal Tunnel is the longest road tunnel in the world at 24.5 kilometers." },
    { code: "PL", name: "Poland", flag: "🇵🇱", region: ["Europe"], color: "#e11d48", small: false, fact: "Marie Skłodowska-Curie, born in Warsaw, remains the only person to win Nobel Prizes in two sciences." },
    { code: "GR", name: "Greece", flag: "🇬🇷", region: ["Europe"], color: "#0284c7", small: false, fact: "No point in Greece is more than 137 kilometers away from the Mediterranean sea." },
    { code: "IS", name: "Iceland", flag: "🇮🇸", region: ["Europe"], color: "#2563eb", small: true, fact: "Iceland generates nearly 100% of its electricity and heating from renewable geothermal and hydro energy." },
    { code: "MC", name: "Monaco", flag: "🇲🇨", region: ["Europe"], color: "#ef4444", small: true, fact: "Monaco has a land area of just over 2 square kilometers, smaller than New York's Central Park." },
    { code: "SM", name: "San Marino", flag: "🇸🇲", region: ["Europe"], color: "#38bdf8", small: true, fact: "Founded in 301 AD on Mount Titano, San Marino claims to be the oldest surviving republic." },
    { code: "MT", name: "Malta", flag: "🇲🇹", region: ["Europe"], color: "#e11d48", small: true, fact: "Malta's megalithic temples are older than Stonehenge and the Egyptian pyramids." },
    { code: "AT", name: "Austria", flag: "🇦🇹", region: ["Europe"], color: "#dc2626", small: false, fact: "The Alps cover roughly 62% of Austria's total surface area." },
    { code: "DK", name: "Denmark", flag: "🇩🇰", region: ["Europe"], color: "#b91c1c", small: false, fact: "The Dannebrog of Denmark is the oldest continuously used national flag in the world (since 1219)." },
    { code: "IE", name: "Ireland", flag: "🇮🇪", region: ["Europe"], color: "#16a34a", small: false, fact: "The harp is Ireland's official national emblem, making it the only nation with a musical instrument symbol." },
    { code: "RS", name: "Serbia", flag: "🇷🇸", region: ["Europe"], color: "#dc2626", small: false, fact: "Serbia is one of the world's top exporters of raspberries and produced 18 Roman Emperors." },
    { code: "BR", name: "Brazil", flag: "🇧🇷", region: ["SouthAmerica"], color: "#22c55e", small: false, fact: "Brazil contains 60% of the Amazon Rainforest, the most biodiverse tract of tropical rainforest on Earth." },
    { code: "AR", name: "Argentina", flag: "🇦🇷", region: ["SouthAmerica"], color: "#38bdf8", small: false, fact: "Argentina contains both the highest peak (Aconcagua) and lowest point in the Southern Hemisphere." },
    { code: "UY", name: "Uruguay", flag: "🇺🇾", region: ["SouthAmerica"], color: "#0284c7", small: true, fact: "Uruguay hosted and won the inaugural FIFA World Cup in Montevideo in 1930." },
    { code: "CO", name: "Colombia", flag: "🇨🇴", region: ["SouthAmerica"], color: "#eab308", small: false, fact: "Colombia is the only South American nation with coastlines on both the Pacific Ocean and Caribbean Sea." },
    { code: "CL", name: "Chile", flag: "🇨🇱", region: ["SouthAmerica"], color: "#dc2626", small: false, fact: "Chile's Atacama Desert is the driest non-polar desert on Earth, making it ideal for giant telescopes." },
    { code: "PE", name: "Peru", flag: "🇵🇪", region: ["SouthAmerica"], color: "#ef4444", small: false, fact: "Over 3,000 varieties of native potatoes are cultivated across the Peruvian Andes." },
    { code: "EC", name: "Ecuador", flag: "🇪🇨", region: ["SouthAmerica"], color: "#eab308", small: false, fact: "Because of Earth's equatorial bulge, the peak of Mount Chimborazo in Ecuador is the farthest point from Earth's center." },
    { code: "PY", name: "Paraguay", flag: "🇵🇾", region: ["SouthAmerica"], color: "#dc2626", small: false, fact: "Paraguay's national flag features two distinct emblems on its front and reverse sides." },
    { code: "BO", name: "Bolivia", flag: "🇧🇴", region: ["SouthAmerica"], color: "#16a34a", small: false, fact: "Salar de Uyuni in Bolivia is the world's largest salt flat at over 10,000 square kilometers." },
    { code: "VE", name: "Venezuela", flag: "🇻🇪", region: ["SouthAmerica"], color: "#eab308", small: false, fact: "Angel Falls in Venezuela is the world's highest uninterrupted waterfall with a drop of 979 meters." },
    { code: "US", name: "United States", flag: "🇺🇸", region: ["NorthAmerica"], color: "#2563eb", small: false, fact: "Yellowstone National Park, established in 1872, was the world's first national park." },
    { code: "CA", name: "Canada", flag: "🇨🇦", region: ["NorthAmerica"], color: "#ef4444", small: false, fact: "Canada has the longest coastline in the world at 243,042 kilometers and over 2 million lakes." },
    { code: "MX", name: "Mexico", flag: "🇲🇽", region: ["NorthAmerica"], color: "#16a34a", small: false, fact: "The Great Pyramid of Cholula in Mexico is the largest pyramid by volume known to exist." },
    { code: "CR", name: "Costa Rica", flag: "🇨🇷", region: ["NorthAmerica"], color: "#dc2626", small: true, fact: "Costa Rica shelters roughly 5% of the world's biodiversity despite covering just 0.03% of Earth's surface." },
    { code: "PA", name: "Panama", flag: "🇵🇦", region: ["NorthAmerica"], color: "#2563eb", small: true, fact: "Panama is the only place in the world where you can watch the sun rise on the Pacific and set on the Atlantic." },
    { code: "JM", name: "Jamaica", flag: "🇯🇲", region: ["NorthAmerica"], color: "#16a34a", small: true, fact: "Jamaica's flag is the only national flag in the world that contains no red, white, or blue." },
    { code: "CU", name: "Cuba", flag: "🇨🇺", region: ["NorthAmerica"], color: "#1d4ed8", small: false, fact: "Cuba is home to the Bee Hummingbird, the smallest living bird on Earth at just 5 cm long." },
    { code: "DO", name: "Dominican Rep.", flag: "🇩🇴", region: ["NorthAmerica"], color: "#2563eb", small: false, fact: "Santo Domingo is the oldest permanently inhabited European settlement in the Americas." },
    { code: "HN", name: "Honduras", flag: "🇭🇳", region: ["NorthAmerica"], color: "#0284c7", small: false, fact: "The five stars on the Honduran flag represent the five nations of the former Federal Republic of Central America." },
    { code: "TT", name: "Trinidad & Tobago", flag: "🇹🇹", region: ["NorthAmerica"], color: "#dc2626", small: true, fact: "Trinidad is the birthplace of the steelpan, the only acoustic musical instrument invented in the 20th century." },
    { code: "AU", name: "Australia", flag: "🇦🇺", region: ["Oceania"], color: "#eab308", small: false, fact: "The Great Barrier Reef off Australia is the largest living structure on Earth, visible from orbit." },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿", region: ["Oceania"], color: "#0284c7", small: false, fact: "New Zealand was the first self-governing country in the world to grant all women the right to vote in 1893." },
    { code: "FJ", name: "Fiji", flag: "🇫🇯", region: ["Oceania"], color: "#38bdf8", small: true, fact: "Fiji is an archipelago of more than 330 islands, of which around 110 are permanently inhabited." },
    { code: "WS", name: "Samoa", flag: "🇼🇸", region: ["Oceania"], color: "#dc2626", small: true, fact: "In 2011, Samoa skipped December 30 entirely when it shifted west of the International Date Line." },
    { code: "TO", name: "Tonga", flag: "🇹🇴", region: ["Oceania"], color: "#ef4444", small: true, fact: "Tonga spans 171 islands across the South Pacific and is known as the Friendly Islands." }
  ]
};
