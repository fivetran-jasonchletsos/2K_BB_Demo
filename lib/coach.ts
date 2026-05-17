// Coach — personal scouting report derived from every localStorage key the
// site writes. Pure client-side. All readers are safe under SSR (return empty
// defaults when window is undefined).

export type CoachAction = {
  id: string;
  label: string;
  estMinutes: number;
  href: string;
  category: "shot" | "scenario" | "code" | "build" | "moves" | "pulse" | "tips";
};

export type CoachSnapshot = {
  activity: number;
  greenPct: number | null;
  optimalPct: number | null;
  dailyStreak: number;
};

export type RecentWin = {
  label: string;
  ts: number;
};

export type CoachReport = {
  growing: string[];
  stuck: string[];
  tonightsThree: CoachAction[];
  snapshot: CoachSnapshot;
  recentWins: RecentWin[];
};

// ---------- Storage keys ---------------------------------------------------

export const KEYS = {
  builds: "2klab.builds",
  favoriteTips: "2klab.favoriteTips",
  // The tips page persists learned tips under `2klab.learnedTips`.
  // We also check `2klab.tips.learned` as a fallback for forward compat.
  learnedTipsCanonical: "2klab.learnedTips",
  learnedTipsAlt: "2klab.tips.learned",
  scenarios: "2klab.scenarios",
  scenarioPoints: "2klab.scenarios.points",
  scenarioDaily: "2klab.scenarios.daily",
  scenarioDailyStreak: "2klab.scenarios.dailyStreak",
  scenarioLastCompleted: "2klab.scenarios.lastCompletedDate",
  shotRecords: "2klab.shottrainer.records",
  shotChallenges: "2klab.shottrainer.challenges",
  shotLatency: "2klab.shottrainer.latencyMs",
  watchlist: "2klab.pulse.watchlist",
  badgeTiers: "2klab.badgeTiers",
  combos: "2klab.combos",
  comboReps: "2klab.comboReps",
  activeCombo: "2klab.activeCombo",
  favoriteMoves: "2klab.favoriteMoves",
  redeemedCodes: "2klab.redeemedCodes",
  diagnose: "2klab.diagnose",
  pathTier: "2klab.path.tier",
  goal: "2klab.coach.goal",
  name: "2klab.coach.name",
  todayDone: "2klab.coach.todayDone",
} as const;

// ---------- Small safe readers --------------------------------------------

function safeWindow(): boolean {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!safeWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readString(key: string): string | null {
  if (!safeWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readNumber(key: string, fallback = 0): number {
  if (!safeWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!safeWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private — ignore */
  }
}

function writeString(key: string, value: string): void {
  if (!safeWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

// ---------- Public typed helpers ------------------------------------------

export function getName(): string {
  return (readString(KEYS.name) ?? "").trim();
}

export function setName(name: string): void {
  writeString(KEYS.name, name.trim().slice(0, 24));
}

export function getGoal(): string {
  return (readString(KEYS.goal) ?? "").trim();
}

export function setGoal(goal: string): void {
  writeString(KEYS.goal, goal.trim().slice(0, 80));
}

export const PRESET_GOALS = [
  "Hit 95+ build OVR",
  "Diamond rep in MyPlayer",
  "Cap 75% green release",
] as const;

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DoneToday = { date: string; ids: string[] };

export function getDoneToday(): DoneToday {
  const raw = readJSON<DoneToday | null>(KEYS.todayDone, null);
  const today = todayKey();
  if (!raw || raw.date !== today || !Array.isArray(raw.ids)) {
    return { date: today, ids: [] };
  }
  return raw;
}

export function setDoneToday(ids: string[]): void {
  const next: DoneToday = { date: todayKey(), ids: Array.from(new Set(ids)) };
  writeJSON(KEYS.todayDone, next);
}

export function toggleDoneToday(id: string): string[] {
  const cur = getDoneToday();
  const next = cur.ids.includes(id)
    ? cur.ids.filter((x) => x !== id)
    : [...cur.ids, id];
  setDoneToday(next);
  return next;
}

// ---------- Raw localStorage probes ---------------------------------------

type ShotRecords = {
  bestStreak: number;
  bestSprint30: number;
  totalGreens: number;
  totalShots: number;
};

type ScenarioProgress = {
  played: number;
  optimal: number;
  streak: number;
  bestStreak: number;
  perScenarioStatus: Record<string, string>;
};

type DailyMap = Record<
  string,
  { date: string; correct: number; total: number; timeMs: number }
>;

type Build = {
  id: string;
  name?: string;
  position?: string;
  archetypeId?: string;
  updatedAt?: number;
};

type SavedCombo = {
  id: string;
  name: string;
  moveIds: string[];
  createdAt: number;
};

type Challenge = {
  code: string;
  sentAt: number;
  accepted: boolean;
  theirScore: number;
  yourScore?: number;
  result?: "win" | "lose" | "tie";
  jumperId: string;
  mode: string;
};

const EMPTY_SHOT: ShotRecords = {
  bestStreak: 0,
  bestSprint30: 0,
  totalGreens: 0,
  totalShots: 0,
};

const EMPTY_PROGRESS: ScenarioProgress = {
  played: 0,
  optimal: 0,
  streak: 0,
  bestStreak: 0,
  perScenarioStatus: {},
};

function loadShotRecords(): ShotRecords {
  const r = readJSON<Partial<ShotRecords>>(KEYS.shotRecords, {});
  return {
    bestStreak: Number(r.bestStreak) || 0,
    bestSprint30: Number(r.bestSprint30) || 0,
    totalGreens: Number(r.totalGreens) || 0,
    totalShots: Number(r.totalShots) || 0,
  };
}

function loadScenarioProgress(): ScenarioProgress {
  const p = readJSON<Partial<ScenarioProgress>>(KEYS.scenarios, {});
  return {
    ...EMPTY_PROGRESS,
    ...p,
    perScenarioStatus: p.perScenarioStatus ?? {},
  };
}

function loadDailyMap(): DailyMap {
  return readJSON<DailyMap>(KEYS.scenarioDaily, {});
}

function loadBuilds(): Build[] {
  const v = readJSON<Build[]>(KEYS.builds, []);
  return Array.isArray(v) ? v : [];
}

function loadCombos(): SavedCombo[] {
  const v = readJSON<SavedCombo[]>(KEYS.combos, []);
  return Array.isArray(v) ? v : [];
}

function loadComboReps(): Record<string, number> {
  const v = readJSON<Record<string, number>>(KEYS.comboReps, {});
  return v && typeof v === "object" ? v : {};
}

function loadChallenges(): Challenge[] {
  const v = readJSON<Challenge[]>(KEYS.shotChallenges, []);
  return Array.isArray(v) ? v : [];
}

function loadWatchlist(): string[] {
  const v = readJSON<string[]>(KEYS.watchlist, []);
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

function loadFavoriteTips(): string[] {
  const v = readJSON<string[]>(KEYS.favoriteTips, []);
  return Array.isArray(v) ? v : [];
}

function loadLearnedTips(): string[] {
  const a = readJSON<string[]>(KEYS.learnedTipsCanonical, []);
  if (Array.isArray(a) && a.length > 0) return a;
  const b = readJSON<string[]>(KEYS.learnedTipsAlt, []);
  return Array.isArray(b) ? b : [];
}

function loadRedeemedCodes(): string[] {
  // Codes page persists an array of redeemed code ids.
  const v = readJSON<string[]>(KEYS.redeemedCodes, []);
  return Array.isArray(v) ? v : [];
}

function loadBadgeTiers(): Record<string, string> {
  const v = readJSON<Record<string, string>>(KEYS.badgeTiers, {});
  return v && typeof v === "object" ? v : {};
}

// ---------- Derived report -------------------------------------------------

const WEEK_MS = 7 * 24 * 3600 * 1000;

function withinWeek(ts: number, now: number): boolean {
  return Number.isFinite(ts) && ts > 0 && now - ts <= WEEK_MS;
}

function pickStableThree(actions: CoachAction[], seed: string): CoachAction[] {
  if (actions.length <= 3) return actions.slice(0, 3);
  // Deterministic shuffle: hash seed → index ordering.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const sorted = [...actions].sort((a, b) => {
    const ha = Math.imul(h ^ a.id.charCodeAt(0), 2654435761) >>> 0;
    const hb = Math.imul(h ^ b.id.charCodeAt(0), 2654435761) >>> 0;
    return ha - hb;
  });
  return sorted.slice(0, 3);
}

export type MasteryTierLabel =
  | "ROOKIE"
  | "PRO"
  | "STARTER"
  | "ALL-STAR"
  | "ALL-NBA"
  | "SUPERSTAR"
  | "ELITE"
  | "HALL OF FAME"
  | "LEGEND"
  | "99 CLUB"
  | "GOAT";

// Map of stored path tier id -> display label (2K-native).
const TIER_ID_TO_LABEL: Record<string, MasteryTierLabel> = {
  bronze: "ROOKIE",
  silver: "PRO",
  gold: "STARTER",
  emerald: "ALL-STAR",
  sapphire: "ALL-NBA",
  ruby: "SUPERSTAR",
  amethyst: "ELITE",
  diamond: "HALL OF FAME",
  "pink-diamond": "LEGEND",
  "galaxy-opal": "99 CLUB",
  "dark-matter": "GOAT",
};

export function getMasteryTier(): MasteryTierLabel {
  const stored = (readString(KEYS.pathTier) ?? "").trim();
  if (stored) {
    // Stored as kebab-case TierId from /path.
    if (TIER_ID_TO_LABEL[stored]) return TIER_ID_TO_LABEL[stored];
    // Tolerate already-formatted display labels and legacy values.
    const up = stored.toUpperCase();
    const known: MasteryTierLabel[] = [
      "ROOKIE",
      "PRO",
      "STARTER",
      "ALL-STAR",
      "ALL-NBA",
      "SUPERSTAR",
      "ELITE",
      "HALL OF FAME",
      "LEGEND",
      "99 CLUB",
      "GOAT",
    ];
    if ((known as string[]).includes(up)) return up as MasteryTierLabel;
  }
  // Heuristic: combine shot volume, scenario optimal%, and streak.
  const shot = loadShotRecords();
  const prog = loadScenarioProgress();
  const greens = shot.totalGreens;
  const pctOpt =
    prog.played > 0 ? Math.round((prog.optimal / prog.played) * 100) : 0;
  const streak = readNumber(KEYS.scenarioDailyStreak);
  let score = 0;
  if (greens >= 2000) score += 3;
  else if (greens >= 500) score += 2;
  else if (greens >= 100) score += 1;
  if (pctOpt >= 80) score += 3;
  else if (pctOpt >= 70) score += 2;
  else if (pctOpt >= 50) score += 1;
  if (streak >= 14) score += 3;
  else if (streak >= 7) score += 2;
  else if (streak >= 3) score += 1;
  // 0..9 score -> 11 tiers.
  if (score >= 9) return "GOAT";
  if (score >= 8) return "99 CLUB";
  if (score >= 7) return "LEGEND";
  if (score >= 6) return "HALL OF FAME";
  if (score >= 5) return "ELITE";
  if (score >= 4) return "SUPERSTAR";
  if (score >= 3) return "ALL-NBA";
  if (score >= 2) return "ALL-STAR";
  if (score >= 1) return "STARTER";
  if (greens > 0 || prog.played > 0) return "PRO";
  return "ROOKIE";
}

export function tierRingClass(tier: MasteryTierLabel): string {
  switch (tier) {
    case "GOAT":
    case "99 CLUB":
      return "ring-2 ring-flame/70 text-flame";
    case "LEGEND":
      return "ring-2 ring-flame/60 text-flame";
    case "HALL OF FAME":
      return "ring-2 ring-ice/70 text-ice";
    case "ELITE":
      return "ring-2 ring-ice/60 text-ice";
    case "SUPERSTAR":
      return "ring-2 ring-flame/60 text-flame";
    case "ALL-NBA":
      return "ring-2 ring-ice/60 text-ice";
    case "ALL-STAR":
      return "ring-2 ring-lime/60 text-lime";
    case "STARTER":
      return "ring-2 ring-gold/70 text-gold";
    case "PRO":
      return "ring-2 ring-line text-ink";
    case "ROOKIE":
    default:
      return "ring-2 ring-flame/60 text-flame";
  }
}

export function analyze(now: number = Date.now()): CoachReport {
  const shot = loadShotRecords();
  const prog = loadScenarioProgress();
  const daily = loadDailyMap();
  const builds = loadBuilds();
  const combos = loadCombos();
  const comboReps = loadComboReps();
  const watch = loadWatchlist();
  const favTips = loadFavoriteTips();
  const learnedTips = loadLearnedTips();
  const redeemed = loadRedeemedCodes();
  const challenges = loadChallenges();
  const badgeTiers = loadBadgeTiers();
  const latency = readNumber(KEYS.shotLatency);
  const dailyStreak = readNumber(KEYS.scenarioDailyStreak);

  // Snapshot ----------------------------------------------------------------
  const greenPct =
    shot.totalShots > 0
      ? Math.round((shot.totalGreens / shot.totalShots) * 100)
      : null;
  const optimalPct =
    prog.played > 0 ? Math.round((prog.optimal / prog.played) * 100) : null;

  // Activity = scenarios played + shot attempts + builds saved this week.
  // We can't perfectly window the historical counters, so we use totals.
  const activity =
    prog.played + shot.totalShots + builds.length + combos.length;

  // Recent wins ------------------------------------------------------------
  const wins: RecentWin[] = [];

  // Build saves
  for (const b of builds) {
    if (b.updatedAt && b.updatedAt > 0) {
      const arch = b.archetypeId ? ` ${b.archetypeId}` : "";
      wins.push({
        label: `Saved build${arch ? `:${arch}` : ""}${b.name ? ` · ${b.name}` : ""}`,
        ts: Number(b.updatedAt),
      });
    }
  }
  // Combo saves
  for (const c of combos) {
    if (c.createdAt) {
      wins.push({
        label: `Saved combo · ${c.name}`,
        ts: Number(c.createdAt),
      });
    }
  }
  // Daily drill completions
  for (const k of Object.keys(daily)) {
    const d = daily[k];
    if (!d) continue;
    const t = Date.parse(k);
    if (Number.isFinite(t)) {
      wins.push({
        label: `Daily drill · ${d.correct}/${d.total} optimal`,
        ts: t,
      });
    }
  }
  // Challenges
  for (const ch of challenges) {
    if (ch.sentAt && ch.yourScore !== undefined) {
      const tag =
        ch.result === "win" ? "Won" : ch.result === "lose" ? "Lost" : "Tied";
      wins.push({
        label: `${tag} shot challenge · ${ch.yourScore} greens`,
        ts: Number(ch.sentAt),
      });
    }
  }

  const recentWins = wins
    .filter((w) => Number.isFinite(w.ts) && w.ts > 0)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5);

  // Growing ----------------------------------------------------------------
  const growing: string[] = [];
  if (dailyStreak >= 3) {
    growing.push(`Daily drill streak: ${dailyStreak} days`);
  }
  if (shot.bestStreak >= 10) {
    growing.push(`Best green streak: ${shot.bestStreak}`);
  }
  if (greenPct !== null && greenPct >= 50) {
    growing.push(`Shot greens: ${greenPct}% over ${shot.totalShots} attempts`);
  }
  if (optimalPct !== null && optimalPct >= 60) {
    growing.push(`Scenario optimal: ${optimalPct}% across ${prog.played}`);
  }
  const recentCombos = combos.filter((c) => withinWeek(c.createdAt, now)).length;
  if (recentCombos >= 1) {
    growing.push(`${recentCombos} new combo${recentCombos === 1 ? "" : "s"} saved this week`);
  }
  const totalReps = Object.values(comboReps).reduce((a, b) => a + (b || 0), 0);
  if (totalReps >= 20) {
    growing.push(`Combo reps: ${totalReps} logged`);
  }
  if (watch.length >= 3) {
    growing.push(`Watchlist tracking ${watch.length} players`);
  }
  if (latency !== 0 && Math.abs(latency) <= 30 && shot.totalShots >= 30) {
    growing.push(`Latency dialed: ${latency > 0 ? "+" : ""}${latency}ms offset`);
  }
  if (learnedTips.length >= 5) {
    growing.push(`Mechanics learned: ${learnedTips.length} tips`);
  }

  // Stuck ------------------------------------------------------------------
  const stuck: string[] = [];
  if (greenPct !== null && greenPct < 50) {
    stuck.push(`Shot greens: ${greenPct}% — below 50% target`);
  } else if (greenPct === null) {
    stuck.push(`Shot Lab: 0 attempts logged`);
  }
  if (optimalPct !== null && optimalPct < 50 && prog.played >= 3) {
    stuck.push(`Scenario optimal: ${optimalPct}% — below 50%`);
  }
  // Late-defense gap
  const lateDefIds = Object.keys(prog.perScenarioStatus).filter((k) =>
    /late|defense|def-/i.test(k)
  );
  if (lateDefIds.length === 0 && prog.played >= 1) {
    stuck.push(`No defense scenarios played`);
  }
  if (dailyStreak === 0) {
    stuck.push(`Daily drill streak: 0`);
  }
  if (watch.length === 0) {
    stuck.push(`Watchlist empty`);
  }
  if (redeemed.length === 0) {
    stuck.push(`0 codes redeemed`);
  }
  if (builds.length === 0) {
    stuck.push(`No MyPlayer build saved`);
  }
  if (Object.keys(badgeTiers).length === 0 && learnedTips.length < 3) {
    stuck.push(`Badge tiers untouched`);
  }
  if (favTips.length === 0 && learnedTips.length === 0) {
    stuck.push(`No tips marked learned`);
  }

  // Tonight's three --------------------------------------------------------
  const candidates: CoachAction[] = [];

  if (greenPct === null || greenPct < 60) {
    candidates.push({
      id: "shot-sprint",
      label:
        greenPct === null
          ? "Run a 30s green sprint in Shot Lab"
          : `Run 30s green sprint · current ${greenPct}%`,
      estMinutes: 3,
      href: "/shot-trainer",
      category: "shot",
    });
  }
  if (lateDefIds.length === 0 || (optimalPct ?? 0) < 70) {
    candidates.push({
      id: "scenarios-defense",
      label: "Run 3 defense scenarios",
      estMinutes: 4,
      href: "/scenarios?cat=late-defense",
      category: "scenario",
    });
  }
  if (redeemed.length === 0) {
    candidates.push({
      id: "codes-redeem",
      label: "Redeem the soonest locker code",
      estMinutes: 1,
      href: "/codes",
      category: "code",
    });
  }
  if (builds.length === 0) {
    candidates.push({
      id: "build-save",
      label: "Save your first MyPlayer build",
      estMinutes: 5,
      href: "/builds",
      category: "build",
    });
  }
  if (combos.length < 2) {
    candidates.push({
      id: "combos-save",
      label: "Save a new combo in Moves",
      estMinutes: 4,
      href: "/moves",
      category: "moves",
    });
  }
  if (watch.length < 3) {
    candidates.push({
      id: "pulse-watch",
      label: "Add 3 players to your watchlist",
      estMinutes: 2,
      href: "/pulse",
      category: "pulse",
    });
  }
  if (learnedTips.length < 5) {
    candidates.push({
      id: "tips-learn",
      label: "Mark 2 mechanics learned in Secrets",
      estMinutes: 3,
      href: "/tips",
      category: "tips",
    });
  }
  if (dailyStreak === 0) {
    candidates.push({
      id: "scenarios-daily",
      label: "Finish today's daily drill",
      estMinutes: 4,
      href: "/scenarios",
      category: "scenario",
    });
  }
  // Always include a generic stretch goal so we never fall under 3.
  candidates.push({
    id: "shot-jumper",
    label: "20 corner 3s with your current jumper",
    estMinutes: 3,
    href: "/shot-trainer",
    category: "shot",
  });

  // Weight by goal
  const goal = getGoal().toLowerCase();
  function weight(a: CoachAction): number {
    let w = 0;
    if (/ovr|build|diamond|myplayer/.test(goal) && a.category === "build") w += 3;
    if (/green|shot|cap/.test(goal) && a.category === "shot") w += 3;
    if (/defense|stop|scenario/.test(goal) && a.category === "scenario") w += 3;
    return w;
  }
  const weighted = [...candidates].sort((a, b) => weight(b) - weight(a));
  const tonightsThree = pickStableThree(weighted, todayKey());

  return {
    growing: growing.slice(0, 3),
    // Return up to 10 stuck items so the UI can choose to expand past the
    // default 3. Use slice rather than splice so callers receive a fresh array.
    stuck: stuck.slice(0, 10),
    tonightsThree,
    snapshot: {
      activity,
      greenPct,
      optimalPct,
      dailyStreak,
    },
    recentWins,
  };
}

// ---------- Reset ----------------------------------------------------------

/**
 * Clears every 2klab.* key the coach reads. Best-effort: only touches keys we
 * know about, so unrelated app state stays intact.
 */
export function clearAllProgress(): void {
  if (!safeWindow()) return;
  const all = new Set<string>([
    KEYS.builds,
    KEYS.favoriteTips,
    KEYS.learnedTipsCanonical,
    KEYS.learnedTipsAlt,
    KEYS.scenarios,
    KEYS.scenarioPoints,
    KEYS.scenarioDaily,
    KEYS.scenarioDailyStreak,
    KEYS.scenarioLastCompleted,
    KEYS.shotRecords,
    KEYS.shotChallenges,
    KEYS.shotLatency,
    KEYS.watchlist,
    KEYS.badgeTiers,
    KEYS.combos,
    KEYS.comboReps,
    KEYS.activeCombo,
    KEYS.favoriteMoves,
    KEYS.redeemedCodes,
    KEYS.diagnose,
    KEYS.pathTier,
    KEYS.goal,
    KEYS.name,
    KEYS.todayDone,
  ]);
  for (const k of all) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

// ---------- Formatting helper ---------------------------------------------

export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}
