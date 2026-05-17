// Diagnostic intake + 2-week prescription. See /diagnose page.

export type QuestionId = "weakness" | "position" | "mode" | "hours" | "target";

export type Question = {
  id: QuestionId;
  prompt: string;
  options: string[];
};

export type ResponseMap = Partial<Record<QuestionId, string>>;

export type DrillAResult = {
  attempts: number;
  greens: number;
  avgOffsetMs: number; // signed; negative = early, positive = late, 0 = perfect
};

export type DrillBResult = {
  scenarioId: string;
  pickedLabel: string;
  optimal: boolean;
};

export type DrillResults = {
  drillA: DrillAResult;
  drillB: DrillBResult;
};

export type FocusArea =
  | "shot-timing"
  | "defense"
  | "decision"
  | "build"
  | "grind";

export const FOCUS_LABEL: Record<FocusArea, string> = {
  "shot-timing": "Shooting timing",
  defense: "Defense IQ",
  decision: "Decision-making",
  build: "Build choice",
  grind: "Grinding VC",
};

export type DailyAction = {
  day: number; // 1..14
  text: string;
  href: string;
  minutes: number;
};

export type Prescription = {
  focus: FocusArea;
  week1: DailyAction[]; // 5 entries (day 1..5 actions, distributed within days 1-7)
  week2: DailyAction[]; // 5 entries (day 8..14 actions)
};

export type DiagnosticState = {
  ts: number;
  responses: ResponseMap;
  drillResults: DrillResults;
  focus: FocusArea;
  summary: string;
  prescription: Prescription;
};

export const STORAGE_KEY = "2klab.diagnose";
export const TTL_DAYS = 14;

export const QUESTIONS: Question[] = [
  {
    id: "weakness",
    prompt: "What hurts you most in 2K?",
    options: [
      "Shooting timing",
      "Defense IQ",
      "Decision-making",
      "Build choice",
      "Grinding VC",
    ],
  },
  {
    id: "position",
    prompt: "Your position?",
    options: ["PG", "SG", "SF", "PF", "C"],
  },
  {
    id: "mode",
    prompt: "Mode you play most?",
    options: ["MyCareer", "MyTeam", "Park & Rec", "Online H2H", "Play Now"],
  },
  {
    id: "hours",
    prompt: "Hours per week?",
    options: ["<5", "5-15", "15-30", "30+"],
  },
  {
    id: "target",
    prompt: "Your target?",
    options: [
      "Beat my friends",
      "Diamond rep",
      "Top of MyCareer",
      "MyTeam grind",
      "Just enjoy",
    ],
  },
];

// Map a stated weakness answer to a focus area.
function statedWeaknessToFocus(weakness: string | undefined): FocusArea | null {
  switch (weakness) {
    case "Shooting timing":
      return "shot-timing";
    case "Defense IQ":
      return "defense";
    case "Decision-making":
      return "decision";
    case "Build choice":
      return "build";
    case "Grinding VC":
      return "grind";
    default:
      return null;
  }
}

// Map a target answer to a focus tilt.
function targetToFocus(target: string | undefined): FocusArea | null {
  switch (target) {
    case "Beat my friends":
      return "decision";
    case "Diamond rep":
      return "shot-timing";
    case "Top of MyCareer":
      return "build";
    case "MyTeam grind":
      return "grind";
    case "Just enjoy":
      return null;
    default:
      return null;
  }
}

// Weighted analyzer. Combines stated weakness, drill results, and target.
export function analyze(
  responses: ResponseMap,
  drillA: DrillAResult,
  drillB: DrillBResult,
): { focus: FocusArea; summary: string; prescription: Prescription } {
  const scores: Record<FocusArea, number> = {
    "shot-timing": 0,
    defense: 0,
    decision: 0,
    build: 0,
    grind: 0,
  };

  // Stated weakness — strongest single signal.
  const stated = statedWeaknessToFocus(responses.weakness);
  if (stated) scores[stated] += 3;

  // Target signal.
  const targetTilt = targetToFocus(responses.target);
  if (targetTilt) scores[targetTilt] += 1;

  // Drill A: shot timing diagnostic.
  // Green rate < 40% or avg offset > 80ms → flag shot-timing.
  const greenRate = drillA.attempts > 0 ? drillA.greens / drillA.attempts : 0;
  if (greenRate < 0.4) scores["shot-timing"] += 2;
  if (Math.abs(drillA.avgOffsetMs) > 80) scores["shot-timing"] += 1;

  // Drill B: decision/scenario diagnostic.
  // Suboptimal pick → flag decision-making.
  if (!drillB.optimal) scores.decision += 2;

  // Hours signal: very low hours + Beat my friends/MyCareer = grind/build less relevant.
  // (No-op — leave scoring simple.)

  // Pick max. Tiebreak: stated weakness wins; else shot-timing.
  let focus: FocusArea = stated ?? "shot-timing";
  let best = scores[focus];
  (Object.keys(scores) as FocusArea[]).forEach((k) => {
    if (scores[k] > best) {
      best = scores[k];
      focus = k;
    }
  });

  const greenCount = `${drillA.greens}/${drillA.attempts}`;
  const offsetText = `${Math.round(drillA.avgOffsetMs)}ms`;
  const drillBText = drillB.optimal ? "scenario pick optimal" : "scenario pick suboptimal";
  const statedText = responses.weakness
    ? `stated weakness: ${responses.weakness.toLowerCase()}`
    : "no stated weakness";

  const summary = `Avg offset ${offsetText} · ${greenCount} greens · ${drillBText} · ${statedText}.`;

  const prescription = PRESCRIPTIONS[focus];

  return { focus, summary, prescription };
}

// 14-day plans per focus area. 10 actions each, distributed: 5 in week 1, 5 in week 2.
// Voice: data-first, no hype. Each action: action text, deep link, minutes.
export const PRESCRIPTIONS: Record<FocusArea, Prescription> = {
  "shot-timing": {
    focus: "shot-timing",
    week1: [
      { day: 1, text: "Run 20 catch-and-shoot reps in Shot Lab · target 30% greens", href: "/shot-trainer", minutes: 8 },
      { day: 2, text: "Same drill, target 40% greens · note your release cue", href: "/shot-trainer", minutes: 8 },
      { day: 3, text: "5 corner 3s in Shot Lab + read 'Release timing' tip", href: "/shot-trainer", minutes: 10 },
      { day: 5, text: "Switch jump-shot animation in Build Lab, retest timing", href: "/builds", minutes: 12 },
      { day: 7, text: "Audit shooting badges on your build (Limitless, Deadeye)", href: "/badges", minutes: 6 },
    ],
    week2: [
      { day: 8, text: "Pull-up 3 reps in Shot Lab · target 35% greens off dribble", href: "/shot-trainer", minutes: 10 },
      { day: 10, text: "Off-dribble + catch reps · target 50% combined greens", href: "/shot-trainer", minutes: 12 },
      { day: 11, text: "Watch top shooter on /players, copy their build's jumper", href: "/players", minutes: 5 },
      { day: 13, text: "Claim active VC code to fund shot tuning attempts", href: "/codes", minutes: 2 },
      { day: 14, text: "Final greens audit · log score, compare to day 1", href: "/shot-trainer", minutes: 10 },
    ],
  },
  defense: {
    focus: "defense",
    week1: [
      { day: 1, text: "3 late-defense scenarios · review coaching notes", href: "/scenarios", minutes: 10 },
      { day: 2, text: "3 more late-defense scenarios · target 2/3 optimal", href: "/scenarios", minutes: 10 },
      { day: 4, text: "Read defensive 'Secrets' tips (hidden mechanics)", href: "/tips", minutes: 6 },
      { day: 5, text: "Browse top defenders on /players, note their badges", href: "/players", minutes: 5 },
      { day: 7, text: "Audit your build's defensive badges (Clamps, Glove)", href: "/badges", minutes: 6 },
    ],
    week2: [
      { day: 8, text: "PnR defense scenarios · target reading the coverage", href: "/scenarios", minutes: 12 },
      { day: 10, text: "Foul-up-3 scenarios · master the math", href: "/scenarios", minutes: 10 },
      { day: 11, text: "Rebuild MyPlayer if defense badges < Gold tier", href: "/builds", minutes: 10 },
      { day: 13, text: "Mixed-category scenarios · 3 runs, focus defense reads", href: "/scenarios", minutes: 12 },
      { day: 14, text: "Re-run late-defense set · compare optimal % vs week 1", href: "/scenarios", minutes: 10 },
    ],
  },
  decision: {
    focus: "decision",
    week1: [
      { day: 1, text: "3 PnR scenarios · read coverage type each time", href: "/scenarios", minutes: 10 },
      { day: 2, text: "3 ISO scenarios · focus on mismatch identification", href: "/scenarios", minutes: 10 },
      { day: 4, text: "3 last-shot scenarios · learn EV math from notes", href: "/scenarios", minutes: 10 },
      { day: 5, text: "Read 'Decision-making' tips on Secrets page", href: "/tips", minutes: 5 },
      { day: 7, text: "Re-run any scenario you missed · target 100% optimal", href: "/scenarios", minutes: 10 },
    ],
    week2: [
      { day: 8, text: "Out-of-timeout (OOT) scenarios · 3 runs", href: "/scenarios", minutes: 10 },
      { day: 10, text: "FT-game scenarios · master fouling decisions", href: "/scenarios", minutes: 10 },
      { day: 11, text: "Watch top playmaker on /players, study their stat line", href: "/players", minutes: 5 },
      { day: 13, text: "Mixed daily set · all categories, no skips", href: "/scenarios", minutes: 12 },
      { day: 14, text: "Re-run PnR + ISO sets · compare optimal % vs day 1-2", href: "/scenarios", minutes: 12 },
    ],
  },
  build: {
    focus: "build",
    week1: [
      { day: 1, text: "Browse all archetypes for your position in Build Lab", href: "/builds", minutes: 10 },
      { day: 2, text: "Compare current build vs top archetype · save both", href: "/builds", minutes: 12 },
      { day: 4, text: "Audit your badge tier list — flag every C-tier slot", href: "/badges", minutes: 8 },
      { day: 5, text: "Check top players at your position on /players", href: "/players", minutes: 5 },
      { day: 7, text: "Pick a finalist archetype · note required attributes", href: "/builds", minutes: 8 },
    ],
    week2: [
      { day: 8, text: "Claim VC codes · fund the rebuild", href: "/codes", minutes: 3 },
      { day: 10, text: "Test new build in MyCareer · 1 game, note feel", href: "/builds", minutes: 5 },
      { day: 11, text: "Re-audit badges on new build · upgrade weakest tier", href: "/badges", minutes: 8 },
      { day: 13, text: "Watch a player who matches your archetype on /players", href: "/players", minutes: 5 },
      { day: 14, text: "Final Build Compare · current vs ideal · lock in pick", href: "/builds", minutes: 10 },
    ],
  },
  grind: {
    focus: "grind",
    week1: [
      { day: 1, text: "Claim every active locker code", href: "/codes", minutes: 3 },
      { day: 2, text: "Set codes watchlist · enable notifications for new drops", href: "/codes", minutes: 3 },
      { day: 3, text: "Read VC-farming tips on Secrets page", href: "/tips", minutes: 6 },
      { day: 5, text: "Check /pulse for live NBA → 2K rating risers", href: "/pulse", minutes: 5 },
      { day: 7, text: "Claim all codes added during the week", href: "/codes", minutes: 3 },
    ],
    week2: [
      { day: 8, text: "Daily code check · claim anything new", href: "/codes", minutes: 3 },
      { day: 10, text: "Snag riser players from /pulse before market adjusts", href: "/pulse", minutes: 6 },
      { day: 11, text: "Review Secrets for VC-per-hour optimizations", href: "/tips", minutes: 5 },
      { day: 13, text: "Final daily code claim · log total VC earned this 14d", href: "/codes", minutes: 3 },
      { day: 14, text: "Audit your saved builds in Build Lab · upgrade with new VC", href: "/builds", minutes: 10 },
    ],
  },
};

// Storage helpers — return null on missing/expired/malformed.
export function loadState(): DiagnosticState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiagnosticState;
    if (!parsed || typeof parsed.ts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: DiagnosticState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or disabled — silent fail */
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silent */
  }
}

export function isStateFresh(state: DiagnosticState, now: number = Date.now()): boolean {
  const ageDays = (now - state.ts) / (1000 * 60 * 60 * 24);
  return ageDays < TTL_DAYS;
}
