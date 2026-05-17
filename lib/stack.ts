// Stack metadata for the /stack page. All values are factual references to
// the connectors and dbt models scaffolded in this repo. Numbers shown for
// "rows ingested today" and "last sync" are realistic mocks suitable for
// a demo environment — they are not pulled from a live system.

export type ConnectorKind = "sdk" | "native";

export type Source = {
  id: string;
  name: string;
  vendor: string;
  kind: ConnectorKind;
  schema: string;
  schedule: string;
  rowsToday: number;
  lastSync: string;
  tables: string[];
  notes: string;
};

export type Materialization = "view" | "table" | "incremental" | "ephemeral";

export type Model = {
  id: string;
  name: string;
  layer: "staging" | "intermediate" | "marts";
  materialization: Materialization;
  description: string;
  sourcesOrRefs: string[];
};

export type LineageEdge = {
  from: string;
  to: string;
};

export type HighlightMart = {
  id: string;
  name: string;
  description: string;
  columns: { name: string; type: string; note?: string }[];
  usedBy: string[];
};

export const SOURCES: Source[] = [
  {
    id: "balldontlie",
    name: "balldontlie",
    vendor: "balldontlie.io",
    kind: "sdk",
    schema: "nba_balldontlie",
    schedule: "every 15 min",
    rowsToday: 18420,
    lastSync: "00:47 ago",
    tables: ["players", "teams", "games", "stats", "season_averages"],
    notes:
      "REST API. API key in connector config. Cursor on `updated_at` for stats, on `date` for games.",
  },
  {
    id: "nba_stats",
    name: "stats.nba.com",
    vendor: "NBA.com",
    kind: "sdk",
    schema: "nba_stats",
    schedule: "every 30 min",
    rowsToday: 6112,
    lastSync: "12:18 ago",
    tables: ["box_scores", "play_by_play", "lineups", "shot_chart_detail"],
    notes:
      "Requires browser-like headers (User-Agent, Referer, x-nba-stats-token). Rate-limited; backoff on 429.",
  },
  {
    id: "reddit_2k",
    name: "reddit r/NBA2k",
    vendor: "Reddit",
    kind: "sdk",
    schema: "reddit_2k",
    schedule: "every 10 min",
    rowsToday: 1284,
    lastSync: "03:02 ago",
    tables: ["posts", "comments"],
    notes:
      "OAuth2 application-only script auth (client_id + client_secret + refresh_token). Subreddits: NBA2k, NBA2k26.",
  },
  {
    id: "twokratings",
    name: "2KRatings.com",
    vendor: "2KRatings (community)",
    kind: "sdk",
    schema: "twokratings",
    schedule: "daily 06:00 UTC",
    rowsToday: 540,
    lastSync: "04:11:09 ago",
    tables: ["player_ratings", "rating_history"],
    notes:
      "Community-curated. HTML scrape with BeautifulSoup. Treated as advisory ground-truth, not official 2K data.",
  },
  {
    id: "espn_news",
    name: "ESPN News",
    vendor: "ESPN",
    kind: "sdk",
    schema: "espn_news",
    schedule: "every 5 min",
    rowsToday: 312,
    lastSync: "01:14 ago",
    tables: ["articles", "headlines"],
    notes:
      "Public ESPN JSON endpoints. Cursor on `published`. Filters to NBA league.",
  },
  {
    id: "locker_codes",
    name: "2K Locker Codes",
    vendor: "2K Codes Aggregator",
    kind: "sdk",
    schema: "locker_codes",
    schedule: "every 5 min",
    rowsToday: 7,
    lastSync: "02:38 ago",
    tables: ["drops"],
    notes:
      "Aggregator JSON endpoint. Codes have expires_at; rewards typed (player_card, mt, vc, badge).",
  },
  {
    id: "snowflake_internal",
    name: "Snowflake Information Schema",
    vendor: "Snowflake",
    kind: "native",
    schema: "snowflake_meta",
    schedule: "hourly",
    rowsToday: 96,
    lastSync: "27:04 ago",
    tables: ["warehouse_load_history", "query_history_summary"],
    notes:
      "Native Fivetran connector. Used for pipeline observability dashboards (not in core lineage).",
  },
];

export const MODELS: Model[] = [
  // staging
  {
    id: "stg_nba__games",
    name: "stg_nba__games",
    layer: "staging",
    materialization: "view",
    description: "Game-level facts from balldontlie /games. Soft-delete filtered.",
    sourcesOrRefs: ["source('nba_balldontlie','games')"],
  },
  {
    id: "stg_nba__players",
    name: "stg_nba__players",
    layer: "staging",
    materialization: "view",
    description: "Player roster: id, name, team, position, height_in, weight_lb.",
    sourcesOrRefs: ["source('nba_balldontlie','players')"],
  },
  {
    id: "stg_nba__player_stats",
    name: "stg_nba__player_stats",
    layer: "staging",
    materialization: "view",
    description: "Per-game box score rows joined to game date and team.",
    sourcesOrRefs: [
      "source('nba_balldontlie','stats')",
      "source('nba_balldontlie','games')",
    ],
  },
  {
    id: "stg_reddit__posts",
    name: "stg_reddit__posts",
    layer: "staging",
    materialization: "view",
    description: "Subreddit posts cleaned, with lowercased title+body.",
    sourcesOrRefs: ["source('reddit_2k','posts')"],
  },
  {
    id: "stg_espn__news",
    name: "stg_espn__news",
    layer: "staging",
    materialization: "view",
    description: "ESPN NBA articles with normalized published timestamp.",
    sourcesOrRefs: ["source('espn_news','articles')"],
  },
  {
    id: "stg_twokratings__ratings",
    name: "stg_twokratings__ratings",
    layer: "staging",
    materialization: "view",
    description: "Community 2K ratings keyed by player slug; deduped to latest scrape.",
    sourcesOrRefs: ["source('twokratings','player_ratings')"],
  },
  {
    id: "stg_locker_codes__drops",
    name: "stg_locker_codes__drops",
    layer: "staging",
    materialization: "view",
    description: "Locker code drops with reward type and expiration parsed to TIMESTAMP_TZ.",
    sourcesOrRefs: ["source('locker_codes','drops')"],
  },

  // intermediate
  {
    id: "int_player_recent_form",
    name: "int_player_recent_form",
    layer: "intermediate",
    materialization: "table",
    description:
      "Per-player rolling last-5 and last-30d averages for PTS/REB/AST/MIN/PLUS_MINUS using QUALIFY window.",
    sourcesOrRefs: ["ref('stg_nba__player_stats')"],
  },
  {
    id: "int_player_news_signal",
    name: "int_player_news_signal",
    layer: "intermediate",
    materialization: "table",
    description:
      "Per-player news/sentiment signal from Reddit + ESPN with keyword-scored injury/role flags.",
    sourcesOrRefs: [
      "ref('stg_reddit__posts')",
      "ref('stg_espn__news')",
      "ref('stg_nba__players')",
    ],
  },

  // marts
  {
    id: "mart_player_360",
    name: "mart_player_360",
    layer: "marts",
    materialization: "incremental",
    description:
      "One row per player. Profile + recent form + 2KRatings + news signal. Unique on player_id.",
    sourcesOrRefs: [
      "ref('stg_nba__players')",
      "ref('int_player_recent_form')",
      "ref('int_player_news_signal')",
      "ref('stg_twokratings__ratings')",
    ],
  },
  {
    id: "mart_rating_predictions",
    name: "mart_rating_predictions",
    layer: "marts",
    materialization: "incremental",
    description:
      "Predicted 2K rating delta with confidence + primary driver. Clamped to [-5,+5].",
    sourcesOrRefs: ["ref('mart_player_360')"],
  },
  {
    id: "mart_locker_codes_active",
    name: "mart_locker_codes_active",
    layer: "marts",
    materialization: "view",
    description:
      "Currently-active locker codes ranked by expiration window. Filters expired drops.",
    sourcesOrRefs: ["ref('stg_locker_codes__drops')"],
  },
];

export const LINEAGE: LineageEdge[] = [
  // staging → intermediate
  { from: "stg_nba__player_stats", to: "int_player_recent_form" },
  { from: "stg_reddit__posts", to: "int_player_news_signal" },
  { from: "stg_espn__news", to: "int_player_news_signal" },
  { from: "stg_nba__players", to: "int_player_news_signal" },
  // staging + intermediate → marts
  { from: "stg_nba__players", to: "mart_player_360" },
  { from: "int_player_recent_form", to: "mart_player_360" },
  { from: "int_player_news_signal", to: "mart_player_360" },
  { from: "stg_twokratings__ratings", to: "mart_player_360" },
  // mart → mart
  { from: "mart_player_360", to: "mart_rating_predictions" },
  // codes
  { from: "stg_locker_codes__drops", to: "mart_locker_codes_active" },
];

export const HIGHLIGHT_MARTS: HighlightMart[] = [
  {
    id: "mart_player_360",
    name: "mart_player_360",
    description:
      "Canonical per-player record. Drives /players and feeds rating predictions.",
    columns: [
      { name: "player_id", type: "NUMBER", note: "PK" },
      { name: "full_name", type: "STRING" },
      { name: "team_abbr", type: "STRING" },
      { name: "position", type: "STRING" },
      { name: "pts_l5", type: "NUMBER(5,2)" },
      { name: "reb_l5", type: "NUMBER(5,2)" },
      { name: "ast_l5", type: "NUMBER(5,2)" },
      { name: "min_l5", type: "NUMBER(5,2)" },
      { name: "plus_minus_l5", type: "NUMBER(5,2)" },
      { name: "form_z", type: "FLOAT", note: "recent vs 30d z-score" },
      { name: "current_2k_rating", type: "NUMBER" },
      { name: "news_score", type: "FLOAT", note: "[-1,1]" },
      { name: "injury_flag", type: "BOOLEAN" },
      { name: "updated_at", type: "TIMESTAMP_TZ" },
    ],
    usedBy: ["/players", "/pulse", "mart_rating_predictions"],
  },
  {
    id: "mart_rating_predictions",
    name: "mart_rating_predictions",
    description:
      "Daily delta forecast vs current 2K rating with attribution.",
    columns: [
      { name: "player_id", type: "NUMBER", note: "PK" },
      { name: "current_rating", type: "NUMBER" },
      { name: "predicted_delta", type: "NUMBER(3,1)", note: "clamped [-5,+5]" },
      { name: "confidence", type: "FLOAT", note: "0..1" },
      { name: "primary_driver", type: "STRING" },
      { name: "driver_breakdown_json", type: "VARIANT" },
      { name: "computed_at", type: "TIMESTAMP_TZ" },
    ],
    usedBy: ["/pulse", "/players/[id]"],
  },
  {
    id: "mart_locker_codes_active",
    name: "mart_locker_codes_active",
    description: "Active locker codes for the /codes page.",
    columns: [
      { name: "code", type: "STRING", note: "PK" },
      { name: "reward_type", type: "STRING" },
      { name: "reward_value", type: "STRING" },
      { name: "released_at", type: "TIMESTAMP_TZ" },
      { name: "expires_at", type: "TIMESTAMP_TZ" },
      { name: "hours_remaining", type: "NUMBER(6,1)" },
      { name: "rank_by_expiry", type: "NUMBER" },
    ],
    usedBy: ["/codes"],
  },
];

export const PIPELINE_STATS = {
  sources: SOURCES.length,
  tablesIngested: SOURCES.reduce((n, s) => n + s.tables.length, 0),
  models: MODELS.length,
  dailyRowsIngested: SOURCES.reduce((n, s) => n + s.rowsToday, 0),
  latencyMinutesP50: 7,
  latencyMinutesP95: 22,
};
