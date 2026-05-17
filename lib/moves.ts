// 2K LAB — NBA 2K26 Moves data layer
// Inputs verified against 2K26 patch 1.7.

export type Button =
  | "L1"
  | "L2"
  | "R1"
  | "R2"
  | "CIRCLE"
  | "CROSS"
  | "TRIANGLE"
  | "SQUARE"
  | "LS"
  | "RS";

export type Direction =
  | "N"
  | "S"
  | "E"
  | "W"
  | "NE"
  | "NW"
  | "SE"
  | "SW";

export type Category =
  | "dribble"
  | "signature"
  | "post"
  | "defense"
  | "shooting"
  | "pass"
  | "layup";

export type InputStep = {
  btn: Button;
  dir?: Direction;
  hold?: boolean;
  flick?: boolean;
  label?: string;
};

export type Move = {
  id: string;
  name: string;
  category: Category;
  owner: string;
  inputs: InputStep[];
  situation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  requiresBadge?: { badge: string; tier: "S" | "A" | "B" | "C" };
  sizeReq?: "G" | "W" | "B" | "ANY";
  durationMs: number;
  popularity: number; // 0-100
  tags: string[];
};

export const MOVE_CATEGORIES: { key: Category; label: string }[] = [
  { key: "dribble", label: "Dribble" },
  { key: "signature", label: "Signature Combos" },
  { key: "post", label: "Post Moves" },
  { key: "defense", label: "Defense" },
  { key: "shooting", label: "Shooting" },
  { key: "pass", label: "Pass" },
  { key: "layup", label: "Layups" },
];

// ---- Move catalog (50+) ----------------------------------------------------

export const MOVES: Move[] = [
  // ---------- DRIBBLE ----------
  {
    id: "drib-hesi-pull",
    name: "Hesitation Pull",
    category: "dribble",
    owner: "SGA",
    inputs: [
      { btn: "R2", label: "Hold Sprint" },
      { btn: "RS", dir: "S", label: "Hesi" },
      { btn: "RS", dir: "N", hold: true, label: "Pull-up" },
    ],
    situation: "Vs trailing defender on the wing",
    difficulty: 2,
    sizeReq: "G",
    durationMs: 1100,
    popularity: 92,
    tags: ["pullup", "iso"],
  },
  {
    id: "drib-snatchback",
    name: "Snatchback",
    category: "dribble",
    owner: "Curry",
    inputs: [
      { btn: "RS", dir: "S", flick: true, label: "Snatch" },
      { btn: "RS", dir: "S", flick: true, label: "Back" },
    ],
    situation: "Create separation for the 3",
    difficulty: 3,
    requiresBadge: { badge: "Killer Combos", tier: "B" },
    sizeReq: "G",
    durationMs: 900,
    popularity: 98,
    tags: ["sep", "three"],
  },
  {
    id: "drib-behind-back",
    name: "Behind-the-Back",
    category: "dribble",
    owner: "Kyrie",
    inputs: [
      { btn: "R1", label: "Pro Stick" },
      { btn: "RS", dir: "W", label: "BTB" },
    ],
    situation: "Vs over-playing on-ball",
    difficulty: 1,
    sizeReq: "G",
    durationMs: 650,
    popularity: 88,
    tags: ["btb", "chain"],
  },
  {
    id: "drib-triple-cross",
    name: "Triple Cross",
    category: "dribble",
    owner: "Kyrie",
    inputs: [
      { btn: "RS", dir: "W", flick: true },
      { btn: "RS", dir: "E", flick: true },
      { btn: "RS", dir: "W", flick: true },
    ],
    situation: "Iso top of the key",
    difficulty: 4,
    requiresBadge: { badge: "Killer Combos", tier: "A" },
    sizeReq: "G",
    durationMs: 1400,
    popularity: 95,
    tags: ["cross", "iso"],
  },
  {
    id: "drib-half-spin",
    name: "Half-Spin",
    category: "dribble",
    owner: "Harden",
    inputs: [
      { btn: "RS", dir: "NW", label: "Half-spin" },
    ],
    situation: "Drive then bait the help",
    difficulty: 3,
    sizeReq: "G",
    durationMs: 800,
    popularity: 81,
    tags: ["spin", "drive"],
  },
  {
    id: "drib-momentum-cross",
    name: "Momentum Crossover",
    category: "dribble",
    owner: "Luka",
    inputs: [
      { btn: "R2", label: "Sprint" },
      { btn: "RS", dir: "E", flick: true },
    ],
    situation: "Downhill change of direction",
    difficulty: 2,
    sizeReq: "ANY",
    durationMs: 700,
    popularity: 86,
    tags: ["cross", "downhill"],
  },
  {
    id: "drib-in-out",
    name: "In-and-Out",
    category: "dribble",
    owner: "Edwards",
    inputs: [
      { btn: "RS", dir: "NE", flick: true },
      { btn: "RS", dir: "NW", flick: true },
    ],
    situation: "Open lane on the wing",
    difficulty: 2,
    sizeReq: "G",
    durationMs: 750,
    popularity: 78,
    tags: ["chain"],
  },
  {
    id: "drib-stop-pull",
    name: "Quick Stop Pull-Up",
    category: "dribble",
    owner: "Maxey",
    inputs: [
      { btn: "R2", label: "Sprint" },
      { btn: "LS", dir: "S", label: "Stop" },
      { btn: "SQUARE", label: "Shoot" },
    ],
    situation: "Trail defender on transition pull-up",
    difficulty: 3,
    sizeReq: "G",
    durationMs: 1200,
    popularity: 74,
    tags: ["pullup", "transition"],
  },
  {
    id: "drib-double-btb",
    name: "Double Behind-the-Back",
    category: "dribble",
    owner: "Trae",
    inputs: [
      { btn: "RS", dir: "W", flick: true },
      { btn: "RS", dir: "W", flick: true },
    ],
    situation: "Reset and re-attack",
    difficulty: 3,
    sizeReq: "G",
    durationMs: 1000,
    popularity: 70,
    tags: ["btb", "reset"],
  },
  {
    id: "drib-hostile-crossover",
    name: "Hostile Crossover",
    category: "dribble",
    owner: "Ja",
    inputs: [
      { btn: "RS", dir: "SE", flick: true },
      { btn: "RS", dir: "W", flick: true },
    ],
    situation: "Vs sagging defender",
    difficulty: 4,
    requiresBadge: { badge: "Ankle Breaker", tier: "B" },
    sizeReq: "G",
    durationMs: 1050,
    popularity: 83,
    tags: ["ankle", "cross"],
  },
  {
    id: "drib-stutter-go",
    name: "Stutter Go",
    category: "dribble",
    owner: "SGA",
    inputs: [
      { btn: "L2", label: "Hesi" },
      { btn: "R2", label: "Sprint" },
    ],
    situation: "Vs flat-footed defender",
    difficulty: 1,
    sizeReq: "ANY",
    durationMs: 600,
    popularity: 80,
    tags: ["hesi", "burst"],
  },

  // ---------- SIGNATURE COMBOS ----------
  {
    id: "sig-stepback-3",
    name: "Stepback Three",
    category: "signature",
    owner: "Harden",
    inputs: [
      { btn: "RS", dir: "S", hold: true, label: "Stepback" },
      { btn: "SQUARE", label: "Shoot" },
    ],
    situation: "Iso wing 3 against soft coverage",
    difficulty: 3,
    requiresBadge: { badge: "Deadeye", tier: "A" },
    sizeReq: "G",
    durationMs: 1300,
    popularity: 99,
    tags: ["three", "iso"],
  },
  {
    id: "sig-snatch-step",
    name: "Snatchback → Stepback",
    category: "signature",
    owner: "Curry",
    inputs: [
      { btn: "RS", dir: "S", flick: true },
      { btn: "RS", dir: "SW", hold: true },
      { btn: "SQUARE" },
    ],
    situation: "Reverse momentum vs trailing on",
    difficulty: 5,
    requiresBadge: { badge: "Killer Combos", tier: "S" },
    sizeReq: "G",
    durationMs: 1800,
    popularity: 91,
    tags: ["sep", "three", "elite"],
  },
  {
    id: "sig-triple-step",
    name: "Triple Cross → Stepback",
    category: "signature",
    owner: "Kyrie",
    inputs: [
      { btn: "RS", dir: "W", flick: true },
      { btn: "RS", dir: "E", flick: true },
      { btn: "RS", dir: "SW", hold: true },
      { btn: "SQUARE" },
    ],
    situation: "Iso, defender on islands",
    difficulty: 5,
    requiresBadge: { badge: "Killer Combos", tier: "S" },
    sizeReq: "G",
    durationMs: 1900,
    popularity: 88,
    tags: ["ankle", "elite"],
  },
  {
    id: "sig-hesi-spin",
    name: "Hesi → Spin Drive",
    category: "signature",
    owner: "LeBron",
    inputs: [
      { btn: "L2" },
      { btn: "RS", dir: "NW" },
      { btn: "R2", label: "Drive" },
    ],
    situation: "Top of key vs single coverage",
    difficulty: 3,
    sizeReq: "W",
    durationMs: 1500,
    popularity: 84,
    tags: ["spin", "drive"],
  },
  {
    id: "sig-cradle-euro",
    name: "Cradle → Eurostep",
    category: "signature",
    owner: "Ja",
    inputs: [
      { btn: "R2", label: "Drive" },
      { btn: "TRIANGLE", label: "Layup Gather" },
      { btn: "LS", dir: "E", label: "Euro" },
    ],
    situation: "Help defender between you and rim",
    difficulty: 4,
    requiresBadge: { badge: "Posterizer", tier: "B" },
    sizeReq: "ANY",
    durationMs: 1700,
    popularity: 90,
    tags: ["euro", "finish"],
  },
  {
    id: "sig-spin-into-fade",
    name: "Spin Into Fade",
    category: "signature",
    owner: "KD",
    inputs: [
      { btn: "RS", dir: "W", hold: true, label: "Spin" },
      { btn: "RS", dir: "S", hold: true, label: "Fade" },
      { btn: "SQUARE" },
    ],
    situation: "Mid-post vs smaller switch",
    difficulty: 4,
    requiresBadge: { badge: "Fadeaway Ace", tier: "A" },
    sizeReq: "W",
    durationMs: 2000,
    popularity: 87,
    tags: ["fade", "mid"],
  },
  {
    id: "sig-eurostep-finish",
    name: "Euro Cradle Finish",
    category: "signature",
    owner: "Luka",
    inputs: [
      { btn: "R2" },
      { btn: "TRIANGLE" },
      { btn: "LS", dir: "W" },
      { btn: "LS", dir: "E" },
    ],
    situation: "Two defenders in the paint",
    difficulty: 4,
    sizeReq: "ANY",
    durationMs: 1850,
    popularity: 81,
    tags: ["euro", "finish"],
  },

  // ---------- POST MOVES ----------
  {
    id: "post-drop-step",
    name: "Drop Step",
    category: "post",
    owner: "Embiid",
    inputs: [
      { btn: "L2", label: "Post Up" },
      { btn: "RS", dir: "E", flick: true, label: "Drop" },
    ],
    situation: "Defender high-side, baseline open",
    difficulty: 2,
    sizeReq: "B",
    durationMs: 1100,
    popularity: 86,
    tags: ["post", "finish"],
  },
  {
    id: "post-dream-shake",
    name: "Dream Shake",
    category: "post",
    owner: "Embiid",
    inputs: [
      { btn: "L2" },
      { btn: "RS", dir: "W", flick: true },
      { btn: "RS", dir: "E", flick: true },
      { btn: "SQUARE" },
    ],
    situation: "Mid-post iso",
    difficulty: 5,
    requiresBadge: { badge: "Post Fade", tier: "A" },
    sizeReq: "B",
    durationMs: 2100,
    popularity: 79,
    tags: ["post", "elite"],
  },
  {
    id: "post-sky-hook",
    name: "Sky Hook",
    category: "post",
    owner: "Jokic",
    inputs: [
      { btn: "L2" },
      { btn: "RS", dir: "N", hold: true },
      { btn: "SQUARE" },
    ],
    situation: "Lefty/righty mismatch in post",
    difficulty: 3,
    requiresBadge: { badge: "Hook Specialist", tier: "B" },
    sizeReq: "B",
    durationMs: 1500,
    popularity: 72,
    tags: ["hook", "post"],
  },
  {
    id: "post-fadeaway",
    name: "Post Fadeaway",
    category: "post",
    owner: "KD",
    inputs: [
      { btn: "L2" },
      { btn: "RS", dir: "S", hold: true },
      { btn: "SQUARE" },
    ],
    situation: "Mid-post vs over-pursuit",
    difficulty: 3,
    requiresBadge: { badge: "Fadeaway Ace", tier: "B" },
    sizeReq: "W",
    durationMs: 1600,
    popularity: 85,
    tags: ["fade", "post"],
  },
  {
    id: "post-up-under",
    name: "Up-and-Under",
    category: "post",
    owner: "Jokic",
    inputs: [
      { btn: "L2" },
      { btn: "TRIANGLE", label: "Shot Fake" },
      { btn: "LS", dir: "N" },
      { btn: "SQUARE" },
    ],
    situation: "Defender bites on pump",
    difficulty: 3,
    sizeReq: "B",
    durationMs: 1700,
    popularity: 76,
    tags: ["post", "fake"],
  },
  {
    id: "post-spin-hook",
    name: "Spin → Hook",
    category: "post",
    owner: "Embiid",
    inputs: [
      { btn: "L2" },
      { btn: "RS", dir: "W", hold: true },
      { btn: "SQUARE" },
    ],
    situation: "Defender shading baseline",
    difficulty: 4,
    sizeReq: "B",
    durationMs: 1850,
    popularity: 73,
    tags: ["post", "hook"],
  },
  {
    id: "post-shimmy-fade",
    name: "Shimmy Fade",
    category: "post",
    owner: "Wemby",
    inputs: [
      { btn: "L2" },
      { btn: "RS", dir: "NW", flick: true },
      { btn: "RS", dir: "S", hold: true },
      { btn: "SQUARE" },
    ],
    situation: "Mismatch vs guard switch",
    difficulty: 4,
    requiresBadge: { badge: "Fadeaway Ace", tier: "A" },
    sizeReq: "B",
    durationMs: 2000,
    popularity: 69,
    tags: ["fade", "shake"],
  },

  // ---------- DEFENSE ----------
  {
    id: "def-intense-d",
    name: "Intense D",
    category: "defense",
    owner: "SGA",
    inputs: [{ btn: "L2", hold: true, label: "Hold L2" }],
    situation: "On-ball pressure, vs slow handle",
    difficulty: 1,
    sizeReq: "ANY",
    durationMs: 400,
    popularity: 94,
    tags: ["onball"],
  },
  {
    id: "def-block",
    name: "Block Attempt",
    category: "defense",
    owner: "Wemby",
    inputs: [{ btn: "TRIANGLE", label: "Block" }],
    situation: "Rim contest",
    difficulty: 2,
    sizeReq: "B",
    durationMs: 600,
    popularity: 90,
    tags: ["rim", "block"],
  },
  {
    id: "def-steal",
    name: "Steal Reach",
    category: "defense",
    owner: "Kyrie",
    inputs: [{ btn: "SQUARE", label: "Reach" }],
    situation: "Loose handle on cross",
    difficulty: 2,
    sizeReq: "ANY",
    durationMs: 500,
    popularity: 82,
    tags: ["pick"],
  },
  {
    id: "def-take-charge",
    name: "Take Charge",
    category: "defense",
    owner: "Tatum",
    inputs: [
      { btn: "L2", hold: true },
      { btn: "CIRCLE", label: "Plant" },
    ],
    situation: "Driver out of control",
    difficulty: 3,
    sizeReq: "ANY",
    durationMs: 800,
    popularity: 60,
    tags: ["charge"],
  },
  {
    id: "def-shading",
    name: "Defensive Shading",
    category: "defense",
    owner: "SGA",
    inputs: [
      { btn: "L2", hold: true },
      { btn: "RS", dir: "E", label: "Shade Right" },
    ],
    situation: "Cut off strong hand",
    difficulty: 2,
    sizeReq: "ANY",
    durationMs: 500,
    popularity: 75,
    tags: ["onball"],
  },
  {
    id: "def-contest",
    name: "Hand-Up Contest",
    category: "defense",
    owner: "Tatum",
    inputs: [{ btn: "TRIANGLE", label: "Contest" }],
    situation: "Closing on jumper",
    difficulty: 1,
    sizeReq: "ANY",
    durationMs: 450,
    popularity: 88,
    tags: ["contest"],
  },
  {
    id: "def-strip",
    name: "Pro Strip",
    category: "defense",
    owner: "Edwards",
    inputs: [
      { btn: "L2", hold: true },
      { btn: "SQUARE", label: "Strip" },
    ],
    situation: "Driver gathers in lane",
    difficulty: 4,
    requiresBadge: { badge: "Pickpocket", tier: "A" },
    sizeReq: "ANY",
    durationMs: 700,
    popularity: 71,
    tags: ["strip"],
  },

  // ---------- SHOOTING ----------
  {
    id: "shoot-catch-shoot",
    name: "Catch & Shoot Three",
    category: "shooting",
    owner: "Curry",
    inputs: [{ btn: "SQUARE", hold: true, label: "Hold Shoot" }],
    situation: "Off the catch, feet set",
    difficulty: 1,
    requiresBadge: { badge: "Deadeye", tier: "B" },
    sizeReq: "ANY",
    durationMs: 900,
    popularity: 97,
    tags: ["three", "catch"],
  },
  {
    id: "shoot-pump-three",
    name: "Pump → Side Step Three",
    category: "shooting",
    owner: "Curry",
    inputs: [
      { btn: "TRIANGLE", label: "Pump" },
      { btn: "LS", dir: "E" },
      { btn: "SQUARE" },
    ],
    situation: "Hard closeout, defender airborne",
    difficulty: 3,
    requiresBadge: { badge: "Killer Combos", tier: "B" },
    sizeReq: "G",
    durationMs: 1500,
    popularity: 89,
    tags: ["three", "shake"],
  },
  {
    id: "shoot-floater",
    name: "Floater",
    category: "shooting",
    owner: "Trae",
    inputs: [
      { btn: "R2" },
      { btn: "SQUARE", hold: true, label: "Hold + Far" },
    ],
    situation: "Big in drop coverage",
    difficulty: 2,
    sizeReq: "G",
    durationMs: 1000,
    popularity: 80,
    tags: ["floater", "mid"],
  },
  {
    id: "shoot-fade-mid",
    name: "Fadeaway Mid",
    category: "shooting",
    owner: "KD",
    inputs: [
      { btn: "RS", dir: "S", hold: true },
      { btn: "SQUARE" },
    ],
    situation: "Iso mid, sticky defender",
    difficulty: 3,
    requiresBadge: { badge: "Fadeaway Ace", tier: "B" },
    sizeReq: "W",
    durationMs: 1400,
    popularity: 83,
    tags: ["fade", "mid"],
  },
  {
    id: "shoot-pullup-three",
    name: "Off-Dribble Three",
    category: "shooting",
    owner: "Maxey",
    inputs: [
      { btn: "R2" },
      { btn: "LS", dir: "N" },
      { btn: "SQUARE" },
    ],
    situation: "Sprinting downhill three",
    difficulty: 3,
    requiresBadge: { badge: "Deadeye", tier: "A" },
    sizeReq: "G",
    durationMs: 1100,
    popularity: 86,
    tags: ["three", "pullup"],
  },
  {
    id: "shoot-hop-three",
    name: "Hop-Step Three",
    category: "shooting",
    owner: "Tatum",
    inputs: [
      { btn: "R2" },
      { btn: "CROSS", label: "Hop" },
      { btn: "SQUARE" },
    ],
    situation: "Defender on hip going right",
    difficulty: 4,
    requiresBadge: { badge: "Killer Combos", tier: "A" },
    sizeReq: "W",
    durationMs: 1450,
    popularity: 77,
    tags: ["three", "hop"],
  },

  // ---------- PASS ----------
  {
    id: "pass-bounce",
    name: "Bounce Pass",
    category: "pass",
    owner: "Jokic",
    inputs: [{ btn: "CIRCLE", label: "Bounce" }],
    situation: "Cutter through traffic",
    difficulty: 1,
    sizeReq: "ANY",
    durationMs: 500,
    popularity: 78,
    tags: ["assist"],
  },
  {
    id: "pass-lob",
    name: "Lob Pass",
    category: "pass",
    owner: "LeBron",
    inputs: [
      { btn: "TRIANGLE", label: "Lob" },
    ],
    situation: "Alley to rolling big",
    difficulty: 2,
    sizeReq: "ANY",
    durationMs: 700,
    popularity: 91,
    tags: ["alley"],
  },
  {
    id: "pass-flashy",
    name: "Flashy Pass",
    category: "pass",
    owner: "Jokic",
    inputs: [
      { btn: "L1", label: "Flashy" },
      { btn: "CROSS", label: "Pass" },
    ],
    situation: "Open shooter, tight window",
    difficulty: 4,
    requiresBadge: { badge: "Dimer", tier: "A" },
    sizeReq: "ANY",
    durationMs: 900,
    popularity: 64,
    tags: ["assist", "risky"],
  },
  {
    id: "pass-icon-pass",
    name: "Icon Pass",
    category: "pass",
    owner: "Luka",
    inputs: [
      { btn: "L1", hold: true, label: "Hold Icon" },
      { btn: "SQUARE", label: "To Target" },
    ],
    situation: "Skip pass cross-court",
    difficulty: 3,
    sizeReq: "ANY",
    durationMs: 850,
    popularity: 70,
    tags: ["skip"],
  },
  {
    id: "pass-no-look",
    name: "No-Look Pass",
    category: "pass",
    owner: "Jokic",
    inputs: [
      { btn: "L1" },
      { btn: "CIRCLE", label: "No-Look" },
    ],
    situation: "Defender ball-watching",
    difficulty: 3,
    requiresBadge: { badge: "Dimer", tier: "B" },
    sizeReq: "ANY",
    durationMs: 800,
    popularity: 66,
    tags: ["assist"],
  },
  {
    id: "pass-outlet",
    name: "Outlet Pass",
    category: "pass",
    owner: "LeBron",
    inputs: [
      { btn: "L1", hold: true },
      { btn: "TRIANGLE", label: "Long" },
    ],
    situation: "Defensive rebound to break",
    difficulty: 2,
    sizeReq: "ANY",
    durationMs: 700,
    popularity: 68,
    tags: ["transition"],
  },

  // ---------- LAYUPS ----------
  {
    id: "lay-eurostep",
    name: "Eurostep",
    category: "layup",
    owner: "Harden",
    inputs: [
      { btn: "R2" },
      { btn: "TRIANGLE", label: "Layup" },
      { btn: "LS", dir: "E" },
    ],
    situation: "Help defender steps in",
    difficulty: 2,
    sizeReq: "ANY",
    durationMs: 1100,
    popularity: 93,
    tags: ["euro", "finish"],
  },
  {
    id: "lay-hop-step",
    name: "Hop Step",
    category: "layup",
    owner: "Ja",
    inputs: [
      { btn: "R2" },
      { btn: "CROSS", label: "Hop" },
    ],
    situation: "Gather past first defender",
    difficulty: 2,
    sizeReq: "ANY",
    durationMs: 1000,
    popularity: 84,
    tags: ["finish"],
  },
  {
    id: "lay-spin-layup",
    name: "Spin Layup",
    category: "layup",
    owner: "LeBron",
    inputs: [
      { btn: "R2" },
      { btn: "RS", dir: "W", hold: true },
      { btn: "TRIANGLE" },
    ],
    situation: "Driver on baseline, big rotating",
    difficulty: 3,
    sizeReq: "W",
    durationMs: 1300,
    popularity: 82,
    tags: ["spin", "finish"],
  },
  {
    id: "lay-reverse",
    name: "Reverse Layup",
    category: "layup",
    owner: "Kyrie",
    inputs: [
      { btn: "R2" },
      { btn: "TRIANGLE", hold: true, label: "Hold" },
    ],
    situation: "Baseline drive, weak-side help",
    difficulty: 3,
    sizeReq: "G",
    durationMs: 1200,
    popularity: 79,
    tags: ["finish", "reverse"],
  },
  {
    id: "lay-floater-finish",
    name: "Floater Finish",
    category: "layup",
    owner: "Trae",
    inputs: [
      { btn: "R2" },
      { btn: "TRIANGLE", label: "Far Stick Up" },
    ],
    situation: "Drop coverage, big back-pedaling",
    difficulty: 2,
    requiresBadge: { badge: "Float Game", tier: "B" },
    sizeReq: "G",
    durationMs: 1050,
    popularity: 81,
    tags: ["floater"],
  },
  {
    id: "lay-poster",
    name: "Posterizer Dunk",
    category: "layup",
    owner: "Edwards",
    inputs: [
      { btn: "R2" },
      { btn: "TRIANGLE", hold: true, label: "Dunk" },
      { btn: "RS", dir: "N", hold: true },
    ],
    situation: "Help defender in restricted area",
    difficulty: 5,
    requiresBadge: { badge: "Posterizer", tier: "A" },
    sizeReq: "W",
    durationMs: 1600,
    popularity: 92,
    tags: ["dunk", "poster"],
  },
  {
    id: "lay-cradle-reverse",
    name: "Cradle Reverse",
    category: "layup",
    owner: "Ja",
    inputs: [
      { btn: "R2" },
      { btn: "TRIANGLE" },
      { btn: "LS", dir: "W" },
      { btn: "TRIANGLE", hold: true },
    ],
    situation: "Help defender at the rim",
    difficulty: 4,
    requiresBadge: { badge: "Acrobat", tier: "A" },
    sizeReq: "G",
    durationMs: 1700,
    popularity: 74,
    tags: ["acrobat", "reverse"],
  },
  {
    id: "lay-scoop",
    name: "Scoop Layup",
    category: "layup",
    owner: "Maxey",
    inputs: [
      { btn: "R2" },
      { btn: "TRIANGLE", label: "Far Down" },
    ],
    situation: "Under the rim, weak-side rotation",
    difficulty: 3,
    sizeReq: "G",
    durationMs: 1150,
    popularity: 72,
    tags: ["finish", "scoop"],
  },

  // ---------- DRIBBLE (4 NEW) ----------
  {
    id: "drib-killer-cross",
    name: "Killer Crossover",
    category: "dribble",
    owner: "Jamal Murray",
    inputs: [
      { btn: "R2", label: "Sprint" },
      { btn: "RS", dir: "W", flick: true, label: "Cross" },
      { btn: "RS", dir: "N", hold: true, label: "Attack" },
    ],
    situation: "Trailing defender on wing drive",
    difficulty: 2,
    sizeReq: "G",
    durationMs: 950,
    popularity: 67,
    tags: ["cross", "downhill"],
  },
  {
    id: "drib-rocker-step",
    name: "Rocker Step",
    category: "dribble",
    owner: "Cade Cunningham",
    inputs: [
      { btn: "LS", dir: "N", label: "Forward step" },
      { btn: "LS", dir: "S", label: "Pull back" },
      { btn: "R2", label: "Drive" },
    ],
    situation: "Top of key, defender flat-footed",
    difficulty: 1,
    sizeReq: "ANY",
    durationMs: 800,
    popularity: 52,
    tags: ["rocker", "size-up"],
  },
  {
    id: "drib-spin-cross",
    name: "Spin Crossover",
    category: "dribble",
    owner: "De'Aaron Fox",
    inputs: [
      { btn: "R2" },
      { btn: "RS", dir: "SW", flick: true, label: "Spin" },
      { btn: "RS", dir: "E", flick: true, label: "Cross" },
    ],
    situation: "Defender shading drive lane",
    difficulty: 4,
    requiresBadge: { badge: "Killer Combos", tier: "B" },
    sizeReq: "G",
    durationMs: 1300,
    popularity: 61,
    tags: ["spin", "cross", "chain"],
  },
  {
    id: "drib-curry-slide",
    name: "Curry Slide",
    category: "dribble",
    owner: "Stephen Curry",
    inputs: [
      { btn: "R2", label: "Sprint" },
      { btn: "RS", dir: "E", label: "Side" },
      { btn: "LS", dir: "W", label: "Stop" },
      { btn: "SQUARE", label: "Shoot" },
    ],
    situation: "Off-ball relocate into open 3",
    difficulty: 3,
    requiresBadge: { badge: "Deadeye", tier: "B" },
    sizeReq: "G",
    durationMs: 1400,
    popularity: 78,
    tags: ["slide", "three", "off-ball"],
  },

  // ---------- SIGNATURE (3 NEW) ----------
  {
    id: "sig-luka-stepback",
    name: "Luka Step-Back",
    category: "signature",
    owner: "Luka Doncic",
    inputs: [
      { btn: "R2" },
      { btn: "RS", dir: "SW", hold: true, label: "Step-back" },
      { btn: "SQUARE", label: "Shoot" },
    ],
    situation: "Iso top of key vs sticky on-ball",
    difficulty: 3,
    requiresBadge: { badge: "Step Back Pure", tier: "A" },
    sizeReq: "G",
    durationMs: 1450,
    popularity: 93,
    tags: ["stepback", "three", "iso"],
  },
  {
    id: "sig-butler-jab",
    name: "Jab → Mid Pull",
    category: "signature",
    owner: "Jimmy Butler",
    inputs: [
      { btn: "LS", dir: "N", label: "Jab" },
      { btn: "R2", label: "Drive" },
      { btn: "LS", dir: "S", label: "Stop" },
      { btn: "SQUARE" },
    ],
    situation: "Wing iso vs sagging defender",
    difficulty: 2,
    sizeReq: "W",
    durationMs: 1350,
    popularity: 64,
    tags: ["jab", "mid", "iso"],
  },
  {
    id: "sig-fox-hesi-finish",
    name: "Hesi → Burst Finish",
    category: "signature",
    owner: "De'Aaron Fox",
    inputs: [
      { btn: "L2", label: "Hesi" },
      { btn: "R2", label: "Burst" },
      { btn: "TRIANGLE", label: "Layup" },
    ],
    situation: "Drop coverage, speed advantage",
    difficulty: 2,
    sizeReq: "G",
    durationMs: 1150,
    popularity: 71,
    tags: ["hesi", "speed", "finish"],
  },

  // ---------- POST (2 NEW) ----------
  {
    id: "post-jokic-pivot",
    name: "Jokic Pivot Pass",
    category: "post",
    owner: "Nikola Jokic",
    inputs: [
      { btn: "L2", label: "Post Up" },
      { btn: "LS", dir: "N", label: "Pivot" },
      { btn: "L1", label: "Icon" },
      { btn: "CIRCLE", label: "Bounce" },
    ],
    situation: "High post hub, cutter weak-side",
    difficulty: 3,
    requiresBadge: { badge: "Post Playmaker", tier: "A" },
    sizeReq: "B",
    durationMs: 1300,
    popularity: 58,
    tags: ["post", "pass", "hub"],
  },
  {
    id: "post-bam-face-up",
    name: "Face-Up Drive",
    category: "post",
    owner: "Bam Adebayo",
    inputs: [
      { btn: "L2", label: "Post Up" },
      { btn: "TRIANGLE", label: "Face Up" },
      { btn: "R2", label: "Drive" },
    ],
    situation: "Post mismatch vs smaller switch",
    difficulty: 2,
    sizeReq: "B",
    durationMs: 1250,
    popularity: 49,
    tags: ["face-up", "drive", "post"],
  },

  // ---------- LAYUP (2 NEW) ----------
  {
    id: "lay-tatum-up-under",
    name: "Up-and-Under Lay",
    category: "layup",
    owner: "Jayson Tatum",
    inputs: [
      { btn: "R2" },
      { btn: "TRIANGLE", label: "Pump" },
      { btn: "LS", dir: "N" },
      { btn: "TRIANGLE", label: "Finish" },
    ],
    situation: "Driver gathers, big bites on pump",
    difficulty: 3,
    sizeReq: "W",
    durationMs: 1500,
    popularity: 56,
    tags: ["pump", "finish"],
  },
  {
    id: "lay-sga-floater",
    name: "Mid-Range Floater",
    category: "layup",
    owner: "Shai Gilgeous-Alexander",
    inputs: [
      { btn: "R2" },
      { btn: "LS", dir: "S", label: "Stop short" },
      { btn: "TRIANGLE", hold: true, label: "Far stick up" },
    ],
    situation: "Drop coverage, big back-pedaling",
    difficulty: 3,
    requiresBadge: { badge: "Pro Touch", tier: "A" },
    sizeReq: "G",
    durationMs: 1100,
    popularity: 75,
    tags: ["floater", "mid"],
  },

  // ---------- DEFENSE (1 NEW) ----------
  {
    id: "def-on-ball-bump",
    name: "On-Ball Bump",
    category: "defense",
    owner: "Jrue Holiday",
    inputs: [
      { btn: "L2", hold: true, label: "Intense" },
      { btn: "LS", dir: "N", label: "Step into" },
    ],
    situation: "Driver mid-attack, body up",
    difficulty: 2,
    requiresBadge: { badge: "Clamps", tier: "B" },
    sizeReq: "ANY",
    durationMs: 350,
    popularity: 68,
    tags: ["onball", "bump"],
  },
];

// ---- Helpers ---------------------------------------------------------------

export function getMovesByCategory(cat: Category): Move[] {
  return MOVES.filter((m) => m.category === cat);
}

export function searchMoves(q: string): Move[] {
  const term = q.trim().toLowerCase();
  if (!term) return MOVES;
  return MOVES.filter((m) => {
    return (
      m.name.toLowerCase().includes(term) ||
      m.owner.toLowerCase().includes(term) ||
      m.situation.toLowerCase().includes(term) ||
      m.tags.some((t) => t.toLowerCase().includes(term))
    );
  });
}

export function getTopMoves(n: number): Move[] {
  return [...MOVES].sort((a, b) => b.popularity - a.popularity).slice(0, n);
}

export function moveById(id: string): Move | undefined {
  return MOVES.find((m) => m.id === id);
}

// Compact share encoding: id1.id2.id3 (Base64 url-safe over comma list).
export function encodeCombo(ids: string[]): string {
  if (typeof window === "undefined") return ids.join(",");
  const s = ids.join(",");
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCombo(code: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const s = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    return s.split(",").filter(Boolean);
  } catch {
    return [];
  }
}

// ---- Active combo (localStorage) ------------------------------------------

export type ActiveCombo = {
  moveIds: string[];
  timingNote?: string | null;
  updatedAt: number;
};

const ACTIVE_COMBO_KEY = "2klab.activeCombo";
const COMBO_REPS_KEY = "2klab.comboReps";

export function getActiveCombo(): ActiveCombo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_COMBO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveCombo;
    if (!parsed || !Array.isArray(parsed.moveIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveCombo(combo: ActiveCombo | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!combo || combo.moveIds.length === 0) {
      window.localStorage.removeItem(ACTIVE_COMBO_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_COMBO_KEY, JSON.stringify(combo));
  } catch {}
}

export function getComboReps(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COMBO_REPS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, number>;
    return {};
  } catch {
    return {};
  }
}

export function setComboReps(reps: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMBO_REPS_KEY, JSON.stringify(reps));
  } catch {}
}

export function bumpComboReps(comboId: string, by = 1): Record<string, number> {
  const reps = getComboReps();
  reps[comboId] = (reps[comboId] ?? 0) + by;
  setComboReps(reps);
  return reps;
}
