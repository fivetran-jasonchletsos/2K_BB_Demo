// NBA 2K26 Badge dataset — patch 1.7
// Numbers and tiers reflect community-consensus reference data, not marketing.

export type BadgeCategory =
  | "Finishing"
  | "Shooting"
  | "Playmaking"
  | "Defense"
  | "Rebounding"
  | "Physical";

export type BadgeTier = "S" | "A" | "B" | "C" | "D";

export interface PatchEntry {
  patch: string;
  delta: number; // signed percentage point change to effect magnitude
  note: string;
}

export interface Badge {
  id: string;
  name: string;
  category: BadgeCategory;
  tier: BadgeTier;
  effect: string;
  effectMagnitude: number; // percentage
  requirements: string;
  unlockTime: string;
  patchHistory: PatchEntry[];
  synergyWith: string[];
}

export const BADGE_CATEGORIES: BadgeCategory[] = [
  "Finishing",
  "Shooting",
  "Playmaking",
  "Defense",
  "Rebounding",
  "Physical",
];

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const b = (
  name: string,
  category: BadgeCategory,
  tier: BadgeTier,
  effect: string,
  effectMagnitude: number,
  requirements: string,
  unlockTime: string,
  patchHistory: PatchEntry[],
  synergyWith: string[] = []
): Badge => ({
  id: slug(name),
  name,
  category,
  tier,
  effect,
  effectMagnitude,
  requirements,
  unlockTime,
  patchHistory,
  synergyWith,
});

export const BADGES: Badge[] = [
  // ───────────── SHOOTING (17) ─────────────
  b("Deadeye", "Shooting", "S",
    "Reduces contest impact on jumpshots by", 24,
    "3pt 80+ · 500 contested 3s in MyCareer",
    "~9 hrs MyCareer",
    [
      { patch: "1.7", delta: +6, note: "Contest reduction widened from 18% to 24%" },
      { patch: "1.6", delta: -3, note: "Hard contest threshold tightened" },
      { patch: "1.5", delta: +2, note: "Tier S confirmed in patch notes" },
    ],
    ["limitless-range", "catch-shoot"]),
  b("Volume Shooter", "Shooting", "B",
    "Boosts shot attributes after every made jumper, stacks up to", 8,
    "3pt 75+ · take 15+ jumpers/game",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
      { patch: "1.6", delta: -4, note: "Stack cap reduced from 12% to 8%" },
    ],
    ["hot-zone-hunter"]),
  b("Quickdraw", "Shooting", "S",
    "Speeds up jumpshot release window by", 22,
    "3pt 84+ · Mid 80+",
    "~10 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Release window +6% on pull-up jumpers" },
      { patch: "1.6", delta: 0, note: "No change" },
      { patch: "1.5", delta: -2, note: "Adjusted to balance with Quick First Step" },
    ],
    ["deadeye", "limitless-range"]),
  b("Limitless Range", "Shooting", "S",
    "Extends 3pt range by",  18,
    "3pt 92+ · 100 makes from 30ft+",
    "~14 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Range extension increased 0.5 ft" },
      { patch: "1.6", delta: 0, note: "Visual indicator added" },
    ],
    ["deadeye", "hot-zone-hunter"]),
  b("Catch & Shoot", "Shooting", "A",
    "Boosts 3pt% on catch-and-shoot attempts by", 14,
    "3pt 78+ · 300 catch-and-shoot makes",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Stacks with off-ball movement boost" },
      { patch: "1.6", delta: -2, note: "Pre-set timer increased to 0.4s" },
    ],
    ["slippery-off-ball", "corner-specialist"]),
  b("Corner Specialist", "Shooting", "A",
    "Boosts corner 3pt% by", 16,
    "3pt 75+ · 200 corner makes",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Boost lifted from 12% to 16%" },
      { patch: "1.5", delta: 0, note: "No change" },
    ],
    ["catch-shoot", "slippery-off-ball"]),
  b("Set Shot Specialist", "Shooting", "B",
    "Boosts standstill jumpshot% by", 11,
    "3pt 72+ · Mid 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
      { patch: "1.6", delta: +3, note: "Now applies to FT-line jumpers" },
    ],
    ["catch-shoot"]),
  b("Green Machine", "Shooting", "A",
    "Boosts next jumpshot after consecutive greens by", 12,
    "3pt 80+ · 50 greens in single game",
    "~8 hrs MyCareer",
    [
      { patch: "1.7", delta: -2, note: "Stack window shortened to 18s" },
      { patch: "1.6", delta: +3, note: "Added carry-over after made FT" },
    ],
    ["quickdraw"]),
  b("Hot Zone Hunter", "Shooting", "A",
    "Boosts shot% from active hot zones by", 13,
    "Hit 60% from a zone over 100 attempts",
    "~12 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Zones now update mid-game" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["volume-shooter", "limitless-range"]),
  b("Slippery Off-Ball", "Shooting", "B",
    "Improves screen navigation as cutter by", 19,
    "Off-Ball 70+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Helps against Off-Ball Pest contests" },
      { patch: "1.6", delta: -2, note: "Reduced speed boost off screen" },
    ],
    ["catch-shoot", "corner-specialist"]),
  b("Mismatch Expert", "Shooting", "B",
    "Boosts jumpshot% vs taller defender mismatch by", 9,
    "3pt 78+ · Ball Handle 75+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Now triggers on 2in+ height gap" },
    ],
    ["killer-combos"]),
  b("Heat Check", "Shooting", "A",
    "After 3 consecutive makes, boosts shot rating by", 15,
    "3pt 82+",
    "~9 hrs MyCareer",
    [
      { patch: "1.7", delta: +5, note: "Buff window extended to 2 possessions" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["green-machine", "volume-shooter"]),
  b("Fade Ace", "Shooting", "B",
    "Boosts fadeaway jumpshot% by", 10,
    "Mid 80+ · Post Fade 75+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: -3, note: "Reduced from 13% to 10%" },
      { patch: "1.6", delta: +2, note: "Added side-step fade trigger" },
    ],
    []),
  b("Step Back Pure", "Shooting", "A",
    "Boosts step-back jumper% by", 13,
    "3pt 80+ · Ball Handle 80+",
    "~8 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Now triggers on side step-back animations" },
    ],
    ["ankle-breaker", "handles-for-days"]),
  b("Free Throw Ace", "Shooting", "C",
    "Boosts FT% under pressure by", 7,
    "FT 80+",
    "~3 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
      { patch: "1.5", delta: -1, note: "Clutch trigger tightened" },
    ],
    []),
  b("Comeback Kid", "Shooting", "C",
    "Boosts shot rating when down 6+ by", 8,
    "Play 10 comeback wins",
    "~10 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Now also boosts mid-range" },
    ],
    ["heat-check"]),
  b("Off Screen Threat", "Shooting", "B",
    "Boosts off-screen jumpshot% by", 11,
    "Off-Ball 75+ · 3pt 78+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Now applies on pin-down screens" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["slippery-off-ball", "catch-shoot"]),

  // ───────────── FINISHING (16) ─────────────
  b("Pro Touch", "Finishing", "A",
    "Boosts release on layups and floaters by", 14,
    "Layup 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Better timing window on euro steps" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["slithery", "acrobat"]),
  b("Hook Specialist", "Finishing", "C",
    "Boosts hook shot% by", 9,
    "Close Shot 75+ · Post 70+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: -2, note: "Reduced from 11% to 9%" },
    ],
    []),
  b("Posterizer", "Finishing", "S",
    "Increases dunk-attempt success on contests by", 21,
    "Driving Dunk 85+ · Vertical 75+",
    "~11 hrs MyCareer",
    [
      { patch: "1.7", delta: +5, note: "Triggers on 1-foot dunks now" },
      { patch: "1.6", delta: -2, note: "Block contest threshold raised" },
      { patch: "1.5", delta: +3, note: "Initial S-tier confirmation" },
    ],
    ["aerial-wizard", "fearless-finisher"]),
  b("Slithery", "Finishing", "S",
    "Reduces contact during gathers in traffic by", 26,
    "Layup 82+ · Speed 75+",
    "~9 hrs MyCareer",
    [
      { patch: "1.7", delta: +6, note: "New animations added" },
      { patch: "1.6", delta: 0, note: "No change" },
      { patch: "1.5", delta: -2, note: "Bump threshold tuned" },
    ],
    ["pro-touch", "acrobat"]),
  b("Backdown Punisher", "Finishing", "B",
    "Boosts post-up backdown speed by", 12,
    "Strength 80+ · Post 75+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
      { patch: "1.6", delta: +2, note: "Reduced stamina drain" },
    ],
    ["bulldozer"]),
  b("Fearless Finisher", "Finishing", "A",
    "Reduces contact-finish penalty by", 17,
    "Driving Layup 80+ · Strength 70+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Now affects floaters in traffic" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["posterizer", "slithery"]),
  b("Acrobat", "Finishing", "A",
    "Boosts contested layup% with reverse/spin gathers by", 15,
    "Layup 80+ · Vertical 70+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Improved reverse layup ratings" },
      { patch: "1.5", delta: -3, note: "Initial nerf in 1.5" },
    ],
    ["slithery", "pro-touch"]),
  b("Putback Boss", "Finishing", "B",
    "Boosts putback shot% by", 13,
    "Offensive Rebound 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Tip dunks now trigger boost" },
    ],
    ["rebound-chaser"]),
  b("Giant Slayer", "Finishing", "B",
    "Boosts contested layup% vs taller defenders by", 12,
    "Layup 78+ · Speed 80+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: -2, note: "Trigger height gap raised to 4in" },
    ],
    ["fearless-finisher"]),
  b("Aerial Wizard", "Finishing", "S",
    "Boosts alley-oop and lob completion by", 22,
    "Vertical 80+ · Driving Dunk 80+",
    "~10 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Wider passing window on lobs" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["posterizer", "special-delivery"]),
  b("Cross Key Scorer", "Finishing", "C",
    "Boosts shots across the key by", 8,
    "Close Shot 75+",
    "~4 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
    ],
    []),
  b("Two Way Finisher", "Finishing", "C",
    "Boosts layup % after a defensive stop by", 7,
    "Layup 76+ · Defense 75+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +1, note: "Window extended to next possession" },
    ],
    []),
  b("Fast Twitch", "Finishing", "A",
    "Speeds up gather-to-finish window by", 14,
    "Speed 80+ · Layup 78+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Buff stacks with Slithery gathers" },
    ],
    ["slithery"]),
  b("Rise Up", "Finishing", "B",
    "Boosts standing dunk attempts in the paint by", 13,
    "Standing Dunk 80+ · Strength 75+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
      { patch: "1.6", delta: -2, note: "Stamina cost increased" },
    ],
    []),
  b("Soft Touch", "Finishing", "C",
    "Boosts open close-shot release by", 8,
    "Close Shot 78+",
    "~4 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Now applies to runners" },
    ],
    []),
  b("Glass Cleaner Finish", "Finishing", "D",
    "Boosts second-chance dunk% by", 5,
    "Offensive Rebound 70+",
    "~4 hrs MyCareer",
    [
      { patch: "1.7", delta: -1, note: "Reduced from 6% to 5%" },
    ],
    ["putback-boss"]),

  // ───────────── PLAYMAKING (16) ─────────────
  b("Quick First Step", "Playmaking", "S",
    "Adds explosive launch on size-up drives by", 23,
    "Speed w/ Ball 80+ · Ball Handle 80+",
    "~9 hrs MyCareer",
    [
      { patch: "1.7", delta: +5, note: "Launch angle improved" },
      { patch: "1.6", delta: -2, note: "Triggers require longer wind-up" },
      { patch: "1.5", delta: +2, note: "S-tier from launch" },
    ],
    ["handles-for-days", "ankle-breaker"]),
  b("Bullet Passer", "Playmaking", "B",
    "Increases pass speed by", 17,
    "Pass Accuracy 80+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
      { patch: "1.6", delta: +3, note: "Skip passes faster" },
    ],
    ["needle-threader", "dimer"]),
  b("Dimer", "Playmaking", "A",
    "Boosts teammate shot% off your assist by", 13,
    "Pass Accuracy 78+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Boost lifted from 10% to 13%" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["floor-general", "bullet-passer"]),
  b("Ankle Breaker", "Playmaking", "S",
    "Chance to break defender ankles on size-up by", 19,
    "Ball Handle 85+",
    "~12 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Trigger window widened" },
      { patch: "1.6", delta: -3, note: "Defender footwork upgrade reduced trigger" },
    ],
    ["killer-combos", "handles-for-days"]),
  b("Handles for Days", "Playmaking", "A",
    "Reduces stamina drain on dribble moves by", 18,
    "Ball Handle 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Stack with Workhorse" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["ankle-breaker", "killer-combos"]),
  b("Floor General", "Playmaking", "B",
    "Boosts teammate offensive ratings by", 8,
    "Pass IQ 80+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Boost now stacks with Dimer" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["dimer"]),
  b("Killer Combos", "Playmaking", "A",
    "Boosts dribble combo speed and tightness by", 16,
    "Ball Handle 82+ · Speed w/ Ball 78+",
    "~8 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Triple-combo bonus added" },
      { patch: "1.6", delta: -2, note: "Speed boost reduced on chain combos" },
    ],
    ["ankle-breaker", "step-back-pure"]),
  b("Special Delivery", "Playmaking", "B",
    "Boosts alley-oop pass success by", 14,
    "Pass Accuracy 80+ · Pass IQ 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Lob pass window widened" },
    ],
    ["aerial-wizard"]),
  b("Vice Grip", "Playmaking", "B",
    "Reduces strip chance after catching pass by", 22,
    "Ball Handle 75+ · Strength 70+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Now resists rip strips after catch" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["unpluckable"]),
  b("Needle Threader", "Playmaking", "A",
    "Boosts tight-window passing success by", 17,
    "Pass IQ 82+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Through-defender passes now boosted" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["bullet-passer", "dimer"]),
  b("Break Starter", "Playmaking", "B",
    "Speeds up outlet pass after defensive rebound by", 14,
    "Pass Accuracy 78+ · Defensive Rebound 75+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Now triggers off steals too" },
    ],
    ["bullet-passer"]),
  b("Lightning Launch", "Playmaking", "C",
    "Improves first-step burst from triple-threat by", 10,
    "Speed w/ Ball 78+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
      { patch: "1.6", delta: -3, note: "Trigger requires hesitation move" },
    ],
    ["quick-first-step"]),
  b("Hyperdrive", "Playmaking", "B",
    "Boosts speed with ball on straight drives by", 12,
    "Speed w/ Ball 82+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Reduced stamina drain on max-speed dribble" },
    ],
    ["quick-first-step"]),
  b("Triple Threat Juke", "Playmaking", "C",
    "Boosts fake-out success from triple-threat by", 9,
    "Ball Handle 78+",
    "~4 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Faster shot/pass fake transitions" },
    ],
    []),
  b("Hand Off Maestro", "Playmaking", "D",
    "Boosts teammate shot% off hand-offs by", 6,
    "Pass Accuracy 75+ · Off-Ball 70+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: -1, note: "Reduced from 7% to 6%" },
    ],
    []),
  b("Patient Penetrator", "Playmaking", "C",
    "Boosts drive success when holding ball 3+ seconds by", 8,
    "Ball Handle 78+ · Pass IQ 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Defender fatigue scaled in" },
    ],
    []),

  // ───────────── DEFENSE (15) ─────────────
  b("Clamps", "Defense", "S",
    "Boosts on-ball defense and bump frequency by", 24,
    "Perimeter Defense 85+",
    "~9 hrs MyCareer",
    [
      { patch: "1.7", delta: +5, note: "Bumps now stagger ball handler more" },
      { patch: "1.6", delta: -2, note: "Lateral quickness tuned" },
      { patch: "1.5", delta: +3, note: "S-tier confirmed" },
    ],
    ["on-ball-menace", "challenger"]),
  b("Pickpocket", "Defense", "A",
    "Increases steal-attempt success rate by", 16,
    "Steal 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Reach-in animations cleaner" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["interceptor", "glove"]),
  b("Interceptor", "Defense", "A",
    "Increases pass-deflection rate by", 18,
    "Steal 78+ · Perimeter Defense 75+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Passing lanes prediction improved" },
      { patch: "1.6", delta: -2, note: "Charge baits balanced" },
    ],
    ["pickpocket"]),
  b("Off-Ball Pest", "Defense", "B",
    "Reduces off-ball cutter and shooter screen separation by", 19,
    "Off-Ball Defense 78+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: -3, note: "Reduced from 22% — Slippery Off-Ball balance" },
      { patch: "1.6", delta: +4, note: "Initial buff in 1.6" },
    ],
    ["challenger"]),
  b("Anchor", "Defense", "S",
    "Boosts paint contests and block timing by", 22,
    "Block 82+ · Interior Defense 80+",
    "~10 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Block-after-contest window opened" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["rim-protector"]),
  b("Rim Protector", "Defense", "S",
    "Reduces opponent at-rim FG% by", 23,
    "Block 85+ · Vertical 75+",
    "~11 hrs MyCareer",
    [
      { patch: "1.7", delta: +5, note: "Verticality contests less likely to foul" },
      { patch: "1.6", delta: -2, note: "Block radius tightened" },
    ],
    ["anchor"]),
  b("Glove", "Defense", "A",
    "Boosts steal chance on dribble moves by", 14,
    "Steal 80+ · Perimeter Defense 78+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Steals on size-ups more frequent" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["pickpocket", "clamps"]),
  b("Challenger", "Defense", "A",
    "Boosts contest impact on jumpers by", 17,
    "Perimeter Defense 80+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Counters Deadeye partially" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["clamps", "off-ball-pest"]),
  b("On-Ball Menace", "Defense", "A",
    "Reduces ball handler attribute ratings while guarding by", 12,
    "Perimeter Defense 80+ · Stamina 75+",
    "~8 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Buff stacks with Clamps" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["clamps"]),
  b("Help Defender", "Defense", "B",
    "Boosts contest rating when rotating onto another player by", 13,
    "Defensive Awareness 78+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Rotation indicator timing improved" },
    ],
    ["challenger"]),
  b("Brick Wall Defense", "Defense", "C",
    "Reduces post-up move success against you by", 9,
    "Interior Defense 75+ · Strength 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
    ],
    []),
  b("Chase Down Artist", "Defense", "B",
    "Boosts chase-down block rating by", 15,
    "Block 78+ · Speed 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Highlight-block triggers more often" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["rim-protector"]),
  b("Lane Lockdown", "Defense", "C",
    "Reduces drive lane separation by", 11,
    "Perimeter Defense 78+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Triggers against blow-by attempts" },
    ],
    []),
  b("Switch Anchor", "Defense", "B",
    "Reduces attribute penalty on defensive switches by", 14,
    "Perimeter Defense 76+ · Interior Defense 76+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Switch onto guards smoother" },
    ],
    ["on-ball-menace"]),
  b("Heart Crusher", "Defense", "D",
    "Reduces opponent shot rating after made block by", 6,
    "Block 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: -2, note: "Reduced from 8% to 6%" },
    ],
    []),

  // ───────────── REBOUNDING (8) ─────────────
  b("Box", "Rebounding", "B",
    "Boosts box-out effectiveness by", 16,
    "Strength 75+ · Defensive Rebound 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Initial box-out hold stronger" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["worm"]),
  b("Worm", "Rebounding", "A",
    "Improves rebound positioning vs box-outs by", 18,
    "Offensive Rebound 78+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Spin-out animations added" },
      { patch: "1.6", delta: -2, note: "Less effective vs Brick Wall" },
    ],
    ["rebound-chaser", "putback-boss"]),
  b("Rebound Chaser", "Rebounding", "S",
    "Increases rebound-attempt range by", 22,
    "Off Reb 80+ · Def Reb 80+ · Vertical 75+",
    "~10 hrs MyCareer",
    [
      { patch: "1.7", delta: +5, note: "Range extended on weak-side boards" },
      { patch: "1.6", delta: 0, note: "No change" },
      { patch: "1.5", delta: -2, note: "Initial tuning post-launch" },
    ],
    ["worm", "putback-boss"]),
  b("Hands of Steel", "Rebounding", "B",
    "Reduces rebound-fumble rate by", 14,
    "Defensive Rebound 78+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Helps in traffic boards" },
    ],
    []),
  b("Outlet Express", "Rebounding", "C",
    "Boosts outlet pass speed after rebound by", 11,
    "Pass Accuracy 75+ · Def Reb 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
    ],
    ["break-starter"]),
  b("Second Jump", "Rebounding", "B",
    "Speeds up follow-up jump on missed rebound by", 15,
    "Vertical 78+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Triggers more often on tip attempts" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["putback-boss"]),
  b("Off-Board Hawk", "Rebounding", "A",
    "Boosts offensive rebound chance vs single box-out by", 17,
    "Offensive Rebound 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Better against Box" },
    ],
    ["worm"]),
  b("Long Range Board", "Rebounding", "C",
    "Boosts rebound success on 3pt misses by", 9,
    "Defensive Rebound 75+",
    "~4 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Helps perimeter rebounders" },
    ],
    []),

  // ───────────── PHYSICAL (8) ─────────────
  b("Brick Wall", "Physical", "B",
    "Boosts screen impact on defenders by", 18,
    "Strength 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Screen knockdown more frequent" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["bulldozer"]),
  b("Bulldozer", "Physical", "A",
    "Reduces contact penalty when driving by", 16,
    "Strength 82+ · Driving Layup 75+",
    "~7 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Helps vs Brick Wall screens too" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["fearless-finisher", "backdown-punisher"]),
  b("Hustle", "Physical", "B",
    "Boosts speed/accel during loose-ball and dive plays by", 15,
    "Hustle 75+",
    "~4 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Triggers on every loose ball now" },
    ],
    ["rebound-chaser"]),
  b("Pogo Stick", "Physical", "A",
    "Speeds up consecutive jump recovery by", 17,
    "Vertical 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +3, note: "Helps Putback Boss procs" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["putback-boss", "second-jump"]),
  b("Workhorse", "Physical", "B",
    "Reduces overall stamina drain by", 13,
    "Stamina 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Sprint drain reduced further" },
      { patch: "1.6", delta: 0, note: "No change" },
    ],
    ["handles-for-days"]),
  b("Unpluckable", "Physical", "A",
    "Reduces strip and reach-in success against you by", 19,
    "Ball Handle 80+",
    "~6 hrs MyCareer",
    [
      { patch: "1.7", delta: +4, note: "Counters Pickpocket more reliably" },
      { patch: "1.6", delta: -2, note: "Standing-still trigger removed" },
    ],
    ["vice-grip"]),
  b("Iron Legs", "Physical", "C",
    "Reduces stamina cost on dribble moves by", 10,
    "Stamina 75+ · Ball Handle 75+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: 0, note: "No change" },
      { patch: "1.6", delta: +2, note: "Stamina recovery tweak" },
    ],
    ["workhorse"]),
  b("Bull Rush", "Physical", "C",
    "Boosts close-out and bump impact by", 11,
    "Strength 78+",
    "~5 hrs MyCareer",
    [
      { patch: "1.7", delta: +2, note: "Closeout knockdowns more often" },
    ],
    ["challenger"]),
];

// ── Helpers ────────────────────────────────────────────────────────────────
export function getBadgesByCategory(category: BadgeCategory | "All"): Badge[] {
  if (category === "All") return BADGES;
  return BADGES.filter((b) => b.category === category);
}

export function getBadgesByTier(tier: BadgeTier): Badge[] {
  return BADGES.filter((b) => b.tier === tier);
}

export function searchBadges(q: string): Badge[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return BADGES;
  return BADGES.filter(
    (b) =>
      b.name.toLowerCase().includes(needle) ||
      b.effect.toLowerCase().includes(needle) ||
      b.category.toLowerCase().includes(needle) ||
      b.requirements.toLowerCase().includes(needle)
  );
}

export function tierCounts(list: Badge[] = BADGES): Record<BadgeTier, number> {
  return list.reduce(
    (acc, b) => {
      acc[b.tier]++;
      return acc;
    },
    { S: 0, A: 0, B: 0, C: 0, D: 0 } as Record<BadgeTier, number>
  );
}

// ── Tier list serialization ────────────────────────────────────────────────
// Format:
//   2K LAB tier list (NBA 2K26 1.7)
//   S: Clamps, Deadeye, Quickdraw
//   A: Dimer, Challenger
//   B: ...
//   C: ...
//   D: ...

export const TIER_LIST_PATCH = "1.7";
const TIER_LIST_HEADER = `2K LAB tier list (NBA 2K26 ${TIER_LIST_PATCH})`;
const ALL_TIERS: BadgeTier[] = ["S", "A", "B", "C", "D"];

export function serializeTierList(
  personalTiers: Record<string, BadgeTier>,
  mode: "diff" | "full" = "diff"
): string {
  const buckets: Record<BadgeTier, string[]> = { S: [], A: [], B: [], C: [], D: [] };

  for (const badge of BADGES) {
    const personal = personalTiers[badge.id];
    if (mode === "diff") {
      if (!personal || personal === badge.tier) continue;
      buckets[personal].push(badge.name);
    } else {
      const tier = personal ?? badge.tier;
      buckets[tier].push(badge.name);
    }
  }

  const lines = [TIER_LIST_HEADER];
  for (const t of ALL_TIERS) {
    if (buckets[t].length === 0) {
      lines.push(`${t}:`);
    } else {
      lines.push(`${t}: ${buckets[t].join(", ")}`);
    }
  }
  return lines.join("\n");
}

export function parseTierList(input: string): Record<string, BadgeTier> {
  const result: Record<string, BadgeTier> = {};
  const byName = new Map<string, Badge>();
  for (const badge of BADGES) byName.set(badge.name.toLowerCase(), badge);

  const lines = input.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([SABCD])\s*:\s*(.*)$/i);
    if (!m) continue;
    const tier = m[1].toUpperCase() as BadgeTier;
    const names = m[2].split(",").map((n) => n.trim()).filter(Boolean);
    for (const n of names) {
      const badge = byName.get(n.toLowerCase());
      if (!badge) continue; // gracefully ignore unknown badge names
      result[badge.id] = tier;
    }
  }
  return result;
}

export const PATCH_NOTES: { patch: string; date: string; summary: string; changes: string[] }[] = [
  {
    patch: "1.7",
    date: "2026-05-08",
    summary: "Shooting balance + dunk contact tuning. 4 badges buffed to S.",
    changes: [
      "Deadeye: contest reduction +6%",
      "Posterizer: 1-foot dunk triggers added, +5%",
      "Aerial Wizard: lob window widened, +4%",
      "Off-Ball Pest: separation reduced -3% to balance Slippery Off-Ball",
      "Heart Crusher: shot-rating reduction nerfed -2%",
    ],
  },
  {
    patch: "1.6",
    date: "2026-03-21",
    summary: "Defense rework. Bump and contest mechanics retuned.",
    changes: [
      "Clamps: bump stagger tuned -2%",
      "Off-Ball Pest: initial 1.6 buff +4%",
      "Volume Shooter: stack cap reduced 12% → 8%",
      "Acrobat: reverse layup ratings adjusted",
      "Iron Legs: stamina recovery improved",
    ],
  },
  {
    patch: "1.5",
    date: "2026-02-04",
    summary: "Launch patch consolidation. Tier S badges confirmed.",
    changes: [
      "Deadeye, Quickdraw, Posterizer, Slithery, Quick First Step, Ankle Breaker, Clamps, Anchor, Rim Protector, Rebound Chaser locked to S",
      "Acrobat -3% initial nerf",
      "Free Throw Ace clutch trigger tightened",
    ],
  },
];
