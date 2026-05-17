export type JumperPreset = {
  id: string;
  name: string;
  owner?: string;
  releaseSpeedMultiplier: number; // 0.6 (slow) - 1.4 (fast). Lower = longer animation = slower release.
  greenWindowPct: number; // 4 - 16. Green zone width as percent of meter.
  holdMode: boolean; // true = hold-and-release; false = single tap when meter aligns.
  notes: string;
};

export const JUMPER_PRESETS: JumperPreset[] = [
  {
    id: "custom",
    name: "Custom",
    releaseSpeedMultiplier: 1.0,
    greenWindowPct: 10,
    holdMode: true,
    notes: "Tune speed and window manually.",
  },
  {
    id: "base11",
    name: "Base 11",
    owner: "Default",
    releaseSpeedMultiplier: 1.0,
    greenWindowPct: 10,
    holdMode: true,
    notes: "Balanced baseline. Good for learning the meter.",
  },
  {
    id: "curry",
    name: "Curry Slide",
    owner: "Stephen Curry",
    releaseSpeedMultiplier: 1.3,
    greenWindowPct: 8,
    holdMode: true,
    notes: "Very fast. Narrow window. Don't anticipate.",
  },
  {
    id: "klay",
    name: "Klay",
    owner: "Klay Thompson",
    releaseSpeedMultiplier: 1.2,
    greenWindowPct: 11,
    holdMode: true,
    notes: "Quick with a forgiving window.",
  },
  {
    id: "booker",
    name: "Booker",
    owner: "Devin Booker",
    releaseSpeedMultiplier: 1.1,
    greenWindowPct: 12,
    holdMode: true,
    notes: "Smooth, wide green. Mid-range cheat code.",
  },
  {
    id: "lillard",
    name: "Dame Time",
    owner: "Damian Lillard",
    releaseSpeedMultiplier: 1.05,
    greenWindowPct: 13,
    holdMode: true,
    notes: "Deep range comfort. Slightly later release.",
  },
  {
    id: "kd",
    name: "Slim Reaper",
    owner: "Kevin Durant",
    releaseSpeedMultiplier: 0.95,
    greenWindowPct: 11,
    holdMode: true,
    notes: "Tall release, slower wind-up.",
  },
  {
    id: "tatum",
    name: "JT",
    owner: "Jayson Tatum",
    releaseSpeedMultiplier: 1.0,
    greenWindowPct: 10,
    holdMode: true,
    notes: "Neutral tempo. Trust the dot.",
  },
  {
    id: "trae",
    name: "Ice Trae",
    owner: "Trae Young",
    releaseSpeedMultiplier: 1.25,
    greenWindowPct: 7,
    holdMode: false,
    notes: "Tap mode. Tight green. Punishes hesitation.",
  },
  {
    id: "maxey",
    name: "Maxey",
    owner: "Tyrese Maxey",
    releaseSpeedMultiplier: 1.2,
    greenWindowPct: 9,
    holdMode: true,
    notes: "Fast release on a small green.",
  },
  {
    id: "bird",
    name: "Larry Legend",
    owner: "Larry Bird",
    releaseSpeedMultiplier: 0.85,
    greenWindowPct: 14,
    holdMode: true,
    notes: "Slow set shot. Wide window. Patience wins.",
  },
  {
    id: "rayallen",
    name: "Jesus Shuttlesworth",
    owner: "Ray Allen",
    releaseSpeedMultiplier: 1.1,
    greenWindowPct: 12,
    holdMode: true,
    notes: "Classic textbook timing.",
  },
  {
    id: "reggie",
    name: "Reggie",
    owner: "Reggie Miller",
    releaseSpeedMultiplier: 1.0,
    greenWindowPct: 11,
    holdMode: false,
    notes: "Tap on the apex. Old-school cadence.",
  },
  {
    id: "kyrie",
    name: "Uncle Drew",
    owner: "Kyrie Irving",
    releaseSpeedMultiplier: 1.15,
    greenWindowPct: 10,
    holdMode: true,
    notes: "Quick flick, average green.",
  },
  {
    id: "halfslide",
    name: "Half Slide",
    owner: "Generic A+",
    releaseSpeedMultiplier: 1.1,
    greenWindowPct: 9,
    holdMode: true,
    notes: "Common meta build jumper.",
  },
];

export type ShotKind = "green" | "white" | "red";

export type ShotResult = {
  kind: ShotKind;
  offsetMs: number; // signed: negative = early, positive = late
  atTimestamp: number;
  mode: string;
};

export type Records = {
  bestStreak: number;
  bestSprint30: number;
  totalGreens: number;
  totalShots: number;
};

export const EMPTY_RECORDS: Records = {
  bestStreak: 0,
  bestSprint30: 0,
  totalGreens: 0,
  totalShots: 0,
};

const RECORDS_KEY = "2klab.shottrainer.records";
const LATENCY_KEY = "2klab.shottrainer.latencyMs";

export function loadRecords(): Records {
  if (typeof window === "undefined") return EMPTY_RECORDS;
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return EMPTY_RECORDS;
    const parsed = JSON.parse(raw) as Partial<Records>;
    return {
      bestStreak: Number(parsed.bestStreak) || 0,
      bestSprint30: Number(parsed.bestSprint30) || 0,
      totalGreens: Number(parsed.totalGreens) || 0,
      totalShots: Number(parsed.totalShots) || 0,
    };
  } catch {
    return EMPTY_RECORDS;
  }
}

export function saveRecords(r: Records): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(r));
  } catch {
    /* noop */
  }
}

export function loadLatency(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(LATENCY_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(-200, Math.min(200, n));
  } catch {
    return 0;
  }
}

export function saveLatency(ms: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LATENCY_KEY, String(Math.round(ms)));
  } catch {
    /* noop */
  }
}

/**
 * Baseline meter fill duration at 1.0x speed. With releaseSpeedMultiplier,
 * actual duration = BASE_FILL_MS / multiplier. So 1.3x = ~615ms, 0.85x = ~941ms.
 */
export const BASE_FILL_MS = 800;

/** Returns the fill duration in ms for a given speed multiplier. */
export function fillDurationMs(speedMultiplier: number): number {
  return BASE_FILL_MS / Math.max(0.1, speedMultiplier);
}

/**
 * Determine result from how far (ms) the release was from perfect center.
 * green if |offset| <= halfGreenMs.
 * white if |offset| <= halfGreenMs * 2.5 (forgiving made-shot zone).
 * red otherwise.
 */
export function classifyShot(
  offsetMs: number,
  greenWindowPct: number,
  totalDurationMs: number
): ShotKind {
  const halfGreenMs = (greenWindowPct / 100) * totalDurationMs * 0.5;
  const absOff = Math.abs(offsetMs);
  if (absOff <= halfGreenMs) return "green";
  if (absOff <= halfGreenMs * 2.5) return "white";
  return "red";
}

// ---------- Challenge codes ----------

export type ChallengeMode = "S30";

export type Challenge = {
  mode: ChallengeMode;
  score: number; // greens count
  streak: number; // best streak
  jumperId: string;
  timestamp: number; // ms since epoch
};

export type ChallengeResult = "win" | "lose" | "tie";

export type ChallengeRecord = {
  code: string;
  sentAt: number;
  /** true if this record represents an accepted challenge (received from someone). */
  accepted: boolean;
  theirScore: number;
  /** undefined until the user actually finishes a run for this challenge. */
  yourScore?: number;
  result?: ChallengeResult;
  jumperId: string;
  mode: ChallengeMode;
};

const CHALLENGES_KEY = "2klab.shottrainer.challenges";
const CHALLENGES_MAX = 50;

/**
 * Encode a challenge into a compact, URL-safe string.
 * Shape: `<MODE>-<SCORE>-<STREAK>-<JUMPER>-<TS36>`
 * Example: `S30-12-5-CURRY-1MZ4PQ`
 */
export function encodeChallenge(c: Challenge): string {
  const jumper = String(c.jumperId || "X")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8) || "X";
  const score = Math.max(0, Math.min(9999, Math.floor(c.score)));
  const streak = Math.max(0, Math.min(9999, Math.floor(c.streak)));
  // Compress timestamp: seconds since 2026-01-01, base36. Stays short for ~years.
  const epoch = Date.UTC(2026, 0, 1);
  const secs = Math.max(0, Math.floor((c.timestamp - epoch) / 1000));
  const ts36 = secs.toString(36).toUpperCase();
  return `${c.mode}-${score}-${streak}-${jumper}-${ts36}`;
}

export function decodeChallenge(s: string): Challenge | null {
  if (!s || typeof s !== "string") return null;
  const trimmed = s.trim().toUpperCase();
  // Strict shape: 5 dash-separated parts, each non-empty.
  const parts = trimmed.split("-");
  if (parts.length !== 5) return null;
  const [modeRaw, scoreRaw, streakRaw, jumperRaw, tsRaw] = parts;
  if (modeRaw !== "S30") return null;
  if (!/^\d+$/.test(scoreRaw) || !/^\d+$/.test(streakRaw)) return null;
  if (!/^[A-Z0-9]+$/.test(jumperRaw)) return null;
  if (!/^[A-Z0-9]+$/.test(tsRaw)) return null;
  const score = parseInt(scoreRaw, 10);
  const streak = parseInt(streakRaw, 10);
  const secs = parseInt(tsRaw, 36);
  if (!Number.isFinite(score) || !Number.isFinite(streak) || !Number.isFinite(secs)) {
    return null;
  }
  const epoch = Date.UTC(2026, 0, 1);
  const timestamp = epoch + secs * 1000;
  return {
    mode: "S30",
    score,
    streak,
    jumperId: jumperRaw.toLowerCase(),
    timestamp,
  };
}

/** Look up the canonical jumper id (lowercase) given a code's jumper segment. */
export function resolveJumperId(rawId: string): string | null {
  const id = rawId.toLowerCase();
  const match = JUMPER_PRESETS.find((p) => p.id === id);
  return match ? match.id : null;
}

export function loadChallenges(): ChallengeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHALLENGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: ChallengeRecord[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const code = typeof item.code === "string" ? item.code : "";
      if (!code) continue;
      const rec: ChallengeRecord = {
        code,
        sentAt: Number(item.sentAt) || 0,
        accepted: Boolean(item.accepted),
        theirScore: Number(item.theirScore) || 0,
        yourScore:
          item.yourScore === undefined || item.yourScore === null
            ? undefined
            : Number(item.yourScore) || 0,
        result:
          item.result === "win" || item.result === "lose" || item.result === "tie"
            ? item.result
            : undefined,
        jumperId: typeof item.jumperId === "string" ? item.jumperId : "base11",
        mode: item.mode === "S30" ? "S30" : "S30",
      };
      out.push(rec);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveChallenge(c: ChallengeRecord): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadChallenges();
    // Replace any existing record with same code+accepted (keeps history tidy
    // when a user finishes an accepted challenge and we update yourScore).
    const filtered = existing.filter(
      (r) => !(r.code === c.code && r.accepted === c.accepted)
    );
    const next = [c, ...filtered].slice(0, CHALLENGES_MAX);
    localStorage.setItem(CHALLENGES_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}
