// lib/playerCard.ts
//
// Aggregates user progress from localStorage into a single "player card" view.
// Pure functions, no React. Safe to call client-side only — callers must gate
// on hydration before reading.

export type TierId =
  | "bronze"
  | "silver"
  | "gold"
  | "emerald"
  | "sapphire"
  | "ruby"
  | "amethyst"
  | "diamond"
  | "pink_diamond"
  | "galaxy_opal"
  | "dark_matter";

export type CardData = {
  /** Display handle from 2klab.coach.name, or null if unset. */
  name: string | null;
  /** Current mastery tier id (Bronze fallback). */
  tier: TierId;
  /** Position chip (PG/SG/SF/PF/C) or null. */
  position: string | null;
  /** Overall 0-99, or null when no signal at all. */
  ovr: number | null;
  /** Greens %, 0-100. */
  grn: number;
  /** Scenario optimal %, 0-100. */
  scn: number;
  /** Saved-build count. */
  bld: number;
  /** Daily streak (days). */
  dly: number;
  /** True when the user has produced any signal yet. */
  hasSignal: boolean;
};

const ALLOWED_POSITIONS = new Set(["PG", "SG", "SF", "PF", "C"]);

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(key);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function readInt(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    return safeParse<T>(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function normalizePosition(p: unknown): string | null {
  if (typeof p !== "string") return null;
  const up = p.toUpperCase().trim();
  return ALLOWED_POSITIONS.has(up) ? up : null;
}

/** Bronze fallback. Order matches a typical 2K mastery ladder. */
const TIER_THRESHOLDS: Array<{ id: TierId; min: number }> = [
  { id: "dark_matter", min: 99 },
  { id: "galaxy_opal", min: 95 },
  { id: "pink_diamond", min: 91 },
  { id: "diamond", min: 87 },
  { id: "amethyst", min: 83 },
  { id: "ruby", min: 79 },
  { id: "sapphire", min: 75 },
  { id: "emerald", min: 70 },
  { id: "gold", min: 65 },
  { id: "silver", min: 55 },
  { id: "bronze", min: 0 },
];

/** Map an OVR (0-99) to a tier id. Used as a fallback when no tier is stored. */
export function tierFromOVR(ovr: number): TierId {
  for (const t of TIER_THRESHOLDS) {
    if (ovr >= t.min) return t.id;
  }
  return "bronze";
}

function readStoredTier(): TierId | null {
  const raw = readString("2klab.path.tier");
  if (!raw) return null;
  const id = raw.toLowerCase().trim().replace(/[\s-]+/g, "_") as TierId;
  const valid: TierId[] = [
    "bronze",
    "silver",
    "gold",
    "emerald",
    "sapphire",
    "ruby",
    "amethyst",
    "diamond",
    "pink_diamond",
    "galaxy_opal",
    "dark_matter",
  ];
  return valid.includes(id) ? id : null;
}

type SavedBuildShape = {
  id?: string;
  name?: string;
  position?: string;
  updatedAt?: number;
};

function readBuilds(): SavedBuildShape[] {
  const arr = readJSON<SavedBuildShape[]>("2klab.builds");
  return Array.isArray(arr) ? arr : [];
}

function mostRecentBuildPosition(builds: SavedBuildShape[]): string | null {
  if (builds.length === 0) return null;
  const sorted = [...builds].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );
  return normalizePosition(sorted[0]?.position);
}

type ShotRecords = {
  totalGreens?: number;
  totalShots?: number;
};

type ScenarioProgress = {
  played?: number;
  optimal?: number;
};

/**
 * Weighted OVR formula (each input normalized to 0-99 first):
 *   shot accuracy 30% + scenario optimal % 30% + build slots used 15%
 *   + daily streak 15% + watchlist depth 10%
 *
 * Inputs with zero signal are excluded from the weight base so the OVR
 * reflects what the user actually did. Returns null when there is no
 * signal at all.
 */
export function computeOVR(card: Pick<
  CardData,
  "grn" | "scn" | "bld" | "dly"
> & { watchDepth: number }): number | null {
  // Normalize each component to 0-99
  const shotN = clamp(Math.round(card.grn * 0.99), 0, 99);
  const scnN = clamp(Math.round(card.scn * 0.99), 0, 99);
  // 5+ saved builds caps at 99
  const bldN = clamp(Math.round((card.bld / 5) * 99), 0, 99);
  // 14-day streak caps at 99
  const dlyN = clamp(Math.round((card.dly / 14) * 99), 0, 99);
  // 10 followed players caps at 99
  const watN = clamp(Math.round((card.watchDepth / 10) * 99), 0, 99);

  const parts: Array<{ v: number; w: number; has: boolean }> = [
    { v: shotN, w: 0.3, has: card.grn > 0 },
    { v: scnN, w: 0.3, has: card.scn > 0 },
    { v: bldN, w: 0.15, has: card.bld > 0 },
    { v: dlyN, w: 0.15, has: card.dly > 0 },
    { v: watN, w: 0.1, has: card.watchDepth > 0 },
  ];

  const active = parts.filter((p) => p.has);
  if (active.length === 0) return null;

  const totalW = active.reduce((s, p) => s + p.w, 0);
  const score = active.reduce((s, p) => s + p.v * p.w, 0) / totalW;
  return clamp(Math.round(score), 0, 99);
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/** Reads every relevant key from localStorage and returns aggregated card data. */
export function loadCardData(): CardData {
  // Identity
  const name = readString("2klab.coach.name");
  const positionFromCoach = normalizePosition(readString("2klab.coach.position"));

  // Builds
  const builds = readBuilds();
  const bld = builds.length;
  const position = positionFromCoach ?? mostRecentBuildPosition(builds);

  // Shot trainer
  const shot = readJSON<ShotRecords>("2klab.shottrainer.records");
  const totalShots = Number(shot?.totalShots) || 0;
  const totalGreens = Number(shot?.totalGreens) || 0;
  const grn = totalShots > 0 ? Math.round((totalGreens / totalShots) * 100) : 0;

  // Scenarios
  const sc = readJSON<ScenarioProgress>("2klab.scenarios");
  const played = Number(sc?.played) || 0;
  const optimal = Number(sc?.optimal) || 0;
  const scn = played > 0 ? Math.round((optimal / played) * 100) : 0;

  // Daily streak (scenarios)
  const dly = readInt("2klab.scenarios.dailyStreak");

  // Watchlist depth (for OVR only, not displayed)
  const watch = readJSON<string[]>("2klab.pulse.watchlist");
  const watchDepth = Array.isArray(watch) ? watch.length : 0;

  const ovr = computeOVR({ grn, scn, bld, dly, watchDepth });
  const hasSignal = ovr !== null || !!name || !!position;

  // Tier: stored value wins; otherwise derive from OVR; otherwise bronze.
  const stored = readStoredTier();
  const tier: TierId = stored ?? (ovr !== null ? tierFromOVR(ovr) : "bronze");

  return {
    name,
    tier,
    position,
    ovr,
    grn,
    scn,
    bld,
    dly,
    hasSignal,
  };
}

export const TIER_LABEL: Record<TierId, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  emerald: "Emerald",
  sapphire: "Sapphire",
  ruby: "Ruby",
  amethyst: "Amethyst",
  diamond: "Diamond",
  pink_diamond: "Pink Diamond",
  galaxy_opal: "Galaxy Opal",
  dark_matter: "Dark Matter",
};

/**
 * Border color for the card. Solid tiers return a single hex string.
 * Gradient tiers return the special tokens "galaxy_opal" / "dark_matter"
 * so the component can render a conic/linear gradient border.
 */
export const TIER_BORDER: Record<TierId, string> = {
  bronze: "#B08D57",
  silver: "#C0C0C0",
  gold: "#FFD60A", // matches the `gold` theme token
  emerald: "#50C878",
  sapphire: "#00E5FF", // ice token
  ruby: "#E0115F",
  amethyst: "#9966CC",
  diamond: "#B9F2FF",
  pink_diamond: "#FFB6C1",
  galaxy_opal: "gradient",
  dark_matter: "gradient",
};
