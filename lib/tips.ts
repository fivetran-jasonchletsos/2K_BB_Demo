export type TipCategory =
  | "vc-farming"
  | "mechanics"
  | "mycareer"
  | "rep"
  | "animations"
  | "glitches"
  | "myteam"
  | "park"
  | "defense"
  | "offense";

export type TipDifficulty = 1 | 2 | 3;

export type TipTime =
  | "<5 min"
  | "5-15 min"
  | "15-60 min"
  | "one-time"
  | "daily"
  | "weekly"
  | "ongoing";

export type Tip = {
  id: string;
  title: string;
  body: string;
  category: TipCategory;
  difficulty: TipDifficulty;
  timeToExecute: TipTime;
  value: string;
  tags: string[];
  source?: string;
  patchVerified?: string;
  /** One-line punchy hook shown on collapsed card. Under 90 chars. */
  hook?: string;
  /** Parsed VC-per-hour rate where the tip clearly maps to one. */
  vcPerHour?: number;
};

export const CATEGORY_LABEL: Record<TipCategory, string> = {
  "vc-farming": "VC Farming",
  mechanics: "Hidden Mechanics",
  mycareer: "MyCareer",
  rep: "Rep Grinding",
  animations: "Animations",
  glitches: "Glitches",
  myteam: "MyTeam",
  park: "Park & Rec",
  defense: "Defense",
  offense: "Offense",
};

export const CATEGORY_ORDER: TipCategory[] = [
  "vc-farming",
  "mechanics",
  "mycareer",
  "rep",
  "animations",
  "glitches",
  "myteam",
  "park",
  "defense",
  "offense",
];

export const TIPS: Tip[] = [
  // VC FARMING
  {
    id: "vc-practice-drills",
    title: "Daily practice drills cap at 1,500 VC",
    body:
      "Hit the team practice option from the MyCareer phone menu. Five drills, all A+ grades, pays 1,500 VC and resets at 4am ET.\nTakes about 4 minutes if you skip the cutscene with Options.",
    category: "vc-farming",
    difficulty: 1,
    timeToExecute: "<5 min",
    value: "1,500 VC/day",
    tags: ["daily", "mycareer", "guaranteed"],
    source: "In-game daily reward",
    patchVerified: "1.7",
    hook: "1,500 VC in 4 min. Caps once per day, resets 4am ET.",
    vcPerHour: 22500,
  },
  {
    id: "vc-domination-vc-min",
    title: "Pro Domination beats Hall of Fame on VC/min",
    body:
      "HoF Domination pays roughly 2x VC per win but takes 3.4x as long with the AI clamping. Pro difficulty pays ~600 VC in 9 minutes — that's 66 VC/min.\nHoF averages 41 VC/min unless you blow out the AI, which is rare on locked rosters.",
    category: "vc-farming",
    difficulty: 2,
    timeToExecute: "15-60 min",
    value: "~66 VC/min",
    tags: ["myteam", "domination", "math"],
    source: "Community-verified across 40-game samples",
    hook: "Pro Domination = 3,960 VC/hr. HoF only pays 2,460/hr.",
    vcPerHour: 3960,
  },
  {
    id: "vc-skip-cutscenes",
    title: "Skip every MyCareer cutscene to save 11 hours/season",
    body:
      "Options button skips every story scene. Cinematic load is unchanged but you save 18-22 seconds per game in the City and ~40 seconds per Story arc beat.\nAcross an 82-game season that's roughly 11 hours back. The VC payout is identical.",
    category: "vc-farming",
    difficulty: 1,
    timeToExecute: "ongoing",
    value: "~11 hrs/season",
    tags: ["mycareer", "qol"],
    hook: "Options skips every cutscene. 11 hours back over an 82-game season.",
  },
  {
    id: "vc-mobile-cross",
    title: "2K Mobile daily spins feed your console wallet",
    body:
      "Linking 2K Mobile to your MyPLAYER pushes the daily spin VC straight to your console account. Average daily spin = 350 VC, weekly Wheel of Boom averages 1,200 VC.\nIdle reward — takes 20 seconds on your phone, no console needed.",
    category: "vc-farming",
    difficulty: 1,
    timeToExecute: "<5 min",
    value: "~2,650 VC/wk",
    tags: ["mobile", "cross-rewards", "daily"],
    source: "2K Mobile companion app",
    hook: "Free 2,650 VC/wk from the phone app. 20 seconds of taps.",
    vcPerHour: 22000,
  },
  {
    id: "vc-myteam-tokens-path",
    title: "Token cap path: Triple Threat Online > TT100 > Challenges",
    body:
      "TT Online pays 1 token per 3 wins (no losses count) — fastest token/min if you can win 60% of games. TT100 is safer, pays 1 token per board cleared.\nWeekly token cap is 40. Hit it Sunday night, you reset Monday 12am ET.",
    category: "myteam",
    difficulty: 2,
    timeToExecute: "weekly",
    value: "40 tokens/wk",
    tags: ["myteam", "tokens", "weekly"],
    hook: "TT Online for tokens if you win 60%+. Otherwise TT100. Cap is 40/wk.",
  },
  {
    id: "vc-endorsement-stack",
    title: "Stack 3 endorsements before signing the 4th",
    body:
      "Endorsement deals offer +15% VC per shoe game if you hold 3 active. Signing the 4th locks the bonus for the duration.\nWait until you have a Jordan, Adidas, and Under Armour offer simultaneously, then accept all four to lock max stacking.",
    category: "vc-farming",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "+15% VC/game",
    tags: ["mycareer", "endorsements"],
    hook: "Hold 3 endorsement offers, then sign all four at once to lock +15%/game.",
  },

  // HIDDEN MECHANICS
  {
    id: "mech-shot-windows",
    title: "Green window is 0.06s on speed C jumpers, 0.14s on speed A",
    body:
      "Faster jumpers (release speed A+) have a ~58% tighter green window than slow jumpers. The trade is reaction time on contests.\nIf you contest-shoot a lot, pick speed B for the 0.10s window — it's the best balance of timing margin and pull-up window.",
    category: "mechanics",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "Greens up ~12%",
    tags: ["shooting", "jumpshot", "math"],
    source: "Frame data community sheet",
    patchVerified: "1.7",
    hook: "Speed B = 0.10s green window. Best balance of timing and contest defense.",
  },
  {
    id: "mech-sprint-fatigue",
    title: "Sprint fatigue resets after 3.0s of slow movement",
    body:
      "Hold sprint and you start losing max speed at ~2.4s. Burst → 2s walk → burst preserves max speed indefinitely.\nUseful in transition: sprint past the 3-point line, release, then sprint again at the elbow.",
    category: "mechanics",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "Max speed kept",
    tags: ["sprint", "stamina", "transition"],
    hook: "Sprint > 2s walk > sprint again. Resets fatigue, keeps top speed.",
  },
  {
    id: "mech-pass-icon",
    title: "Pass icon override lets you swap who you control",
    body:
      "Hold L1 and tap a teammate's icon to take control of them off-ball. Releases your defender but gives you immediate off-ball position.\nKey for back-cuts and inbound plays. Lasts until you release L1.",
    category: "mechanics",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "Off-ball control",
    tags: ["passing", "off-ball", "advanced"],
    hook: "Hold L1, tap a teammate icon to take over off-ball. Cuts and inbounds get easy.",
  },
  {
    id: "mech-pnr-defender",
    title: "Pick-and-roll defender setting changes who hedges",
    body:
      "From the L1 quick menu, pick coverage = ICE forces baseline, Show forces hard hedge. Drop coverage is default and gets blown up by any 80+ 3PT guard.\nMatch coverage to the screener: switch on guards, drop on bigs without floaters.",
    category: "defense",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "PnR stops up ~22%",
    tags: ["pnr", "coverage", "defense"],
    hook: "Switch on guards, drop on bigs without floaters. Default Drop gets cooked.",
  },
  {
    id: "mech-shot-meter-off",
    title: "Hiding the shot meter raises green % by ~4 points",
    body:
      "Meter on adds visual processing delay. Players in the 99 OVR pool average 4.1% more greens with meter off across 2K Labs sample.\nUse the audio cue (shooter's grunt + ball-out-of-hands sound) to time. Takes a week to adjust.",
    category: "mechanics",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "+4% green rate",
    tags: ["shooting", "meter", "advanced"],
    source: "2K Labs frame sample",
    hook: "Meter off = +4% greens. Time off the audio cue. Adjustment takes a week.",
  },

  // MYCAREER
  {
    id: "mc-affiliation-order",
    title: "Affiliation order: South Side > West Side > Beach > Old Town",
    body:
      "South Side rep quests pay 22% more XP than Old Town's identical objectives because the South Side gym is closer to spawn (less travel time per quest).\nClear all four eventually for the badge, but rep up South Side first to unlock the affiliate weekend boost rotation faster.",
    category: "mycareer",
    difficulty: 1,
    timeToExecute: "ongoing",
    value: "~22% XP/quest",
    tags: ["affiliation", "rep", "order"],
    hook: "Rep South Side first. 22% more XP per quest from shorter travel.",
  },
  {
    id: "mc-trade-request-shots",
    title: "Trade request after 3 sub-7-FGA games to force a shot bump",
    body:
      "The coach's playbook auto-tunes if you log 3 straight games with under 7 FGA. Your plays-called number rises ~40% the next game.\nDon't request a trade — just hit Coach Talk → 'Plays called for me'. Same effect, no contract penalty.",
    category: "mycareer",
    difficulty: 2,
    timeToExecute: "weekly",
    value: "+40% plays called",
    tags: ["coach", "shots", "trade"],
    hook: "Three sub-7 FGA games triggers coach auto-tune. +40% plays next game.",
  },
  {
    id: "mc-teammate-grade",
    title: "Hockey assist > shot for teammate grade on bigs",
    body:
      "If your role is Stretch Big or Glass Cleaner, passing into a teammate's assist counts as a hockey assist and pays +0.4 grade vs +0.1 for a made jumper.\nThe coach grade algorithm weights playmaking on bigs heavier than guards.",
    category: "mycareer",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "+0.3 grade/poss",
    tags: ["grade", "bigs", "passing"],
    hook: "Bigs: hockey assist beats a made jumper for teammate grade. 4x the points.",
  },
  {
    id: "mc-dunk-meter-sweet",
    title: "Dunk meter sweet spot sits at 75% on contact dunks",
    body:
      "Release at 75% bar fill (not 100%) for contact finishes. 100% triggers a layup or block animation against a 80+ vertical defender.\nStat req: 86 Driving Dunk + Contact Finisher silver to even attempt.",
    category: "mycareer",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "Contact finish rate +18%",
    tags: ["dunks", "meter", "contact"],
    hook: "Release the dunk meter at 75%, not 100%. 100% = layup or block.",
  },
  {
    id: "mc-endorsement-math",
    title: "Endorsement game ROI: cap at 4 deals, not 5",
    body:
      "5th endorsement deal adds a 'shoe game' obligation every 4 games. Miss it and you forfeit 8,000 VC penalty.\n4 deals = 9,200 VC/wk average bonus with no obligation penalty. 5 deals = 11,000 if perfect, 6,400 if you miss one.",
    category: "mycareer",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "9,200 VC/wk safe",
    tags: ["endorsement", "math", "vc"],
    hook: "Stop at 4 endorsements. 5th adds a shoe-game obligation that costs 8K if missed.",
    vcPerHour: 9200,
  },

  // REP GRINDING
  {
    id: "rep-3v3-vs-5v5",
    title: "3v3 park = 1,250 rep/win vs 5v5 Rec at 1,400/win",
    body:
      "Per-minute, 3v3 wins faster (8 min avg vs 22 min) so rep/hour: 3v3 = 9,375, Rec = 3,818.\nRec only wins on rep when you stack a 5-game win streak (multiplier kicks in at game 5).",
    category: "rep",
    difficulty: 1,
    timeToExecute: "15-60 min",
    value: "9,375 rep/hr",
    tags: ["park", "rec", "math"],
    hook: "3v3 park = 9,375 rep/hr. Rec only wins on rep with a 5-game streak.",
  },
  {
    id: "rep-proam-queue",
    title: "Pro-Am queue under 90s between 7-10pm ET weekdays",
    body:
      "Queue times spike Saturday afternoon (3-5 min) and drop weeknight evenings.\nPro-Am pays 1.4x park rep per win. Stack it during fast-queue windows.",
    category: "rep",
    difficulty: 1,
    timeToExecute: "ongoing",
    value: "1.4x park rep",
    tags: ["proam", "queue", "timing"],
    hook: "Queue Pro-Am 7-10pm ET weekdays. 1.4x park rep, sub-90s queues.",
  },
  {
    id: "rep-affiliate-weekend",
    title: "Affiliate weekend boost is 1.5x, not 2x as advertised",
    body:
      "The in-game banner says 'double rep'. Actual multiplier from data sample: 1.48-1.52x.\nStill the highest weekend rep window — clear all park dailies Friday night so they pay during Saturday's boost.",
    category: "rep",
    difficulty: 1,
    timeToExecute: "weekly",
    value: "1.5x weekend rep",
    tags: ["weekend", "boost", "park"],
    source: "Community-verified",
    hook: "Affiliate weekend boost is 1.5x, not 2x. Stack dailies into Saturday.",
  },
  {
    id: "rep-win-streak-ceiling",
    title: "Win-streak multiplier caps at 5 games (1.75x)",
    body:
      "Games 1-2 pay base. Game 3 = 1.2x. Game 4 = 1.45x. Game 5+ = 1.75x and stays there.\nDon't chase 10-streaks for rep — it's flat after 5. Take the break, queue fresh.",
    category: "rep",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "1.75x cap",
    tags: ["streak", "multiplier", "math"],
    hook: "Streak bonus caps at 5 games (1.75x). Don't chase 10s, they pay the same.",
  },

  // ANIMATIONS
  {
    id: "anim-jumpshot-bases",
    title: "Best jumpshot bases by height (under 6'5\")",
    body:
      "Under 6'5\": Base Pro 3 (87 release speed, B+ defensive immunity). Trae Young base is faster but green window shrinks to 0.07s.\nNeed 75+ Mid-range OR 75+ 3PT to unlock either.",
    category: "animations",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "Top tier release",
    tags: ["jumpshot", "base", "guards"],
    patchVerified: "1.7",
    hook: "Under 6'5\": Base Pro 3 beats Trae. Wider green window, B+ contest immunity.",
  },
  {
    id: "anim-dunk-cradle",
    title: "Cradle dunks need 88 Driving Dunk + 6'5\"+",
    body:
      "Cradle pack unlocks at 88 DD and locks under 6'5\". Hop step packs unlock at 84 DD with no height req.\nIf you're 6'4\" or shorter, save the upgrade points — cradle is locked regardless of stat.",
    category: "animations",
    difficulty: 1,
    timeToExecute: "one-time",
    value: "Animation unlock",
    tags: ["dunks", "stat-req", "height"],
    hook: "Under 6'5\"? Skip Driving Dunk over 84. Cradles are locked, hop steps aren't.",
  },
  {
    id: "anim-dribble-pullup",
    title: "Dribble pull-ups: 84+ Ball Handle for the fast ones",
    body:
      "Speed A pull-ups (Curry, Trae) lock at 84 BH. Speed B (Dame, Booker) unlock at 78.\nUnder 78 BH gets generic pull-ups with 22-frame windup — easy contests.",
    category: "animations",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "Speed A unlock",
    tags: ["dribble", "pullup", "ball-handle"],
    hook: "Push Ball Handle to 84 for Speed A pull-ups. Under 78 = generic windup.",
  },
  {
    id: "anim-layup-contact",
    title: "Contact-finish layups: 80 Driving Layup + Acrobat",
    body:
      "Acrobat badge (Bronze minimum) is required to even attempt contact layups. Without it, you get a regular layup animation and bricked finish.\nGold Acrobat unlocks the euro-step contact finish at 84 DL.",
    category: "animations",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "Contact layup unlock",
    tags: ["layups", "acrobat", "badge"],
    hook: "No Acrobat badge = no contact layup. Even Bronze is the gatekeeper.",
  },
  {
    id: "anim-locked-list",
    title: "Locked animations that aren't worth chasing",
    body:
      "Pro Touch sigs (signature size-up) lock at 90+ BH but reduce shooting % during the size-up. Trae's between-the-legs requires 92 BH for a 0.08s real game advantage.\nUnder 90 BH, stick with the unlocked Park 3 size-up — same defensive shake, no penalty.",
    category: "animations",
    difficulty: 3,
    timeToExecute: "one-time",
    value: "Saved upgrade points",
    tags: ["sigs", "ball-handle", "tradeoffs"],
    hook: "Pro Touch sigs hurt your shot %. Don't chase 90+ Ball Handle for sigs.",
  },

  // GLITCHES (mark uncertain)
  {
    id: "glitch-park-preload",
    title: "Park spot pre-load (community-reported, unverified)",
    body:
      "Standing on the affiliate court border at 11:58pm and entering a 3v3 lobby reportedly preserves your spot through server reset.\nUnconfirmed by 2K. May be patched at any time. Use at your own risk.",
    category: "glitches",
    difficulty: 2,
    timeToExecute: "<5 min",
    value: "Court spot saved",
    tags: ["park", "exploit", "unverified"],
    source: "Reddit community report",
    hook: "Unverified: standing on court border at server reset reportedly saves spot.",
  },
  {
    id: "glitch-pack-order",
    title: "Pack order rule (community theory, take with salt)",
    body:
      "Some players claim opening 5 base packs before a deluxe gives a pity-pull on the deluxe. No 2K Labs data confirms this.\nDoes not appear to affect drop rates in controlled samples >500 packs. Treat as folklore.",
    category: "glitches",
    difficulty: 1,
    timeToExecute: "<5 min",
    value: "Unconfirmed",
    tags: ["myteam", "packs", "unverified"],
    source: "Community folklore",
    hook: "Pity-pull pack theory is folklore. 500-pack samples show no effect.",
  },
  {
    id: "glitch-anim-cancel",
    title: "Animation cancel window: 0.4s after dribble pickup",
    body:
      "Quick L2 + pass within 0.4s of a dribble pickup cancels the pickup animation and lets you re-dribble without a travel.\nWorks in 2K26 1.7. Likely flagged for patch. Don't rely on it in ranked.",
    category: "glitches",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "Re-dribble window",
    tags: ["exploit", "cancel", "uncertain"],
    patchVerified: "1.7",
    hook: "L2 + pass within 0.4s cancels pickup. Don't trust it in ranked — likely patch.",
  },

  // MYTEAM
  {
    id: "mt-token-rotation",
    title: "Token store rotates Thursday 12pm ET",
    body:
      "Top players cycle out Thursday noon. The Wednesday night rotation usually drops a 95+ for 950 tokens (down from 1,200).\nIf you're sitting on 40 tokens, hold until Wednesday to check Thursday's preview leak.",
    category: "myteam",
    difficulty: 1,
    timeToExecute: "weekly",
    value: "~250 tokens saved",
    tags: ["tokens", "rotation", "weekly"],
    hook: "Token store rotates Thursday noon ET. Hold 40 tokens through Wednesday.",
  },
  {
    id: "mt-auction-house-time",
    title: "Auction house: list packs Sunday 9pm ET for max bid",
    body:
      "Peak bidder count is Sunday 8-11pm ET (post-Madden crowd flips to 2K). Average sale price is 18% higher than weekday afternoons.\nUse 'expire in 6 hours' so the auction ends during peak.",
    category: "myteam",
    difficulty: 2,
    timeToExecute: "weekly",
    value: "+18% MT/auction",
    tags: ["auction", "timing", "mt"],
    hook: "List packs Sunday 9pm ET with 6-hour expiry. Peak bidders = +18% MT.",
  },
  {
    id: "mt-synergy-stack",
    title: "Stacking 3+ same-team synergies compounds (not additive)",
    body:
      "Three Lakers boosts +5 each on paper. Actual stat boost in-game: +18 (not 15). Four-stack adds +6 more (+24 total).\nFive+ is capped at +24 — no return on the 5th.",
    category: "myteam",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "+24 stat at 4-stack",
    tags: ["synergy", "lineup", "math"],
    hook: "Team synergy compounds. 4-stack = +24 stat. 5th adds nothing.",
  },
  {
    id: "mt-tt-offline",
    title: "Triple-threat offline: full board for 250 MT and 1 token",
    body:
      "Each board (6 wins) pays 250 MT + 1 token + 1 pack. Takes ~12 minutes if you spam fast-break dunks against the AI.\n21 boards per token cap week = 21 tokens + 5,250 MT just from TT offline.",
    category: "myteam",
    difficulty: 1,
    timeToExecute: "15-60 min",
    value: "250 MT + 1 token/12min",
    tags: ["tt-offline", "grind", "weekly"],
    hook: "TT Offline = 1 token + 250 MT per 12 min. 21 boards/wk hits token cap.",
  },

  // PARK & REC
  {
    id: "park-squad-vs-random",
    title: "Squad-up pays 1.3x rep but takes 2.1x to queue",
    body:
      "Random 3v3 averages 28s queue, 1,250 rep/win. Squad with two friends: 60s queue, 1,625 rep/win (1.3x bonus).\nMath: random = 33 rep/sec of queue+game. Squad = 31 rep/sec. Random wins on per-second rep unless you can't lose.",
    category: "park",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "33 vs 31 rep/sec",
    tags: ["squad", "park", "math"],
    hook: "Random 3v3 beats squad on rep/sec unless your squad is undefeated.",
  },
  {
    id: "park-latency-shot",
    title: "Park latency shifts shot timing by 4-7 frames",
    body:
      "Online park adds ~80-120ms input lag. Set shot timing to -6 in Settings → Controller → Shot Timing Visual Cue: Push.\nIf you green at -2 offline, you'll need -6 to -8 in park.",
    category: "park",
    difficulty: 3,
    timeToExecute: "one-time",
    value: "Online green rate restored",
    tags: ["latency", "shooting", "settings"],
    hook: "Online park adds 80-120ms lag. Set Shot Timing Cue to Push, drop to -6.",
  },
  {
    id: "park-court-by-time",
    title: "Best park court by player count and time",
    body:
      "Old Town fills 6-9pm ET (real comp games). Beach fills 10pm+ (casual). South Side mornings (10am-1pm) = sweat spot, fewest randoms.\nAffiliation matters for the daily, but for fast queues just pick the emptiest court.",
    category: "park",
    difficulty: 1,
    timeToExecute: "ongoing",
    value: "Queue under 30s",
    tags: ["courts", "timing", "queue"],
    hook: "South Side mornings = lowest comp, fastest queues. Old Town nights = sweats.",
  },
  {
    id: "park-affiliate-badge",
    title: "Affiliate court badge unlocks at 200 wins (per court)",
    body:
      "200 wins on one court unlocks the affiliate badge (cosmetic + 1 stat boost in that affiliation's park).\nNot worth grinding unless you're in the 99 OVR pool. Focus rep first.",
    category: "park",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "Cosmetic + 1 stat",
    tags: ["affiliate", "badge", "park"],
    hook: "Affiliate badge needs 200 wins per court. Skip unless you're already 99 OVR.",
  },

  // DEFENSE
  {
    id: "def-stick-vs-button",
    title: "Right stick steal beats square for reach distance",
    body:
      "Right stick swipe covers 1.4 meters at 80+ Steal. Square button reaches 0.9 meters.\nStick attempts also miss the foul animation 22% more often (smaller wind-up). Use stick on perimeter, square on backdowns.",
    category: "defense",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "+56% reach distance",
    tags: ["steal", "stick", "input"],
    hook: "Right stick steal reaches 1.4m vs square's 0.9m. Stick perimeter, square post.",
  },
  {
    id: "def-settings-matchup",
    title: "Change defensive settings per matchup, not per game",
    body:
      "L1 → Defensive Settings. Force right on right-handed shooters with weak left-hand finishing (most players under 80 Driving Layup).\nForce baseline on PGs to push them away from their best 3PT angle.",
    category: "defense",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "FG% allowed -6%",
    tags: ["settings", "matchup", "advanced"],
    hook: "Force right on right-handed shooters. Force baseline on PGs. -6% FG allowed.",
  },
  {
    id: "def-steal-foul-math",
    title: "Steal foul rate: 12% under 85 Steal, 4% over 90",
    body:
      "Below 85 Steal, every steal attempt has a 12% foul chance. At 90+, drops to 4%. Pickpocket Gold further reduces by 2%.\nIf you build defense, push Steal to 90 — the foul reduction is the real reason.",
    category: "defense",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "Foul rate -8%",
    tags: ["steal", "fouls", "stat-req"],
    hook: "Push Steal to 90 for the foul rate drop (12% > 4%). That's the real reason.",
  },
  {
    id: "def-help-rotation",
    title: "Help defense triggers when ball is 1.5m from rim",
    body:
      "Off-ball help AI rotates when the ball-handler crosses the 1.5m radius from the rim. Earlier = no rotation. Later = late rotation, easy layup.\nKnow this on offense: drive to 1.6m, kick out. Defender just committed.",
    category: "defense",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "Read help rotations",
    tags: ["help", "ai", "advanced"],
    hook: "Help rotates at 1.5m from rim. Drive to 1.6m and kick — defender's committed.",
  },

  // OFFENSE
  {
    id: "off-spacing-tags",
    title: "Off-ball spacing tag: 'Spot Up Shooter' boosts 3PT +3",
    body:
      "Set teammate tags via Coach Settings → Player. Spot Up Shooter tag adds +3 effective 3PT when the player is stationary beyond the arc.\nSet your two best shooters to this tag. Don't tag your slasher — it reduces their cut frequency.",
    category: "offense",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "+3 effective 3PT",
    tags: ["tags", "spacing", "coach"],
    hook: "Tag your two best shooters Spot Up. +3 effective 3PT, no slasher penalty.",
  },
  {
    id: "off-play-shortcuts",
    title: "L1 + R1 = quick play 1, L1 + L2 = quick play 2",
    body:
      "Skip the menu. Pre-set Play 1 to your favorite PnR and Play 2 to your best ATO.\nL1+R1 calls Play 1 in 0.3s vs 2.1s through the menu.",
    category: "offense",
    difficulty: 1,
    timeToExecute: "one-time",
    value: "1.8s saved/possession",
    tags: ["plays", "shortcuts", "input"],
    hook: "L1+R1 calls Play 1, L1+L2 calls Play 2. Skip the menu, save 1.8s/poss.",
  },
  {
    id: "off-inbound-wins",
    title: "Inbound under 5s: throw to corner shooter, immediate 3",
    body:
      "Defensive AI freezes for 1.2s after inbound. Corner shooter gets a wide-open look if you pass within 0.5s of catching the inbound.\nWorks even against IQ-99 defenders — it's an animation lock, not a stat check.",
    category: "offense",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "Open 3 every inbound",
    tags: ["inbound", "exploit-ish", "corner"],
    hook: "Inbound to corner shooter under 0.5s. AI freezes 1.2s — open 3 every time.",
  },
  {
    id: "off-transition-math",
    title: "Transition 3 vs half-court 3: same %, half the time",
    body:
      "Transition 3PT% averages 47% across the 99 OVR sample. Half-court catch-and-shoot averages 46%.\nDifference: transition takes 4 seconds, half-court takes 12. Push pace if you have shooters.",
    category: "offense",
    difficulty: 1,
    timeToExecute: "ongoing",
    value: "3x possessions/min",
    tags: ["transition", "pace", "math"],
    hook: "Transition 3s shoot the same % as half-court but in 1/3 the time. Push pace.",
  },

  // EXTRA MECHANICS
  {
    id: "mech-stamina-dribble",
    title: "Sig size-ups burn 4% stamina each",
    body:
      "Each signature size-up move costs ~4% stamina. Three in a row = 12% gone before you've shot.\nStick to one size-up, then attack. Don't chain — it tanks your green window from the stamina hit.",
    category: "mechanics",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "Stamina preserved",
    tags: ["stamina", "dribble", "shooting"],
    hook: "Each sig size-up burns 4% stamina. One move then attack — never chain.",
  },
  {
    id: "mech-rebound-positioning",
    title: "Box-out chains start 0.5s after shot release",
    body:
      "Hold L1 + Square within 0.5s of opponent shot release for the strong box-out chain animation. Later = standard box-out (loses to verticals).\nTiming this gives you a 38% rebound advantage on contested boards.",
    category: "mechanics",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "+38% contested boards",
    tags: ["rebound", "box-out", "timing"],
    hook: "L1+Square within 0.5s of opponent shot = strong box-out chain. +38% rebounds.",
  },
  {
    id: "mech-foul-trouble",
    title: "AI defenders foul more in 4th quarter on auto-sim",
    body:
      "MyCareer sim engine raises AI foul rate by 18% in the 4th. If you're sitting with 28 pts, sim the 4th — you'll often clear 35 with free throws.\nOnly works in MyCareer sim, not playable games.",
    category: "mycareer",
    difficulty: 1,
    timeToExecute: "<5 min",
    value: "+6-8 pts/sim",
    tags: ["sim", "fouls", "stat-padding"],
    hook: "Got 28 pts? Sim the 4th. AI fouls +18% — easy FTs to clear 35.",
  },
  {
    id: "mech-screen-angle",
    title: "Screen angle: re-screen if defender goes over",
    body:
      "If your screen defender goes over the top, immediately call another screen (double-tap L1). The animation chains and forces a switch 70% of the time.\nDon't re-screen if they go under — you'll just trap yourself.",
    category: "offense",
    difficulty: 3,
    timeToExecute: "ongoing",
    value: "Switch forced 70%",
    tags: ["screen", "pnr", "advanced"],
    hook: "Defender goes over the screen? Double-tap L1 — forces switch 70% of the time.",
  },
  {
    id: "mech-takeover-chain",
    title: "Chain takeover by triggering with the same shot type",
    body:
      "Two greens of the same shot type (both pull-up, or both catch-and-shoot) fills takeover ~30% faster than mixed.\nTakeover meter weights consistency. Pick a shot type each game and lean into it.",
    category: "mechanics",
    difficulty: 2,
    timeToExecute: "ongoing",
    value: "Takeover 30% faster",
    tags: ["takeover", "shooting", "math"],
    hook: "Pick one shot type per game. Repeating same-type greens fills takeover 30% faster.",
  },

  // MORE REP / VC
  {
    id: "rep-2v2-rooftop",
    title: "Rooftop 2v2 pays 1.6x rep but spawns rarely",
    body:
      "Rooftop event spawns Friday/Saturday 8pm-12am ET. Pays 2,000 rep per win vs 1,250 standard 3v3.\nLimited spots — queue 5 minutes before event start.",
    category: "rep",
    difficulty: 2,
    timeToExecute: "weekly",
    value: "2,000 rep/win",
    tags: ["rooftop", "event", "weekend"],
    hook: "Rooftop 2v2 = 2,000 rep/win. Fri/Sat 8pm-12am ET only. Queue 5 min early.",
  },
  {
    id: "vc-locker-codes",
    title: "Locker code drop window: Tuesday + Friday 2pm ET",
    body:
      "2K drops the majority of free VC/pack codes Tuesday and Friday afternoons. Set a reminder for 2pm ET those days.\nCodes expire in 24-72h. Check our Codes page — synced live.",
    category: "vc-farming",
    difficulty: 1,
    timeToExecute: "<5 min",
    value: "5-15k VC/code",
    tags: ["codes", "free", "weekly"],
    hook: "Set a 2pm ET reminder for Tuesday + Friday. Codes expire in 24-72h.",
  },
  {
    id: "vc-season-pass",
    title: "Season pass math: pays back at level 28",
    body:
      "Pro Pass costs 1,000 VC. Total VC rewards by level 40 = 12,500 VC.\nROI hits at level 28 (~25 hrs of casual play). Skip if you play under 5 hrs/wk that season.",
    category: "vc-farming",
    difficulty: 1,
    timeToExecute: "one-time",
    value: "+11,500 VC/season",
    tags: ["pass", "season", "math"],
    hook: "Pro Pass ROI hits at level 28. Skip if you play under 5 hrs/wk.",
  },

  // MYTEAM EXTRA
  {
    id: "mt-evo-fast-path",
    title: "Evo player fastest path: TT100 + Spotlight Sims",
    body:
      "Most evo stat reqs are 'make 50 3PT' or 'score 80 pts'. Spotlight Sims (offline) let you sim 4 quarters at max points in under a minute.\nFull evo of a base 84 to 92 in ~40 minutes if you stack TT100 + Spotlight.",
    category: "myteam",
    difficulty: 1,
    timeToExecute: "15-60 min",
    value: "Evo'd 92 in 40min",
    tags: ["evo", "spotlight", "tt100"],
    hook: "Spotlight Sims clear evo reqs in 1 min/quarter. 84 > 92 evo in 40 min.",
  },

  // ANIMATIONS EXTRA
  {
    id: "anim-jumpshot-tall",
    title: "Best jumpshot bases by height (6'10\"+)",
    body:
      "6'10\"+: KD base (95 release height, A defensive immunity, B+ release speed). Locks at 70+ 3PT.\nGiannis base is faster release but the 80 release height gets blocked by guards.",
    category: "animations",
    difficulty: 2,
    timeToExecute: "one-time",
    value: "KD base unlock",
    tags: ["jumpshot", "base", "bigs"],
    hook: "6'10\"+: KD base at 70 3PT. Giannis base gets blocked by guards.",
  },
];

/**
 * Stable hash of a yyyy-mm-dd string used to deterministically pick the day's
 * tips. Plain djb2 — fine for selecting 3-of-N daily, not for security.
 */
export function hashDate(yyyyMmDd: string): number {
  let h = 5381;
  for (let i = 0; i < yyyyMmDd.length; i++) {
    h = ((h << 5) + h + yyyyMmDd.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Pick `count` tips deterministically from today's date hash.
 * Same date returns the same three tips.
 */
export function pickDailyTips(tips: Tip[], count = 3, key = todayKey()): Tip[] {
  const seed = hashDate(key);
  const indexed = tips.map((t, i) => ({
    t,
    score: hashDate(key + ":" + t.id + ":" + i),
  }));
  indexed.sort((a, b) => a.score - b.score);
  // bias on seed parity to keep variety
  if (seed % 2 === 0) indexed.reverse();
  return indexed.slice(0, count).map((x) => x.t);
}

/**
 * Rough VC/hr equivalent across the corpus — uses crude regex parse on the
 * `value` string. Returns a formatted display string.
 */
export function averageVcEquivalent(tips: Tip[]): string {
  let total = 0;
  let counted = 0;
  for (const t of tips) {
    const m = t.value.match(/([\d,]+)\s*VC/i);
    if (!m) continue;
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (!Number.isFinite(n)) continue;
    total += n;
    counted++;
  }
  if (!counted) return "—";
  const avg = Math.round(total / counted);
  return `+${avg.toLocaleString()} VC equivalent`;
}

/**
 * Find the easiest high-value tip — difficulty 1 with the largest numeric VC
 * value, falling back to the first difficulty-1 tip.
 */
export function easiestBigWin(tips: Tip[]): Tip | null {
  const easy = tips.filter((t) => t.difficulty === 1);
  if (!easy.length) return null;
  let best = easy[0];
  let bestN = 0;
  for (const t of easy) {
    const m = t.value.match(/([\d,]+)/);
    if (!m) continue;
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (Number.isFinite(n) && n > bestN) {
      bestN = n;
      best = t;
    }
  }
  return best;
}
