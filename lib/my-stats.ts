// My Stats — local game log for MyCareer (and other modes). Pure client-side.
// All readers are SSR-safe (return empty defaults when window is undefined).

export const GAME_MODES = [
  "MyCareer",
  "MyTeam",
  "Park",
  "Online H2H",
  "Play Now",
] as const;

export type GameMode = (typeof GAME_MODES)[number];
export type Outcome = "W" | "L";

export type GameLog = {
  id: string;
  ts: number; // created/updated timestamp
  date: string; // YYYY-MM-DD
  mode: GameMode;
  opponent?: string;
  outcome: Outcome;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  plusMinus: number;
  min: number;
  notes?: string;
};

export type GameInput = Omit<GameLog, "id" | "ts">;

export type Snapshot = {
  totalGames: number;
  avgPtsLastN: number | null;
  wlLastN: { w: number; l: number } | null;
  plusMinusAvgLastN: number | null;
  n: number;
};

export type PR = {
  key: string;
  label: string;
  value: string;
  gameId?: string;
};

export type TargetStat =
  | "pts"
  | "reb"
  | "ast"
  | "stl"
  | "blk"
  | "plusMinus"
  | "fgPct"
  | "threePct"
  | "ftPct";

export type StatTarget = {
  stat: TargetStat;
  threshold: number;
  lookback: number; // number of games to average over
};

// ---------- Storage keys ---------------------------------------------------

export const KEYS = {
  games: "2klab.myStats.games",
  target: "2klab.myStats.target",
  coachGoal: "2klab.coach.goal",
} as const;

// ---------- Safe localStorage ---------------------------------------------

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

function writeJSON<T>(key: string, value: T): void {
  if (!safeWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // swallow — quota or disabled storage
  }
}

// ---------- Helpers --------------------------------------------------------

function makeId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function avg(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function fgPct(g: Pick<GameLog, "fgm" | "fga">): number | null {
  if (g.fga <= 0) return null;
  return (g.fgm / g.fga) * 100;
}

export function threePct(g: Pick<GameLog, "threePm" | "threePa">): number | null {
  if (g.threePa <= 0) return null;
  return (g.threePm / g.threePa) * 100;
}

export function ftPct(g: Pick<GameLog, "ftm" | "fta">): number | null {
  if (g.fta <= 0) return null;
  return (g.ftm / g.fta) * 100;
}

// ---------- CRUD -----------------------------------------------------------

function normalizeGame(raw: Partial<GameLog>): GameLog {
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : makeId(),
    ts: num(raw.ts) || Date.now(),
    date: typeof raw.date === "string" && raw.date ? raw.date : todayISO(),
    mode: (GAME_MODES as readonly string[]).includes(raw.mode as string)
      ? (raw.mode as GameMode)
      : "MyCareer",
    opponent: typeof raw.opponent === "string" && raw.opponent.trim()
      ? raw.opponent.trim()
      : undefined,
    outcome: raw.outcome === "L" ? "L" : "W",
    pts: num(raw.pts),
    reb: num(raw.reb),
    ast: num(raw.ast),
    stl: num(raw.stl),
    blk: num(raw.blk),
    to: num(raw.to),
    fgm: num(raw.fgm),
    fga: num(raw.fga),
    threePm: num(raw.threePm),
    threePa: num(raw.threePa),
    ftm: num(raw.ftm),
    fta: num(raw.fta),
    plusMinus: num(raw.plusMinus),
    min: num(raw.min),
    notes: typeof raw.notes === "string" && raw.notes.trim()
      ? raw.notes.trim()
      : undefined,
  };
}

export function loadGames(): GameLog[] {
  const raw = readJSON<unknown>(KEYS.games, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Partial<GameLog> => !!r && typeof r === "object")
    .map(normalizeGame)
    .sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
}

export function saveGames(games: GameLog[]): void {
  writeJSON(KEYS.games, games);
}

export function addGame(input: GameInput): GameLog {
  const game = normalizeGame({ ...input, id: makeId(), ts: Date.now() });
  const games = [game, ...loadGames()];
  saveGames(games);
  return game;
}

export function updateGame(id: string, patch: Partial<GameInput>): GameLog | null {
  const games = loadGames();
  const idx = games.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  const next = normalizeGame({ ...games[idx], ...patch, id, ts: Date.now() });
  games[idx] = next;
  saveGames(games);
  return next;
}

export function deleteGame(id: string): void {
  const games = loadGames().filter((g) => g.id !== id);
  saveGames(games);
}

// ---------- Snapshot -------------------------------------------------------

export function snapshot(games: GameLog[], n = 10): Snapshot {
  const sorted = [...games].sort(
    (a, b) => b.date.localeCompare(a.date) || b.ts - a.ts,
  );
  const lastN = sorted.slice(0, n);
  if (lastN.length === 0) {
    return {
      totalGames: games.length,
      avgPtsLastN: null,
      wlLastN: null,
      plusMinusAvgLastN: null,
      n,
    };
  }
  const w = lastN.filter((g) => g.outcome === "W").length;
  const l = lastN.length - w;
  return {
    totalGames: games.length,
    avgPtsLastN: round1(avg(lastN.map((g) => g.pts)) ?? 0),
    wlLastN: { w, l },
    plusMinusAvgLastN: round1(avg(lastN.map((g) => g.plusMinus)) ?? 0),
    n,
  };
}

// ---------- Personal Records ----------------------------------------------

function fmtFg(g: GameLog): string {
  const pct = fgPct(g);
  return pct === null ? "—" : `${pct.toFixed(1)}% (${g.fgm}/${g.fga})`;
}

export function personalRecords(games: GameLog[]): PR[] {
  if (games.length === 0) {
    return [
      { key: "pts", label: "PTS high", value: "—" },
      { key: "reb", label: "REB high", value: "—" },
      { key: "ast", label: "AST high", value: "—" },
      { key: "plusMinus", label: "+/− high", value: "—" },
      { key: "threePm", label: "3PM high", value: "—" },
      { key: "wStreak", label: "Best W streak", value: "0" },
      { key: "fgPct", label: "Best FG% (≥8 FGA)", value: "—" },
    ];
  }

  const maxBy = <K extends keyof GameLog>(k: K): GameLog =>
    games.reduce((best, g) =>
      (g[k] as number) > (best[k] as number) ? g : best,
    );

  const ptsBest = maxBy("pts");
  const rebBest = maxBy("reb");
  const astBest = maxBy("ast");
  const pmBest = maxBy("plusMinus");
  const tpmBest = maxBy("threePm");

  // Best W streak — order chronologically.
  const chrono = [...games].sort(
    (a, b) => a.date.localeCompare(b.date) || a.ts - b.ts,
  );
  let best = 0;
  let cur = 0;
  for (const g of chrono) {
    if (g.outcome === "W") {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }

  // Best FG% game with min 8 FGA
  const eligible = games.filter((g) => g.fga >= 8);
  const fgBest = eligible.length
    ? eligible.reduce((b, g) => {
        const a = fgPct(b) ?? -1;
        const c = fgPct(g) ?? -1;
        return c > a ? g : b;
      })
    : null;

  return [
    { key: "pts", label: "PTS high", value: String(ptsBest.pts), gameId: ptsBest.id },
    { key: "reb", label: "REB high", value: String(rebBest.reb), gameId: rebBest.id },
    { key: "ast", label: "AST high", value: String(astBest.ast), gameId: astBest.id },
    {
      key: "plusMinus",
      label: "+/− high",
      value: (pmBest.plusMinus >= 0 ? "+" : "") + pmBest.plusMinus,
      gameId: pmBest.id,
    },
    {
      key: "threePm",
      label: "3PM high",
      value: String(tpmBest.threePm),
      gameId: tpmBest.id,
    },
    { key: "wStreak", label: "Best W streak", value: String(best) },
    {
      key: "fgPct",
      label: "Best FG% (≥8 FGA)",
      value: fgBest ? fmtFg(fgBest) : "—",
      gameId: fgBest?.id,
    },
  ];
}

// Returns which PR keys were broken by the new game (vs. games-before-new).
export function detectNewPRs(
  before: GameLog[],
  afterAddingNew: GameLog,
): string[] {
  const newPRs: string[] = [];
  const numericKeys: Array<keyof GameLog & string> = [
    "pts",
    "reb",
    "ast",
    "plusMinus",
    "threePm",
  ];
  for (const k of numericKeys) {
    const prevMax = before.length
      ? Math.max(...before.map((g) => g[k] as number))
      : -Infinity;
    if ((afterAddingNew[k] as number) > prevMax) newPRs.push(k);
  }
  if (afterAddingNew.fga >= 8) {
    const prevBest =
      before.filter((g) => g.fga >= 8).map((g) => fgPct(g) ?? -1);
    const prevMax = prevBest.length ? Math.max(...prevBest) : -Infinity;
    const cur = fgPct(afterAddingNew) ?? -1;
    if (cur > prevMax) newPRs.push("fgPct");
  }
  return newPRs;
}

// ---------- Target progress -----------------------------------------------

function valueForStat(g: GameLog, stat: TargetStat): number | null {
  switch (stat) {
    case "pts":
      return g.pts;
    case "reb":
      return g.reb;
    case "ast":
      return g.ast;
    case "stl":
      return g.stl;
    case "blk":
      return g.blk;
    case "plusMinus":
      return g.plusMinus;
    case "fgPct":
      return fgPct(g);
    case "threePct":
      return threePct(g);
    case "ftPct":
      return ftPct(g);
  }
}

export function targetAvg(
  games: GameLog[],
  target: StatTarget,
): number | null {
  const sorted = [...games].sort(
    (a, b) => b.date.localeCompare(a.date) || b.ts - a.ts,
  );
  const slice = sorted.slice(0, Math.max(1, target.lookback));
  const vals: number[] = [];
  for (const g of slice) {
    const v = valueForStat(g, target.stat);
    if (v !== null) vals.push(v);
  }
  return avg(vals);
}

export function targetProgress(
  games: GameLog[],
  target: StatTarget,
): number {
  const cur = targetAvg(games, target);
  if (cur === null || target.threshold <= 0) return 0;
  const pct = (cur / target.threshold) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function loadTarget(): StatTarget | null {
  const raw = readJSON<unknown>(KEYS.target, null);
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<StatTarget>;
  const validStats: TargetStat[] = [
    "pts",
    "reb",
    "ast",
    "stl",
    "blk",
    "plusMinus",
    "fgPct",
    "threePct",
    "ftPct",
  ];
  if (!obj.stat || !validStats.includes(obj.stat as TargetStat)) return null;
  const threshold = Number(obj.threshold);
  const lookback = Number(obj.lookback);
  if (!Number.isFinite(threshold) || !Number.isFinite(lookback)) return null;
  return {
    stat: obj.stat as TargetStat,
    threshold,
    lookback: Math.max(1, Math.floor(lookback)),
  };
}

export function saveTarget(target: StatTarget | null): void {
  if (!safeWindow()) return;
  if (target === null) {
    try {
      window.localStorage.removeItem(KEYS.target);
    } catch {
      // swallow
    }
    return;
  }
  writeJSON(KEYS.target, target);
}

export function loadCoachGoal(): string {
  if (!safeWindow()) return "";
  try {
    return window.localStorage.getItem(KEYS.coachGoal) ?? "";
  } catch {
    return "";
  }
}

export const TARGET_STAT_LABELS: Record<TargetStat, string> = {
  pts: "PTS",
  reb: "REB",
  ast: "AST",
  stl: "STL",
  blk: "BLK",
  plusMinus: "+/−",
  fgPct: "FG%",
  threePct: "3P%",
  ftPct: "FT%",
};

// ---------- CSV ------------------------------------------------------------

const CSV_HEADERS: Array<keyof GameLog> = [
  "id",
  "ts",
  "date",
  "mode",
  "opponent",
  "outcome",
  "pts",
  "reb",
  "ast",
  "stl",
  "blk",
  "to",
  "fgm",
  "fga",
  "threePm",
  "threePa",
  "ftm",
  "fta",
  "plusMinus",
  "min",
  "notes",
];

function csvEscape(v: unknown): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function gamesToCSV(games: GameLog[]): string {
  const rows: string[] = [];
  rows.push(CSV_HEADERS.join(","));
  for (const g of games) {
    rows.push(CSV_HEADERS.map((h) => csvEscape(g[h])).join(","));
  }
  return rows.join("\n");
}

// Tiny CSV parser — handles quoted fields with embedded commas/quotes/newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      cur.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      cur.push(field);
      field = "";
      rows.push(cur);
      cur = [];
      // swallow \r\n
      if (ch === "\r" && text[i + 1] === "\n") i += 2;
      else i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // tail
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

export function csvToGames(s: string): GameLog[] {
  const rows = parseCsv(s);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const out: GameLog[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = row[c];
    }
    out.push(normalizeGame(obj as Partial<GameLog>));
  }
  return out;
}
