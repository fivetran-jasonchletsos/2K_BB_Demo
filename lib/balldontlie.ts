// balldontlie — client-side helpers for live NBA data.
//
// All calls are issued from the BROWSER directly to api.balldontlie.io.
// Nothing here is allowed to run at build time (the static export must
// remain a static export). Callers must invoke these inside event handlers
// or `useEffect`.
//
// The API key is OPTIONAL. balldontlie's basic tier works without auth
// but is heavily rate-limited; a paid key unlocks higher rates and is
// required for some endpoints (e.g. season averages). When set, the key
// is sent as `Authorization: <key>` per balldontlie v1 docs.
//
// Storage: localStorage only. The key never leaves this site except as
// the Authorization header on api.balldontlie.io requests.

// ---------- Types (subset of balldontlie v1 schemas) ----------

export interface BDLTeam {
  id: number;
  conference: string;
  division: string;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string;
}

export interface BDLPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height: string | null;
  weight: string | null;
  jersey_number: string | null;
  college: string | null;
  country: string | null;
  draft_year: number | null;
  draft_round: number | null;
  draft_number: number | null;
  team: BDLTeam;
}

export interface BDLGame {
  id: number;
  date: string;
  season: number;
  status: string;
  period: number;
  time: string | null;
  postseason: boolean;
  home_team_score: number;
  visitor_team_score: number;
  home_team: BDLTeam;
  visitor_team: BDLTeam;
}

export interface BDLStat {
  id?: number;
  player_id?: number;
  // box-score stat shape
  min?: string;
  pts?: number;
  ast?: number;
  reb?: number;
  stl?: number;
  blk?: number;
  turnover?: number;
  fg_pct?: number;
  fg3_pct?: number;
  ft_pct?: number;
  fgm?: number;
  fga?: number;
  fg3m?: number;
  fg3a?: number;
  ftm?: number;
  fta?: number;
  oreb?: number;
  dreb?: number;
  pf?: number;
  // season-average shape
  games_played?: number;
  season?: number;
  // attached references when included
  player?: BDLPlayer;
  team?: BDLTeam;
  game?: BDLGame;
}

export interface BDLMeta {
  next_cursor?: number | null;
  per_page?: number;
}

// ---------- Feature flag ----------
// Single switch the page UI checks. The page also has a runtime toggle,
// but this gates the helpers themselves so they're safe to import at
// build time. Disabled by default; enabled when the user opts in.

export const LIVE_BDL_ENABLED = true;

// ---------- Key storage ----------

export const BDL_KEY_STORAGE = "2klab.bdl.apiKey";

export function loadKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(BDL_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function saveKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(BDL_KEY_STORAGE, trimmed);
    else localStorage.removeItem(BDL_KEY_STORAGE);
  } catch {
    // private mode / storage disabled — ignore
  }
}

export function clearKey(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BDL_KEY_STORAGE);
  } catch {
    // ignore
  }
}

// ---------- Internal: fetch wrapper ----------

const BASE_URL = "https://api.balldontlie.io/v1";

export class BDLError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "BDLError";
    this.status = status;
  }
}

type QueryValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | undefined
  | null;

async function bdlGet<T>(
  path: string,
  params?: Record<string, QueryValue>,
): Promise<T> {
  if (typeof window === "undefined") {
    throw new BDLError("balldontlie fetch attempted on the server", 0);
  }
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  const key = loadKey();
  if (key) headers.Authorization = key;

  const res = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    throw new BDLError(
      `balldontlie ${res.status}: ${detail.slice(0, 160) || res.statusText}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

// ---------- In-memory session cache ----------
// Avoid re-fetching the same player / team / game list during a single
// session. Keyed by a string discriminator + canonical params.

const cache = new Map<string, unknown>();

function cacheGet<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}
function cacheSet<T>(key: string, value: T): T {
  cache.set(key, value);
  return value;
}

// ---------- Public helpers ----------

export async function fetchTeams(): Promise<BDLTeam[]> {
  const cached = cacheGet<BDLTeam[]>("teams");
  if (cached) return cached;
  const json = await bdlGet<{ data: BDLTeam[] }>("/teams");
  return cacheSet("teams", json.data ?? []);
}

export interface FetchPlayersOptions {
  search?: string;
  perPage?: number;
  page?: number;
  cursor?: number;
}

export async function fetchPlayers(
  opts: FetchPlayersOptions = {},
): Promise<{ data: BDLPlayer[]; meta: BDLMeta }> {
  const key = `players:${JSON.stringify(opts)}`;
  const cached = cacheGet<{ data: BDLPlayer[]; meta: BDLMeta }>(key);
  if (cached) return cached;
  const json = await bdlGet<{ data: BDLPlayer[]; meta: BDLMeta }>("/players", {
    search: opts.search,
    per_page: opts.perPage ?? 25,
    cursor: opts.cursor,
  });
  return cacheSet(key, { data: json.data ?? [], meta: json.meta ?? {} });
}

export async function fetchPlayerSeasonAverages(
  playerIds: number[],
  season: number,
): Promise<BDLStat[]> {
  if (!playerIds.length) return [];
  const key = `season-avg:${season}:${[...playerIds].sort().join(",")}`;
  const cached = cacheGet<BDLStat[]>(key);
  if (cached) return cached;
  const json = await bdlGet<{ data: BDLStat[] }>("/season_averages", {
    season,
    "player_ids": playerIds,
  });
  return cacheSet(key, json.data ?? []);
}

export interface FetchGamesOptions {
  dates?: string[]; // YYYY-MM-DD
  teamIds?: number[];
  perPage?: number;
  seasons?: number[];
  postseason?: boolean;
}

export async function fetchGames(
  opts: FetchGamesOptions = {},
): Promise<BDLGame[]> {
  const key = `games:${JSON.stringify(opts)}`;
  const cached = cacheGet<BDLGame[]>(key);
  if (cached) return cached;
  const json = await bdlGet<{ data: BDLGame[] }>("/games", {
    dates: opts.dates,
    team_ids: opts.teamIds,
    seasons: opts.seasons,
    postseason: opts.postseason,
    per_page: opts.perPage ?? 25,
  });
  return cacheSet(key, json.data ?? []);
}

export async function fetchPlayerRecentGames(
  playerId: number,
  lastN: number,
): Promise<BDLGame[]> {
  const key = `recent-games:${playerId}:${lastN}`;
  const cached = cacheGet<BDLGame[]>(key);
  if (cached) return cached;

  // Pull recent box scores for this player, then dedupe by game id.
  const json = await bdlGet<{ data: BDLStat[] }>("/stats", {
    "player_ids": [playerId],
    per_page: Math.max(lastN, 25),
  });
  const stats = json.data ?? [];
  const games: BDLGame[] = [];
  const seen = new Set<number>();
  // /stats returns newest first when sorted by date desc; we'll sort to be safe.
  const sorted = [...stats].sort((a, b) => {
    const da = a.game?.date ?? "";
    const db = b.game?.date ?? "";
    return db.localeCompare(da);
  });
  for (const s of sorted) {
    if (!s.game) continue;
    if (seen.has(s.game.id)) continue;
    seen.add(s.game.id);
    games.push(s.game);
    if (games.length >= lastN) break;
  }
  return cacheSet(key, games);
}

export async function fetchPlayerRecentStats(
  playerId: number,
  lastN: number,
): Promise<BDLStat[]> {
  const key = `recent-stats:${playerId}:${lastN}`;
  const cached = cacheGet<BDLStat[]>(key);
  if (cached) return cached;
  const json = await bdlGet<{ data: BDLStat[] }>("/stats", {
    "player_ids": [playerId],
    per_page: Math.max(lastN, 25),
  });
  const stats = (json.data ?? [])
    .filter((s) => s.game)
    .sort((a, b) => (b.game?.date ?? "").localeCompare(a.game?.date ?? ""))
    .slice(0, lastN);
  return cacheSet(key, stats);
}

// ---------- Utilities ----------

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function averageStat(stats: BDLStat[], key: keyof BDLStat): number {
  if (!stats.length) return 0;
  let total = 0;
  let count = 0;
  for (const s of stats) {
    const v = s[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      total += v;
      count++;
    }
  }
  return count ? total / count : 0;
}
