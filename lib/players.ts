// NBA Players Database — 2K26 ratings + real-life stat approximations.
// Data shape mirrors what Fivetran connectors deliver to Snowflake (balldontlie, nba_stats).

export type TeamId = string;

export type TeamInfo = {
  id: TeamId;
  name: string;
  abbr: string;
  city: string;
  primary: string; // hex
  secondary: string; // hex
};

export type Position = "PG" | "SG" | "SF" | "PF" | "C" | "G" | "F";

export type Tier = "S" | "A" | "B" | "C" | "D";

export type Attributes = {
  threePt: number;
  midRange: number;
  layup: number;
  dunk: number;
  ballHandle: number;
  pass: number;
  perimDef: number;
  intDef: number;
  rebound: number;
  speed: number;
  strength: number;
  vertical: number;
};

export type Badge = {
  name: string;
  category: string; // Finishing / Shooting / Playmaking / Defense / Rebounding / Physical
  tier: Tier;
};

export type Last10 = {
  ppg: number;
  rpg: number;
  apg: number;
  fgPct: number; // 0-1
  threePct: number; // 0-1
  plusMinus: number;
};

export type GameLog = {
  date: string; // YYYY-MM-DD
  opp: string; // team abbr (vs prefix optional)
  min: number;
  pts: number;
  reb: number;
  ast: number;
  plusMinus: number;
};

export type Predicted = {
  nextDelta: number;
  reason: string;
  confidence: "high" | "med" | "low";
};

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  team: TeamId;
  position: Position;
  height: string;
  weightLb: number;
  age: number;
  rating2k: number;
  ratingDelta: number;
  archetypeId: string;
  attributes: Attributes;
  badges: Badge[];
  last10: Last10;
  recentGames: GameLog[];
  predicted: Predicted;
};

// ---------- TEAMS ----------

export const TEAMS: Record<TeamId, TeamInfo> = {
  ATL: { id: "ATL", name: "Hawks", city: "Atlanta", abbr: "ATL", primary: "#E03A3E", secondary: "#C1D32F" },
  BOS: { id: "BOS", name: "Celtics", city: "Boston", abbr: "BOS", primary: "#007A33", secondary: "#BA9653" },
  BKN: { id: "BKN", name: "Nets", city: "Brooklyn", abbr: "BKN", primary: "#000000", secondary: "#FFFFFF" },
  CHA: { id: "CHA", name: "Hornets", city: "Charlotte", abbr: "CHA", primary: "#1D1160", secondary: "#00788C" },
  CHI: { id: "CHI", name: "Bulls", city: "Chicago", abbr: "CHI", primary: "#CE1141", secondary: "#000000" },
  CLE: { id: "CLE", name: "Cavaliers", city: "Cleveland", abbr: "CLE", primary: "#860038", secondary: "#FDBB30" },
  DAL: { id: "DAL", name: "Mavericks", city: "Dallas", abbr: "DAL", primary: "#00538C", secondary: "#002B5E" },
  DEN: { id: "DEN", name: "Nuggets", city: "Denver", abbr: "DEN", primary: "#0E2240", secondary: "#FEC524" },
  DET: { id: "DET", name: "Pistons", city: "Detroit", abbr: "DET", primary: "#C8102E", secondary: "#1D42BA" },
  GSW: { id: "GSW", name: "Warriors", city: "Golden State", abbr: "GSW", primary: "#1D428A", secondary: "#FFC72C" },
  HOU: { id: "HOU", name: "Rockets", city: "Houston", abbr: "HOU", primary: "#CE1141", secondary: "#000000" },
  IND: { id: "IND", name: "Pacers", city: "Indiana", abbr: "IND", primary: "#002D62", secondary: "#FDBB30" },
  LAC: { id: "LAC", name: "Clippers", city: "LA", abbr: "LAC", primary: "#C8102E", secondary: "#1D428A" },
  LAL: { id: "LAL", name: "Lakers", city: "Los Angeles", abbr: "LAL", primary: "#552583", secondary: "#FDB927" },
  MEM: { id: "MEM", name: "Grizzlies", city: "Memphis", abbr: "MEM", primary: "#5D76A9", secondary: "#12173F" },
  MIA: { id: "MIA", name: "Heat", city: "Miami", abbr: "MIA", primary: "#98002E", secondary: "#F9A01B" },
  MIL: { id: "MIL", name: "Bucks", city: "Milwaukee", abbr: "MIL", primary: "#00471B", secondary: "#EEE1C6" },
  MIN: { id: "MIN", name: "Timberwolves", city: "Minnesota", abbr: "MIN", primary: "#0C2340", secondary: "#236192" },
  NOP: { id: "NOP", name: "Pelicans", city: "New Orleans", abbr: "NOP", primary: "#0C2340", secondary: "#C8102E" },
  NYK: { id: "NYK", name: "Knicks", city: "New York", abbr: "NYK", primary: "#006BB6", secondary: "#F58426" },
  OKC: { id: "OKC", name: "Thunder", city: "Oklahoma City", abbr: "OKC", primary: "#007AC1", secondary: "#EF3B24" },
  ORL: { id: "ORL", name: "Magic", city: "Orlando", abbr: "ORL", primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { id: "PHI", name: "76ers", city: "Philadelphia", abbr: "PHI", primary: "#006BB6", secondary: "#ED174C" },
  PHX: { id: "PHX", name: "Suns", city: "Phoenix", abbr: "PHX", primary: "#1D1160", secondary: "#E56020" },
  POR: { id: "POR", name: "Trail Blazers", city: "Portland", abbr: "POR", primary: "#E03A3E", secondary: "#000000" },
  SAC: { id: "SAC", name: "Kings", city: "Sacramento", abbr: "SAC", primary: "#5A2D81", secondary: "#63727A" },
  SAS: { id: "SAS", name: "Spurs", city: "San Antonio", abbr: "SAS", primary: "#C4CED4", secondary: "#000000" },
  TOR: { id: "TOR", name: "Raptors", city: "Toronto", abbr: "TOR", primary: "#CE1141", secondary: "#000000" },
  UTA: { id: "UTA", name: "Jazz", city: "Utah", abbr: "UTA", primary: "#002B5C", secondary: "#00471B" },
  WAS: { id: "WAS", name: "Wizards", city: "Washington", abbr: "WAS", primary: "#002B5C", secondary: "#E31837" },
};

// ---------- HELPERS for compact data construction ----------

const a = (
  threePt: number, midRange: number, layup: number, dunk: number,
  ballHandle: number, pass: number, perimDef: number, intDef: number,
  rebound: number, speed: number, strength: number, vertical: number
): Attributes => ({
  threePt, midRange, layup, dunk, ballHandle, pass,
  perimDef, intDef, rebound, speed, strength, vertical,
});

const b = (name: string, category: string, tier: Tier): Badge => ({ name, category, tier });

const l10 = (ppg: number, rpg: number, apg: number, fgPct: number, threePct: number, plusMinus: number): Last10 =>
  ({ ppg, rpg, apg, fgPct, threePct, plusMinus });

// Generate plausible recent games from last10 averages.
const games = (avg: Last10, opps: string[], seed: number): GameLog[] => {
  const out: GameLog[] = [];
  const base = new Date("2026-05-14");
  for (let i = 0; i < opps.length; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i * 2);
    const wobble = ((seed * (i + 3)) % 7) - 3; // -3..+3
    const pwobble = ((seed * (i + 5)) % 9) - 4;
    out.push({
      date: d.toISOString().slice(0, 10),
      opp: opps[i],
      min: Math.round(34 + wobble),
      pts: Math.max(0, Math.round(avg.ppg + pwobble)),
      reb: Math.max(0, Math.round(avg.rpg + wobble / 2)),
      ast: Math.max(0, Math.round(avg.apg + wobble / 2)),
      plusMinus: Math.round(avg.plusMinus + wobble * 2),
    });
  }
  return out;
};

// ---------- PLAYERS ----------

export const PLAYERS: Player[] = [
  {
    id: "jokic",
    firstName: "Nikola", lastName: "Jokic", displayName: "Nikola Jokic",
    team: "DEN", position: "C", height: "6'11\"", weightLb: 284, age: 31,
    rating2k: 98, ratingDelta: 0, archetypeId: "POINT_CENTER",
    attributes: a(82, 86, 88, 78, 88, 96, 74, 86, 92, 70, 90, 70),
    badges: [
      b("Dimer", "Playmaking", "S"), b("Bail Out", "Playmaking", "S"),
      b("Post Playmaker", "Playmaking", "S"), b("Boxout Beast", "Rebounding", "A"),
      b("Touch", "Finishing", "A"), b("Middy Magician", "Shooting", "A"),
    ],
    last10: l10(29.4, 12.8, 10.1, 0.586, 0.402, 8.2),
    recentGames: games(l10(29.4, 12.8, 10.1, 0.586, 0.402, 8.2), ["MIN", "LAL", "OKC", "DAL", "GSW", "PHX", "SAC", "MEM"], 7),
    predicted: { nextDelta: 0, reason: "Ceiling 99 OVR locked. Holds steady barring slump.", confidence: "high" },
  },
  {
    id: "giannis",
    firstName: "Giannis", lastName: "Antetokounmpo", displayName: "Giannis Antetokounmpo",
    team: "MIL", position: "PF", height: "6'11\"", weightLb: 243, age: 31,
    rating2k: 97, ratingDelta: 0, archetypeId: "PAINT_BEAST",
    attributes: a(62, 72, 94, 96, 78, 80, 82, 90, 88, 88, 94, 92),
    badges: [
      b("Posterizer", "Finishing", "S"), b("Backdown Punisher", "Finishing", "S"),
      b("Anchor", "Defense", "S"), b("Rebound Chaser", "Rebounding", "A"),
      b("Pogo Stick", "Physical", "A"), b("Pro Touch", "Finishing", "A"),
    ],
    last10: l10(30.2, 11.4, 6.2, 0.604, 0.301, 6.4),
    recentGames: games(l10(30.2, 11.4, 6.2, 0.604, 0.301, 6.4), ["BOS", "PHI", "NYK", "MIA", "CLE", "IND", "CHI", "ATL"], 11),
    predicted: { nextDelta: 0, reason: "Top-3 OVR floor. No movement expected this week.", confidence: "high" },
  },
  {
    id: "luka",
    firstName: "Luka", lastName: "Doncic", displayName: "Luka Doncic",
    team: "DAL", position: "PG", height: "6'7\"", weightLb: 230, age: 27,
    rating2k: 96, ratingDelta: -1, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(88, 88, 84, 76, 94, 92, 70, 68, 78, 74, 84, 70),
    badges: [
      b("Shifty Shooter", "Shooting", "S"), b("Dimer", "Playmaking", "S"),
      b("Stepback Smoother", "Shooting", "S"), b("Mismatch Expert", "Playmaking", "A"),
      b("Triple Threat Juke", "Playmaking", "A"), b("Limitless Range", "Shooting", "A"),
    ],
    last10: l10(31.6, 8.4, 9.2, 0.476, 0.358, 2.8),
    recentGames: games(l10(31.6, 8.4, 9.2, 0.476, 0.358, 2.8), ["DEN", "GSW", "PHX", "SAC", "OKC", "MIN", "POR", "HOU"], 13),
    predicted: { nextDelta: 0, reason: "Volume scoring high but FG% slipped. Holds 96.", confidence: "med" },
  },
  {
    id: "sga",
    firstName: "Shai", lastName: "Gilgeous-Alexander", displayName: "Shai Gilgeous-Alexander",
    team: "OKC", position: "PG", height: "6'6\"", weightLb: 195, age: 27,
    rating2k: 97, ratingDelta: 1, archetypeId: "TWO_WAY_SHOT_CREATOR",
    attributes: a(80, 92, 90, 78, 94, 82, 88, 70, 64, 88, 78, 80),
    badges: [
      b("Middy Magician", "Shooting", "S"), b("Slippery Off-Ball", "Finishing", "S"),
      b("Pickpocket", "Defense", "A"), b("Clamps", "Defense", "A"),
      b("Touch", "Finishing", "S"), b("Aerial Wizard", "Finishing", "A"),
    ],
    last10: l10(32.8, 5.6, 6.1, 0.548, 0.378, 11.4),
    recentGames: games(l10(32.8, 5.6, 6.1, 0.548, 0.378, 11.4), ["DEN", "MIN", "DAL", "LAC", "GSW", "SAC", "PHX", "MEM"], 17),
    predicted: { nextDelta: 1, reason: "MVP-level efficiency + plus-minus. Trending to 98.", confidence: "high" },
  },
  {
    id: "tatum",
    firstName: "Jayson", lastName: "Tatum", displayName: "Jayson Tatum",
    team: "BOS", position: "SF", height: "6'8\"", weightLb: 210, age: 28,
    rating2k: 95, ratingDelta: 0, archetypeId: "TWO_WAY_THREE_LEVEL",
    attributes: a(86, 84, 86, 84, 86, 80, 82, 76, 78, 80, 82, 84),
    badges: [
      b("Limitless Range", "Shooting", "S"), b("Deadeye", "Shooting", "A"),
      b("Clamps", "Defense", "A"), b("Posterizer", "Finishing", "A"),
      b("Rhythm Shooter", "Shooting", "A"), b("Aerial Wizard", "Finishing", "B"),
    ],
    last10: l10(27.4, 8.6, 5.4, 0.466, 0.354, 5.2),
    recentGames: games(l10(27.4, 8.6, 5.4, 0.466, 0.354, 5.2), ["MIL", "NYK", "PHI", "MIA", "ATL", "CLE", "ORL", "CHI"], 19),
    predicted: { nextDelta: 0, reason: "Steady high-volume scorer. No swing factor.", confidence: "high" },
  },
  {
    id: "embiid",
    firstName: "Joel", lastName: "Embiid", displayName: "Joel Embiid",
    team: "PHI", position: "C", height: "7'0\"", weightLb: 280, age: 32,
    rating2k: 93, ratingDelta: -2, archetypeId: "POST_SCORER",
    attributes: a(78, 88, 86, 84, 78, 76, 70, 88, 86, 60, 92, 70),
    badges: [
      b("Post Spin Technician", "Finishing", "S"), b("Backdown Punisher", "Finishing", "A"),
      b("Anchor", "Defense", "A"), b("Middy Magician", "Shooting", "A"),
      b("Boxout Beast", "Rebounding", "A"), b("Free Throw Fiend", "Shooting", "B"),
    ],
    last10: l10(24.8, 9.2, 4.8, 0.482, 0.298, -1.6),
    recentGames: games(l10(24.8, 9.2, 4.8, 0.482, 0.298, -1.6), ["BOS", "NYK", "MIA", "CLE", "DET", "WAS", "TOR", "CHI"], 23),
    predicted: { nextDelta: -1, reason: "Minutes restriction + cold stretch. Possible 92.", confidence: "med" },
  },
  {
    id: "curry",
    firstName: "Stephen", lastName: "Curry", displayName: "Stephen Curry",
    team: "GSW", position: "PG", height: "6'2\"", weightLb: 185, age: 38,
    rating2k: 94, ratingDelta: 0, archetypeId: "PURE_SHARP",
    attributes: a(98, 88, 80, 60, 96, 86, 72, 50, 50, 84, 60, 60),
    badges: [
      b("Limitless Range", "Shooting", "S"), b("Deadeye", "Shooting", "S"),
      b("Shifty Shooter", "Shooting", "S"), b("Set Shot Specialist", "Shooting", "S"),
      b("Dimer", "Playmaking", "A"), b("Ankle Breaker", "Playmaking", "A"),
    ],
    last10: l10(26.4, 4.2, 6.4, 0.464, 0.418, 4.2),
    recentGames: games(l10(26.4, 4.2, 6.4, 0.464, 0.418, 4.2), ["SAC", "LAL", "PHX", "DEN", "MIN", "DAL", "OKC", "LAC"], 29),
    predicted: { nextDelta: 0, reason: "Age-resistant shooting. Holds at 94.", confidence: "high" },
  },
  {
    id: "kd",
    firstName: "Kevin", lastName: "Durant", displayName: "Kevin Durant",
    team: "PHX", position: "SF", height: "6'11\"", weightLb: 240, age: 37,
    rating2k: 94, ratingDelta: 0, archetypeId: "THREE_LEVEL",
    attributes: a(92, 96, 86, 80, 84, 78, 78, 72, 70, 76, 76, 78),
    badges: [
      b("Middy Magician", "Shooting", "S"), b("Limitless Range", "Shooting", "S"),
      b("Deadeye", "Shooting", "S"), b("Slippery Off-Ball", "Finishing", "A"),
      b("Rhythm Shooter", "Shooting", "A"), b("Touch", "Finishing", "A"),
    ],
    last10: l10(27.8, 6.4, 4.2, 0.518, 0.402, 3.4),
    recentGames: games(l10(27.8, 6.4, 4.2, 0.518, 0.402, 3.4), ["LAL", "GSW", "SAC", "LAC", "DEN", "MIN", "DAL", "OKC"], 31),
    predicted: { nextDelta: 0, reason: "Most efficient scoring stretch. Stable.", confidence: "high" },
  },
  {
    id: "lebron",
    firstName: "LeBron", lastName: "James", displayName: "LeBron James",
    team: "LAL", position: "SF", height: "6'9\"", weightLb: 250, age: 41,
    rating2k: 93, ratingDelta: 0, archetypeId: "POINT_FORWARD",
    attributes: a(78, 80, 90, 86, 90, 92, 76, 72, 76, 82, 90, 80),
    badges: [
      b("Dimer", "Playmaking", "S"), b("Posterizer", "Finishing", "A"),
      b("Bail Out", "Playmaking", "A"), b("Slippery Off-Ball", "Finishing", "A"),
      b("Boxout Beast", "Rebounding", "B"), b("Clamps", "Defense", "B"),
    ],
    last10: l10(24.2, 7.8, 8.4, 0.524, 0.362, 4.6),
    recentGames: games(l10(24.2, 7.8, 8.4, 0.524, 0.362, 4.6), ["DEN", "GSW", "PHX", "DAL", "MIN", "SAC", "OKC", "POR"], 37),
    predicted: { nextDelta: 0, reason: "Anti-decline. Holds at 93.", confidence: "high" },
  },
  {
    id: "wemby",
    firstName: "Victor", lastName: "Wembanyama", displayName: "Victor Wembanyama",
    team: "SAS", position: "C", height: "7'4\"", weightLb: 210, age: 22,
    rating2k: 95, ratingDelta: 2, archetypeId: "TWO_WAY_INSIDE_OUT",
    attributes: a(82, 78, 86, 88, 76, 78, 84, 96, 90, 78, 70, 92),
    badges: [
      b("Anchor", "Defense", "S"), b("Chase Down Artist", "Defense", "S"),
      b("Posterizer", "Finishing", "A"), b("Limitless Range", "Shooting", "A"),
      b("Pogo Stick", "Physical", "S"), b("Rebound Chaser", "Rebounding", "A"),
    ],
    last10: l10(26.4, 11.2, 4.2, 0.522, 0.358, 5.8),
    recentGames: games(l10(26.4, 11.2, 4.2, 0.522, 0.358, 5.8), ["DAL", "OKC", "MEM", "HOU", "NOP", "DEN", "MIN", "GSW"], 41),
    predicted: { nextDelta: 2, reason: "DPOY-level defense + scoring jump. Climbing fast.", confidence: "high" },
  },
  {
    id: "ant",
    firstName: "Anthony", lastName: "Edwards", displayName: "Anthony Edwards",
    team: "MIN", position: "SG", height: "6'4\"", weightLb: 225, age: 24,
    rating2k: 94, ratingDelta: 1, archetypeId: "TWO_WAY_SHOT_CREATOR",
    attributes: a(84, 80, 88, 92, 84, 76, 86, 64, 68, 88, 84, 94),
    badges: [
      b("Posterizer", "Finishing", "S"), b("Pogo Stick", "Physical", "S"),
      b("Limitless Range", "Shooting", "A"), b("Clamps", "Defense", "A"),
      b("Ankle Breaker", "Playmaking", "A"), b("Aerial Wizard", "Finishing", "A"),
    ],
    last10: l10(28.6, 5.8, 4.6, 0.488, 0.388, 4.4),
    recentGames: games(l10(28.6, 5.8, 4.6, 0.488, 0.388, 4.4), ["DEN", "OKC", "GSW", "DAL", "LAL", "PHX", "SAC", "POR"], 43),
    predicted: { nextDelta: 1, reason: "Volume + 3pt jump. Trending to 95.", confidence: "high" },
  },
  {
    id: "booker",
    firstName: "Devin", lastName: "Booker", displayName: "Devin Booker",
    team: "PHX", position: "SG", height: "6'5\"", weightLb: 206, age: 29,
    rating2k: 91, ratingDelta: 0, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(86, 90, 84, 76, 86, 82, 76, 60, 60, 80, 76, 72),
    badges: [
      b("Middy Magician", "Shooting", "S"), b("Limitless Range", "Shooting", "A"),
      b("Deadeye", "Shooting", "A"), b("Shifty Shooter", "Shooting", "A"),
      b("Dimer", "Playmaking", "B"), b("Slippery Off-Ball", "Finishing", "B"),
    ],
    last10: l10(25.8, 4.6, 6.8, 0.474, 0.362, 1.2),
    recentGames: games(l10(25.8, 4.6, 6.8, 0.474, 0.362, 1.2), ["LAL", "GSW", "SAC", "DAL", "DEN", "MIN", "OKC", "POR"], 47),
    predicted: { nextDelta: 0, reason: "Steady wing scorer. No rating swing.", confidence: "high" },
  },
  {
    id: "halibuton",
    firstName: "Tyrese", lastName: "Haliburton", displayName: "Tyrese Haliburton",
    team: "IND", position: "PG", height: "6'5\"", weightLb: 185, age: 26,
    rating2k: 90, ratingDelta: -1, archetypeId: "FLOOR_GENERAL",
    attributes: a(86, 78, 76, 64, 90, 96, 70, 54, 58, 82, 64, 64),
    badges: [
      b("Dimer", "Playmaking", "S"), b("Bail Out", "Playmaking", "S"),
      b("Deadeye", "Shooting", "A"), b("Triple Threat Juke", "Playmaking", "A"),
      b("Limitless Range", "Shooting", "A"), b("Post Playmaker", "Playmaking", "B"),
    ],
    last10: l10(18.4, 3.6, 10.2, 0.452, 0.342, 2.8),
    recentGames: games(l10(18.4, 3.6, 10.2, 0.452, 0.342, 2.8), ["MIL", "BOS", "PHI", "CLE", "NYK", "ATL", "ORL", "MIA"], 53),
    predicted: { nextDelta: 0, reason: "Scoring dipped, assists steady. Likely holds 90.", confidence: "med" },
  },
  {
    id: "brunson",
    firstName: "Jalen", lastName: "Brunson", displayName: "Jalen Brunson",
    team: "NYK", position: "PG", height: "6'2\"", weightLb: 190, age: 30,
    rating2k: 91, ratingDelta: 1, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(82, 88, 86, 64, 90, 82, 72, 56, 58, 78, 78, 60),
    badges: [
      b("Middy Magician", "Shooting", "S"), b("Slippery Off-Ball", "Finishing", "A"),
      b("Triple Threat Juke", "Playmaking", "A"), b("Touch", "Finishing", "A"),
      b("Ankle Breaker", "Playmaking", "A"), b("Shifty Shooter", "Shooting", "B"),
    ],
    last10: l10(28.4, 3.8, 7.6, 0.498, 0.402, 4.6),
    recentGames: games(l10(28.4, 3.8, 7.6, 0.498, 0.402, 4.6), ["BOS", "MIL", "PHI", "MIA", "CLE", "DET", "ORL", "WAS"], 59),
    predicted: { nextDelta: 1, reason: "Elite mid-range volume + clutch. Climb to 92.", confidence: "high" },
  },
  {
    id: "maxey",
    firstName: "Tyrese", lastName: "Maxey", displayName: "Tyrese Maxey",
    team: "PHI", position: "PG", height: "6'2\"", weightLb: 200, age: 25,
    rating2k: 92, ratingDelta: 1, archetypeId: "THREE_LEVEL",
    attributes: a(86, 80, 88, 70, 90, 82, 78, 56, 56, 92, 70, 76),
    badges: [
      b("Limitless Range", "Shooting", "S"), b("Slippery Off-Ball", "Finishing", "S"),
      b("Ankle Breaker", "Playmaking", "A"), b("Deadeye", "Shooting", "A"),
      b("Touch", "Finishing", "A"), b("Dimer", "Playmaking", "B"),
    ],
    last10: l10(28.2, 3.8, 6.8, 0.484, 0.398, 3.2),
    recentGames: games(l10(28.2, 3.8, 6.8, 0.484, 0.398, 3.2), ["BOS", "NYK", "MIL", "MIA", "CLE", "ORL", "ATL", "WAS"], 61),
    predicted: { nextDelta: 1, reason: "Elite scoring form. Trending to 93.", confidence: "high" },
  },
  {
    id: "mitchell",
    firstName: "Donovan", lastName: "Mitchell", displayName: "Donovan Mitchell",
    team: "CLE", position: "SG", height: "6'3\"", weightLb: 215, age: 29,
    rating2k: 91, ratingDelta: 0, archetypeId: "TWO_WAY_SHOT_CREATOR",
    attributes: a(84, 82, 88, 86, 86, 76, 80, 60, 62, 86, 82, 88),
    badges: [
      b("Posterizer", "Finishing", "A"), b("Limitless Range", "Shooting", "A"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Clamps", "Defense", "A"),
      b("Ankle Breaker", "Playmaking", "B"), b("Aerial Wizard", "Finishing", "A"),
    ],
    last10: l10(26.4, 4.6, 5.2, 0.476, 0.382, 5.8),
    recentGames: games(l10(26.4, 4.6, 5.2, 0.476, 0.382, 5.8), ["BOS", "NYK", "MIL", "ORL", "MIA", "CHI", "DET", "ATL"], 67),
    predicted: { nextDelta: 0, reason: "Consistent two-way wing. Holds 91.", confidence: "high" },
  },
  {
    id: "lillard",
    firstName: "Damian", lastName: "Lillard", displayName: "Damian Lillard",
    team: "MIL", position: "PG", height: "6'2\"", weightLb: 195, age: 35,
    rating2k: 88, ratingDelta: -1, archetypeId: "PURE_SHARP",
    attributes: a(92, 84, 78, 60, 88, 84, 64, 50, 50, 76, 70, 60),
    badges: [
      b("Limitless Range", "Shooting", "S"), b("Deadeye", "Shooting", "S"),
      b("Shifty Shooter", "Shooting", "A"), b("Free Throw Fiend", "Shooting", "S"),
      b("Dimer", "Playmaking", "A"), b("Bail Out", "Playmaking", "B"),
    ],
    last10: l10(22.8, 3.8, 6.4, 0.412, 0.358, -2.4),
    recentGames: games(l10(22.8, 3.8, 6.4, 0.412, 0.358, -2.4), ["GSW", "SAC", "LAL", "PHX", "DEN", "OKC", "MIN", "DAL"], 71),
    predicted: { nextDelta: -1, reason: "Efficiency down, minus games. Drops to 87.", confidence: "med" },
  },
  {
    id: "trae",
    firstName: "Trae", lastName: "Young", displayName: "Trae Young",
    team: "ATL", position: "PG", height: "6'1\"", weightLb: 164, age: 27,
    rating2k: 89, ratingDelta: 0, archetypeId: "FLOOR_GENERAL",
    attributes: a(88, 80, 80, 58, 92, 94, 58, 46, 50, 80, 56, 56),
    badges: [
      b("Limitless Range", "Shooting", "S"), b("Dimer", "Playmaking", "S"),
      b("Bail Out", "Playmaking", "S"), b("Ankle Breaker", "Playmaking", "A"),
      b("Deadeye", "Shooting", "A"), b("Free Throw Fiend", "Shooting", "A"),
    ],
    last10: l10(24.6, 3.2, 11.4, 0.428, 0.354, -0.4),
    recentGames: games(l10(24.6, 3.2, 11.4, 0.428, 0.354, -0.4), ["BOS", "NYK", "MIA", "ORL", "CHI", "CLE", "WAS", "PHI"], 73),
    predicted: { nextDelta: 0, reason: "Elite assists offset cold FG%. Holds 89.", confidence: "med" },
  },
  {
    id: "ja",
    firstName: "Ja", lastName: "Morant", displayName: "Ja Morant",
    team: "MEM", position: "PG", height: "6'2\"", weightLb: 174, age: 27,
    rating2k: 89, ratingDelta: 1, archetypeId: "TWO_WAY_SLASHER",
    attributes: a(70, 76, 92, 92, 90, 84, 72, 56, 58, 94, 68, 96),
    badges: [
      b("Posterizer", "Finishing", "S"), b("Aerial Wizard", "Finishing", "S"),
      b("Pogo Stick", "Physical", "S"), b("Ankle Breaker", "Playmaking", "A"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Bail Out", "Playmaking", "B"),
    ],
    last10: l10(24.4, 4.4, 8.2, 0.486, 0.302, 2.4),
    recentGames: games(l10(24.4, 4.4, 8.2, 0.486, 0.302, 2.4), ["DEN", "OKC", "DAL", "GSW", "LAL", "MIN", "SAC", "PHX", "POR", "HOU"], 79),
    predicted: { nextDelta: 1, reason: "Healthy + explosive. Trending 90.", confidence: "med" },
  },
  {
    id: "zion",
    firstName: "Zion", lastName: "Williamson", displayName: "Zion Williamson",
    team: "NOP", position: "PF", height: "6'6\"", weightLb: 284, age: 26,
    rating2k: 89, ratingDelta: 0, archetypeId: "POINT_FORWARD",
    attributes: a(64, 70, 96, 96, 80, 78, 70, 76, 76, 84, 94, 90),
    badges: [
      b("Posterizer", "Finishing", "S"), b("Backdown Punisher", "Finishing", "S"),
      b("Touch", "Finishing", "S"), b("Pogo Stick", "Physical", "A"),
      b("Aerial Wizard", "Finishing", "A"), b("Slippery Off-Ball", "Finishing", "A"),
    ],
    last10: l10(24.6, 6.2, 5.4, 0.582, 0.298, 1.8),
    recentGames: games(l10(24.6, 6.2, 5.4, 0.582, 0.298, 1.8), ["DAL", "MEM", "SAS", "HOU", "OKC", "DEN", "GSW", "LAL"], 83),
    predicted: { nextDelta: 0, reason: "Elite finishing but ankle minutes managed.", confidence: "low" },
  },
  {
    id: "bane",
    firstName: "Desmond", lastName: "Bane", displayName: "Desmond Bane",
    team: "MEM", position: "SG", height: "6'5\"", weightLb: 215, age: 28,
    rating2k: 86, ratingDelta: 0, archetypeId: "TWO_WAY_SHARP",
    attributes: a(88, 78, 80, 72, 80, 74, 80, 60, 68, 76, 84, 72),
    badges: [
      b("Limitless Range", "Shooting", "S"), b("Deadeye", "Shooting", "A"),
      b("Set Shot Specialist", "Shooting", "A"), b("Clamps", "Defense", "B"),
      b("Slippery Off-Ball", "Finishing", "B"), b("Rhythm Shooter", "Shooting", "A"),
    ],
    last10: l10(21.4, 5.2, 4.8, 0.484, 0.408, 2.4),
    recentGames: games(l10(21.4, 5.2, 4.8, 0.484, 0.408, 2.4), ["DAL", "HOU", "OKC", "DEN", "MIN", "GSW", "SAC", "LAC"], 89),
    predicted: { nextDelta: 0, reason: "Reliable 3pt wing. Steady.", confidence: "high" },
  },
  {
    id: "cunningham",
    firstName: "Cade", lastName: "Cunningham", displayName: "Cade Cunningham",
    team: "DET", position: "PG", height: "6'6\"", weightLb: 220, age: 24,
    rating2k: 88, ratingDelta: 2, archetypeId: "POINT_FORWARD",
    attributes: a(80, 82, 84, 74, 88, 88, 72, 60, 64, 74, 78, 68),
    badges: [
      b("Dimer", "Playmaking", "S"), b("Middy Magician", "Shooting", "A"),
      b("Bail Out", "Playmaking", "A"), b("Triple Threat Juke", "Playmaking", "A"),
      b("Limitless Range", "Shooting", "B"), b("Touch", "Finishing", "B"),
    ],
    last10: l10(26.4, 6.4, 9.2, 0.486, 0.378, 1.8),
    recentGames: games(l10(26.4, 6.4, 9.2, 0.486, 0.378, 1.8), ["BOS", "CLE", "NYK", "MIL", "CHI", "ATL", "ORL", "MIA"], 97),
    predicted: { nextDelta: 2, reason: "Triple-double pace. Rising fast.", confidence: "high" },
  },
  {
    id: "banchero",
    firstName: "Paolo", lastName: "Banchero", displayName: "Paolo Banchero",
    team: "ORL", position: "PF", height: "6'10\"", weightLb: 250, age: 23,
    rating2k: 89, ratingDelta: 1, archetypeId: "POINT_FORWARD",
    attributes: a(76, 82, 86, 84, 82, 78, 74, 68, 74, 76, 86, 76),
    badges: [
      b("Backdown Punisher", "Finishing", "A"), b("Posterizer", "Finishing", "A"),
      b("Middy Magician", "Shooting", "A"), b("Dimer", "Playmaking", "B"),
      b("Touch", "Finishing", "A"), b("Limitless Range", "Shooting", "B"),
    ],
    last10: l10(25.2, 7.4, 5.6, 0.474, 0.342, 2.2),
    recentGames: games(l10(25.2, 7.4, 5.6, 0.474, 0.342, 2.2), ["BOS", "MIA", "ATL", "WAS", "CHA", "DET", "CHI", "IND"], 101),
    predicted: { nextDelta: 1, reason: "Volume + young curve. Climbing.", confidence: "med" },
  },
  {
    id: "wagner",
    firstName: "Franz", lastName: "Wagner", displayName: "Franz Wagner",
    team: "ORL", position: "SF", height: "6'10\"", weightLb: 220, age: 24,
    rating2k: 85, ratingDelta: 0, archetypeId: "TWO_WAY_THREE_LEVEL",
    attributes: a(78, 78, 84, 76, 82, 78, 82, 68, 70, 78, 78, 76),
    badges: [
      b("Slippery Off-Ball", "Finishing", "A"), b("Clamps", "Defense", "A"),
      b("Middy Magician", "Shooting", "B"), b("Touch", "Finishing", "B"),
      b("Limitless Range", "Shooting", "B"), b("Dimer", "Playmaking", "B"),
    ],
    last10: l10(20.4, 5.6, 4.4, 0.484, 0.362, 2.6),
    recentGames: games(l10(20.4, 5.6, 4.4, 0.484, 0.362, 2.6), ["BOS", "MIA", "ATL", "WAS", "CHA", "DET", "CHI", "IND"], 103),
    predicted: { nextDelta: 0, reason: "Steady two-way wing. Holds 85.", confidence: "high" },
  },
  {
    id: "jjj",
    firstName: "Jaren", lastName: "Jackson Jr.", displayName: "Jaren Jackson Jr.",
    team: "MEM", position: "PF", height: "6'10\"", weightLb: 242, age: 26,
    rating2k: 87, ratingDelta: 0, archetypeId: "TWO_WAY_STRETCH",
    attributes: a(80, 76, 80, 84, 70, 64, 78, 90, 78, 76, 80, 86),
    badges: [
      b("Anchor", "Defense", "S"), b("Chase Down Artist", "Defense", "A"),
      b("Limitless Range", "Shooting", "A"), b("Pogo Stick", "Physical", "A"),
      b("Rebound Chaser", "Rebounding", "B"), b("Posterizer", "Finishing", "B"),
    ],
    last10: l10(21.2, 5.4, 2.2, 0.482, 0.358, 2.8),
    recentGames: games(l10(21.2, 5.4, 2.2, 0.482, 0.358, 2.8), ["DAL", "HOU", "OKC", "DEN", "MIN", "GSW", "SAC", "LAC"], 107),
    predicted: { nextDelta: 0, reason: "Stretch-5 DPOY candidate. Holds 87.", confidence: "high" },
  },
  {
    id: "adebayo",
    firstName: "Bam", lastName: "Adebayo", displayName: "Bam Adebayo",
    team: "MIA", position: "C", height: "6'9\"", weightLb: 255, age: 28,
    rating2k: 88, ratingDelta: 0, archetypeId: "GLUE_C",
    attributes: a(60, 80, 86, 82, 76, 80, 84, 88, 86, 80, 88, 80),
    badges: [
      b("Anchor", "Defense", "S"), b("Boxout Beast", "Rebounding", "A"),
      b("Middy Magician", "Shooting", "A"), b("Post Playmaker", "Playmaking", "A"),
      b("Clamps", "Defense", "A"), b("Touch", "Finishing", "A"),
    ],
    last10: l10(18.4, 9.6, 4.2, 0.524, 0.298, 3.4),
    recentGames: games(l10(18.4, 9.6, 4.2, 0.524, 0.298, 3.4), ["BOS", "MIL", "PHI", "NYK", "ATL", "ORL", "CLE", "DET"], 109),
    predicted: { nextDelta: 0, reason: "Switchable anchor. No movement.", confidence: "high" },
  },
  {
    id: "butler",
    firstName: "Jimmy", lastName: "Butler", displayName: "Jimmy Butler",
    team: "MIA", position: "SF", height: "6'7\"", weightLb: 230, age: 36,
    rating2k: 89, ratingDelta: 0, archetypeId: "TWO_WAY_SLASHER",
    attributes: a(72, 84, 86, 76, 84, 80, 86, 70, 70, 76, 84, 70),
    badges: [
      b("Clamps", "Defense", "S"), b("Free Throw Fiend", "Shooting", "S"),
      b("Pickpocket", "Defense", "A"), b("Slippery Off-Ball", "Finishing", "A"),
      b("Middy Magician", "Shooting", "A"), b("Dimer", "Playmaking", "B"),
    ],
    last10: l10(20.4, 5.8, 5.4, 0.504, 0.358, 4.2),
    recentGames: games(l10(20.4, 5.8, 5.4, 0.504, 0.358, 4.2), ["LAL", "SAC", "PHX", "DEN", "MIN", "OKC", "DAL", "LAC"], 113),
    predicted: { nextDelta: 0, reason: "Playoff Jimmy energy. Holds 89.", confidence: "high" },
  },
  {
    id: "mobley",
    firstName: "Evan", lastName: "Mobley", displayName: "Evan Mobley",
    team: "CLE", position: "PF", height: "7'0\"", weightLb: 215, age: 25,
    rating2k: 86, ratingDelta: 1, archetypeId: "GLUE_C",
    attributes: a(64, 74, 82, 80, 70, 74, 80, 90, 84, 78, 76, 84),
    badges: [
      b("Anchor", "Defense", "S"), b("Chase Down Artist", "Defense", "A"),
      b("Rebound Chaser", "Rebounding", "A"), b("Touch", "Finishing", "A"),
      b("Pogo Stick", "Physical", "A"), b("Boxout Beast", "Rebounding", "B"),
    ],
    last10: l10(17.4, 9.8, 3.4, 0.572, 0.342, 5.8),
    recentGames: games(l10(17.4, 9.8, 3.4, 0.572, 0.342, 5.8), ["BOS", "NYK", "MIL", "ORL", "MIA", "CHI", "DET", "ATL"], 127),
    predicted: { nextDelta: 1, reason: "DPOY-level + scoring jump. Trending 87.", confidence: "high" },
  },
  {
    id: "garland",
    firstName: "Darius", lastName: "Garland", displayName: "Darius Garland",
    team: "CLE", position: "PG", height: "6'1\"", weightLb: 192, age: 26,
    rating2k: 84, ratingDelta: 0, archetypeId: "FLOOR_GENERAL",
    attributes: a(82, 76, 80, 60, 88, 88, 64, 50, 50, 82, 60, 60),
    badges: [
      b("Dimer", "Playmaking", "A"), b("Ankle Breaker", "Playmaking", "A"),
      b("Limitless Range", "Shooting", "A"), b("Bail Out", "Playmaking", "B"),
      b("Deadeye", "Shooting", "B"), b("Triple Threat Juke", "Playmaking", "B"),
    ],
    last10: l10(19.4, 2.8, 7.6, 0.474, 0.372, 3.2),
    recentGames: games(l10(19.4, 2.8, 7.6, 0.474, 0.372, 3.2), ["BOS", "NYK", "MIL", "ORL", "MIA", "CHI", "DET", "ATL"], 131),
    predicted: { nextDelta: 0, reason: "Solid PG2 production. Steady.", confidence: "high" },
  },
  {
    id: "fox",
    firstName: "De'Aaron", lastName: "Fox", displayName: "De'Aaron Fox",
    team: "SAS", position: "PG", height: "6'3\"", weightLb: 185, age: 28,
    rating2k: 89, ratingDelta: 0, archetypeId: "TWO_WAY_SLASHER",
    attributes: a(78, 82, 90, 80, 88, 82, 78, 56, 56, 96, 70, 84),
    badges: [
      b("Slippery Off-Ball", "Finishing", "S"), b("Pogo Stick", "Physical", "A"),
      b("Middy Magician", "Shooting", "A"), b("Ankle Breaker", "Playmaking", "A"),
      b("Aerial Wizard", "Finishing", "A"), b("Clamps", "Defense", "B"),
    ],
    last10: l10(26.2, 4.6, 5.8, 0.494, 0.358, 1.2),
    recentGames: games(l10(26.2, 4.6, 5.8, 0.494, 0.358, 1.2), ["GSW", "LAL", "PHX", "DEN", "MIN", "OKC", "DAL", "POR"], 137),
    predicted: { nextDelta: 0, reason: "Steady scoring guard. Holds 89.", confidence: "high" },
  },
  {
    id: "sabonis",
    firstName: "Domantas", lastName: "Sabonis", displayName: "Domantas Sabonis",
    team: "SAC", position: "C", height: "6'11\"", weightLb: 240, age: 30,
    rating2k: 88, ratingDelta: 0, archetypeId: "POINT_CENTER",
    attributes: a(72, 80, 88, 76, 80, 88, 64, 76, 92, 70, 88, 64),
    badges: [
      b("Rebound Chaser", "Rebounding", "S"), b("Boxout Beast", "Rebounding", "S"),
      b("Dimer", "Playmaking", "A"), b("Touch", "Finishing", "A"),
      b("Post Playmaker", "Playmaking", "A"), b("Backdown Punisher", "Finishing", "B"),
    ],
    last10: l10(20.4, 13.6, 8.2, 0.594, 0.388, 4.4),
    recentGames: games(l10(20.4, 13.6, 8.2, 0.594, 0.388, 4.4), ["GSW", "LAL", "PHX", "DEN", "MIN", "OKC", "DAL", "POR"], 139),
    predicted: { nextDelta: 0, reason: "Triple-double machine. Steady 88.", confidence: "high" },
  },
  {
    id: "irving",
    firstName: "Kyrie", lastName: "Irving", displayName: "Kyrie Irving",
    team: "DAL", position: "PG", height: "6'2\"", weightLb: 195, age: 34,
    rating2k: 91, ratingDelta: 0, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(88, 88, 92, 70, 96, 80, 72, 56, 56, 84, 70, 70),
    badges: [
      b("Ankle Breaker", "Playmaking", "S"), b("Shifty Shooter", "Shooting", "S"),
      b("Touch", "Finishing", "S"), b("Slippery Off-Ball", "Finishing", "A"),
      b("Limitless Range", "Shooting", "A"), b("Middy Magician", "Shooting", "A"),
    ],
    last10: l10(25.4, 4.4, 5.2, 0.512, 0.388, 3.4),
    recentGames: games(l10(25.4, 4.4, 5.2, 0.512, 0.388, 3.4), ["DEN", "OKC", "GSW", "LAL", "MIN", "PHX", "SAC", "POR"], 149),
    predicted: { nextDelta: 0, reason: "Elite handle + scoring. Holds 91.", confidence: "high" },
  },
  {
    id: "george",
    firstName: "Paul", lastName: "George", displayName: "Paul George",
    team: "PHI", position: "SF", height: "6'8\"", weightLb: 220, age: 36,
    rating2k: 87, ratingDelta: -1, archetypeId: "TWO_WAY_THREE_LEVEL",
    attributes: a(86, 82, 80, 72, 82, 76, 82, 64, 68, 76, 78, 74),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Deadeye", "Shooting", "A"),
      b("Clamps", "Defense", "A"), b("Pickpocket", "Defense", "A"),
      b("Slippery Off-Ball", "Finishing", "B"), b("Middy Magician", "Shooting", "B"),
    ],
    last10: l10(18.4, 4.6, 3.8, 0.434, 0.348, -1.2),
    recentGames: games(l10(18.4, 4.6, 3.8, 0.434, 0.348, -1.2), ["BOS", "MIL", "NYK", "MIA", "CLE", "ATL", "ORL", "DET"], 151),
    predicted: { nextDelta: -1, reason: "Cold FG% + lower minutes. Drop to 86.", confidence: "med" },
  },
  {
    id: "kawhi",
    firstName: "Kawhi", lastName: "Leonard", displayName: "Kawhi Leonard",
    team: "LAC", position: "SF", height: "6'7\"", weightLb: 225, age: 35,
    rating2k: 90, ratingDelta: 0, archetypeId: "TWO_WAY_THREE_LEVEL",
    attributes: a(82, 88, 86, 78, 84, 76, 90, 76, 72, 74, 88, 72),
    badges: [
      b("Clamps", "Defense", "S"), b("Pickpocket", "Defense", "S"),
      b("Middy Magician", "Shooting", "S"), b("Limitless Range", "Shooting", "A"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Deadeye", "Shooting", "A"),
    ],
    last10: l10(22.4, 6.2, 3.6, 0.524, 0.402, 5.2),
    recentGames: games(l10(22.4, 6.2, 3.6, 0.524, 0.402, 5.2), ["DEN", "MIN", "OKC", "LAL", "GSW", "PHX", "SAC", "DAL"], 157),
    predicted: { nextDelta: 0, reason: "Efficient when available. Holds 90.", confidence: "med" },
  },
  {
    id: "harden",
    firstName: "James", lastName: "Harden", displayName: "James Harden",
    team: "LAC", position: "SG", height: "6'5\"", weightLb: 220, age: 36,
    rating2k: 88, ratingDelta: 0, archetypeId: "FLOOR_GENERAL",
    attributes: a(84, 80, 82, 64, 92, 92, 70, 56, 60, 72, 80, 60),
    badges: [
      b("Dimer", "Playmaking", "S"), b("Step Through Specialist", "Finishing", "A"),
      b("Limitless Range", "Shooting", "A"), b("Bail Out", "Playmaking", "A"),
      b("Free Throw Fiend", "Shooting", "A"), b("Ankle Breaker", "Playmaking", "A"),
    ],
    last10: l10(21.4, 5.4, 8.2, 0.444, 0.378, 2.8),
    recentGames: games(l10(21.4, 5.4, 8.2, 0.444, 0.378, 2.8), ["DEN", "MIN", "OKC", "LAL", "GSW", "PHX", "SAC", "DAL"], 163),
    predicted: { nextDelta: 0, reason: "Veteran orchestrator. Holds 88.", confidence: "high" },
  },
  {
    id: "tyler-herro",
    firstName: "Tyler", lastName: "Herro", displayName: "Tyler Herro",
    team: "MIA", position: "SG", height: "6'5\"", weightLb: 195, age: 26,
    rating2k: 84, ratingDelta: 1, archetypeId: "PURE_SHARP",
    attributes: a(86, 80, 78, 64, 84, 78, 64, 50, 56, 76, 70, 62),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Deadeye", "Shooting", "A"),
      b("Shifty Shooter", "Shooting", "A"), b("Rhythm Shooter", "Shooting", "A"),
      b("Slippery Off-Ball", "Finishing", "B"), b("Dimer", "Playmaking", "B"),
    ],
    last10: l10(22.4, 5.2, 5.6, 0.474, 0.402, 1.8),
    recentGames: games(l10(22.4, 5.2, 5.6, 0.474, 0.402, 1.8), ["BOS", "MIL", "PHI", "NYK", "ATL", "ORL", "CLE", "DET"], 167),
    predicted: { nextDelta: 1, reason: "Career-high 3pt volume. Climbs to 85.", confidence: "med" },
  },
  {
    id: "siakam",
    firstName: "Pascal", lastName: "Siakam", displayName: "Pascal Siakam",
    team: "IND", position: "PF", height: "6'8\"", weightLb: 230, age: 32,
    rating2k: 85, ratingDelta: 0, archetypeId: "TWO_WAY_SLASHER",
    attributes: a(72, 76, 86, 80, 78, 74, 76, 72, 76, 80, 82, 78),
    badges: [
      b("Slippery Off-Ball", "Finishing", "A"), b("Touch", "Finishing", "A"),
      b("Posterizer", "Finishing", "B"), b("Clamps", "Defense", "B"),
      b("Middy Magician", "Shooting", "B"), b("Rebound Chaser", "Rebounding", "B"),
    ],
    last10: l10(20.8, 6.4, 3.8, 0.524, 0.358, 3.4),
    recentGames: games(l10(20.8, 6.4, 3.8, 0.524, 0.358, 3.4), ["MIL", "BOS", "PHI", "CLE", "NYK", "ATL", "ORL", "MIA"], 173),
    predicted: { nextDelta: 0, reason: "Steady combo forward. Holds 85.", confidence: "high" },
  },
  {
    id: "lavine",
    firstName: "Zach", lastName: "LaVine", displayName: "Zach LaVine",
    team: "CHI", position: "SG", height: "6'5\"", weightLb: 200, age: 31,
    rating2k: 83, ratingDelta: 0, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(86, 80, 86, 92, 80, 70, 64, 50, 58, 84, 76, 92),
    badges: [
      b("Posterizer", "Finishing", "S"), b("Limitless Range", "Shooting", "A"),
      b("Pogo Stick", "Physical", "A"), b("Aerial Wizard", "Finishing", "A"),
      b("Slippery Off-Ball", "Finishing", "B"), b("Deadeye", "Shooting", "B"),
    ],
    last10: l10(21.6, 4.4, 4.2, 0.484, 0.392, 1.2),
    recentGames: games(l10(21.6, 4.4, 4.2, 0.484, 0.392, 1.2), ["GSW", "LAL", "PHX", "DEN", "MIN", "OKC", "DAL", "POR"], 179),
    predicted: { nextDelta: 0, reason: "Healthy bucket-getter. Holds 83.", confidence: "med" },
  },
  {
    id: "demar",
    firstName: "DeMar", lastName: "DeRozan", displayName: "DeMar DeRozan",
    team: "CHI", position: "SF", height: "6'6\"", weightLb: 220, age: 36,
    rating2k: 84, ratingDelta: 0, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(64, 90, 84, 72, 84, 78, 70, 56, 60, 72, 80, 64),
    badges: [
      b("Middy Magician", "Shooting", "S"), b("Free Throw Fiend", "Shooting", "S"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Touch", "Finishing", "A"),
      b("Ankle Breaker", "Playmaking", "B"), b("Dimer", "Playmaking", "B"),
    ],
    last10: l10(21.4, 4.2, 4.6, 0.484, 0.302, 0.4),
    recentGames: games(l10(21.4, 4.2, 4.6, 0.484, 0.302, 0.4), ["GSW", "LAL", "PHX", "DEN", "MIN", "OKC", "DAL", "POR"], 181),
    predicted: { nextDelta: 0, reason: "Mid-range master. Steady 84.", confidence: "high" },
  },
  {
    id: "ingram",
    firstName: "Brandon", lastName: "Ingram", displayName: "Brandon Ingram",
    team: "TOR", position: "SF", height: "6'8\"", weightLb: 190, age: 29,
    rating2k: 84, ratingDelta: 0, archetypeId: "THREE_LEVEL",
    attributes: a(80, 86, 82, 72, 82, 78, 74, 60, 60, 74, 70, 70),
    badges: [
      b("Middy Magician", "Shooting", "A"), b("Limitless Range", "Shooting", "A"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Touch", "Finishing", "A"),
      b("Dimer", "Playmaking", "B"), b("Deadeye", "Shooting", "B"),
    ],
    last10: l10(21.4, 5.2, 4.6, 0.474, 0.378, -0.8),
    recentGames: games(l10(21.4, 5.2, 4.6, 0.474, 0.378, -0.8), ["BOS", "NYK", "MIL", "PHI", "MIA", "CLE", "ATL", "ORL"], 191),
    predicted: { nextDelta: 0, reason: "Smooth scorer. Holds 84.", confidence: "med" },
  },
  {
    id: "vanvleet",
    firstName: "Fred", lastName: "VanVleet", displayName: "Fred VanVleet",
    team: "HOU", position: "PG", height: "6'0\"", weightLb: 197, age: 32,
    rating2k: 83, ratingDelta: 0, archetypeId: "TWO_WAY_SHARP",
    attributes: a(84, 76, 76, 60, 86, 86, 82, 56, 58, 76, 70, 60),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Pickpocket", "Defense", "A"),
      b("Clamps", "Defense", "A"), b("Dimer", "Playmaking", "A"),
      b("Deadeye", "Shooting", "B"), b("Set Shot Specialist", "Shooting", "B"),
    ],
    last10: l10(15.4, 3.4, 7.6, 0.404, 0.362, 1.8),
    recentGames: games(l10(15.4, 3.4, 7.6, 0.404, 0.362, 1.8), ["DAL", "OKC", "MEM", "DEN", "MIN", "GSW", "SAC", "POR"], 193),
    predicted: { nextDelta: 0, reason: "Veteran point of attack. Steady.", confidence: "high" },
  },
  {
    id: "sengun",
    firstName: "Alperen", lastName: "Sengun", displayName: "Alperen Sengun",
    team: "HOU", position: "C", height: "6'11\"", weightLb: 243, age: 24,
    rating2k: 86, ratingDelta: 1, archetypeId: "POINT_CENTER",
    attributes: a(60, 78, 86, 72, 76, 86, 64, 76, 88, 68, 86, 60),
    badges: [
      b("Post Playmaker", "Playmaking", "S"), b("Touch", "Finishing", "A"),
      b("Backdown Punisher", "Finishing", "A"), b("Boxout Beast", "Rebounding", "A"),
      b("Dimer", "Playmaking", "A"), b("Post Spin Technician", "Finishing", "A"),
    ],
    last10: l10(20.4, 10.4, 5.8, 0.534, 0.298, 3.4),
    recentGames: games(l10(20.4, 10.4, 5.8, 0.534, 0.298, 3.4), ["DAL", "OKC", "MEM", "DEN", "MIN", "GSW", "SAC", "POR"], 197),
    predicted: { nextDelta: 1, reason: "Hub of HOU offense. Climbs to 87.", confidence: "high" },
  },
  {
    id: "smith",
    firstName: "Jabari", lastName: "Smith Jr.", displayName: "Jabari Smith Jr.",
    team: "HOU", position: "PF", height: "6'11\"", weightLb: 220, age: 23,
    rating2k: 81, ratingDelta: 1, archetypeId: "TWO_WAY_STRETCH",
    attributes: a(80, 74, 76, 76, 64, 60, 76, 84, 80, 74, 78, 82),
    badges: [
      b("Anchor", "Defense", "A"), b("Limitless Range", "Shooting", "A"),
      b("Rebound Chaser", "Rebounding", "A"), b("Chase Down Artist", "Defense", "B"),
      b("Pogo Stick", "Physical", "B"), b("Set Shot Specialist", "Shooting", "B"),
    ],
    last10: l10(14.2, 7.8, 1.8, 0.454, 0.378, 2.2),
    recentGames: games(l10(14.2, 7.8, 1.8, 0.454, 0.378, 2.2), ["DAL", "OKC", "MEM", "DEN", "MIN", "GSW", "SAC", "POR"], 199),
    predicted: { nextDelta: 1, reason: "Stretch-4 hitting stride. Climbs to 82.", confidence: "med" },
  },
  {
    id: "thompson-amen",
    firstName: "Amen", lastName: "Thompson", displayName: "Amen Thompson",
    team: "HOU", position: "SG", height: "6'7\"", weightLb: 215, age: 23,
    rating2k: 85, ratingDelta: 2, archetypeId: "TWO_WAY_SLASHER",
    attributes: a(60, 64, 86, 88, 78, 78, 86, 70, 74, 92, 80, 92),
    badges: [
      b("Posterizer", "Finishing", "A"), b("Pogo Stick", "Physical", "S"),
      b("Clamps", "Defense", "A"), b("Slippery Off-Ball", "Finishing", "A"),
      b("Chase Down Artist", "Defense", "A"), b("Aerial Wizard", "Finishing", "A"),
    ],
    last10: l10(16.4, 7.2, 4.4, 0.564, 0.302, 5.8),
    recentGames: games(l10(16.4, 7.2, 4.4, 0.564, 0.302, 5.8), ["DAL", "OKC", "MEM", "DEN", "MIN", "GSW", "SAC", "POR"], 211),
    predicted: { nextDelta: 2, reason: "Two-way breakout. Rising fast.", confidence: "high" },
  },
  {
    id: "porzingis",
    firstName: "Kristaps", lastName: "Porzingis", displayName: "Kristaps Porzingis",
    team: "BOS", position: "C", height: "7'2\"", weightLb: 240, age: 30,
    rating2k: 85, ratingDelta: 0, archetypeId: "TWO_WAY_STRETCH",
    attributes: a(84, 80, 80, 78, 64, 60, 70, 86, 80, 64, 80, 76),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Anchor", "Defense", "A"),
      b("Set Shot Specialist", "Shooting", "A"), b("Rebound Chaser", "Rebounding", "B"),
      b("Touch", "Finishing", "B"), b("Posterizer", "Finishing", "B"),
    ],
    last10: l10(18.4, 6.8, 1.8, 0.504, 0.382, 4.2),
    recentGames: games(l10(18.4, 6.8, 1.8, 0.504, 0.382, 4.2), ["MIL", "NYK", "PHI", "MIA", "CLE", "ATL", "ORL", "CHI"], 223),
    predicted: { nextDelta: 0, reason: "Stretch-5 reliable. Holds 85.", confidence: "med" },
  },
  {
    id: "brown",
    firstName: "Jaylen", lastName: "Brown", displayName: "Jaylen Brown",
    team: "BOS", position: "SG", height: "6'6\"", weightLb: 223, age: 29,
    rating2k: 91, ratingDelta: 0, archetypeId: "TWO_WAY_THREE_LEVEL",
    attributes: a(80, 80, 88, 86, 82, 72, 86, 68, 70, 84, 86, 86),
    badges: [
      b("Posterizer", "Finishing", "S"), b("Clamps", "Defense", "A"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Limitless Range", "Shooting", "A"),
      b("Aerial Wizard", "Finishing", "A"), b("Pogo Stick", "Physical", "A"),
    ],
    last10: l10(24.6, 6.4, 4.4, 0.488, 0.362, 5.2),
    recentGames: games(l10(24.6, 6.4, 4.4, 0.488, 0.362, 5.2), ["MIL", "NYK", "PHI", "MIA", "CLE", "ATL", "ORL", "CHI"], 227),
    predicted: { nextDelta: 0, reason: "Steady two-way wing. Holds 91.", confidence: "high" },
  },
  {
    id: "holmgren",
    firstName: "Chet", lastName: "Holmgren", displayName: "Chet Holmgren",
    team: "OKC", position: "C", height: "7'1\"", weightLb: 208, age: 24,
    rating2k: 86, ratingDelta: 1, archetypeId: "TWO_WAY_STRETCH",
    attributes: a(80, 74, 82, 80, 64, 64, 72, 90, 80, 76, 64, 88),
    badges: [
      b("Anchor", "Defense", "S"), b("Chase Down Artist", "Defense", "A"),
      b("Limitless Range", "Shooting", "A"), b("Pogo Stick", "Physical", "A"),
      b("Rebound Chaser", "Rebounding", "B"), b("Touch", "Finishing", "B"),
    ],
    last10: l10(16.4, 8.6, 2.4, 0.524, 0.378, 9.4),
    recentGames: games(l10(16.4, 8.6, 2.4, 0.524, 0.378, 9.4), ["DEN", "MIN", "DAL", "LAC", "GSW", "SAC", "PHX", "MEM"], 229),
    predicted: { nextDelta: 1, reason: "Defensive anchor + spacing. Climbs to 87.", confidence: "high" },
  },
  {
    id: "jwill",
    firstName: "Jalen", lastName: "Williams", displayName: "Jalen Williams",
    team: "OKC", position: "SF", height: "6'5\"", weightLb: 211, age: 25,
    rating2k: 87, ratingDelta: 1, archetypeId: "TWO_WAY_THREE_LEVEL",
    attributes: a(80, 80, 84, 76, 82, 80, 84, 64, 64, 80, 80, 78),
    badges: [
      b("Slippery Off-Ball", "Finishing", "A"), b("Clamps", "Defense", "A"),
      b("Middy Magician", "Shooting", "A"), b("Limitless Range", "Shooting", "A"),
      b("Pickpocket", "Defense", "A"), b("Dimer", "Playmaking", "B"),
    ],
    last10: l10(21.4, 5.4, 5.2, 0.504, 0.388, 8.4),
    recentGames: games(l10(21.4, 5.4, 5.2, 0.504, 0.388, 8.4), ["DEN", "MIN", "DAL", "LAC", "GSW", "SAC", "PHX", "MEM"], 233),
    predicted: { nextDelta: 1, reason: "All-NBA two-way. Climbs to 88.", confidence: "high" },
  },
  {
    id: "randle",
    firstName: "Julius", lastName: "Randle", displayName: "Julius Randle",
    team: "MIN", position: "PF", height: "6'8\"", weightLb: 250, age: 31,
    rating2k: 83, ratingDelta: 0, archetypeId: "POINT_FORWARD",
    attributes: a(74, 78, 84, 80, 78, 78, 64, 70, 80, 70, 86, 70),
    badges: [
      b("Backdown Punisher", "Finishing", "A"), b("Touch", "Finishing", "A"),
      b("Middy Magician", "Shooting", "B"), b("Posterizer", "Finishing", "B"),
      b("Dimer", "Playmaking", "B"), b("Rebound Chaser", "Rebounding", "B"),
    ],
    last10: l10(19.4, 6.8, 4.4, 0.484, 0.342, 2.2),
    recentGames: groomGames("MIN", 239),
    predicted: { nextDelta: 0, reason: "Veteran forward. Holds 83.", confidence: "high" },
  },
  {
    id: "kat",
    firstName: "Karl-Anthony", lastName: "Towns", displayName: "Karl-Anthony Towns",
    team: "NYK", position: "C", height: "7'0\"", weightLb: 248, age: 30,
    rating2k: 88, ratingDelta: 0, archetypeId: "TWO_WAY_STRETCH",
    attributes: a(86, 82, 84, 78, 74, 70, 64, 76, 86, 68, 86, 70),
    badges: [
      b("Limitless Range", "Shooting", "S"), b("Deadeye", "Shooting", "A"),
      b("Rebound Chaser", "Rebounding", "A"), b("Touch", "Finishing", "A"),
      b("Set Shot Specialist", "Shooting", "A"), b("Backdown Punisher", "Finishing", "B"),
    ],
    last10: l10(22.4, 12.6, 3.4, 0.524, 0.402, 4.2),
    recentGames: groomGames("NYK", 241),
    predicted: { nextDelta: 0, reason: "Stretch big production. Holds 88.", confidence: "high" },
  },
  {
    id: "og",
    firstName: "OG", lastName: "Anunoby", displayName: "OG Anunoby",
    team: "NYK", position: "SF", height: "6'7\"", weightLb: 232, age: 28,
    rating2k: 84, ratingDelta: 0, archetypeId: "TWO_WAY_SHARP",
    attributes: a(80, 70, 80, 78, 70, 60, 90, 76, 70, 78, 86, 80),
    badges: [
      b("Clamps", "Defense", "S"), b("Pickpocket", "Defense", "S"),
      b("Limitless Range", "Shooting", "A"), b("Chase Down Artist", "Defense", "A"),
      b("Set Shot Specialist", "Shooting", "B"), b("Posterizer", "Finishing", "B"),
    ],
    last10: l10(16.4, 4.6, 2.4, 0.494, 0.378, 4.8),
    recentGames: groomGames("NYK", 251),
    predicted: { nextDelta: 0, reason: "3-and-D specialist. Holds 84.", confidence: "high" },
  },
  {
    id: "white",
    firstName: "Derrick", lastName: "White", displayName: "Derrick White",
    team: "BOS", position: "SG", height: "6'4\"", weightLb: 190, age: 32,
    rating2k: 85, ratingDelta: 0, archetypeId: "TWO_WAY_SHARP",
    attributes: a(84, 76, 78, 70, 76, 80, 84, 66, 64, 78, 76, 78),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Clamps", "Defense", "A"),
      b("Chase Down Artist", "Defense", "A"), b("Deadeye", "Shooting", "A"),
      b("Dimer", "Playmaking", "B"), b("Pickpocket", "Defense", "A"),
    ],
    last10: l10(16.4, 4.4, 4.8, 0.484, 0.398, 6.2),
    recentGames: groomGames("BOS", 257),
    predicted: { nextDelta: 0, reason: "Glue guard. Steady.", confidence: "high" },
  },
  {
    id: "horford",
    firstName: "Al", lastName: "Horford", displayName: "Al Horford",
    team: "BOS", position: "C", height: "6'9\"", weightLb: 240, age: 39,
    rating2k: 80, ratingDelta: 0, archetypeId: "TWO_WAY_STRETCH",
    attributes: a(80, 74, 72, 64, 60, 76, 70, 80, 78, 60, 78, 60),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Anchor", "Defense", "A"),
      b("Set Shot Specialist", "Shooting", "A"), b("Boxout Beast", "Rebounding", "B"),
      b("Post Playmaker", "Playmaking", "B"), b("Touch", "Finishing", "B"),
    ],
    last10: l10(9.4, 6.2, 2.6, 0.482, 0.402, 4.8),
    recentGames: groomGames("BOS", 263),
    predicted: { nextDelta: 0, reason: "Veteran spacing 5. Holds 80.", confidence: "high" },
  },
  {
    id: "lavert",
    firstName: "Lauri", lastName: "Markkanen", displayName: "Lauri Markkanen",
    team: "UTA", position: "PF", height: "7'0\"", weightLb: 240, age: 28,
    rating2k: 84, ratingDelta: 0, archetypeId: "TWO_WAY_STRETCH",
    attributes: a(86, 78, 78, 78, 64, 60, 64, 72, 76, 72, 78, 76),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Deadeye", "Shooting", "A"),
      b("Set Shot Specialist", "Shooting", "A"), b("Touch", "Finishing", "B"),
      b("Rebound Chaser", "Rebounding", "B"), b("Posterizer", "Finishing", "B"),
    ],
    last10: l10(21.4, 6.8, 1.6, 0.474, 0.392, 0.4),
    recentGames: groomGames("UTA", 269),
    predicted: { nextDelta: 0, reason: "Stretch-4 floor spacer. Holds.", confidence: "high" },
  },
  {
    id: "powell",
    firstName: "Norman", lastName: "Powell", displayName: "Norman Powell",
    team: "MIA", position: "SG", height: "6'4\"", weightLb: 215, age: 33,
    rating2k: 82, ratingDelta: 1, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(86, 78, 84, 70, 78, 64, 70, 56, 56, 80, 76, 72),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Deadeye", "Shooting", "A"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Rhythm Shooter", "Shooting", "A"),
      b("Posterizer", "Finishing", "B"), b("Set Shot Specialist", "Shooting", "B"),
    ],
    last10: l10(22.4, 3.4, 2.2, 0.504, 0.422, 3.4),
    recentGames: groomGames("MIA", 271),
    predicted: { nextDelta: 1, reason: "Career-best 3pt %. Climbs.", confidence: "med" },
  },
  {
    id: "scottie",
    firstName: "Scottie", lastName: "Barnes", displayName: "Scottie Barnes",
    team: "TOR", position: "SF", height: "6'7\"", weightLb: 225, age: 24,
    rating2k: 85, ratingDelta: 0, archetypeId: "POINT_FORWARD",
    attributes: a(70, 74, 84, 78, 80, 86, 84, 78, 80, 78, 84, 80),
    badges: [
      b("Dimer", "Playmaking", "A"), b("Clamps", "Defense", "A"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Rebound Chaser", "Rebounding", "A"),
      b("Touch", "Finishing", "B"), b("Pickpocket", "Defense", "B"),
    ],
    last10: l10(18.4, 7.6, 5.8, 0.484, 0.342, -1.8),
    recentGames: groomGames("TOR", 277),
    predicted: { nextDelta: 0, reason: "Swiss-army forward. Holds 85.", confidence: "med" },
  },
  {
    id: "rj",
    firstName: "RJ", lastName: "Barrett", displayName: "RJ Barrett",
    team: "TOR", position: "SG", height: "6'6\"", weightLb: 214, age: 25,
    rating2k: 80, ratingDelta: 0, archetypeId: "TWO_WAY_SLASHER",
    attributes: a(72, 72, 84, 78, 78, 70, 70, 56, 64, 78, 80, 76),
    badges: [
      b("Slippery Off-Ball", "Finishing", "A"), b("Posterizer", "Finishing", "B"),
      b("Touch", "Finishing", "B"), b("Free Throw Fiend", "Shooting", "B"),
      b("Middy Magician", "Shooting", "B"), b("Limitless Range", "Shooting", "C"),
    ],
    last10: l10(18.4, 5.2, 4.4, 0.464, 0.342, -2.4),
    recentGames: groomGames("TOR", 281),
    predicted: { nextDelta: 0, reason: "Steady scorer. Holds 80.", confidence: "med" },
  },
  {
    id: "ingles",
    firstName: "Tari", lastName: "Eason", displayName: "Tari Eason",
    team: "HOU", position: "SF", height: "6'8\"", weightLb: 215, age: 25,
    rating2k: 81, ratingDelta: 1, archetypeId: "TWO_WAY_SLASHER",
    attributes: a(74, 68, 80, 80, 70, 60, 84, 74, 78, 80, 84, 84),
    badges: [
      b("Chase Down Artist", "Defense", "A"), b("Pickpocket", "Defense", "A"),
      b("Clamps", "Defense", "A"), b("Rebound Chaser", "Rebounding", "A"),
      b("Pogo Stick", "Physical", "A"), b("Slippery Off-Ball", "Finishing", "B"),
    ],
    last10: l10(13.4, 7.4, 1.8, 0.504, 0.342, 4.4),
    recentGames: groomGames("HOU", 283),
    predicted: { nextDelta: 1, reason: "Defensive disruptor. Climbs.", confidence: "med" },
  },
  {
    id: "murray-dejounte",
    firstName: "Dejounte", lastName: "Murray", displayName: "Dejounte Murray",
    team: "NOP", position: "PG", height: "6'4\"", weightLb: 180, age: 29,
    rating2k: 83, ratingDelta: 0, archetypeId: "TWO_WAY_SHOT_CREATOR",
    attributes: a(78, 76, 80, 72, 84, 84, 82, 58, 64, 82, 76, 70),
    badges: [
      b("Pickpocket", "Defense", "S"), b("Clamps", "Defense", "A"),
      b("Dimer", "Playmaking", "A"), b("Middy Magician", "Shooting", "B"),
      b("Slippery Off-Ball", "Finishing", "B"), b("Triple Threat Juke", "Playmaking", "B"),
    ],
    last10: l10(17.6, 4.4, 6.8, 0.434, 0.342, -1.4),
    recentGames: groomGames("NOP", 289),
    predicted: { nextDelta: 0, reason: "Two-way guard. Steady.", confidence: "med" },
  },
  {
    id: "murray-jamal",
    firstName: "Jamal", lastName: "Murray", displayName: "Jamal Murray",
    team: "DEN", position: "PG", height: "6'4\"", weightLb: 215, age: 29,
    rating2k: 86, ratingDelta: 0, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(84, 82, 82, 68, 86, 80, 70, 56, 60, 78, 76, 70),
    badges: [
      b("Middy Magician", "Shooting", "A"), b("Limitless Range", "Shooting", "A"),
      b("Slippery Off-Ball", "Finishing", "A"), b("Deadeye", "Shooting", "A"),
      b("Touch", "Finishing", "B"), b("Ankle Breaker", "Playmaking", "B"),
    ],
    last10: l10(21.4, 4.4, 6.2, 0.474, 0.408, 4.8),
    recentGames: groomGames("DEN", 293),
    predicted: { nextDelta: 0, reason: "Clutch scoring guard. Steady.", confidence: "high" },
  },
  {
    id: "gobert",
    firstName: "Rudy", lastName: "Gobert", displayName: "Rudy Gobert",
    team: "MIN", position: "C", height: "7'1\"", weightLb: 258, age: 33,
    rating2k: 86, ratingDelta: 0, archetypeId: "GLUE_C",
    attributes: a(40, 50, 78, 80, 50, 50, 60, 96, 92, 60, 92, 76),
    badges: [
      b("Anchor", "Defense", "S"), b("Boxout Beast", "Rebounding", "S"),
      b("Rebound Chaser", "Rebounding", "S"), b("Chase Down Artist", "Defense", "A"),
      b("Pogo Stick", "Physical", "B"), b("Touch", "Finishing", "C"),
    ],
    last10: l10(13.4, 12.8, 1.4, 0.654, 0, 6.2),
    recentGames: groomGames("MIN", 307),
    predicted: { nextDelta: 0, reason: "Elite rim protection. Holds 86.", confidence: "high" },
  },
  {
    id: "tatum-2",
    firstName: "Devin", lastName: "Vassell", displayName: "Devin Vassell",
    team: "SAS", position: "SG", height: "6'5\"", weightLb: 200, age: 25,
    rating2k: 80, ratingDelta: 0, archetypeId: "TWO_WAY_SHARP",
    attributes: a(82, 76, 76, 68, 74, 64, 80, 60, 60, 78, 72, 72),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Clamps", "Defense", "B"),
      b("Set Shot Specialist", "Shooting", "A"), b("Deadeye", "Shooting", "B"),
      b("Slippery Off-Ball", "Finishing", "B"), b("Middy Magician", "Shooting", "B"),
    ],
    last10: l10(16.2, 3.8, 2.8, 0.434, 0.382, -2.8),
    recentGames: groomGames("SAS", 311),
    predicted: { nextDelta: 0, reason: "Two-way wing. Steady.", confidence: "med" },
  },
  {
    id: "lamelo",
    firstName: "LaMelo", lastName: "Ball", displayName: "LaMelo Ball",
    team: "CHA", position: "PG", height: "6'7\"", weightLb: 180, age: 24,
    rating2k: 86, ratingDelta: 1, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(86, 76, 78, 70, 90, 90, 64, 52, 64, 84, 68, 76),
    badges: [
      b("Limitless Range", "Shooting", "S"), b("Dimer", "Playmaking", "A"),
      b("Ankle Breaker", "Playmaking", "A"), b("Needle Threader", "Playmaking", "A"),
      b("Bail Out", "Playmaking", "B"), b("Quick First Step", "Playmaking", "B"),
    ],
    last10: l10(25.4, 5.2, 7.6, 0.428, 0.358, -4.2),
    recentGames: groomGames("CHA", 313),
    predicted: { nextDelta: 1, reason: "Volume scorer, weak D drags ceiling.", confidence: "med" },
  },
  {
    id: "cam-thomas",
    firstName: "Cam", lastName: "Thomas", displayName: "Cam Thomas",
    team: "BKN", position: "SG", height: "6'3\"", weightLb: 199, age: 24,
    rating2k: 82, ratingDelta: 0, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(82, 84, 78, 68, 82, 68, 64, 54, 56, 78, 72, 70),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Middy Magician", "Shooting", "A"),
      b("Step Back Pure", "Shooting", "A"), b("Deadeye", "Shooting", "B"),
      b("Killer Combos", "Playmaking", "B"), b("Heat Check", "Shooting", "B"),
    ],
    last10: l10(23.8, 3.4, 3.6, 0.434, 0.348, -5.4),
    recentGames: groomGames("BKN", 317),
    predicted: { nextDelta: 0, reason: "Bucket-getter on a rebuild. Holds 82.", confidence: "med" },
  },
  {
    id: "scoot",
    firstName: "Scoot", lastName: "Henderson", displayName: "Scoot Henderson",
    team: "POR", position: "PG", height: "6'2\"", weightLb: 196, age: 22,
    rating2k: 80, ratingDelta: 1, archetypeId: "TWO_WAY_SHOT_CREATOR",
    attributes: a(72, 74, 82, 80, 82, 80, 72, 56, 60, 86, 74, 86),
    badges: [
      b("Quick First Step", "Playmaking", "A"), b("Dimer", "Playmaking", "B"),
      b("Posterizer", "Finishing", "B"), b("Killer Combos", "Playmaking", "B"),
      b("Handles for Days", "Playmaking", "B"), b("Pogo Stick", "Physical", "B"),
    ],
    last10: l10(16.8, 3.6, 6.4, 0.444, 0.328, -3.6),
    recentGames: groomGames("POR", 319),
    predicted: { nextDelta: 1, reason: "Sophomore leap on usage. Climbs.", confidence: "low" },
  },
  {
    id: "keegan",
    firstName: "Keegan", lastName: "Murray", displayName: "Keegan Murray",
    team: "SAC", position: "PF", height: "6'8\"", weightLb: 225, age: 25,
    rating2k: 82, ratingDelta: 0, archetypeId: "TWO_WAY_STRETCH",
    attributes: a(82, 74, 76, 74, 64, 60, 76, 70, 74, 74, 78, 74),
    badges: [
      b("Catch & Shoot", "Shooting", "A"), b("Corner Specialist", "Shooting", "A"),
      b("Limitless Range", "Shooting", "B"), b("Clamps", "Defense", "B"),
      b("Set Shot Specialist", "Shooting", "B"), b("Rebound Chaser", "Rebounding", "C"),
    ],
    last10: l10(15.4, 6.2, 1.8, 0.444, 0.378, 1.2),
    recentGames: groomGames("SAC", 323),
    predicted: { nextDelta: 0, reason: "3&D forward. Holds 82.", confidence: "high" },
  },
  {
    id: "brandon-miller",
    firstName: "Brandon", lastName: "Miller", displayName: "Brandon Miller",
    team: "CHA", position: "SF", height: "6'9\"", weightLb: 200, age: 23,
    rating2k: 83, ratingDelta: 2, archetypeId: "TWO_WAY_THREE_LEVEL",
    attributes: a(82, 78, 80, 76, 80, 70, 76, 60, 68, 76, 72, 78),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Step Back Pure", "Shooting", "A"),
      b("Deadeye", "Shooting", "B"), b("Slippery Off-Ball", "Finishing", "B"),
      b("Clamps", "Defense", "B"), b("Mismatch Expert", "Shooting", "B"),
    ],
    last10: l10(22.6, 5.4, 3.4, 0.454, 0.382, -2.8),
    recentGames: groomGames("CHA", 329),
    predicted: { nextDelta: 2, reason: "Year-3 leap. Volume + efficiency up.", confidence: "med" },
  },
  {
    id: "kuminga",
    firstName: "Jonathan", lastName: "Kuminga", displayName: "Jonathan Kuminga",
    team: "GSW", position: "PF", height: "6'7\"", weightLb: 225, age: 23,
    rating2k: 82, ratingDelta: 1, archetypeId: "TWO_WAY_SLASHER",
    attributes: a(70, 72, 84, 88, 72, 60, 76, 68, 70, 82, 84, 86),
    badges: [
      b("Posterizer", "Finishing", "A"), b("Fearless Finisher", "Finishing", "A"),
      b("Pogo Stick", "Physical", "A"), b("Bulldozer", "Physical", "B"),
      b("Slippery Off-Ball", "Finishing", "B"), b("Clamps", "Defense", "C"),
    ],
    last10: l10(17.4, 4.8, 2.4, 0.504, 0.328, 1.8),
    recentGames: groomGames("GSW", 331),
    predicted: { nextDelta: 1, reason: "Athletic slasher on a contender. Climbing.", confidence: "med" },
  },
  {
    id: "reaves",
    firstName: "Austin", lastName: "Reaves", displayName: "Austin Reaves",
    team: "LAL", position: "SG", height: "6'5\"", weightLb: 197, age: 27,
    rating2k: 83, ratingDelta: 0, archetypeId: "TWO_WAY_SHOT_CREATOR",
    attributes: a(80, 78, 82, 64, 82, 80, 70, 56, 60, 74, 74, 64),
    badges: [
      b("Dimer", "Playmaking", "A"), b("Limitless Range", "Shooting", "A"),
      b("Catch & Shoot", "Shooting", "A"), b("Step Back Pure", "Shooting", "B"),
      b("Middy Magician", "Shooting", "B"), b("Triple Threat Juke", "Playmaking", "B"),
    ],
    last10: l10(18.2, 4.4, 5.6, 0.474, 0.392, 2.4),
    recentGames: groomGames("LAL", 337),
    predicted: { nextDelta: 0, reason: "Reliable third option. Holds 83.", confidence: "high" },
  },
  {
    id: "mathurin",
    firstName: "Bennedict", lastName: "Mathurin", displayName: "Bennedict Mathurin",
    team: "IND", position: "SG", height: "6'5\"", weightLb: 210, age: 24,
    rating2k: 81, ratingDelta: 0, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(78, 76, 84, 82, 74, 62, 68, 56, 66, 78, 78, 82),
    badges: [
      b("Posterizer", "Finishing", "A"), b("Limitless Range", "Shooting", "B"),
      b("Corner Specialist", "Shooting", "B"), b("Slippery Off-Ball", "Finishing", "B"),
      b("Fearless Finisher", "Finishing", "B"), b("Catch & Shoot", "Shooting", "B"),
    ],
    last10: l10(16.4, 4.6, 2.2, 0.464, 0.358, 0.6),
    recentGames: groomGames("IND", 341),
    predicted: { nextDelta: 0, reason: "Scorer off bench. Holds 81.", confidence: "med" },
  },
  {
    id: "poole",
    firstName: "Jordan", lastName: "Poole", displayName: "Jordan Poole",
    team: "WAS", position: "SG", height: "6'4\"", weightLb: 194, age: 26,
    rating2k: 80, ratingDelta: -1, archetypeId: "OFFENSIVE_THREAT",
    attributes: a(82, 76, 78, 70, 84, 72, 62, 50, 54, 78, 70, 72),
    badges: [
      b("Limitless Range", "Shooting", "A"), b("Step Back Pure", "Shooting", "A"),
      b("Killer Combos", "Playmaking", "B"), b("Deadeye", "Shooting", "B"),
      b("Heat Check", "Shooting", "B"), b("Handles for Days", "Playmaking", "C"),
    ],
    last10: l10(20.4, 2.8, 4.6, 0.418, 0.342, -6.2),
    recentGames: groomGames("WAS", 343),
    predicted: { nextDelta: -1, reason: "Inefficient volume. Trending down.", confidence: "med" },
  },
];

// Filler that uses common opponent set per team.
function groomGames(team: TeamId, seed: number): GameLog[] {
  const opps = ["DEN", "BOS", "LAL", "GSW", "NYK", "PHI", "MIA", "OKC"];
  // pull last10 averages off player by team for filler — but we don't have ref here, so use generic.
  const avg: Last10 = { ppg: 18, rpg: 5, apg: 4, fgPct: 0.47, threePct: 0.36, plusMinus: 1 };
  return games(avg, opps, seed);
}

// ---------- LOOKUPS ----------

export function getPlayer(id: string): Player | undefined {
  return PLAYERS.find((p) => p.id === id);
}

export function searchPlayers(q: string): Player[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return PLAYERS;
  return PLAYERS.filter((p) => {
    const hay = `${p.displayName} ${p.team} ${p.position}`.toLowerCase();
    // crude fuzzy: every char of needle appears in order in hay
    let i = 0;
    for (const c of needle) {
      const idx = hay.indexOf(c, i);
      if (idx === -1) return false;
      i = idx + 1;
    }
    return true;
  });
}

export function getPlayersByTeam(team: TeamId): Player[] {
  return PLAYERS.filter((p) => p.team === team);
}

export function getPlayersByPosition(pos: Position | "All" | "G" | "F" | "C"): Player[] {
  if (pos === "All") return PLAYERS;
  if (pos === "G") return PLAYERS.filter((p) => ["PG", "SG", "G"].includes(p.position));
  if (pos === "F") return PLAYERS.filter((p) => ["SF", "PF", "F"].includes(p.position));
  if (pos === "C") return PLAYERS.filter((p) => p.position === "C");
  return PLAYERS.filter((p) => p.position === pos);
}

// ---------- MATCHUP CALCULATOR ----------

export type MatchupAttrRow = {
  key: keyof Attributes;
  label: string;
  a: number;
  b: number;
  delta: number; // a - b
};

export type MatchupEdge = {
  dimension: "Scoring" | "Defense" | "Athleticism" | "Playmaking";
  aAvg: number;
  bAvg: number;
  delta: number; // a - b, rounded
  winner: "A" | "B" | "EVEN";
};

export type MatchupBadgeOverlap = {
  shared: Badge[]; // S/A badges both players have (by name)
  onlyA: Badge[]; // S/A badges only A has
  onlyB: Badge[]; // S/A badges only B has
};

export type MatchupResult = {
  a: Player;
  b: Player;
  ovrDelta: number; // a - b
  rows: MatchupAttrRow[]; // 12 rows
  edges: MatchupEdge[];
  isoAdvantage: { side: "A" | "B" | "EVEN"; pctA: number }; // pctA = predicted A win % in neutral 1v1 ISO
  formDelta: number; // ratingDelta a - b
  badges: MatchupBadgeOverlap;
};

const MATCHUP_ROW_DEFS: { key: keyof Attributes; label: string }[] = [
  { key: "threePt", label: "3PT" },
  { key: "midRange", label: "Mid" },
  { key: "layup", label: "Layup" },
  { key: "dunk", label: "Dunk" },
  { key: "ballHandle", label: "Handle" },
  { key: "pass", label: "Pass" },
  { key: "perimDef", label: "Perim D" },
  { key: "intDef", label: "Int D" },
  { key: "rebound", label: "REB" },
  { key: "speed", label: "Speed" },
  { key: "strength", label: "Strength" },
  { key: "vertical", label: "Vert" },
];

const SCORING_KEYS: (keyof Attributes)[] = ["threePt", "midRange", "layup", "dunk"];
const DEFENSE_KEYS: (keyof Attributes)[] = ["perimDef", "intDef", "rebound"];
const ATHLETIC_KEYS: (keyof Attributes)[] = ["speed", "strength", "vertical"];
const PLAYMAKING_KEYS: (keyof Attributes)[] = ["ballHandle", "pass"];

function avgAttrs(attr: Attributes, keys: (keyof Attributes)[]): number {
  const total = keys.reduce((s, k) => s + attr[k], 0);
  return total / keys.length;
}

function edge(
  dimension: MatchupEdge["dimension"],
  a: Attributes,
  b: Attributes,
  keys: (keyof Attributes)[]
): MatchupEdge {
  const aAvg = avgAttrs(a, keys);
  const bAvg = avgAttrs(b, keys);
  const delta = Math.round(aAvg - bAvg);
  const winner: MatchupEdge["winner"] =
    delta === 0 ? "EVEN" : delta > 0 ? "A" : "B";
  return { dimension, aAvg, bAvg, delta, winner };
}

// 1v1 ISO neutral-court prediction.
// Weighted: 50% scoring, 30% playmaking, 20% defense.
// Each component contributes (aAvg - bAvg) * weight; result clamped 30-85.
function isoPercent(a: Attributes, b: Attributes): number {
  const scoring = avgAttrs(a, SCORING_KEYS) - avgAttrs(b, SCORING_KEYS);
  const playmaking = avgAttrs(a, PLAYMAKING_KEYS) - avgAttrs(b, PLAYMAKING_KEYS);
  const defense = avgAttrs(a, DEFENSE_KEYS) - avgAttrs(b, DEFENSE_KEYS);
  // Each rating point of edge -> ~1.5 percentage points.
  const raw = 50 + (scoring * 0.5 + playmaking * 0.3 + defense * 0.2) * 1.5;
  return Math.max(30, Math.min(85, Math.round(raw)));
}

function topTierBadges(p: Player): Badge[] {
  return p.badges.filter((bd) => bd.tier === "S" || bd.tier === "A");
}

export function computeMatchup(a: Player, b: Player): MatchupResult {
  const rows: MatchupAttrRow[] = MATCHUP_ROW_DEFS.map((def) => {
    const av = a.attributes[def.key];
    const bv = b.attributes[def.key];
    return { key: def.key, label: def.label, a: av, b: bv, delta: av - bv };
  });

  const edges: MatchupEdge[] = [
    edge("Scoring", a.attributes, b.attributes, SCORING_KEYS),
    edge("Defense", a.attributes, b.attributes, DEFENSE_KEYS),
    edge("Playmaking", a.attributes, b.attributes, PLAYMAKING_KEYS),
    edge("Athleticism", a.attributes, b.attributes, ATHLETIC_KEYS),
  ];

  const pctA = isoPercent(a.attributes, b.attributes);
  const isoSide: "A" | "B" | "EVEN" =
    pctA === 50 ? "EVEN" : pctA > 50 ? "A" : "B";

  const aTop = topTierBadges(a);
  const bTop = topTierBadges(b);
  const bNames = new Set(bTop.map((x) => x.name));
  const aNames = new Set(aTop.map((x) => x.name));
  const shared = aTop.filter((x) => bNames.has(x.name));
  const onlyA = aTop.filter((x) => !bNames.has(x.name));
  const onlyB = bTop.filter((x) => !aNames.has(x.name));

  return {
    a,
    b,
    ovrDelta: a.rating2k - b.rating2k,
    rows,
    edges,
    isoAdvantage: { side: isoSide, pctA },
    formDelta: a.ratingDelta - b.ratingDelta,
    badges: { shared, onlyA, onlyB },
  };
}

// Archetype display labels (matches Build Lab convention).
export const ARCHETYPE_LABELS: Record<string, string> = {
  THREE_LEVEL: "3-Level Threat",
  TWO_WAY_THREE_LEVEL: "Two-Way 3-Level",
  TWO_WAY_SHOT_CREATOR: "Two-Way Shot Creator",
  TWO_WAY_SLASHER: "Two-Way Slasher",
  TWO_WAY_SHARP: "Two-Way Sharpshooter",
  TWO_WAY_STRETCH: "Two-Way Stretch Big",
  TWO_WAY_INSIDE_OUT: "Two-Way Inside-Out",
  OFFENSIVE_THREAT: "Offensive Threat",
  PURE_SHARP: "Pure Sharpshooter",
  FLOOR_GENERAL: "Floor General",
  POINT_FORWARD: "Point Forward",
  POINT_CENTER: "Point Center",
  PAINT_BEAST: "Paint Beast",
  POST_SCORER: "Post Scorer",
  GLUE_C: "Glue Center",
};

// Map player-side archetype keys (UPPER_SNAKE) to Build Lab archetype ids
// (kebab-case as defined in lib/builds.ts ARCHETYPES). This lets a player's
// "Closest archetype" deep-link into /builds?arche=<buildId>.
export const PLAYER_TO_BUILD_ARCHE: Record<string, string> = {
  THREE_LEVEL: "three-level",
  TWO_WAY_THREE_LEVEL: "three-level",
  TWO_WAY_SHOT_CREATOR: "playmaker-creator",
  TWO_WAY_SLASHER: "two-way-slasher",
  TWO_WAY_SHARP: "sharp-2way",
  TWO_WAY_STRETCH: "two-way-stretch",
  TWO_WAY_INSIDE_OUT: "inside-out",
  OFFENSIVE_THREAT: "iso-scorer",
  PURE_SHARP: "spot-up-shooter",
  FLOOR_GENERAL: "pure-pg",
  POINT_FORWARD: "point-forward",
  POINT_CENTER: "facilitator-c",
  PAINT_BEAST: "paint-beast",
  POST_SCORER: "post-scorer",
  GLUE_C: "facilitator-c",
};

// Resolve a player archetype id to the matching Build Lab archetype id.
// Falls back to a sane default so the /builds link is never broken.
export function buildArcheFor(playerArcheId: string): string {
  return PLAYER_TO_BUILD_ARCHE[playerArcheId] ?? "do-everything";
}

// Resolve a player's `id` by display name (case-insensitive, trimmed).
// Used to deep-link from Scenarios / Pulse references → /players?id=...
export function getPlayerIdByName(name: string): string | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  const exact = PLAYERS.find((p) => p.displayName.toLowerCase() === needle);
  if (exact) return exact.id;
  // Fallback: match on last name token (handles minor punctuation drift).
  return PLAYERS.find((p) => p.lastName.toLowerCase() === needle)?.id;
}
