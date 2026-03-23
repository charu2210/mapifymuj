/* ════════════════════════════════════════
   MapifyMUJ · script.js
   Shared data + helpers used by all pages
════════════════════════════════════════ */

/* ── ROOM DATA ── */
const ROOMS = {
  AB1: {
    "1st Floor": [
      {num:"110",type:"Classroom"},{num:"109",type:"Classroom"},{num:"108",type:"Classroom"},
      {num:"107",type:"Classroom"},{num:"131",type:"Classroom"},{num:"130",type:"Classroom"},
      {num:"129",type:"Classroom"},{num:"128",type:"Classroom"},{num:"119",type:"Classroom"},
      {num:"118A",type:"Classroom"},{num:"118B",type:"Classroom"},{num:"118D",type:"Classroom"},
      {num:"117A",type:"Classroom"},{num:"117B",type:"Classroom"},{num:"117C",type:"Classroom"},
      {num:"117D",type:"Classroom"},
      {num:"111",type:"Lab"},{num:"112",type:"Lab"},{num:"113",type:"Lab"},{num:"114",type:"Lab"},
      {num:"115",type:"Lab"},{num:"116",type:"Lab"},{num:"104",type:"Lab"},{num:"103",type:"Lab"},
      {num:"101",type:"Lab"},{num:"126",type:"Lab"},{num:"123",type:"Lab"},{num:"122",type:"Lab"},
      {num:"121",type:"Lab"},{num:"120",type:"Lab"},
      {num:"106",type:"Management Room"},{num:"102",type:"Management Room"},
      {num:"125",type:"Management Room"},{num:"124",type:"Management Room"},
      {num:"105",type:"Seminar Room"},
    ],
    "2nd Floor": [
      {num:"209",type:"Classroom"},{num:"210",type:"Classroom"},{num:"211",type:"Classroom"},
      {num:"217",type:"Classroom"},{num:"219",type:"Classroom"},{num:"220",type:"Classroom"},
      {num:"221",type:"Classroom"},{num:"222",type:"Classroom"},{num:"223",type:"Classroom"},
      {num:"202",type:"Lab"},{num:"203",type:"Lab"},{num:"204",type:"Lab"},{num:"205",type:"Lab"},
      {num:"229",type:"Faculty Room"},{num:"228",type:"Faculty Room"},
      {num:"227",type:"Faculty Room"},{num:"226",type:"Faculty Room"},
    ],
    "3rd Floor": [
      {num:"309",type:"Classroom"},{num:"310",type:"Classroom"},{num:"311",type:"Classroom"},
      {num:"312",type:"Classroom"},{num:"319",type:"Classroom"},{num:"320",type:"Classroom"},
      {num:"321B",type:"Classroom"},{num:"322",type:"Classroom"},{num:"323",type:"Classroom"},
      {num:"326",type:"Classroom"},{num:"327",type:"Classroom"},{num:"328",type:"Classroom"},
      {num:"329",type:"Classroom"},
      {num:"301",type:"Lab"},{num:"302",type:"Lab"},{num:"303",type:"Lab"},{num:"304",type:"Lab"},
      {num:"305",type:"Lab"},{num:"306",type:"Lab"},{num:"308",type:"Lab"},{num:"313",type:"Lab"},
      {num:"314",type:"Lab"},{num:"315",type:"Lab"},{num:"316",type:"Lab"},{num:"317",type:"Lab"},
      {num:"318",type:"Lab"},
      {num:"324A",type:"Other"},{num:"324B",type:"Other"},{num:"325",type:"Other"},
    ],
  },
  AB2: {
    "1st Floor": [
      {num:"101",type:"Classroom"},{num:"102",type:"Classroom"},{num:"103",type:"Classroom"},
      {num:"104",type:"Classroom"},{num:"Lab 101",type:"Lab"},{num:"Lab 102",type:"Lab"},
      {num:"Faculty",type:"Faculty Room"},
    ],
    "2nd Floor": [
      {num:"201",type:"Classroom"},{num:"202",type:"Classroom"},{num:"213",type:"Classroom"},
      {num:"204",type:"Classroom"},{num:"Lab 213",type:"Lab"},{num:"Faculty",type:"Faculty Room"},
    ],
    "3rd Floor": [
      {num:"301",type:"Classroom"},{num:"302",type:"Classroom"},{num:"127",type:"Classroom"},
      {num:"304",type:"Classroom"},{num:"305",type:"Classroom"},{num:"HOD Cabin",type:"Faculty Room"},
    ],
  },
  AB3: {
    "Ground Floor": [
      {num:"008",type:"Classroom"},{num:"009",type:"Classroom"},{num:"010",type:"Classroom"},
      {num:"011",type:"Classroom"},{num:"012",type:"Classroom"},{num:"013",type:"Classroom"},
      {num:"015",type:"Classroom"},{num:"016",type:"Classroom"},{num:"017",type:"Classroom"},
      {num:"018",type:"Classroom"},{num:"019",type:"Classroom"},
      {num:"001",type:"Lab"},{num:"002",type:"Lab"},{num:"003",type:"Lab"},
      {num:"004",type:"Lab"},{num:"005",type:"Lab"},{num:"007",type:"Lab"},{num:"014",type:"Lab"},
      {num:"006",type:"Discussion Room"},
    ],
    "1st Floor": [
      {num:"101",type:"Classroom"},{num:"102",type:"Classroom"},{num:"103",type:"Classroom"},
      {num:"104",type:"Classroom"},{num:"105",type:"Classroom"},{num:"106",type:"Classroom"},
      {num:"107",type:"Classroom"},{num:"108",type:"Classroom"},{num:"109",type:"Classroom"},
      {num:"110",type:"Classroom"},{num:"111",type:"Classroom"},{num:"112",type:"Classroom"},
      {num:"113",type:"Classroom"},{num:"114",type:"Classroom"},{num:"115",type:"Classroom"},
      {num:"116",type:"Classroom"},{num:"117",type:"Classroom"},{num:"118",type:"Classroom"},
      {num:"119",type:"Classroom"},
      {num:"Moot Court",type:"Special Room"},{num:"120",type:"PhD Room"},
    ],
    "2nd Floor": [
      {num:"201",type:"Room"},{num:"206",type:"Room"},{num:"207",type:"Room"},
      {num:"208",type:"Room"},{num:"209",type:"Room"},{num:"210",type:"Room"},
      {num:"211",type:"Room"},{num:"212",type:"Room"},{num:"213",type:"Room"},
      {num:"214",type:"Room"},{num:"215",type:"Room"},{num:"216",type:"Room"},
      {num:"217",type:"Room"},{num:"218",type:"Room"},{num:"219",type:"Room"},
      {num:"220",type:"Room"},{num:"221",type:"Room"},{num:"222",type:"Room"},
      {num:"223",type:"Room"},
      {num:"202",type:"Faculty Cabin"},{num:"203",type:"Faculty Cabin"},
      {num:"204",type:"Faculty Cabin"},{num:"205",type:"Discussion Room"},
      {num:"Conf. Room",type:"Conference Room"},
    ],
  },
  LHC: {
    "Ground Floor": [
      {num:"001",type:"Lecture Hall"},{num:"002",type:"Lecture Hall"},
      {num:"003",type:"Lecture Hall"},{num:"004",type:"Lecture Hall"},
    ],
    "1st Floor": [
      {num:"101",type:"Lecture Hall"},{num:"102",type:"Lecture Hall"},
      {num:"103",type:"Lecture Hall"},{num:"104",type:"Lecture Hall"},
      {num:"Disc. Room 1",type:"Discussion Room"},{num:"Disc. Room 2",type:"Discussion Room"},
    ],
    "2nd Floor": [
      {num:"201",type:"Classroom"},{num:"202",type:"Classroom"},{num:"203",type:"Classroom"},
      {num:"204",type:"Classroom"},{num:"205",type:"Classroom"},{num:"206",type:"Classroom"},
      {num:"207",type:"Classroom"},{num:"208",type:"Classroom"},{num:"209",type:"Classroom"},
      {num:"210",type:"Classroom"},{num:"211",type:"Classroom"},{num:"212",type:"Classroom"},
      {num:"213",type:"Classroom"},{num:"214",type:"Classroom"},{num:"215",type:"Classroom"},
      {num:"216",type:"Classroom"},{num:"217",type:"Classroom"},{num:"218",type:"Classroom"},
      {num:"219",type:"Classroom"},{num:"220",type:"Classroom"},
    ],
    "3rd Floor": [{num:"Cabins",type:"Cabin Area"}],
  },
};

/* ── BUILDING META ── */
const BUILDING_META = {
  AB1: {label:"Academic Block 1", short:"AB-1", emoji:"🏢", accent:"#8B7CC8", light:"#EEE8FF"},
  AB2: {label:"Academic Block 2", short:"AB-2", emoji:"🏢", accent:"#E87D4A", light:"#FFF0E6"},
  AB3: {label:"Academic Block 3", short:"AB-3", emoji:"🏢", accent:"#4AABAA", light:"#E0F7F6"},
  LHC: {label:"Lecture Hall Complex", short:"LHC", emoji:"🎓", accent:"#9B8EC4", light:"#EDE8FF"},
};

/* ── TIMETABLE ── */
const TIMETABLE = {
  MON: [
    null,
    {code:"MAS2001",name:"Statistics & Probability",         faculty:"Dr. Vijaypal Poonia",      room:"127",building:"AB2"},
    {code:"DSE2240",name:"Cloud Computing",                  faculty:"Dr. Malvinder Singh Bali", room:"127",building:"AB2"},
    {code:"DSE2231",name:"Computer Networks Lab",            faculty:"Dr. Santosh Rajak",        room:"213",building:"AB2",isLab:true},
    {code:"DSE2231",name:"Computer Networks Lab",            faculty:"Dr. Santosh Rajak",        room:"213",building:"AB2",isLab:true},
  ],
  TUE: [
    {code:"DSE2230",name:"RDBMS Lab",                        faculty:"Dr. Shitanshu Jain",       room:"213",building:"AB2",isLab:true},
    {code:"DSE2230",name:"RDBMS Lab",                        faculty:"Dr. Shitanshu Jain",       room:"213",building:"AB2",isLab:true},
    {code:"DSE2201",name:"Relational DB Mgmt. Systems",      faculty:"Dr. Neeraj Kumar Verma",   room:"127",building:"AB2"},
    {code:"DSE2202",name:"Computer Networks",                faculty:"Dr. Santosh Rajak",        room:"127",building:"AB2"},
    {code:"MAS2001",name:"Statistics & Probability",         faculty:"Dr. Vijaypal Poonia",      room:"127",building:"AB2"},
  ],
  WED: [
    {code:"DSE2220",name:"Machine Learning",                 faculty:"Mr. Ashish Pandey",        room:"127",building:"AB2"},
    {code:"DSE2201",name:"Relational DB Mgmt. Systems",      faculty:"Dr. Neeraj Kumar Verma",   room:"127",building:"AB2"},
    {code:"MAS2001",name:"Statistics & Probability",         faculty:"Dr. Vijaypal Poonia",      room:"127",building:"AB2"},
    {code:"DSE2202",name:"Computer Networks",                faculty:"Dr. Santosh Rajak",        room:"127",building:"AB2"},
    {code:"DSE2202",name:"Computer Networks",                faculty:"Dr. Santosh Rajak",        room:"127",building:"AB2"},
  ],
  THU: [
    {code:"DSE2240",name:"Cloud Computing",                  faculty:"Dr. Malvinder Singh Bali", room:"127",building:"AB2"},
    {code:"DSE2202",name:"Computer Networks",                faculty:"Dr. Santosh Rajak",        room:"127",building:"AB2"},
    {code:"DSE2201",name:"Relational DB Mgmt. Systems",      faculty:"Dr. Neeraj Kumar Verma",   room:"127",building:"AB2"},
    {code:"DSE2220",name:"Machine Learning",                 faculty:"Mr. Ashish Pandey",        room:"127",building:"AB2"},
    {code:"DSE2220",name:"Machine Learning",                 faculty:"Mr. Ashish Pandey",        room:"127",building:"AB2"},
  ],
  FRI: [
    null,
    {code:"DSE2229",name:"Machine Learning",                 faculty:"Mr. Ashish Pandey",        room:"127",building:"AB2"},
    {code:"DSE2270",name:"PBL-2",                            faculty:"Dr. Santosh Rajak",        room:"127",building:"AB2"},
    {code:"DSE2240",name:"Cloud Computing",                  faculty:"Dr. Malvinder Singh Bali", room:"127",building:"AB2"},
    {code:"DSE2201",name:"Relational DB Mgmt. Systems",      faculty:"Dr. Neeraj Kumar Verma",   room:"127",building:"AB2"},
  ],
};

const SLOTS = [
  {time:"9:00–9:50"},
  {time:"9:50–10:40"},
  {time:"10:40–11:30"},
  {time:"11:30–12:20"},
  {time:"12:20–1:10"},
];

/* ── ATTENDANCE ── */
const ATTENDANCE = {
  DSE2201:{a:18,t:22}, DSE2202:{a:20,t:22}, DSE2220:{a:15,t:20},
  DSE2240:{a:12,t:18}, DSE2230:{a:8, t:10}, DSE2231:{a:9, t:10},
  DSE2270:{a:6, t:8 }, MAS2001:{a:19,t:22}, DSE2229:{a:14,t:18},
};

/* ── HELPERS ── */

/** Returns bg/color/icon for a room type */
function roomStyle(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("lab"))                                  return {bg:"#E8F5E9", color:"#2E7D32", icon:"🧪"};
  if (t.includes("faculty") || t.includes("cabin"))      return {bg:"#FFF3E0", color:"#E65100", icon:"👤"};
  if (t.includes("lecture"))                             return {bg:"#E3F2FD", color:"#1565C0", icon:"🎓"};
  if (t.includes("seminar")||t.includes("discussion")||
      t.includes("conference")||t.includes("moot"))      return {bg:"#F3E5F5", color:"#6A1B9A", icon:"💬"};
  if (t.includes("management"))                          return {bg:"#FCE4EC", color:"#880E4F", icon:"🗂️"};
  if (t.includes("special")||t.includes("phd"))         return {bg:"#FFF8E1", color:"#F57F17", icon:"⭐"};
  if (t.includes("other")||t.includes("cabin area"))    return {bg:"#EFEBE9", color:"#4E342E", icon:"📦"};
  return {bg:"#F5F5F8", color:"#444", icon:"🚪"};
}

/** SVG attendance ring */
function makeRing(pct, size) {
  size = size || 44;
  const r = size * 0.3, cx = size / 2, cy = size / 2;
  const c = 2 * Math.PI * r;
  const col = pct >= 75 ? "#4CAF50" : pct >= 60 ? "#FF8C42" : "#FF4C4C";
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F0F0F0" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="3"
      stroke-dasharray="${(pct/100)*c} ${c}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy+3.5}" text-anchor="middle" font-size="${size*0.2}"
      font-weight="800" fill="${col}" font-family="DM Sans,sans-serif">${pct}%</text>
  </svg>`;
}
