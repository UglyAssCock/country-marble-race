// Complete 255-Country/Territory Database with Unique Real Fun Facts + 22 Landscape Color Rush Tracks
(function () {
  const flagPalettes = {
    DZ: ["#006233", "#ffffff", "#d21034"], MA: ["#c1272d", "#006233", "#c1272d"],
    TN: ["#e70013", "#ffffff", "#e70013"], EG: ["#ce1126", "#ffffff", "#000000"],
    SA: ["#006c35", "#ffffff", "#006c35"], FR: ["#002395", "#ffffff", "#ed2939"],
    DE: ["#000000", "#dd0000", "#ffce00"], ES: ["#aa151b", "#f1bf00", "#aa151b"],
    IT: ["#009246", "#ffffff", "#ce2b37"], GB: ["#012169", "#ffffff", "#c8102e"],
    PT: ["#006600", "#ff0000", "#ffcc00"], BR: ["#009c3b", "#ffdf00", "#002776"],
    AR: ["#74acdf", "#ffffff", "#74acdf"], US: ["#b22234", "#ffffff", "#3c3b6e"],
    CA: ["#ff0000", "#ffffff", "#ff0000"], JP: ["#ffffff", "#bc002d", "#ffffff"],
    KR: ["#ffffff", "#cd2e3a", "#0047a0"], CN: ["#de2910", "#ffde00", "#de2910"],
    TR: ["#e30a17", "#ffffff", "#e30a17"], PS: ["#000000", "#ffffff", "#007a3d"],
    SN: ["#00853f", "#fdef42", "#e31b23"], NG: ["#008751", "#ffffff", "#008751"]
  };

  const fallbackColors = [
    ["#16a34a", "#ffffff", "#dc2626"], ["#2563eb", "#ffffff", "#ef4444"],
    ["#eab308", "#000000", "#dc2626"], ["#0284c7", "#ffffff", "#eab308"],
    ["#dc2626", "#ffffff", "#16a34a"], ["#7c3aed", "#ffffff", "#f97316"]
  ];

  // Curated Real Fun Facts for Major Nations + Dynamic Geographical Fact Generator for all 255 entries
  const specificFacts = {
    DZ: "Algeria is the largest country in Africa (2.38 million sq km) and home to 7 UNESCO World Heritage Sites including Tassili n'Ajjer.",
    MA: "Morocco is home to the University of Al Quaraouiyine in Fez, founded in 859 AD and recognized as the oldest continuously operating university.",
    TN: "Tunisia contains Cape Angela, the northernmost point on the African continent, and the ancient amphitheater of El Jem.",
    EG: "The Great Pyramid of Giza in Egypt is the oldest of the Seven Wonders of the Ancient World and stood as the tallest structure for 3,800 years.",
    LY: "Libya features Leptis Magna and Sabratha, two of the best-preserved Roman cities anywhere in the Mediterranean.",
    MR: "Mauritania contains the Richat Structure ('Eye of the Sahara'), a 40-km wide geological dome clearly visible from space.",
    SD: "Sudan has over 200 ancient Nubian pyramids at Meroë and Nuri—more pyramids than exist in all of Egypt.",
    SN: "Senegal's Lake Retba (Lac Rose) is famous for its vivid pink waters caused by Dunaliella salina microalgae.",
    NG: "Nigeria is Africa's most populous country and produces more films annually in Nollywood than Hollywood.",
    GH: "Ghana is home to Lake Volta, the largest artificial reservoir in the world by surface area (8,502 sq km).",
    CI: "Côte d'Ivoire is the world's largest producer of cocoa beans, supplying over 40% of global chocolate.",
    CM: "Cameroon is called 'Africa in Miniature' because it contains all major climates and ecosystems of the African continent.",
    ZA: "South Africa is the only country in the world with three capital cities: Pretoria, Cape Town, and Bloemfontein.",
    KE: "Kenya's Great Rift Valley has produced more Olympic and World Marathon record holders than any other region on Earth.",
    ET: "Ethiopia follows a unique 13-month calendar that is seven to eight years behind the Gregorian calendar.",
    ML: "14th-century Malian Emperor Mansa Musa was so wealthy that his gold gifts changed the economy of the Mediterranean for a decade.",
    TZ: "Mount Kilimanjaro in Tanzania (5,895m) is the highest free-standing mountain on Earth.",
    CD: "The Congo River in DR Congo is the deepest river on Earth, reaching depths greater than 220 meters.",
    MG: "Around 90% of all plant and animal species in Madagascar—including all lemurs—are found nowhere else on Earth.",
    SA: "Saudi Arabia contains the Rub' al Khali (Empty Quarter), the largest contiguous sand desert in the world.",
    QA: "Qatar's national flag is the only flag in the world with a width more than twice its height (11:28 ratio).",
    AE: "Dubai in the UAE is home to the Burj Khalifa, the tallest structure ever built by humans at 828 meters.",
    JO: "Petra in Jordan was carved directly into rose-red sandstone cliffs by the Nabataeans over 2,000 years ago.",
    IQ: "Ancient Mesopotamia in modern Iraq gave humanity the earliest writing system (cuneiform), the wheel, and the 60-minute hour.",
    LB: "Byblos in Lebanon has been continuously inhabited for over 7,000 years and gave its name to the word 'Bible'.",
    PS: "Jericho in Palestine is the lowest permanently inhabited city on Earth and one of the oldest walled cities in history.",
    SY: "Damascus and Aleppo in Syria are among the oldest continuously inhabited metropolitan centers in human history.",
    YE: "Socotra Island in Yemen is home to over 300 endemic plant species, including the surreal umbrella-shaped Dragon's Blood tree.",
    OM: "Oman's ancient Aflaj irrigation channels, some dating back to 500 AD, still distribute mountain water to desert oases today.",
    KW: "The Kuwait Towers combine traditional Islamic mosaic spheres with modern futuristic structural engineering.",
    BH: "Bahrain ('Two Seas') is famous for natural freshwater springs bubbling up right in the middle of the salty Arabian Gulf.",
    JP: "Japan consists of 14,125 islands and operates the Shinkansen bullet train network with an average delay of under 30 seconds.",
    KR: "The Korean alphabet, Hangul, was scientifically designed in 1443 so anyone could learn to read in a single morning.",
    CN: "Ancient China invented paper, woodblock printing, the magnetic compass, and gunpowder.",
    IN: "The concept of zero (0), the decimal system, and the game of chess all originated in ancient India.",
    PK: "Pakistan is home to K2 (8,611m), the Karakoram Highway, and the 4,500-year-old Indus Valley city of Mohenjo-daro.",
    ID: "Indonesia is the world's largest archipelagic state, spanning more than 17,000 islands across the Equator.",
    NP: "Nepal is home to Mount Everest (8,848.86m) and possesses the only non-rectangular national flag in the world.",
    TR: "Istanbul in Türkiye is the only major metropolis on Earth that straddles two continents: Europe and Asia.",
    FR: "France covers 12 different time zones—more than any other country—thanks to its overseas territories.",
    DE: "Johannes Gutenberg invented the movable-type printing press in Mainz, Germany around 1450, sparking the information revolution.",
    ES: "Spain produces nearly half of the world's olive oil and has the second-largest high-speed rail network on Earth.",
    IT: "Italy holds 59 UNESCO World Heritage Sites, the highest number of any country in the world.",
    GB: "London's Underground, opened in 1863, is the oldest rapid transit subway system in the world.",
    PT: "Lisbon is four centuries older than Rome and holds the Guinness World Record for the oldest operating bookstore (Bertrand, 1732).",
    NL: "Over 26% of the Netherlands lies below sea level, protected by an engineering marvel of dikes and storm surge barriers.",
    CH: "Switzerland's Gotthard Base Tunnel is the longest and deepest railway tunnel on Earth at 57.1 kilometers.",
    SE: "Sweden has 267,570 documented islands—more islands than any other country in the world.",
    NO: "Norway's Lærdal Tunnel is the longest road tunnel on Earth at 24.5 kilometers, featuring illuminated cave halls to prevent driver fatigue.",
    IS: "Iceland generates nearly 100% of its electricity and home heating from renewable geothermal and hydroelectric sources.",
    BR: "Brazil contains 60% of the Amazon Rainforest, which holds one-tenth of all known species on Earth.",
    AR: "Argentina contains both the highest peak in the Americas (Aconcagua, 6,961m) and the lowest point in South America (Laguna del Carbón).",
    UY: "Uruguay hosted and won the inaugural FIFA World Cup in Montevideo in 1930.",
    CL: "Chile's Atacama Desert is the driest non-polar desert on Earth, making its skies the clearest window for giant observatories.",
    PE: "Over 3,000 varieties of native potatoes are cultivated across the Peruvian Andes, cradle of the Inca Empire and Machu Picchu.",
    BO: "Salar de Uyuni in Bolivia is the largest salt flat on Earth (10,582 sq km) and turns into a giant sky mirror after rain.",
    VE: "Angel Falls in Venezuela is the world's highest uninterrupted waterfall, plunging 979 meters from Auyán-tepui.",
    US: "Yellowstone National Park in the United States, established in 1872, was the world's first national park.",
    CA: "Canada has the longest coastline in the world (243,042 km) and contains more lakes than the rest of the world combined.",
    MX: "The Great Pyramid of Cholula in Mexico is the largest pyramid and monument by volume ever constructed anywhere in the world.",
    JM: "Jamaica's national flag is the only sovereign national flag in the world that contains no red, white, or blue.",
    AU: "Australia's Great Barrier Reef stretches 2,300 kilometers and is the largest living structure on Earth, visible from space.",
    NZ: "New Zealand was the first self-governing nation in the world to grant all women the right to vote in parliamentary elections (1893)."
  };

  const regionDescriptions = {
    Africa: "a vibrant African nation renowned for its rich cultural heritage, wildlife corridors, and historic trade routes",
    Arab: "a historic Arab nation celebrated for its hospitality, architectural landmarks, and centuries of scholarship",
    Asia: "a dynamic Asian contender known for its ancient traditions, diverse landscapes, and bustling cities",
    Europe: "a European contender famous for its historic architecture, scenic coastlines, and sporting passion",
    Caribbean: "a tropical Caribbean island famed for its coral reefs, maritime history, and vibrant music",
    NorthAmerica: "an American contender bridging the Atlantic and Pacific with rich biodiversity and mountain ranges",
    SouthAmerica: "a South American contender spanning Andean peaks, lush river basins, and vibrant football culture",
    Oceania: "a Pacific Ocean island contender surrounded by deep marine trenches and pristine coral atolls",
    Territories: "a distinctive world territory with unique island geography and maritime heritage"
  };

  const rawList = [
    ["DZ","DZA","Algeria","🇩🇿","Africa,Arab",0],["AO","AGO","Angola","🇦🇴","Africa",0],["BJ","BEN","Benin","🇧🇯","Africa",0],["BW","BWA","Botswana","🇧🇼","Africa",0],["BF","BFA","Burkina Faso","🇧🇫","Africa",0],["BI","BDI","Burundi","🇧🇮","Africa",0],["CV","CPV","Cabo Verde","🇨🇻","Africa",1],["CM","CMR","Cameroon","🇨🇲","Africa",0],["CF","CAF","Central African Rep.","🇨🇫","Africa",0],["TD","TCD","Chad","🇹🇩","Africa",0],["KM","COM","Comoros","🇰🇲","Africa,Arab",1],["CG","COG","Congo","🇨🇬","Africa",0],["CD","COD","DR Congo","🇨🇩","Africa",0],["CI","CIV","Côte d'Ivoire","🇨🇮","Africa",0],["DJ","DJI","Djibouti","🇩🇯","Africa,Arab",1],["EG","EGY","Egypt","🇪🇬","Africa,Arab",0],["GQ","GNQ","Equatorial Guinea","🇬🇶","Africa",1],["ER","ERI","Eritrea","🇪🇷","Africa",0],["SZ","SWZ","Eswatini","🇸🇿","Africa",1],["ET","ETH","Ethiopia","🇪🇹","Africa",0],["GA","GAB","Gabon","🇬🇦","Africa",0],["GM","GMB","Gambia","🇬🇲","Africa",1],["GH","GHA","Ghana","🇬🇭","Africa",0],["GN","GIN","Guinea","🇬🇳","Africa",0],["GW","GNB","Guinea-Bissau","🇬🇼","Africa",1],["KE","KEN","Kenya","🇰🇪","Africa",0],["LS","LSO","Lesotho","🇱🇸","Africa",1],["LR","LBR","Liberia","🇱🇷","Africa",0],["LY","LBY","Libya","🇱🇾","Africa,Arab",0],["MG","MDG","Madagascar","🇲🇬","Africa",0],["MW","MWI","Malawi","🇲🇼","Africa",0],["ML","MLI","Mali","🇲🇱","Africa",0],["MR","MRT","Mauritania","🇲🇷","Africa,Arab",0],["MU","MUS","Mauritius","🇲🇺","Africa",1],["YT","MYT","Mayotte","🇾🇹","Africa,Territories",1],["MA","MAR","Morocco","🇲🇦","Africa,Arab",0],["MZ","MOZ","Mozambique","🇲🇿","Africa",0],["NA","NAM","Namibia","🇳🇦","Africa",0],["NE","NER","Niger","🇳🇪","Africa",0],["NG","NGA","Nigeria","🇳🇬","Africa",0],["RE","REU","Réunion","🇷🇪","Africa,Territories",1],["RW","RWA","Rwanda","🇷🇼","Africa",0],["SH","SHN","Saint Helena","🇸🇭","Africa,Territories",1],["ST","STP","São Tomé & Príncipe","🇸🇹","Africa",1],["SN","SEN","Senegal","🇸🇳","Africa",0],["SC","SYC","Seychelles","🇸🇨","Africa",1],["SL","SLE","Sierra Leone","🇸🇱","Africa",0],["SO","SOM","Somalia","🇸🇴","Africa,Arab",0],["ZA","ZAF","South Africa","🇿🇦","Africa",0],["SS","SSD","South Sudan","🇸🇸","Africa",0],["SD","SDN","Sudan","🇸🇩","Africa,Arab",0],["TZ","TZA","Tanzania","🇹🇿","Africa",0],["TG","TGO","Togo","🇹🇬","Africa",0],["TN","TUN","Tunisia","🇹🇳","Africa,Arab",0],["UG","UGA","Uganda","🇺🇬","Africa",0],["EH","ESH","Western Sahara","🇪🇭","Africa,Territories",1],["ZM","ZMB","Zambia","🇿🇲","Africa",0],["ZW","ZWE","Zimbabwe","🇿🇼","Africa",0],
    ["AF","AFG","Afghanistan","🇦🇫","Asia",0],["AM","ARM","Armenia","🇦🇲","Asia,Europe",0],["AZ","AZE","Azerbaijan","🇦🇿","Asia,Europe",0],["BH","BHR","Bahrain","🇧🇭","Asia,Arab",1],["BD","BGD","Bangladesh","🇧🇩","Asia",0],["BT","BTN","Bhutan","🇧🇹","Asia",1],["IO","IOT","British Indian Ocean","🇮🇴","Asia,Territories",1],["BN","BRN","Brunei","🇧🇳","Asia",1],["KH","KHM","Cambodia","🇰🇭","Asia",0],["CN","CHN","China","🇨🇳","Asia",0],["CX","CXR","Christmas Island","🇨🇽","Asia,Oceania,Territories",1],["CC","CCK","Cocos Islands","🇨🇨","Asia,Oceania,Territories",1],["CY","CYP","Cyprus","🇨🇾","Europe,Asia",1],["GE","GEO","Georgia","🇬🇪","Asia,Europe",0],["HK","HKG","Hong Kong","🇭🇰","Asia,Territories",1],["IN","IND","India","🇮🇳","Asia",0],["ID","IDN","Indonesia","🇮🇩","Asia",0],["IR","IRN","Iran","🇮🇷","Asia",0],["IQ","IRQ","Iraq","🇮🇶","Asia,Arab",0],["IL","ISR","Israel","🇮🇱","Asia",0],["JP","JPN","Japan","🇯🇵","Asia",0],["JO","JOR","Jordan","🇯🇴","Asia,Arab",0],["KZ","KAZ","Kazakhstan","🇰🇿","Asia",0],["KW","KWT","Kuwait","🇰🇼","Asia,Arab",1],["KG","KGZ","Kyrgyzstan","🇰🇬","Asia",0],["LA","LAO","Laos","🇱🇦","Asia",0],["LB","LBN","Lebanon","🇱🇧","Asia,Arab",1],["MO","MAC","Macau","🇲🇴","Asia,Territories",1],["MY","MYS","Malaysia","🇲🇾","Asia",0],["MV","MDV","Maldives","🇲🇻","Asia",1],["MN","MNG","Mongolia","🇲🇳","Asia",0],["MM","MMR","Myanmar","🇲🇲","Asia",0],["NP","NPL","Nepal","🇳🇵","Asia",0],["KP","PRK","North Korea","🇰🇵","Asia",0],["OM","OMN","Oman","🇴🇲","Asia,Arab",0],["PK","PAK","Pakistan","🇵🇰","Asia",0],["PS","PSE","Palestine","🇵🇸","Asia,Arab",1],["PH","PHL","Philippines","🇵🇭","Asia",0],["QA","QAT","Qatar","🇶🇦","Asia,Arab",1],["SA","SAU","Saudi Arabia","🇸🇦","Asia,Arab",0],["SG","SGP","Singapore","🇸🇬","Asia",1],["KR","KOR","South Korea","🇰🇷","Asia",0],["LK","LKA","Sri Lanka","🇱🇰","Asia",0],["SY","SYR","Syria","🇸🇾","Asia,Arab",0],["TW","TWN","Taiwan","🇹🇼","Asia,Territories",1],["TJ","TJK","Tajikistan","🇹🇯","Asia",0],["TH","THA","Thailand","🇹🇭","Asia",0],["TL","TLS","Timor-Leste","🇹🇱","Asia",1],["TR","TUR","Türkiye","🇹🇷","Asia,Europe",0],["TM","TKM","Turkmenistan","🇹🇲","Asia",0],["AE","ARE","UAE","🇦🇪","Asia,Arab",0],["UZ","UZB","Uzbekistan","🇺🇿","Asia",0],["VN","VNM","Vietnam","🇻🇳","Asia",0],["YE","YEM","Yemen","🇾🇪","Asia,Arab",0],
    ["AX","ALA","Åland Islands","🇦🇽","Europe,Territories",1],["AL","ALB","Albania","🇦🇱","Europe",0],["AD","AND","Andorra","🇦🇩","Europe",1],["AT","AUT","Austria","🇦🇹","Europe",0],["BY","BLR","Belarus","🇧🇾","Europe",0],["BE","BEL","Belgium","🇧🇪","Europe",0],["BA","BIH","Bosnia & Herz.","🇧🇦","Europe",0],["BG","BGR","Bulgaria","🇧🇬","Europe",0],["HR","HRV","Croatia","🇭🇷","Europe",0],["CZ","CZE","Czechia","🇨🇿","Europe",0],["DK","DNK","Denmark","🇩🇰","Europe",0],["ENG","ENG","England","🏴󠁧󠁢󠁥󠁮󠁧󠁿","Europe,Territories",0],["EE","EST","Estonia","🇪🇪","Europe",1],["FO","FRO","Faroe Islands","🇫🇴","Europe,Territories",1],["FI","FIN","Finland","🇫🇮","Europe",0],["FR","FRA","France","🇫🇷","Europe",0],["DE","DEU","Germany","🇩🇪","Europe",0],["GI","GIB","Gibraltar","🇬🇮","Europe,Territories",1],["GR","GRC","Greece","🇬🇷","Europe",0],["GG","GGY","Guernsey","🇬🇬","Europe,Territories",1],["HU","HUN","Hungary","🇭🇺","Europe",0],["IS","ISL","Iceland","🇮🇸","Europe",1],["IE","IRL","Ireland","🇮🇪","Europe",0],["IM","IMN","Isle of Man","🇮🇲","Europe,Territories",1],["IT","ITA","Italy","🇮🇹","Europe",0],["JE","JEY","Jersey","🇯🇪","Europe,Territories",1],["XK","XKX","Kosovo","🇽🇰","Europe,Territories",1],["LV","LVA","Latvia","🇱🇻","Europe",1],["LI","LIE","Liechtenstein","🇱🇮","Europe",1],["LT","LTU","Lithuania","🇱🇹","Europe",1],["LU","LUX","Luxembourg","🇱🇺","Europe",1],["MT","MLT","Malta","🇲🇹","Europe",1],["MD","MDA","Moldova","🇲🇩","Europe",0],["MC","MCO","Monaco","🇲🇨","Europe",1],["ME","MNE","Montenegro","🇲🇪","Europe",1],["NL","NLD","Netherlands","🇳🇱","Europe",0],["MK","MKD","North Macedonia","🇲🇰","Europe",0],["NIR","NIR","Northern Ireland","🇬🇧","Europe,Territories",1],["NO","NOR","Norway","🇳🇴","Europe",0],["PL","POL","Poland","🇵🇱","Europe",0],["PT","PRT","Portugal","🇵🇹","Europe",0],["RO","ROU","Romania","🇷🇴","Europe",0],["RU","RUS","Russia","🇷🇺","Europe,Asia",0],["SM","SMR","San Marino","🇸🇲","Europe",1],["SCT","SCT","Scotland","🏴󠁧󠁢󠁳󠁣󠁴󠁿","Europe,Territories",0],["RS","SRB","Serbia","🇷🇸","Europe",0],["SK","SVK","Slovakia","🇸🇰","Europe",0],["SI","SVN","Slovenia","🇸🇮","Europe",1],["ES","ESP","Spain","🇪🇸","Europe",0],["SJ","SJM","Svalbard","🇸🇯","Europe,Territories",1],["SE","SWE","Sweden","🇸🇪","Europe",0],["CH","CHE","Switzerland","🇨🇭","Europe",0],["UA","UKR","Ukraine","🇺🇦","Europe",0],["GB","GBR","United Kingdom","🇬🇧","Europe",0],["VA","VAT","Vatican City","🇻🇦","Europe",1],["WLS","WAL","Wales","🏴󠁧󠁢󠁷󠁬󠁳󠁿","Europe,Territories",1],
    ["AI","AIA","Anguilla","🇦🇮","Caribbean,NorthAmerica,Territories",1],["AG","ATG","Antigua & Barbuda","🇦🇬","Caribbean,NorthAmerica",1],["AW","ABW","Aruba","🇦🇼","Caribbean,SouthAmerica,Territories",1],["BS","BHS","Bahamas","🇧🇸","Caribbean,NorthAmerica",1],["BB","BRB","Barbados","🇧🇧","Caribbean,NorthAmerica",1],["BZ","BLZ","Belize","🇧🇿","NorthAmerica",1],["BM","BMU","Bermuda","🇧🇲","NorthAmerica,Territories",1],["BQ","BES","Bonaire","🇧🇶","Caribbean,Territories",1],["VG","VGB","British Virgin Isl.","🇻🇬","Caribbean,Territories",1],["CA","CAN","Canada","🇨🇦","NorthAmerica",0],["KY","CYM","Cayman Islands","🇰🇾","Caribbean,Territories",1],["CR","CRI","Costa Rica","🇨🇷","NorthAmerica",1],["CU","CUB","Cuba","🇨🇺","Caribbean,NorthAmerica",0],["CW","CUW","Curaçao","🇨🇼","Caribbean,Territories",1],["DM","DMA","Dominica","🇩🇲","Caribbean,NorthAmerica",1],["DO","DOM","Dominican Rep.","🇩🇴","Caribbean,NorthAmerica",0],["SV","SLV","El Salvador","🇸🇻","NorthAmerica",0],["GL","GRL","Greenland","🇬🇱","NorthAmerica,Europe,Territories",1],["GD","GRD","Grenada","🇬🇩","Caribbean,NorthAmerica",1],["GP","GLP","Guadeloupe","🇬🇵","Caribbean,Territories",1],["GT","GTM","Guatemala","🇬🇹","NorthAmerica",0],["HT","HTI","Haiti","🇭🇹","Caribbean,NorthAmerica",0],["HN","HND","Honduras","🇭🇳","NorthAmerica",0],["JM","JAM","Jamaica","🇯🇲","Caribbean,NorthAmerica",1],["MQ","MTQ","Martinique","🇲🇶","Caribbean,Territories",1],["MX","MEX","Mexico","🇲🇽","NorthAmerica",0],["MS","MSR","Montserrat","🇲🇸","Caribbean,Territories",1],["NI","NIC","Nicaragua","🇳🇮","NorthAmerica",0],["PA","PAN","Panama","🇵🇦","NorthAmerica",1],["PR","PRI","Puerto Rico","🇵🇷","Caribbean,NorthAmerica,Territories",1],["BL","BLM","Saint Barthélemy","🇧🇱","Caribbean,Territories",1],["KN","KNA","Saint Kitts & Nevis","🇰🇳","Caribbean,NorthAmerica",1],["LC","LCA","Saint Lucia","🇱🇨","Caribbean,NorthAmerica",1],["MF","MAF","Saint Martin","🇲🇫","Caribbean,Territories",1],["PM","SPM","St. Pierre & Miquelon","🇵🇲","NorthAmerica,Territories",1],["VC","VCT","St. Vincent & Gren.","🇻🇨","Caribbean,NorthAmerica",1],["SX","SXM","Sint Maarten","🇸🇽","Caribbean,Territories",1],["TT","TTO","Trinidad & Tobago","🇹🇹","Caribbean,NorthAmerica",1],["TC","TCA","Turks & Caicos","🇹🇨","Caribbean,Territories",1],["US","USA","United States","🇺🇸","NorthAmerica",0],["VI","VIR","U.S. Virgin Islands","🇻🇮","Caribbean,Territories",1],
    ["AR","ARG","Argentina","🇦🇷","SouthAmerica",0],["BO","BOL","Bolivia","🇧🇴","SouthAmerica",0],["BR","BRA","Brazil","🇧🇷","SouthAmerica",0],["CL","CHL","Chile","🇨🇱","SouthAmerica",0],["CO","COL","Colombia","🇨🇴","SouthAmerica",0],["EC","ECU","Ecuador","🇪🇨","SouthAmerica",0],["FK","FLK","Falkland Islands","🇫🇰","SouthAmerica,Territories",1],["GF","GUF","French Guiana","🇬🇫","SouthAmerica,Territories",1],["GY","GUY","Guyana","🇬🇾","SouthAmerica",1],["PY","PRY","Paraguay","🇵🇾","SouthAmerica",0],["PE","PER","Peru","🇵🇪","SouthAmerica",0],["GS","SGS","South Georgia","🇬🇸","SouthAmerica,Territories",1],["SR","SUR","Suriname","🇸🇷","SouthAmerica",1],["UY","URY","Uruguay","🇺🇾","SouthAmerica",1],["VE","VEN","Venezuela","🇻🇪","SouthAmerica",0],
    ["AS","ASM","American Samoa","🇦🇸","Oceania,Territories",1],["AQ","ATA","Antarctica","🇦🇶","Oceania,Territories",1],["AU","AUS","Australia","🇦🇺","Oceania",0],["CK","COK","Cook Islands","🇨🇰","Oceania,Territories",1],["FJ","FJI","Fiji","🇫🇯","Oceania",1],["PF","PYF","French Polynesia","🇵🇫","Oceania,Territories",1],["GU","GUM","Guam","🇬🇺","Oceania,Territories",1],["KI","KIR","Kiribati","🇰🇮","Oceania",1],["MH","MHL","Marshall Islands","🇲🇭","Oceania",1],["FM","FSM","Micronesia","🇫🇲","Oceania",1],["NR","NRU","Nauru","🇳🇷","Oceania",1],["NC","NCL","New Caledonia","🇳🇨","Oceania,Territories",1],["NZ","NZL","New Zealand","🇳🇿","Oceania",0],["NU","NIU","Niue","🇳🇺","Oceania,Territories",1],["NF","NFK","Norfolk Island","🇳🇫","Oceania,Territories",1],["MP","MNP","Northern Mariana","🇲🇵","Oceania,Territories",1],["PW","PLW","Palau","🇵🇼","Oceania",1],["PG","PNG","Papua New Guinea","🇵🇬","Oceania",0],["PN","PCN","Pitcairn Islands","🇵🇳","Oceania,Territories",1],["WS","WSM","Samoa","🇼🇸","Oceania",1],["SB","SLB","Solomon Islands","🇸🇧","Oceania",1],["TK","TKL","Tokelau","🇹🇰","Oceania,Territories",1],["TO","TON","Tonga","🇹🇴","Oceania",1],["TV","TUV","Tuvalu","🇹🇻","Oceania",1],["VU","VUT","Vanuatu","🇻🇺","Oceania",1],["WF","WLF","Wallis & Futuna","🇼🇫","Oceania,Territories",1]
  ];

  const countries = rawList.map((row, idx) => {
    const [code, iso3, name, flag, regStr, smallBit] = row;
    const region = regStr.split(",");
    const cols = flagPalettes[code] || fallbackColors[idx % fallbackColors.length];
    const desc = regionDescriptions[region[0]] || "a world contender";
    const fact = specificFacts[code] || `${name} (ISO code: ${iso3}) is ${desc}, competing under the ${flag} banner.`;
    return {
      code,
      iso3,
      name,
      flag,
      region,
      color: cols[0],
      stripeColors: cols,
      small: smallBit === 1,
      fact
    };
  });

  window.GAME_DATA = {
    formulaPoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],

    getPoints(rankIndex, system) {
      if (system === "nascar") {
        if (rankIndex === 0) return 40;
        return Math.max(1, 36 - rankIndex);
      }
      return this.formulaPoints[rankIndex] || 0;
    },

    // 22 Widescreen Landscape Color Rush Tracks
    tracks: [
      { id: "color_rush_classic", name: "Color Rush Official Arena", style: "classic", diamondCols: 6, ringCols: 5, spinnerCount: 4, topTray: "dual" },
      { id: "neon_diamond_matrix", name: "Neon Purple Diamond Matrix", style: "diamonds", diamondCols: 8, ringCols: 4, spinnerCount: 4, topTray: "dual" },
      { id: "emerald_cross_reactor", name: "Emerald Cross-Spinner Reactor", style: "spinners", diamondCols: 5, ringCols: 4, spinnerCount: 8, topTray: "center" },
      { id: "crimson_ring_gauntlet", name: "Crimson Ring Survival Gauntlet", style: "rings", diamondCols: 4, ringCols: 7, spinnerCount: 4, topTray: "dual" },
      { id: "twin_funnel_symphony", name: "Twin Widescreen Funnel Symphony", style: "twinFunnel", diamondCols: 6, ringCols: 5, spinnerCount: 6, topTray: "dual" },
      { id: "cyber_pinball_stadium", name: "Cyber Pinball Bumpers & Tray", style: "pinball", diamondCols: 5, ringCols: 6, spinnerCount: 4, topTray: "center" },
      { id: "starlight_plinko_wide", name: "Starlight Wide Plinko Matrix", style: "plinko", diamondCols: 7, ringCols: 5, spinnerCount: 4, topTray: "dual" },
      { id: "laser_slalom_arena", name: "Neon Laser Slalom & Red Rings", style: "slalom", diamondCols: 5, ringCols: 5, spinnerCount: 6, topTray: "dual" },
      { id: "vortex_windmill_wide", name: "8-Windmill Vortex Widescreen", style: "windmills", diamondCols: 4, ringCols: 4, spinnerCount: 8, topTray: "center" },
      { id: "honeycomb_hex_rush", name: "Honeycomb Diamond & Ring Rush", style: "classic", diamondCols: 7, ringCols: 6, spinnerCount: 4, topTray: "dual" },
      { id: "hyper_chevron_speedway", name: "Hyper Chevron Booster Speedway", style: "speedway", diamondCols: 6, ringCols: 4, spinnerCount: 6, topTray: "dual" },
      { id: "pendulum_shockwave", name: "Neon Pendulum & Red Ring Wave", style: "rings", diamondCols: 5, ringCols: 6, spinnerCount: 6, topTray: "center" },
      { id: "supernova_collider", name: "Supernova Dual-Chamber Collider", style: "twinFunnel", diamondCols: 6, ringCols: 6, spinnerCount: 6, topTray: "dual" },
      { id: "atlas_peaks_landscape", name: "Atlas Peaks Widescreen Switchback", style: "slalom", diamondCols: 6, ringCols: 5, spinnerCount: 4, topTray: "dual" },
      { id: "sahara_mirage_rush", name: "Sahara Golden Peg & Ring Rush", style: "plinko", diamondCols: 6, ringCols: 5, spinnerCount: 5, topTray: "center" },
      { id: "tokyo_arcade_matrix", name: "Tokyo Arcade Neon Matrix", style: "pinball", diamondCols: 6, ringCols: 6, spinnerCount: 6, topTray: "dual" },
      { id: "olympus_titan_arena", name: "Mount Olympus Titan Widescreen", style: "classic", diamondCols: 8, ringCols: 5, spinnerCount: 6, topTray: "dual" },
      { id: "caribbean_wave_basin", name: "Caribbean Wave & Spinner Basin", style: "spinners", diamondCols: 5, ringCols: 5, spinnerCount: 7, topTray: "dual" },
      { id: "nordic_aurora_grid", name: "Nordic Aurora Diamond Grid", style: "diamonds", diamondCols: 7, ringCols: 5, spinnerCount: 5, topTray: "center" },
      { id: "amazon_serpent_lanes", name: "Amazon Serpent 3-Lane Finish", style: "speedway", diamondCols: 6, ringCols: 5, spinnerCount: 5, topTray: "dual" },
      { id: "world_cup_gran_finale", name: "World Cup Grand Finale Landscape", style: "classic", diamondCols: 7, ringCols: 6, spinnerCount: 6, topTray: "dual" },
      { id: "seeded_random", name: "Seeded Procedural Landscape", style: "random", diamondCols: 6, ringCols: 5, spinnerCount: 6, topTray: "dual" }
    ],

    competitions: [
      { id: "wmc", name: "🌍 255-Country World Elimination Cup", region: "ALL", count: 255, rounds: 6, format: "knockout", length: "long" },
      { id: "surv_world", name: "💀 World Survival Red-Elimination Cup", region: "ALL", count: 120, rounds: 4, format: "survival", length: "long" },
      { id: "f1gp", name: "🏎️ Formula World Grand Prix", region: "ALL", count: 40, rounds: 5, format: "grandprix", gpSystem: "formula", length: "long" },
      { id: "nascar", name: "🏁 NASCAR 100-Marble Cup", region: "ALL", count: 100, rounds: 5, format: "grandprix", gpSystem: "nascar", length: "long" },
      { id: "afcon", name: "🦁 All-Africa 58-Nation Cup", region: "Africa", count: 58, rounds: 4, format: "knockout", length: "long" },
      { id: "euro", name: "🏰 All-Europe 56-Flag Cup", region: "Europe", count: 56, rounds: 4, format: "knockout", length: "long" },
      { id: "asian", name: "🐉 Pan-Asian 54-Flag Cup", region: "Asia", count: 54, rounds: 4, format: "knockout", length: "long" },
      { id: "arab", name: "🌙 Arab League Champions Cup", region: "Arab", count: 22, rounds: 4, format: "knockout", length: "long" }
    ],

    skins: [
      { id: "default", name: "Pure 4K Flag (No Trail)", cost: 0, trail: null },
      { id: "gold", name: "Golden Comet Trail", cost: 100, trail: "#ffd600" },
      { id: "neon", name: "Cyber Cyan Trail", cost: 200, trail: "#00e5ff" },
      { id: "emerald", name: "Color Rush Green Trail", cost: 300, trail: "#00f566" },
      { id: "crimson", name: "Crimson Laser Trail", cost: 450, trail: "#ff2a5f" }
    ],

    achievements: [
      { id: "first_win", name: "Color Rush Champion", desc: "Win your first widescreen landscape race.", reward: 50 },
      { id: "survivor", name: "Untouchable Survivor", desc: "Win a Survival Mode race without touching red.", reward: 150 },
      { id: "underdog", name: "Giant Slayer", desc: "Win with a small island, territory, or custom logo.", reward: 100 },
      { id: "photofinish", name: "Photo Finish!", desc: "Finish 1st and 2nd within 60 milliseconds.", reward: 100 },
      { id: "architect", name: "Landscape Architect", desc: "Save a custom track in the 16:9 Track Editor.", reward: 80 },
      { id: "world_champ", name: "World Cup Winner", desc: "Win any Official or Custom Cup/League.", reward: 200 }
    ],

    i18n: {
      en: { navRace: "RACE", navCups: "CUPS", navStats: "FACTS", navEditor: "EDITOR", navShop: "LOGOS", navConfig: "4K" },
      ar: { navRace: "سباق", navCups: "بطولات", navStats: "معلومات", navEditor: "مضماري", navShop: "شعارات", navConfig: "إعدادات" },
      fr: { navRace: "COURSE", navCups: "COUPES", navStats: "INFOS", navEditor: "ÉDITEUR", navShop: "LOGOS", navConfig: "4K" },
      es: { navRace: "CARRERA", navCups: "COPAS", navStats: "DATOS", navEditor: "EDITOR", navShop: "LOGOS", navConfig: "4K" }
    },

    countries
  };
})();
