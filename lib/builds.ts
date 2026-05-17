// Build Lab data + computation
// Models NBA 2K26-style MyPlayer attribute caps, recommended badges, and VC cost.
// All numbers are designed approximations — not scraped from the game files.

export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type AttrGroupKey =
  | "finishing"
  | "shooting"
  | "playmaking"
  | "defense"
  | "athleticism"
  | "physicals";

export type SubAttr = { key: string; label: string; value: number };

export type AttributeCaps = {
  finishing: SubAttr[];
  shooting: SubAttr[];
  playmaking: SubAttr[];
  defense: SubAttr[];
  athleticism: SubAttr[];
  physicals: SubAttr[];
};

export type BadgeRec = {
  name: string;
  category: "Finishing" | "Shooting" | "Playmaking" | "Defense" | "All-Around";
  tier: "S" | "A" | "B" | "C" | "D";
  effect: string;
};

export type Archetype = {
  id: string;
  name: string;
  tagline: string; // 2-word
  icon: string; // single letter / glyph
  primaryRole: Position[]; // suggested positions
  focus: string[]; // tags
  // Multipliers per attribute group. 1.0 = neutral. Caps are clipped to 25-99.
  weights: Record<AttrGroupKey, number>;
  // Optional per sub-attribute boosts (added after weight pass)
  subBoosts?: Partial<Record<string, number>>;
  // 8 recommended badges
  badges: BadgeRec[];
  // Comparable real player by position
  comparable: Partial<Record<Position, string>>;
};

export type Build = {
  id: string;
  name: string;
  position: Position;
  heightIn: number; // total inches, 67 .. 87
  weightLb: number; // 160 .. 280
  wingspanDelta: number; // -2 .. +6 inches relative to height
  archetypeId: string;
  updatedAt: number;
};

// ---------- helpers ----------

export const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

export const HEIGHT_MIN = 67; // 5'7"
export const HEIGHT_MAX = 87; // 7'3"
export const WEIGHT_MIN = 160;
export const WEIGHT_MAX = 280;
export const WINGSPAN_MIN = -2;
export const WINGSPAN_MAX = 6;

export function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

export function formatWingspan(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta}"`;
}

// Suggested baseline height per position (in inches)
const POSITION_BASE_HEIGHT: Record<Position, number> = {
  PG: 74, // 6'2"
  SG: 77, // 6'5"
  SF: 79, // 6'7"
  PF: 81, // 6'9"
  C: 83, // 6'11"
};

// Suggested baseline weight per position
const POSITION_BASE_WEIGHT: Record<Position, number> = {
  PG: 185,
  SG: 205,
  SF: 220,
  PF: 240,
  C: 260,
};

// ---------- archetypes ----------

const B = (
  name: string,
  category: BadgeRec["category"],
  tier: BadgeRec["tier"],
  effect: string,
): BadgeRec => ({ name, category, tier, effect });

export const ARCHETYPES: Archetype[] = [
  {
    id: "sharp-2way",
    name: "2-Way Sharpshooter",
    tagline: "Catch fire",
    icon: "S",
    primaryRole: ["PG", "SG"],
    focus: ["3PT", "Perimeter D", "Movement"],
    weights: {
      finishing: 0.85,
      shooting: 1.22,
      playmaking: 0.95,
      defense: 1.1,
      athleticism: 1.0,
      physicals: 0.85,
    },
    subBoosts: { threePt: 4, midRange: 3, perimeterD: 3, steal: 2 },
    badges: [
      B("Limitless Range", "Shooting", "S", "Extends 3PT range past the logo."),
      B("Deadeye", "Shooting", "A", "Reduces contest impact on jumpers."),
      B("Catch & Shoot", "Shooting", "A", "Boosts catch-and-shoot threes."),
      B("Green Machine", "Shooting", "B", "Larger ideal release window."),
      B("Clamps", "Defense", "A", "Better cutoff on ball-handlers."),
      B("Pick Dodger", "Defense", "B", "Easier nav through screens."),
      B("Volume Shooter", "Shooting", "B", "Stacks boost off shots taken."),
      B("Agent 3", "Shooting", "A", "Boost on dribble pull-up threes."),
    ],
    comparable: { PG: "Stephen Curry", SG: "Klay Thompson", SF: "Buddy Hield" },
  },
  {
    id: "slasher",
    name: "Slasher",
    tagline: "Live paint",
    icon: "/",
    primaryRole: ["PG", "SG", "SF"],
    focus: ["Drive", "Layups", "Speed"],
    weights: {
      finishing: 1.2,
      shooting: 0.9,
      playmaking: 1.05,
      defense: 0.95,
      athleticism: 1.18,
      physicals: 0.95,
    },
    subBoosts: { layup: 4, drivingDunk: 4, speedWithBall: 3, speed: 3 },
    badges: [
      B("Posterizer", "Finishing", "S", "More contact dunks at the rim."),
      B("Slithery", "Finishing", "A", "Better contact avoidance in the lane."),
      B("Acrobat", "Finishing", "A", "Boosts difficult layups."),
      B("Aerial Wizard", "Finishing", "B", "Better lob and cut finishes."),
      B("Bully", "Finishing", "B", "Boost on contact in the paint."),
      B("Fast Twitch", "Finishing", "A", "Quicker layup/dunk gathers."),
      B("Unpluckable", "Playmaking", "B", "Reduces strip risk on drives."),
      B("Hyperdrive", "Playmaking", "A", "Speed boost on live-ball moves."),
    ],
    comparable: {
      PG: "Ja Morant",
      SG: "Anthony Edwards",
      SF: "Zach LaVine",
      PF: "Aaron Gordon",
    },
  },
  {
    id: "inside-out",
    name: "Inside-Out Scorer",
    tagline: "Score everywhere",
    icon: "X",
    primaryRole: ["SG", "SF"],
    focus: ["Mid-range", "Drive", "3PT"],
    weights: {
      finishing: 1.1,
      shooting: 1.12,
      playmaking: 1.0,
      defense: 0.92,
      athleticism: 1.02,
      physicals: 0.95,
    },
    subBoosts: { midRange: 4, threePt: 2, drivingDunk: 2, layup: 2 },
    badges: [
      B("Middy Magician", "Shooting", "S", "Boost on mid-range jumpers."),
      B("Set Shot Specialist", "Shooting", "A", "Boost on no-dribble jumpers."),
      B("Posterizer", "Finishing", "A", "More contact dunks."),
      B("Limitless Range", "Shooting", "B", "Extends 3PT range."),
      B("Slithery", "Finishing", "B", "Better contact avoidance."),
      B("Whistle", "Finishing", "B", "Increases foul-drawing on drives."),
      B("Deadeye", "Shooting", "A", "Reduces contest impact."),
      B("Agent 3", "Shooting", "B", "Pull-up three boost."),
    ],
    comparable: {
      SG: "Devin Booker",
      SF: "Jayson Tatum",
      PG: "DeMar DeRozan",
      PF: "Paul George",
    },
  },
  {
    id: "lockdown",
    name: "Lockdown Defender",
    tagline: "Erase guards",
    icon: "L",
    primaryRole: ["PG", "SG", "SF"],
    focus: ["Steals", "On-ball D", "Speed"],
    weights: {
      finishing: 0.85,
      shooting: 0.85,
      playmaking: 0.95,
      defense: 1.28,
      athleticism: 1.15,
      physicals: 0.95,
    },
    subBoosts: { perimeterD: 5, steal: 4, lateralQuickness: 4, speed: 2 },
    badges: [
      B("Clamps", "Defense", "S", "Strong cutoff on ball-handlers."),
      B("Glove", "Defense", "A", "Boosts steal attempts on dribblers."),
      B("Off-Ball Pest", "Defense", "A", "Disrupts off-ball cutters."),
      B("Pick Dodger", "Defense", "A", "Easier nav through screens."),
      B("Challenger", "Defense", "B", "Stronger jumper contests."),
      B("Interceptor", "Defense", "B", "Better passing-lane steals."),
      B("Anchor", "Defense", "B", "Improved rim protection."),
      B("Immovable Enforcer", "Defense", "B", "Holds position on drives."),
    ],
    comparable: {
      PG: "Marcus Smart",
      SG: "Alex Caruso",
      SF: "Jrue Holiday",
      PF: "Herb Jones",
    },
  },
  {
    id: "glass-finisher",
    name: "Glass-Cleaning Finisher",
    tagline: "Eat boards",
    icon: "G",
    primaryRole: ["PF", "C"],
    focus: ["Dunks", "Rebound", "Block"],
    weights: {
      finishing: 1.2,
      shooting: 0.7,
      playmaking: 0.7,
      defense: 1.18,
      athleticism: 1.05,
      physicals: 1.15,
    },
    subBoosts: { drivingDunk: 5, offReb: 4, defReb: 4, block: 3, strength: 4 },
    badges: [
      B("Posterizer", "Finishing", "S", "Higher contact-dunk frequency."),
      B("Boxout Beast", "Defense", "A", "Wins rebound positioning."),
      B("Rebound Chaser", "Defense", "A", "Tracks long rebounds."),
      B("Paint Patroller", "Defense", "A", "Boosts paint defense."),
      B("Aerial Wizard", "Finishing", "A", "Better lob/putback finishes."),
      B("Brick Wall", "Defense", "B", "Stronger screens."),
      B("Pogo Stick", "Defense", "B", "Quicker second-jump."),
      B("Bully", "Finishing", "B", "Boost on contact in the paint."),
    ],
    comparable: {
      PF: "Aaron Gordon",
      C: "Clint Capela",
      SF: "Jonathan Isaac",
    },
  },
  {
    id: "playmaker-creator",
    name: "Playmaking Shot Creator",
    tagline: "Cook iso",
    icon: "C",
    primaryRole: ["PG", "SG"],
    focus: ["Ball-handling", "Pull-up 3", "Iso"],
    weights: {
      finishing: 0.98,
      shooting: 1.12,
      playmaking: 1.22,
      defense: 0.9,
      athleticism: 1.05,
      physicals: 0.9,
    },
    subBoosts: { ballHandle: 5, threePt: 3, passAcc: 3, midRange: 2 },
    badges: [
      B("Handles For Days", "Playmaking", "S", "Reduced stamina on dribble moves."),
      B("Agent 3", "Shooting", "A", "Boost on dribble pull-up threes."),
      B("Killer Combos", "Playmaking", "A", "Faster size-up chains."),
      B("Ankle Assassin", "Playmaking", "A", "Higher chance of breakdowns."),
      B("Deadeye", "Shooting", "B", "Reduces contest impact."),
      B("Volume Shooter", "Shooting", "B", "Stacks off shots taken."),
      B("Limitless Range", "Shooting", "B", "Extends 3PT range."),
      B("Quick First Step", "Playmaking", "B", "Burst on launch dribbles."),
    ],
    comparable: {
      PG: "Damian Lillard",
      SG: "Donovan Mitchell",
      SF: "DeMar DeRozan",
    },
  },
  {
    id: "three-level",
    name: "3-Level Threat",
    tagline: "Score levels",
    icon: "3",
    primaryRole: ["SG", "SF"],
    focus: ["3PT", "Mid", "Layup"],
    weights: {
      finishing: 1.08,
      shooting: 1.14,
      playmaking: 1.02,
      defense: 0.95,
      athleticism: 1.03,
      physicals: 0.95,
    },
    subBoosts: { threePt: 3, midRange: 3, layup: 3 },
    badges: [
      B("Middy Magician", "Shooting", "S", "Mid-range jumper boost."),
      B("Limitless Range", "Shooting", "A", "Extends 3PT range."),
      B("Agent 3", "Shooting", "A", "Pull-up three boost."),
      B("Slithery", "Finishing", "A", "Contact avoidance in lane."),
      B("Deadeye", "Shooting", "B", "Reduces contest impact."),
      B("Catch & Shoot", "Shooting", "B", "Catch-and-shoot boost."),
      B("Posterizer", "Finishing", "B", "More contact dunks."),
      B("Set Shot Specialist", "Shooting", "B", "Boost on no-dribble jumpers."),
    ],
    comparable: {
      SG: "Devin Booker",
      SF: "Jayson Tatum",
      PG: "Tyrese Maxey",
    },
  },
  {
    id: "post-scorer",
    name: "Post Scorer",
    tagline: "Block work",
    icon: "P",
    primaryRole: ["PF", "C"],
    focus: ["Post", "Strength", "Footwork"],
    weights: {
      finishing: 1.18,
      shooting: 0.92,
      playmaking: 0.85,
      defense: 1.0,
      athleticism: 0.9,
      physicals: 1.18,
    },
    subBoosts: { postControl: 5, closeShot: 4, strength: 4 },
    badges: [
      B("Post Powerhouse", "Finishing", "S", "Boost on back-down attempts."),
      B("Drop Stepper", "Finishing", "A", "Faster post pivots."),
      B("Hook Specialist", "Finishing", "A", "Boost on hook shots."),
      B("Fadeaway Specialist", "Shooting", "A", "Post fadeaway boost."),
      B("Bully", "Finishing", "B", "Boost on paint contact."),
      B("Boxout Beast", "Defense", "B", "Wins rebound positioning."),
      B("Whistle", "Finishing", "B", "Foul-drawing in post."),
      B("Slithery", "Finishing", "B", "Contact avoidance in lane."),
    ],
    comparable: { C: "Nikola Jokic", PF: "Joel Embiid", SF: "LeBron James" },
  },
  {
    id: "stretch-big",
    name: "Stretch Big",
    tagline: "Pop three",
    icon: "T",
    primaryRole: ["PF", "C"],
    focus: ["3PT", "Mid", "Pick & Pop"],
    weights: {
      finishing: 0.95,
      shooting: 1.18,
      playmaking: 0.92,
      defense: 1.0,
      athleticism: 0.92,
      physicals: 1.05,
    },
    subBoosts: { threePt: 5, midRange: 3, defReb: 2 },
    badges: [
      B("Limitless Range", "Shooting", "S", "Extends 3PT range."),
      B("Catch & Shoot", "Shooting", "A", "Catch-and-shoot boost."),
      B("Set Shot Specialist", "Shooting", "A", "No-dribble jumper boost."),
      B("Deadeye", "Shooting", "A", "Reduces contest impact."),
      B("Middy Magician", "Shooting", "B", "Mid-range jumper boost."),
      B("Boxout Beast", "Defense", "B", "Wins rebound positioning."),
      B("Aerial Wizard", "Finishing", "B", "Better lob finishes."),
      B("Green Machine", "Shooting", "B", "Larger green window."),
    ],
    comparable: {
      PF: "Karl-Anthony Towns",
      C: "Kristaps Porzingis",
      SF: "Kevin Durant",
    },
  },
  {
    id: "point-forward",
    name: "Point Forward",
    tagline: "Run offense",
    icon: "F",
    primaryRole: ["SF", "PF"],
    focus: ["Passing", "Drive", "Versatile"],
    weights: {
      finishing: 1.08,
      shooting: 1.02,
      playmaking: 1.18,
      defense: 1.02,
      athleticism: 1.0,
      physicals: 1.05,
    },
    subBoosts: { passAcc: 5, passVision: 4, ballHandle: 3 },
    badges: [
      B("Dimer", "Playmaking", "S", "Boosts teammate shots off pass."),
      B("Bail Out", "Playmaking", "A", "Cleaner passes out of air."),
      B("Float Game", "Playmaking", "A", "Boost on floaters/runners."),
      B("Posterizer", "Finishing", "B", "More contact dunks."),
      B("Bullet Passer", "Playmaking", "B", "Faster passes."),
      B("Handles For Days", "Playmaking", "B", "Reduced dribble stamina drain."),
      B("Deadeye", "Shooting", "B", "Reduces contest impact."),
      B("Slithery", "Finishing", "B", "Contact avoidance in lane."),
    ],
    comparable: {
      SF: "LeBron James",
      PF: "Giannis Antetokounmpo",
      PG: "Luka Doncic",
    },
  },
  {
    id: "two-way-slasher",
    name: "2-Way Slasher",
    tagline: "Both ends",
    icon: "Z",
    primaryRole: ["SG", "SF"],
    focus: ["Drive", "On-ball D", "Speed"],
    weights: {
      finishing: 1.14,
      shooting: 0.9,
      playmaking: 1.0,
      defense: 1.14,
      athleticism: 1.12,
      physicals: 0.98,
    },
    subBoosts: { drivingDunk: 3, layup: 3, perimeterD: 3, steal: 3 },
    badges: [
      B("Posterizer", "Finishing", "S", "More contact dunks."),
      B("Clamps", "Defense", "A", "Strong cutoff on ball-handlers."),
      B("Slithery", "Finishing", "A", "Contact avoidance in lane."),
      B("Glove", "Defense", "A", "Steal boost on dribblers."),
      B("Pick Dodger", "Defense", "B", "Nav through screens."),
      B("Aerial Wizard", "Finishing", "B", "Lob/putback finishes."),
      B("Fast Twitch", "Finishing", "B", "Quicker gathers."),
      B("Off-Ball Pest", "Defense", "B", "Disrupts off-ball cutters."),
    ],
    comparable: {
      SG: "Anthony Edwards",
      SF: "Jaylen Brown",
      PG: "Jrue Holiday",
    },
  },
  {
    id: "paint-beast",
    name: "Paint Beast",
    tagline: "Rule paint",
    icon: "B",
    primaryRole: ["C"],
    focus: ["Post", "Block", "Rebound"],
    weights: {
      finishing: 1.14,
      shooting: 0.75,
      playmaking: 0.78,
      defense: 1.2,
      athleticism: 0.95,
      physicals: 1.2,
    },
    subBoosts: { block: 5, defReb: 4, offReb: 4, postControl: 3, strength: 4 },
    badges: [
      B("Anchor", "Defense", "S", "Stronger rim protection."),
      B("Paint Patroller", "Defense", "A", "Boosts paint defense."),
      B("Boxout Beast", "Defense", "A", "Wins rebound positioning."),
      B("Post Powerhouse", "Finishing", "A", "Boost on back-downs."),
      B("Brick Wall", "Defense", "B", "Stronger screens."),
      B("Pogo Stick", "Defense", "B", "Quick second jump."),
      B("Bully", "Finishing", "B", "Boost on paint contact."),
      B("Drop Stepper", "Finishing", "B", "Faster post pivots."),
    ],
    comparable: { C: "Rudy Gobert", PF: "Bam Adebayo" },
  },
  {
    id: "spot-up-shooter",
    name: "Spot-Up Shooter",
    tagline: "Stand kill",
    icon: "Y",
    primaryRole: ["SG", "SF"],
    focus: ["Catch & Shoot", "3PT", "Off-ball"],
    weights: {
      finishing: 0.85,
      shooting: 1.24,
      playmaking: 0.85,
      defense: 0.92,
      athleticism: 0.95,
      physicals: 0.9,
    },
    subBoosts: { threePt: 5, midRange: 3 },
    badges: [
      B("Catch & Shoot", "Shooting", "S", "Catch-and-shoot boost."),
      B("Deadeye", "Shooting", "A", "Reduces contest impact."),
      B("Limitless Range", "Shooting", "A", "Extends 3PT range."),
      B("Set Shot Specialist", "Shooting", "A", "No-dribble jumper boost."),
      B("Green Machine", "Shooting", "B", "Larger green window."),
      B("Corner Specialist", "Shooting", "B", "Corner-3 boost."),
      B("Volume Shooter", "Shooting", "B", "Stacks off shots taken."),
      B("Open Looks", "Shooting", "C", "Boost on uncontested shots."),
    ],
    comparable: { SG: "Klay Thompson", SF: "Buddy Hield", PG: "Duncan Robinson" },
  },
  {
    id: "two-way-stretch",
    name: "2-Way Stretch",
    tagline: "Switch all",
    icon: "W",
    primaryRole: ["SF", "PF"],
    focus: ["3PT", "Switch D", "Rebound"],
    weights: {
      finishing: 0.95,
      shooting: 1.12,
      playmaking: 0.95,
      defense: 1.15,
      athleticism: 1.0,
      physicals: 1.0,
    },
    subBoosts: { threePt: 4, perimeterD: 3, defReb: 2, block: 2 },
    badges: [
      B("Limitless Range", "Shooting", "S", "Extends 3PT range."),
      B("Challenger", "Defense", "A", "Stronger jumper contests."),
      B("Anchor", "Defense", "A", "Improved rim protection."),
      B("Catch & Shoot", "Shooting", "A", "Catch-and-shoot boost."),
      B("Off-Ball Pest", "Defense", "B", "Disrupts off-ball cutters."),
      B("Boxout Beast", "Defense", "B", "Wins rebound positioning."),
      B("Deadeye", "Shooting", "B", "Reduces contest impact."),
      B("Pick Dodger", "Defense", "B", "Nav through screens."),
    ],
    comparable: { SF: "Mikal Bridges", PF: "Aaron Gordon", C: "Kevin Durant" },
  },
  {
    id: "iso-scorer",
    name: "Iso Scorer",
    tagline: "Solo bucket",
    icon: "I",
    primaryRole: ["SG", "SF"],
    focus: ["Iso", "Mid", "Step-back"],
    weights: {
      finishing: 1.05,
      shooting: 1.12,
      playmaking: 1.1,
      defense: 0.92,
      athleticism: 1.0,
      physicals: 0.95,
    },
    subBoosts: { midRange: 4, ballHandle: 4, threePt: 2 },
    badges: [
      B("Killer Combos", "Playmaking", "S", "Faster size-up chains."),
      B("Middy Magician", "Shooting", "A", "Mid-range jumper boost."),
      B("Step Back Smith", "Shooting", "A", "Step-back jumper boost."),
      B("Agent 3", "Shooting", "A", "Pull-up three boost."),
      B("Fadeaway Specialist", "Shooting", "B", "Fadeaway boost."),
      B("Handles For Days", "Playmaking", "B", "Reduced dribble drain."),
      B("Deadeye", "Shooting", "B", "Reduces contest impact."),
      B("Slithery", "Finishing", "B", "Contact avoidance in lane."),
    ],
    comparable: { SG: "Kobe Bryant", SF: "Kevin Durant", PG: "James Harden" },
  },
  {
    id: "pure-pg",
    name: "Pure Playmaker",
    tagline: "Dish only",
    icon: "D",
    primaryRole: ["PG"],
    focus: ["Passing", "Ball-handling", "Speed"],
    weights: {
      finishing: 0.92,
      shooting: 0.92,
      playmaking: 1.26,
      defense: 0.95,
      athleticism: 1.05,
      physicals: 0.85,
    },
    subBoosts: { passAcc: 5, passVision: 5, ballHandle: 4 },
    badges: [
      B("Dimer", "Playmaking", "S", "Boosts teammate shots off pass."),
      B("Handles For Days", "Playmaking", "A", "Reduced dribble drain."),
      B("Bail Out", "Playmaking", "A", "Cleaner passes out of air."),
      B("Bullet Passer", "Playmaking", "A", "Faster passes."),
      B("Unpluckable", "Playmaking", "B", "Reduces strip risk."),
      B("Killer Combos", "Playmaking", "B", "Faster size-ups."),
      B("Float Game", "Playmaking", "B", "Boost on floaters."),
      B("Ankle Assassin", "Playmaking", "B", "Breakdown chance."),
    ],
    comparable: { PG: "Chris Paul", SG: "Tyrese Haliburton" },
  },
  {
    id: "athletic-wing",
    name: "Athletic Wing",
    tagline: "Run jump",
    icon: "A",
    primaryRole: ["SG", "SF"],
    focus: ["Speed", "Vertical", "Cut"],
    weights: {
      finishing: 1.1,
      shooting: 0.95,
      playmaking: 0.95,
      defense: 1.05,
      athleticism: 1.2,
      physicals: 1.0,
    },
    subBoosts: { drivingDunk: 4, layup: 2, speed: 3, vertical: 4 },
    badges: [
      B("Posterizer", "Finishing", "S", "More contact dunks."),
      B("Aerial Wizard", "Finishing", "A", "Better lob/putback finishes."),
      B("Fast Twitch", "Finishing", "A", "Quicker gathers."),
      B("Pogo Stick", "Defense", "A", "Quick second jump."),
      B("Slithery", "Finishing", "B", "Contact avoidance in lane."),
      B("Rebound Chaser", "Defense", "B", "Tracks long rebounds."),
      B("Off-Ball Pest", "Defense", "B", "Disrupts off-ball cutters."),
      B("Catch & Shoot", "Shooting", "C", "Catch-and-shoot boost."),
    ],
    comparable: {
      SG: "Anthony Edwards",
      SF: "Zach LaVine",
      PF: "Aaron Gordon",
    },
  },
  {
    id: "rim-protector",
    name: "Rim Protector",
    tagline: "Swat shots",
    icon: "R",
    primaryRole: ["C"],
    focus: ["Block", "Anchor", "Rebound"],
    weights: {
      finishing: 0.95,
      shooting: 0.7,
      playmaking: 0.75,
      defense: 1.25,
      athleticism: 1.05,
      physicals: 1.15,
    },
    subBoosts: { block: 6, defReb: 4, interiorD: 5 },
    badges: [
      B("Anchor", "Defense", "S", "Stronger rim protection."),
      B("Paint Patroller", "Defense", "A", "Boosts paint defense."),
      B("Challenger", "Defense", "A", "Stronger jumper contests."),
      B("Pogo Stick", "Defense", "A", "Quick second jump."),
      B("Boxout Beast", "Defense", "B", "Rebound positioning."),
      B("Brick Wall", "Defense", "B", "Stronger screens."),
      B("Rebound Chaser", "Defense", "B", "Tracks long rebounds."),
      B("Immovable Enforcer", "Defense", "B", "Holds position on drives."),
    ],
    comparable: { C: "Victor Wembanyama", PF: "Anthony Davis" },
  },
  {
    id: "two-way-finisher",
    name: "2-Way Finisher",
    tagline: "Slam stop",
    icon: "H",
    primaryRole: ["SF", "PF"],
    focus: ["Dunks", "Defense", "Athletic"],
    weights: {
      finishing: 1.15,
      shooting: 0.88,
      playmaking: 0.9,
      defense: 1.14,
      athleticism: 1.1,
      physicals: 1.05,
    },
    subBoosts: { drivingDunk: 4, perimeterD: 2, interiorD: 3, defReb: 2 },
    badges: [
      B("Posterizer", "Finishing", "S", "More contact dunks."),
      B("Aerial Wizard", "Finishing", "A", "Lob/putback finishes."),
      B("Challenger", "Defense", "A", "Stronger jumper contests."),
      B("Paint Patroller", "Defense", "A", "Boosts paint defense."),
      B("Slithery", "Finishing", "B", "Contact avoidance in lane."),
      B("Pogo Stick", "Defense", "B", "Quick second jump."),
      B("Off-Ball Pest", "Defense", "B", "Disrupts cutters."),
      B("Boxout Beast", "Defense", "B", "Rebound positioning."),
    ],
    comparable: {
      SF: "Jaylen Brown",
      PF: "Pascal Siakam",
      C: "Bam Adebayo",
    },
  },
  {
    id: "facilitator-c",
    name: "Facilitator Center",
    tagline: "Hub offense",
    icon: "O",
    primaryRole: ["C"],
    focus: ["Passing", "Post", "Rebound"],
    weights: {
      finishing: 1.05,
      shooting: 0.95,
      playmaking: 1.15,
      defense: 1.0,
      athleticism: 0.9,
      physicals: 1.15,
    },
    subBoosts: { passAcc: 5, passVision: 4, defReb: 3, postControl: 3 },
    badges: [
      B("Dimer", "Playmaking", "S", "Boosts teammate shots off pass."),
      B("Bullet Passer", "Playmaking", "A", "Faster passes."),
      B("Float Game", "Playmaking", "A", "Boost on floaters."),
      B("Post Powerhouse", "Finishing", "A", "Boost on back-downs."),
      B("Boxout Beast", "Defense", "B", "Rebound positioning."),
      B("Brick Wall", "Defense", "B", "Stronger screens."),
      B("Hook Specialist", "Finishing", "B", "Boost on hook shots."),
      B("Bail Out", "Playmaking", "B", "Cleaner passes out of air."),
    ],
    comparable: { C: "Nikola Jokic", PF: "Domantas Sabonis" },
  },
  {
    id: "scoring-pg",
    name: "Scoring PG",
    tagline: "Score lead",
    icon: "Q",
    primaryRole: ["PG"],
    focus: ["3PT", "Drive", "Pull-up"],
    weights: {
      finishing: 1.02,
      shooting: 1.18,
      playmaking: 1.1,
      defense: 0.92,
      athleticism: 1.05,
      physicals: 0.88,
    },
    subBoosts: { threePt: 4, midRange: 2, ballHandle: 3, layup: 2 },
    badges: [
      B("Agent 3", "Shooting", "S", "Pull-up three boost."),
      B("Limitless Range", "Shooting", "A", "Extends 3PT range."),
      B("Killer Combos", "Playmaking", "A", "Faster size-ups."),
      B("Slithery", "Finishing", "A", "Contact avoidance in lane."),
      B("Step Back Smith", "Shooting", "B", "Step-back jumper boost."),
      B("Deadeye", "Shooting", "B", "Reduces contest impact."),
      B("Handles For Days", "Playmaking", "B", "Reduced dribble drain."),
      B("Float Game", "Playmaking", "B", "Boost on floaters."),
    ],
    comparable: { PG: "Damian Lillard", SG: "Trae Young" },
  },
  {
    id: "do-everything",
    name: "Do-Everything",
    tagline: "Versatile star",
    icon: "*",
    primaryRole: ["SF", "PF"],
    focus: ["Versatile", "Two-way", "Iso"],
    weights: {
      finishing: 1.05,
      shooting: 1.05,
      playmaking: 1.05,
      defense: 1.05,
      athleticism: 1.05,
      physicals: 1.05,
    },
    subBoosts: {},
    badges: [
      B("Posterizer", "Finishing", "A", "More contact dunks."),
      B("Limitless Range", "Shooting", "A", "Extends 3PT range."),
      B("Dimer", "Playmaking", "A", "Boost on assists."),
      B("Clamps", "Defense", "A", "Cutoff on ball-handlers."),
      B("Middy Magician", "Shooting", "B", "Mid-range boost."),
      B("Anchor", "Defense", "B", "Improved rim protection."),
      B("Killer Combos", "Playmaking", "B", "Faster size-ups."),
      B("Slithery", "Finishing", "B", "Contact avoidance in lane."),
    ],
    comparable: {
      SF: "LeBron James",
      PF: "Giannis Antetokounmpo",
      SG: "Luka Doncic",
      PG: "Luka Doncic",
      C: "Nikola Jokic",
    },
  },
];

export function getArchetype(id: string): Archetype {
  return ARCHETYPES.find((a) => a.id === id) ?? ARCHETYPES[0];
}

// ---------- attribute scaffolding ----------

type SubKey = string;

type GroupDef = {
  key: AttrGroupKey;
  label: string;
  subs: { key: SubKey; label: string; base: number }[];
};

const GROUPS: GroupDef[] = [
  {
    key: "finishing",
    label: "Finishing",
    subs: [
      { key: "closeShot", label: "Close Shot", base: 55 },
      { key: "drivingLayup", label: "Driving Layup", base: 60 },
      { key: "drivingDunk", label: "Driving Dunk", base: 55 },
      { key: "standingDunk", label: "Standing Dunk", base: 45 },
      { key: "postControl", label: "Post Control", base: 45 },
    ],
  },
  {
    key: "shooting",
    label: "Shooting",
    subs: [
      { key: "midRange", label: "Mid-Range", base: 60 },
      { key: "threePt", label: "3PT", base: 60 },
      { key: "freeThrow", label: "Free Throw", base: 65 },
      { key: "shotIQ", label: "Shot IQ", base: 55 },
    ],
  },
  {
    key: "playmaking",
    label: "Playmaking",
    subs: [
      { key: "passAcc", label: "Pass Accuracy", base: 60 },
      { key: "passVision", label: "Pass Vision", base: 55 },
      { key: "ballHandle", label: "Ball Handle", base: 60 },
      { key: "speedWithBall", label: "Speed w/ Ball", base: 60 },
    ],
  },
  {
    key: "defense",
    label: "Defense / Rebound",
    subs: [
      { key: "interiorD", label: "Interior D", base: 55 },
      { key: "perimeterD", label: "Perimeter D", base: 55 },
      { key: "steal", label: "Steal", base: 55 },
      { key: "block", label: "Block", base: 50 },
      { key: "offReb", label: "Off Rebound", base: 50 },
      { key: "defReb", label: "Def Rebound", base: 55 },
    ],
  },
  {
    key: "athleticism",
    label: "Athleticism",
    subs: [
      { key: "speed", label: "Speed", base: 65 },
      { key: "acceleration", label: "Acceleration", base: 65 },
      { key: "vertical", label: "Vertical", base: 60 },
      { key: "stamina", label: "Stamina", base: 75 },
      { key: "lateralQuickness", label: "Lat. Quickness", base: 60 },
    ],
  },
  {
    key: "physicals",
    label: "Physicals",
    subs: [
      { key: "strength", label: "Strength", base: 60 },
      { key: "hands", label: "Hands", base: 65 },
    ],
  },
];

export function getGroupDefs(): GroupDef[] {
  return GROUPS;
}

function clampCap(v: number): number {
  return Math.max(25, Math.min(99, Math.round(v)));
}

// Position modifiers — how each position naturally leans
const POSITION_MOD: Record<Position, Partial<Record<SubKey, number>>> = {
  PG: {
    speed: 4,
    acceleration: 3,
    ballHandle: 5,
    passAcc: 4,
    passVision: 4,
    speedWithBall: 4,
    perimeterD: 2,
    threePt: 2,
    standingDunk: -8,
    block: -6,
    postControl: -6,
    interiorD: -4,
    strength: -6,
  },
  SG: {
    speed: 2,
    acceleration: 2,
    threePt: 3,
    midRange: 3,
    ballHandle: 2,
    standingDunk: -4,
    block: -4,
    postControl: -4,
    interiorD: -2,
    strength: -3,
  },
  SF: {
    drivingDunk: 2,
    threePt: 2,
    perimeterD: 2,
    defReb: 1,
    postControl: -2,
    block: -2,
  },
  PF: {
    drivingDunk: 2,
    standingDunk: 2,
    postControl: 3,
    defReb: 3,
    offReb: 2,
    interiorD: 3,
    strength: 4,
    speed: -3,
    ballHandle: -3,
    threePt: -2,
    perimeterD: -1,
  },
  C: {
    standingDunk: 5,
    block: 5,
    defReb: 5,
    offReb: 4,
    interiorD: 5,
    postControl: 5,
    strength: 6,
    speed: -6,
    acceleration: -4,
    ballHandle: -6,
    threePt: -5,
    perimeterD: -4,
    passVision: -2,
  },
};

export function computeAttributes(b: Omit<Build, "id" | "name" | "updatedAt">): AttributeCaps {
  const arche = getArchetype(b.archetypeId);

  const baseHeight = POSITION_BASE_HEIGHT[b.position];
  const heightDelta = b.heightIn - baseHeight; // +inches = taller than average for pos
  const baseWeight = POSITION_BASE_WEIGHT[b.position];
  const weightDelta = b.weightLb - baseWeight;
  const wing = b.wingspanDelta;

  const out: Partial<AttributeCaps> = {};

  for (const group of GROUPS) {
    const w = arche.weights[group.key];
    const subs: SubAttr[] = group.subs.map((sub) => {
      let v = sub.base;

      // archetype weight (multiplier centered around 1.0)
      v = sub.base * w + (w - 1) * 12; // gives weight some teeth at high end

      // position lean
      const posMod = POSITION_MOD[b.position]?.[sub.key] ?? 0;
      v += posMod;

      // archetype sub boosts
      const subBoost = arche.subBoosts?.[sub.key] ?? 0;
      v += subBoost;

      // height effects
      if (
        sub.key === "speed" ||
        sub.key === "acceleration" ||
        sub.key === "lateralQuickness" ||
        sub.key === "speedWithBall"
      ) {
        v -= heightDelta * 0.8; // taller = slower
      }
      if (sub.key === "threePt" || sub.key === "midRange") {
        v -= heightDelta * 0.25; // mild downside for very tall shooters
      }
      if (
        sub.key === "standingDunk" ||
        sub.key === "block" ||
        sub.key === "offReb" ||
        sub.key === "defReb" ||
        sub.key === "interiorD" ||
        sub.key === "postControl"
      ) {
        v += heightDelta * 0.9; // taller = stronger inside
      }
      if (sub.key === "freeThrow") {
        v -= heightDelta * 0.15;
      }

      // weight effects
      if (sub.key === "strength") v += weightDelta * 0.18;
      if (sub.key === "postControl") v += weightDelta * 0.1;
      if (sub.key === "interiorD") v += weightDelta * 0.08;
      if (sub.key === "speed" || sub.key === "acceleration") v -= weightDelta * 0.12;
      if (sub.key === "vertical") v -= weightDelta * 0.1;
      if (sub.key === "lateralQuickness") v -= weightDelta * 0.08;

      // wingspan effects
      if (
        sub.key === "block" ||
        sub.key === "steal" ||
        sub.key === "interiorD" ||
        sub.key === "perimeterD" ||
        sub.key === "defReb" ||
        sub.key === "offReb"
      ) {
        v += wing * 1.1;
      }
      if (sub.key === "threePt" || sub.key === "midRange") {
        v -= Math.max(0, wing - 2) * 0.5; // very long arms = slightly worse shot
      }
      if (sub.key === "freeThrow") {
        v -= Math.max(0, wing - 2) * 0.4;
      }

      return { key: sub.key, label: sub.label, value: clampCap(v) };
    });
    (out as any)[group.key] = subs;
  }

  return out as AttributeCaps;
}

// ---------- VC cost ----------

// Cost per +1 attribute from current value (roughly linear early, sharp >85, brutal >90)
function costPerPoint(current: number): number {
  if (current < 60) return 110;
  if (current < 70) return 220;
  if (current < 80) return 500;
  if (current < 85) return 950;
  if (current < 90) return 1800;
  if (current < 95) return 3200;
  return 5400;
}

function costFromBaseTo(target: number, base = 25): number {
  let total = 0;
  for (let v = base; v < target; v++) total += costPerPoint(v);
  return total;
}

export function vcCost(a: AttributeCaps): number {
  let total = 0;
  for (const k of Object.keys(a) as AttrGroupKey[]) {
    for (const sub of a[k]) {
      // assume buying up to the cap from a base of ~25
      total += costFromBaseTo(sub.value, 25);
    }
  }
  // VC actually scales lower than raw cap math; apply realistic divisor
  return Math.round(total / 28 / 100) * 100;
}

// ---------- recommended badges ----------

export function recommendedBadges(arche: Archetype, _b: Build): BadgeRec[] {
  return arche.badges.slice(0, 8);
}

// ---------- compare helpers ----------

export type SubDelta = {
  key: string;
  label: string;
  a: number;
  b: number;
  delta: number; // a - b
};

export type AttributeDiff = Record<AttrGroupKey, SubDelta[]>;

export function diffAttributes(a: AttributeCaps, b: AttributeCaps): AttributeDiff {
  const out: Partial<AttributeDiff> = {};
  (Object.keys(a) as AttrGroupKey[]).forEach((k) => {
    const aSubs = a[k];
    const bSubs = b[k];
    const bMap = new Map(bSubs.map((s) => [s.key, s]));
    out[k] = aSubs.map((sA) => {
      const sB = bMap.get(sA.key);
      const bVal = sB?.value ?? 0;
      return {
        key: sA.key,
        label: sA.label,
        a: sA.value,
        b: bVal,
        delta: sA.value - bVal,
      };
    });
  });
  return out as AttributeDiff;
}

export function diffVc(a: AttributeCaps, b: AttributeCaps): number {
  return vcCost(a) - vcCost(b);
}

export type BadgeOverlap = {
  shared: BadgeRec[];
  onlyA: BadgeRec[];
  onlyB: BadgeRec[];
};

export function diffBadges(a: BadgeRec[], b: BadgeRec[]): BadgeOverlap {
  const aNames = new Set(a.map((x) => x.name));
  const bNames = new Set(b.map((x) => x.name));
  return {
    shared: a.filter((x) => bNames.has(x.name)),
    onlyA: a.filter((x) => !bNames.has(x.name)),
    onlyB: b.filter((x) => !aNames.has(x.name)),
  };
}

export function topAbsDeltas(diff: AttributeDiff, n = 3): SubDelta[] {
  const flat: SubDelta[] = [];
  (Object.keys(diff) as AttrGroupKey[]).forEach((k) => flat.push(...diff[k]));
  return [...flat]
    .filter((d) => d.delta !== 0)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, n);
}

// ---------- strengths/weaknesses ----------

export function strengthsWeaknesses(
  a: AttributeCaps,
): { strengths: string[]; weaknesses: string[] } {
  const flat: SubAttr[] = [];
  (Object.keys(a) as AttrGroupKey[]).forEach((k) => flat.push(...a[k]));
  const sorted = [...flat].sort((x, y) => y.value - x.value);
  const strengths = sorted.slice(0, 4).map((s) => `${s.label} ${s.value}`);
  const weaknesses = sorted
    .slice(-4)
    .reverse()
    .map((s) => `${s.label} ${s.value}`);
  return { strengths, weaknesses };
}

// ---------- comparable player ----------

export function comparablePlayer(b: Build): string {
  const a = getArchetype(b.archetypeId);
  return (
    a.comparable[b.position] ??
    Object.values(a.comparable)[0] ??
    "—"
  );
}

// ---------- encode / decode ----------

// Format: POS-HEIGHT-WEIGHT-WING-ARCHE_SHORT
// Example: PG-74-175-2-SHARP2W
const ARCHE_CODE: Record<string, string> = {};
const CODE_ARCHE: Record<string, string> = {};
ARCHETYPES.forEach((a) => {
  // produce a short uppercase code from id
  const code = a.id
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  ARCHE_CODE[a.id] = code;
  CODE_ARCHE[code] = a.id;
});

export function encodeBuild(b: Build): string {
  const aCode = ARCHE_CODE[b.archetypeId] ?? "UNK";
  const wing = b.wingspanDelta >= 0 ? `+${b.wingspanDelta}` : `${b.wingspanDelta}`;
  return `${b.position}-${b.heightIn}-${b.weightLb}-${wing}-${aCode}`;
}

export function decodeBuild(s: string): Build | null {
  const parts = s.trim().toUpperCase().split("-");
  if (parts.length < 5) return null;
  const [pos, h, w, wing, code] = parts;
  if (!POSITIONS.includes(pos as Position)) return null;
  const heightIn = parseInt(h, 10);
  const weightLb = parseInt(w, 10);
  const wingspanDelta = parseInt(wing, 10);
  if (
    !Number.isFinite(heightIn) ||
    !Number.isFinite(weightLb) ||
    !Number.isFinite(wingspanDelta)
  )
    return null;
  const archetypeId = CODE_ARCHE[code];
  if (!archetypeId) return null;
  return {
    id: `b_${Date.now().toString(36)}`,
    name: `${pos} ${formatHeight(heightIn)}`,
    position: pos as Position,
    heightIn,
    weightLb,
    wingspanDelta,
    archetypeId,
    updatedAt: Date.now(),
  };
}

// ---------- default build ----------

export function defaultBuild(): Build {
  return {
    id: `b_${Date.now().toString(36)}`,
    name: "Sharpshooter PG",
    position: "PG",
    heightIn: 74, // 6'2"
    weightLb: 175,
    wingspanDelta: 2,
    archetypeId: "sharp-2way",
    updatedAt: Date.now(),
  };
}

// ---------- localStorage helpers ----------

export const SAVED_KEY = "2klab.builds";

export function loadSavedBuilds(): Build[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b: any) =>
        b &&
        typeof b.id === "string" &&
        POSITIONS.includes(b.position) &&
        typeof b.heightIn === "number" &&
        typeof b.weightLb === "number" &&
        typeof b.wingspanDelta === "number" &&
        typeof b.archetypeId === "string",
    );
  } catch {
    return [];
  }
}

export function saveBuilds(builds: Build[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(builds));
  } catch {
    /* quota / private mode — silently ignore */
  }
}
