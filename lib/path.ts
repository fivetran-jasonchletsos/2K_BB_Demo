// Path to Pro — mastery tier progression.
//
// Reads existing per-feature localStorage state to compute the user's
// current tier (Bronze → Dark Matter) and the criteria needed to advance.
//
// All read functions are SSR-safe: they no-op to defaults on the server.

import { SCENARIOS, type ScenarioCategory } from "./scenarios";

// ---------- Storage keys (read-only, except CURRENT_TIER_KEY) ----------

const K = {
  builds: "2klab.builds",
  scenarios: "2klab.scenarios",
  scenariosPoints: "2klab.scenarios.points",
  dailyStreak: "2klab.scenarios.dailyStreak",
  shotRecords: "2klab.shottrainer.records",
  combos: "2klab.combos",
  favoriteMoves: "2klab.favoriteMoves",
  favoriteTips: "2klab.favoriteTips",
  redeemedCodes: "2klab.redeemedCodes",
  badgeTiers: "2klab.badgeTiers",
  watchlist: "2klab.pulse.watchlist",
} as const;

export const CURRENT_TIER_KEY = "2klab.path.tier";

// ---------- Tier IDs ----------

export type TierId =
  | "bronze"
  | "silver"
  | "gold"
  | "emerald"
  | "sapphire"
  | "ruby"
  | "amethyst"
  | "diamond"
  | "pink-diamond"
  | "galaxy-opal"
  | "dark-matter";

export const TIER_ORDER: TierId[] = [
  "bronze",
  "silver",
  "gold",
  "emerald",
  "sapphire",
  "ruby",
  "amethyst",
  "diamond",
  "pink-diamond",
  "galaxy-opal",
  "dark-matter",
];

// ---------- Snapshot ----------

export type MasterySnapshot = {
  // Site engagement
  siteVisited: boolean; // always true when running client-side

  // Builds
  savedBuilds: number;

  // Scenarios
  scenariosPlayed: number;
  scenariosOptimal: number;
  scenariosOptimalPct: number; // 0-100
  scenariosBestStreak: number;
  scenariosDailyStreak: number;
  scenariosCategoriesTouched: number; // 0-7
  scenariosCategoriesTotal: number;

  // Shot trainer
  totalGreens: number;
  shotBestStreak: number;

  // Moves
  savedCombos: number;
  favoriteMovesCount: number;

  // Tips
  favoriteTipsCount: number;

  // Codes
  redeemedCodesCount: number;

  // Badges (personal tier overrides)
  badgeOverridesCount: number;

  // Pulse
  watchlistCount: number;
};

const EMPTY_SNAPSHOT: MasterySnapshot = {
  siteVisited: false,
  savedBuilds: 0,
  scenariosPlayed: 0,
  scenariosOptimal: 0,
  scenariosOptimalPct: 0,
  scenariosBestStreak: 0,
  scenariosDailyStreak: 0,
  scenariosCategoriesTouched: 0,
  scenariosCategoriesTotal: 7,
  totalGreens: 0,
  shotBestStreak: 0,
  savedCombos: 0,
  favoriteMovesCount: 0,
  favoriteTipsCount: 0,
  redeemedCodesCount: 0,
  badgeOverridesCount: 0,
  watchlistCount: 0,
};

// ---------- Storage helpers ----------

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readInt(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function arrayLen(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function objectKeyCount(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  return Object.keys(value as Record<string, unknown>).length;
}

// ---------- Snapshot loader ----------

export function loadSnapshot(): MasterySnapshot {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;

  // Scenarios progress
  const scenariosState = readJson<{
    played?: number;
    optimal?: number;
    bestStreak?: number;
    perScenarioStatus?: Record<string, string>;
  }>(K.scenarios, {});
  const played = Number(scenariosState.played) || 0;
  const optimal = Number(scenariosState.optimal) || 0;
  const pct = played > 0 ? Math.round((optimal / played) * 100) : 0;

  // Categories touched — count distinct scenario categories that have any status entry
  // representing an answered scenario.
  const perStatus = scenariosState.perScenarioStatus ?? {};
  const cats = new Set<ScenarioCategory>();
  for (const s of SCENARIOS) {
    const st = perStatus[s.id];
    if (st === "optimal" || st === "suboptimal" || st === "learned") {
      cats.add(s.category);
    }
  }

  // Shot trainer
  const shot = readJson<{ bestStreak?: number; totalGreens?: number }>(
    K.shotRecords,
    {},
  );

  // Combos
  const combos = readJson<unknown>(K.combos, []);

  // Favorite moves / tips (arrays of ids)
  const favMoves = readJson<unknown>(K.favoriteMoves, []);
  const favTips = readJson<unknown>(K.favoriteTips, []);

  // Redeemed codes (array of code ids)
  const redeemed = readJson<unknown>(K.redeemedCodes, []);

  // Badge tier overrides — object keyed by badge id
  const badgeTiers = readJson<Record<string, unknown>>(K.badgeTiers, {});

  // Watchlist
  const watchlist = readJson<unknown>(K.watchlist, []);

  // Builds
  const builds = readJson<unknown>(K.builds, []);

  return {
    siteVisited: true,
    savedBuilds: arrayLen(builds),
    scenariosPlayed: played,
    scenariosOptimal: optimal,
    scenariosOptimalPct: pct,
    scenariosBestStreak: Number(scenariosState.bestStreak) || 0,
    scenariosDailyStreak: readInt(K.dailyStreak),
    scenariosCategoriesTouched: cats.size,
    scenariosCategoriesTotal: 7,
    totalGreens: Number(shot.totalGreens) || 0,
    shotBestStreak: Number(shot.bestStreak) || 0,
    savedCombos: arrayLen(combos),
    favoriteMovesCount: arrayLen(favMoves),
    favoriteTipsCount: arrayLen(favTips),
    redeemedCodesCount: arrayLen(redeemed),
    badgeOverridesCount: objectKeyCount(badgeTiers),
    watchlistCount: arrayLen(watchlist),
  };
}

// ---------- Criterion / Tier types ----------

export type Criterion = {
  /** Stable id for the criterion (per-tier). */
  key: string;
  /** Human label, e.g. "Play 50 scenarios". */
  label: string;
  /** Numeric threshold to meet. */
  threshold: number;
  /** Unit suffix for display (e.g. "scenarios", "greens", "%"). */
  unit?: string;
  /** Reads the current value off a snapshot. */
  currentValueFn: (s: MasterySnapshot) => number;
};

export type TierDef = {
  id: TierId;
  name: string;
  /** CSS color (hex or token name) for the tier marker border. */
  color: string;
  /** Optional CSS gradient string for tiers with multi-color identity. */
  gradient?: string;
  /** Whether the color value above is a Tailwind token (e.g. "ice","gold"). */
  isToken?: boolean;
  reward: string;
  criteria: Criterion[];
};

// ---------- Criterion helpers ----------

const c = (
  key: string,
  label: string,
  threshold: number,
  currentValueFn: (s: MasterySnapshot) => number,
  unit?: string,
): Criterion => ({ key, label, threshold, currentValueFn, unit });

// ---------- Tier definitions ----------

export const TIERS: TierDef[] = [
  {
    id: "bronze",
    name: "Bronze",
    color: "#B08D57",
    reward: "Welcome to the lab",
    criteria: [
      c("site", "Open the site", 1, (s) => (s.siteVisited ? 1 : 0)),
      c("scenario1", "Complete 1 scenario", 1, (s) => s.scenariosPlayed),
      c("build1", "Save 1 build", 1, (s) => s.savedBuilds),
    ],
  },
  {
    id: "silver",
    name: "Silver",
    color: "#C0C0C0",
    reward: "Custom build slot lock-in",
    criteria: [
      c("scen10", "Play scenarios", 10, (s) => s.scenariosPlayed, "scenarios"),
      c("build1", "Save 1 build", 1, (s) => s.savedBuilds, "builds"),
      c("greens5", "Hit greens in Shot Lab", 5, (s) => s.totalGreens, "greens"),
      c("code1", "Redeem 1 locker code", 1, (s) => s.redeemedCodesCount, "codes"),
    ],
  },
  {
    id: "gold",
    name: "Gold",
    color: "gold",
    isToken: true,
    reward: "Daily drill priority",
    criteria: [
      c("scen30", "Play scenarios", 30, (s) => s.scenariosPlayed, "scenarios"),
      c("pct50", "Optimal rate", 50, (s) => s.scenariosOptimalPct, "%"),
      c("build2", "Save builds", 2, (s) => s.savedBuilds, "builds"),
      c("greens30", "Hit greens", 30, (s) => s.totalGreens, "greens"),
      c("combo1", "Save a combo", 1, (s) => s.savedCombos, "combos"),
      c("tips3", "Favorite tips", 3, (s) => s.favoriteTipsCount, "tips"),
    ],
  },
  {
    id: "emerald",
    name: "Emerald",
    color: "#50C878",
    reward: "Combo encyclopedia access",
    criteria: [
      c("scen60", "Play scenarios", 60, (s) => s.scenariosPlayed, "scenarios"),
      c("pct60", "Optimal rate", 60, (s) => s.scenariosOptimalPct, "%"),
      c("build3", "Save builds", 3, (s) => s.savedBuilds, "builds"),
      c("greens50", "Hit greens", 50, (s) => s.totalGreens, "greens"),
      c("streak5", "Best shot streak", 5, (s) => s.shotBestStreak, "in a row"),
      c("combo2", "Save combos", 2, (s) => s.savedCombos, "combos"),
      c("daily3", "Daily drill streak", 3, (s) => s.scenariosDailyStreak, "days"),
    ],
  },
  {
    id: "sapphire",
    name: "Sapphire",
    color: "ice",
    isToken: true,
    reward: "Pulse watchlist alerts",
    criteria: [
      c("scen100", "Play scenarios", 100, (s) => s.scenariosPlayed, "scenarios"),
      c("pct65", "Optimal rate", 65, (s) => s.scenariosOptimalPct, "%"),
      c("build4", "Save builds", 4, (s) => s.savedBuilds, "builds"),
      c("greens100", "Hit greens", 100, (s) => s.totalGreens, "greens"),
      c("streak8", "Best shot streak", 8, (s) => s.shotBestStreak, "in a row"),
      c("combo3", "Save combos", 3, (s) => s.savedCombos, "combos"),
      c("daily5", "Daily drill streak", 5, (s) => s.scenariosDailyStreak, "days"),
      c("watch3", "Watchlist players", 3, (s) => s.watchlistCount, "players"),
    ],
  },
  {
    id: "ruby",
    name: "Ruby",
    color: "#E0115F",
    reward: "Advanced scenario unlocks",
    criteria: [
      c("scen150", "Play scenarios", 150, (s) => s.scenariosPlayed, "scenarios"),
      c("pct70", "Optimal rate", 70, (s) => s.scenariosOptimalPct, "%"),
      c("build5", "Save builds", 5, (s) => s.savedBuilds, "builds"),
      c("greens200", "Hit greens", 200, (s) => s.totalGreens, "greens"),
      c("streak12", "Best shot streak", 12, (s) => s.shotBestStreak, "in a row"),
      c("combo5", "Save combos", 5, (s) => s.savedCombos, "combos"),
      c("daily7", "Daily drill streak", 7, (s) => s.scenariosDailyStreak, "days"),
      c("watch5", "Watchlist players", 5, (s) => s.watchlistCount, "players"),
      c("tips10", "Favorite tips", 10, (s) => s.favoriteTipsCount, "tips"),
    ],
  },
  {
    id: "amethyst",
    name: "Amethyst",
    color: "#9966CC",
    reward: "Cross-category mastery badge",
    criteria: [
      c("scen200", "Play scenarios", 200, (s) => s.scenariosPlayed, "scenarios"),
      c("pct73", "Optimal rate", 73, (s) => s.scenariosOptimalPct, "%"),
      c("build7", "Save builds", 7, (s) => s.savedBuilds, "builds"),
      c("greens350", "Hit greens", 350, (s) => s.totalGreens, "greens"),
      c("streak15", "Best shot streak", 15, (s) => s.shotBestStreak, "in a row"),
      c("combo7", "Save combos", 7, (s) => s.savedCombos, "combos"),
      c("daily10", "Daily drill streak", 10, (s) => s.scenariosDailyStreak, "days"),
      c(
        "catsAll",
        "Scenario categories touched",
        7,
        (s) => s.scenariosCategoriesTouched,
        "of 7",
      ),
    ],
  },
  {
    id: "diamond",
    name: "Diamond",
    color: "#B9F2FF",
    reward: "Friend challenge code prefix changes",
    criteria: [
      c("scen300", "Play scenarios", 300, (s) => s.scenariosPlayed, "scenarios"),
      c("pct75", "Optimal rate", 75, (s) => s.scenariosOptimalPct, "%"),
      c("build10", "Save builds", 10, (s) => s.savedBuilds, "builds"),
      c("greens500", "Hit greens", 500, (s) => s.totalGreens, "greens"),
      c("streak20", "Best shot streak", 20, (s) => s.shotBestStreak, "in a row"),
      c("combo10", "Save combos", 10, (s) => s.savedCombos, "combos"),
      c("daily14", "Daily drill streak", 14, (s) => s.scenariosDailyStreak, "days"),
      c(
        "badges20",
        "Custom badge tier overrides",
        20,
        (s) => s.badgeOverridesCount,
        "overrides",
      ),
    ],
  },
  {
    id: "pink-diamond",
    name: "Pink Diamond",
    color: "#FFB6C1",
    reward: "Pink Diamond profile flair",
    criteria: [
      c("scen400", "Play scenarios", 400, (s) => s.scenariosPlayed, "scenarios"),
      c("pct78", "Optimal rate", 78, (s) => s.scenariosOptimalPct, "%"),
      c("build12", "Save builds", 12, (s) => s.savedBuilds, "builds"),
      c("greens750", "Hit greens", 750, (s) => s.totalGreens, "greens"),
      c("streak25", "Best shot streak", 25, (s) => s.shotBestStreak, "in a row"),
      c("combo15", "Save combos", 15, (s) => s.savedCombos, "combos"),
      c("daily21", "Daily drill streak", 21, (s) => s.scenariosDailyStreak, "days"),
    ],
  },
  {
    id: "galaxy-opal",
    name: "Galaxy Opal",
    color: "#FF3D00",
    gradient: "linear-gradient(135deg, #FFB6C1 0%, #9966CC 50%, #00E5FF 100%)",
    reward: "Galaxy Opal profile flair",
    criteria: [
      c("scen500", "Play scenarios", 500, (s) => s.scenariosPlayed, "scenarios"),
      c("pct80", "Optimal rate", 80, (s) => s.scenariosOptimalPct, "%"),
      c("build15", "Save builds", 15, (s) => s.savedBuilds, "builds"),
      c("greens1000", "Hit greens", 1000, (s) => s.totalGreens, "greens"),
      c("streak30", "Best shot streak", 30, (s) => s.shotBestStreak, "in a row"),
      c("combo20", "Save combos", 20, (s) => s.savedCombos, "combos"),
      c("daily30", "Daily drill streak", 30, (s) => s.scenariosDailyStreak, "days"),
      c(
        "watch5opal",
        "Watchlist players",
        5,
        (s) => s.watchlistCount,
        "players",
      ),
    ],
  },
  {
    id: "dark-matter",
    name: "Dark Matter",
    color: "#FF3D00",
    gradient:
      "linear-gradient(135deg, #FF3D00 0%, #FFD60A 33%, #00E5FF 66%, #9966CC 100%)",
    reward: "Hall of Fame entry",
    criteria: [
      c("scen1000", "Play scenarios", 1000, (s) => s.scenariosPlayed, "scenarios"),
      c("pct82", "Optimal rate", 82, (s) => s.scenariosOptimalPct, "%"),
      c("build20", "Save builds", 20, (s) => s.savedBuilds, "builds"),
      c("greens2500", "Hit greens", 2500, (s) => s.totalGreens, "greens"),
      c("streak40", "Best shot streak", 40, (s) => s.shotBestStreak, "in a row"),
      c(
        "catsAll",
        "All scenario categories touched",
        7,
        (s) => s.scenariosCategoriesTouched,
        "of 7",
      ),
      c(
        "tips10dm",
        "Favorite tips",
        10,
        (s) => s.favoriteTipsCount,
        "tips",
      ),
      c(
        "badges20dm",
        "Custom badge tier overrides",
        20,
        (s) => s.badgeOverridesCount,
        "overrides",
      ),
    ],
  },
];

// ---------- Tier computation ----------

export function tierIndex(id: TierId): number {
  return TIER_ORDER.indexOf(id);
}

export function getTier(id: TierId): TierDef {
  const t = TIERS.find((t) => t.id === id);
  if (!t) return TIERS[0];
  return t;
}

export function isCriterionMet(crit: Criterion, snap: MasterySnapshot): boolean {
  return crit.currentValueFn(snap) >= crit.threshold;
}

export function tierMetCount(tier: TierDef, snap: MasterySnapshot): {
  met: number;
  total: number;
} {
  let met = 0;
  for (const cr of tier.criteria) {
    if (isCriterionMet(cr, snap)) met++;
  }
  return { met, total: tier.criteria.length };
}

export function tierFullyMet(tier: TierDef, snap: MasterySnapshot): boolean {
  return tier.criteria.every((cr) => isCriterionMet(cr, snap));
}

export type TierResult = {
  current: TierId;
  /** Tier that follows the current one, or null if at the top. */
  next: TierId | null;
  /** Number of next-tier criteria met. */
  met: number;
  /** Total number of next-tier criteria. */
  total: number;
  /** 0-100, % of next-tier criteria met. (If at top tier, % of current tier met.) */
  pctToNext: number;
  /** Unmet criteria for next tier, sorted by closest-to-met first. */
  nextCriteria: Criterion[];
};

export function computeTier(snap: MasterySnapshot): TierResult {
  // Highest fully-met tier (defaults to bronze even if no criteria met — bronze
  // is the entry point and includes "open the site" which is always true client-side).
  let currentIdx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (tierFullyMet(TIERS[i], snap)) currentIdx = i;
    else break;
  }
  const current = TIERS[currentIdx];

  const nextIdx = currentIdx + 1;
  const isTop = nextIdx >= TIERS.length;
  const target = isTop ? current : TIERS[nextIdx];

  const { met, total } = tierMetCount(target, snap);
  const pct = total > 0 ? Math.round((met / total) * 100) : 0;

  // Unmet criteria, ranked by closest-to-threshold (highest ratio first).
  const unmet = target.criteria
    .filter((cr) => !isCriterionMet(cr, snap))
    .map((cr) => {
      const cur = cr.currentValueFn(snap);
      const ratio = cr.threshold > 0 ? cur / cr.threshold : 0;
      return { cr, ratio };
    })
    .sort((a, b) => b.ratio - a.ratio)
    .map((x) => x.cr);

  return {
    current: current.id,
    next: isTop ? null : target.id,
    met,
    total,
    pctToNext: pct,
    nextCriteria: unmet,
  };
}

// ---------- Persist current tier ----------

export function saveCurrentTier(tier: TierId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CURRENT_TIER_KEY, tier);
  } catch {
    /* noop */
  }
}

export function loadCurrentTier(): TierId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CURRENT_TIER_KEY);
    if (!raw) return null;
    if ((TIER_ORDER as string[]).includes(raw)) return raw as TierId;
    return null;
  } catch {
    return null;
  }
}

// ---------- Display helpers ----------

export function formatCriterionValue(cr: Criterion, snap: MasterySnapshot): string {
  const cur = cr.currentValueFn(snap);
  const unit = cr.unit ? ` ${cr.unit}` : "";
  return `${cur}/${cr.threshold}${unit}`;
}

/**
 * Rough estimate of days until next tier given recent activity. Heuristic only.
 * Returns null if not enough signal (e.g. no progress yet, or already at top).
 */
export function estimateDaysToNext(
  result: TierResult,
  snap: MasterySnapshot,
): string | null {
  if (!result.next) return null;
  if (result.total === 0) return null;
  if (result.met === result.total) return null;

  // Very rough: assume the user maintains roughly current daily-drill streak
  // pace. If no daily streak yet, fall back to a generic range tied to how many
  // criteria remain.
  const remaining = result.total - result.met;
  const dailyPace = Math.max(1, snap.scenariosDailyStreak || 1);
  const lo = Math.max(1, Math.round(remaining / Math.max(1, dailyPace / 2)));
  const hi = lo + Math.max(2, remaining);
  return `${lo}-${hi} days at current pace`;
}
