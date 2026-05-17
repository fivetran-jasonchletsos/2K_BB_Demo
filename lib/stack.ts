// Stack metadata for the /stack page. All values are factual references to
// the connectors and dbt models scaffolded in this repo. Numbers shown for
// "rows ingested today" and "last sync" are realistic mocks suitable for
// a demo environment — they are not pulled from a live system.

export type ConnectorKind = "sdk" | "native";
export type SourceKind = "rest" | "scrape" | "oauth" | "json";
export type Cadence = "5m" | "10m" | "15m" | "30m" | "1h" | "4h" | "daily";
export type SourceStatus = "green" | "amber" | "red";

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
  // Box-score fields
  sourceKind: SourceKind;
  cadence: Cadence;
  rowsPerDay: number;
  lastSyncSecondsAgo: number;
  freshness7d: number[]; // length 7; minutes of staleness per day (0 = fresh)
  errorPct: number; // 0-100
  errorThresholdPct: number;
  status: SourceStatus;
  // Lake-first destination metadata
  destination: string; // e.g. mdls.bronze_balldontlie
  format: "iceberg";
};

export type EngineKind = "snowflake" | "athena" | "databricks" | "trino";
export type EngineStatus = "enabled" | "optional";

export type Engine = {
  id: string;
  name: string;
  kind: EngineKind;
  catalogReader: string;
  dbtAdapter: string;
  status: EngineStatus;
};

export type Materialization = "view" | "table" | "incremental" | "ephemeral";

export type Model = {
  id: string;
  name: string;
  layer: "staging" | "intermediate" | "marts";
  materialization: Materialization;
  description: string;
  sourcesOrRefs: string[];
  rowCount: number;
  grain: string;
  refreshCadence: string;
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
  grain: string;
  materialization: Materialization;
  refreshCadence: string;
  rowCount: number;
};

export type TimingStage = "extract" | "load" | "staging" | "marts" | "revalidate";

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
    sourceKind: "rest",
    cadence: "15m",
    rowsPerDay: 184200,
    lastSyncSecondsAgo: 47,
    freshness7d: [0, 0, 2, 0, 0, 1, 0],
    errorPct: 0.2,
    errorThresholdPct: 1.0,
    status: "green",
    destination: "mdls.bronze_balldontlie",
    format: "iceberg",
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
    sourceKind: "scrape",
    cadence: "30m",
    rowsPerDay: 61120,
    lastSyncSecondsAgo: 738,
    freshness7d: [0, 3, 0, 8, 0, 2, 4],
    errorPct: 0.9,
    errorThresholdPct: 1.0,
    status: "amber",
    destination: "mdls.bronze_nba_stats",
    format: "iceberg",
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
    sourceKind: "oauth",
    cadence: "10m",
    rowsPerDay: 12840,
    lastSyncSecondsAgo: 182,
    freshness7d: [0, 0, 0, 1, 0, 0, 0],
    errorPct: 0.1,
    errorThresholdPct: 1.0,
    status: "green",
    destination: "mdls.bronze_reddit_2k",
    format: "iceberg",
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
    sourceKind: "scrape",
    cadence: "daily",
    rowsPerDay: 540,
    lastSyncSecondsAgo: 15069,
    freshness7d: [0, 0, 0, 0, 0, 0, 0],
    errorPct: 0.0,
    errorThresholdPct: 2.0,
    status: "green",
    destination: "mdls.bronze_twokratings",
    format: "iceberg",
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
    sourceKind: "json",
    cadence: "5m",
    rowsPerDay: 3120,
    lastSyncSecondsAgo: 74,
    freshness7d: [0, 0, 0, 0, 1, 0, 0],
    errorPct: 0.3,
    errorThresholdPct: 1.0,
    status: "green",
    destination: "mdls.bronze_espn_news",
    format: "iceberg",
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
    sourceKind: "json",
    cadence: "5m",
    rowsPerDay: 70,
    lastSyncSecondsAgo: 158,
    freshness7d: [0, 0, 14, 0, 0, 0, 22],
    errorPct: 1.4,
    errorThresholdPct: 1.0,
    status: "red",
    destination: "mdls.bronze_locker_codes",
    format: "iceberg",
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
    sourceKind: "rest",
    cadence: "1h",
    rowsPerDay: 2304,
    lastSyncSecondsAgo: 1624,
    freshness7d: [0, 0, 0, 0, 0, 0, 0],
    errorPct: 0.0,
    errorThresholdPct: 1.0,
    status: "green",
    destination: "mdls.bronze_snowflake_meta",
    format: "iceberg",
  },
];

// Catalog-compatible read engines. Same Iceberg tables in MDLS — different
// query engines. Snowflake and Athena are wired in dbt/profiles.example.yml;
// Databricks and Trino are catalog-readable but not configured in this demo.
export const ENGINES: Engine[] = [
  {
    id: "snowflake",
    name: "Snowflake-on-Iceberg",
    kind: "snowflake",
    catalogReader: "EXTERNAL VOLUME + CATALOG INTEGRATION (Polaris)",
    dbtAdapter: "dbt-snowflake",
    status: "enabled",
  },
  {
    id: "athena",
    name: "Amazon Athena",
    kind: "athena",
    catalogReader: "AWS Glue Iceberg REST catalog",
    dbtAdapter: "dbt-athena",
    status: "enabled",
  },
  {
    id: "databricks",
    name: "Databricks SQL",
    kind: "databricks",
    catalogReader: "Unity Catalog Iceberg federation",
    dbtAdapter: "dbt-databricks",
    status: "optional",
  },
  {
    id: "trino",
    name: "Trino",
    kind: "trino",
    catalogReader: "Iceberg REST catalog connector",
    dbtAdapter: "dbt-trino",
    status: "optional",
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
    rowCount: 12480,
    grain: "one row per game",
    refreshCadence: "on-read",
  },
  {
    id: "stg_nba__players",
    name: "stg_nba__players",
    layer: "staging",
    materialization: "view",
    description: "Player roster: id, name, team, position, height_in, weight_lb.",
    sourcesOrRefs: ["source('nba_balldontlie','players')"],
    rowCount: 624,
    grain: "one row per player",
    refreshCadence: "on-read",
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
    rowCount: 312840,
    grain: "one row per player-game",
    refreshCadence: "on-read",
  },
  {
    id: "stg_reddit__posts",
    name: "stg_reddit__posts",
    layer: "staging",
    materialization: "view",
    description: "Subreddit posts cleaned, with lowercased title+body.",
    sourcesOrRefs: ["source('reddit_2k','posts')"],
    rowCount: 41208,
    grain: "one row per post",
    refreshCadence: "on-read",
  },
  {
    id: "stg_espn__news",
    name: "stg_espn__news",
    layer: "staging",
    materialization: "view",
    description: "ESPN NBA articles with normalized published timestamp.",
    sourcesOrRefs: ["source('espn_news','articles')"],
    rowCount: 9870,
    grain: "one row per article",
    refreshCadence: "on-read",
  },
  {
    id: "stg_twokratings__ratings",
    name: "stg_twokratings__ratings",
    layer: "staging",
    materialization: "view",
    description: "Community 2K ratings keyed by player slug; deduped to latest scrape.",
    sourcesOrRefs: ["source('twokratings','player_ratings')"],
    rowCount: 612,
    grain: "one row per player",
    refreshCadence: "on-read",
  },
  {
    id: "stg_locker_codes__drops",
    name: "stg_locker_codes__drops",
    layer: "staging",
    materialization: "view",
    description: "Locker code drops with reward type and expiration parsed to TIMESTAMP_TZ.",
    sourcesOrRefs: ["source('locker_codes','drops')"],
    rowCount: 184,
    grain: "one row per drop",
    refreshCadence: "on-read",
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
    rowCount: 624,
    grain: "one row per player",
    refreshCadence: "every 30m",
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
    rowCount: 624,
    grain: "one row per player",
    refreshCadence: "every 15m",
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
    rowCount: 624,
    grain: "one row per player",
    refreshCadence: "every 15m",
  },
  {
    id: "mart_rating_predictions",
    name: "mart_rating_predictions",
    layer: "marts",
    materialization: "incremental",
    description:
      "Predicted 2K rating delta with confidence + primary driver. Clamped to [-5,+5].",
    sourcesOrRefs: ["ref('mart_player_360')"],
    rowCount: 624,
    grain: "one row per player",
    refreshCadence: "every 15m",
  },
  {
    id: "mart_locker_codes_active",
    name: "mart_locker_codes_active",
    layer: "marts",
    materialization: "view",
    description:
      "Currently-active locker codes ranked by expiration window. Filters expired drops.",
    sourcesOrRefs: ["ref('stg_locker_codes__drops')"],
    rowCount: 42,
    grain: "one row per active code",
    refreshCadence: "on-read",
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
    grain: "one row per player",
    materialization: "incremental",
    refreshCadence: "every 15m",
    rowCount: 624,
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
    grain: "one row per player",
    materialization: "incremental",
    refreshCadence: "every 15m",
    rowCount: 624,
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
    grain: "one row per active code",
    materialization: "view",
    refreshCadence: "on-read",
    rowCount: 42,
  },
];

export const PIPELINE_STATS = {
  sources: SOURCES.length,
  // Bronze tables = one Iceberg table in MDLS per ingested source table.
  bronzeTables: SOURCES.reduce((n, s) => n + s.tables.length, 0),
  // Back-compat alias: same number, lake-first label.
  tablesIngested: SOURCES.reduce((n, s) => n + s.tables.length, 0),
  models: MODELS.length,
  dailyRowsIngested: SOURCES.reduce((n, s) => n + s.rowsToday, 0),
  latencyMinutesP50: 7,
  latencyMinutesP95: 22,
  engineCount: 4,
  enabledEngineCount: 2,
  // Labels reflect the lake-first architecture.
  labels: {
    sources: "SDK connectors",
    bronzeTables: "bronze Iceberg tables in MDLS",
    models: "dbt models on Iceberg",
    engines: "catalog-compatible read engines",
  },
};

// End-to-end timing across the lifecycle stages. Seconds.
export const END_TO_END_TIMING: {
  stage: TimingStage;
  label: string;
  actualSeconds: number;
  targetSeconds: number;
}[] = [
  { stage: "extract", label: "source extract", actualSeconds: 42, targetSeconds: 60 },
  { stage: "load", label: "load to raw", actualSeconds: 28, targetSeconds: 45 },
  { stage: "staging", label: "staging build", actualSeconds: 51, targetSeconds: 60 },
  { stage: "marts", label: "mart build", actualSeconds: 88, targetSeconds: 90 },
  { stage: "revalidate", label: "app revalidate", actualSeconds: 31, targetSeconds: 30 },
];

// Mart column snippets (4-6 cols each) for the three highlight marts.
export const MART_SCHEMA_SNIPPETS: Record<
  string,
  { col: string; type: string; note?: string }[]
> = {
  mart_player_360: [
    { col: "player_id", type: "NUMBER", note: "PK" },
    { col: "full_name", type: "STRING" },
    { col: "form_z", type: "FLOAT", note: "z-score" },
    { col: "current_2k_rating", type: "NUMBER" },
    { col: "news_score", type: "FLOAT" },
    { col: "updated_at", type: "TIMESTAMP_TZ" },
  ],
  mart_rating_predictions: [
    { col: "player_id", type: "NUMBER", note: "PK" },
    { col: "current_rating", type: "NUMBER" },
    { col: "predicted_delta", type: "NUMBER(3,1)" },
    { col: "confidence", type: "FLOAT" },
    { col: "primary_driver", type: "STRING" },
    { col: "computed_at", type: "TIMESTAMP_TZ" },
  ],
  mart_locker_codes_active: [
    { col: "code", type: "STRING", note: "PK" },
    { col: "reward_type", type: "STRING" },
    { col: "reward_value", type: "STRING" },
    { col: "expires_at", type: "TIMESTAMP_TZ" },
    { col: "hours_remaining", type: "NUMBER(6,1)" },
    { col: "rank_by_expiry", type: "NUMBER" },
  ],
};

// Joe Reis data engineering lifecycle stages used in the header strip.
export const LIFECYCLE_STAGES: {
  n: number;
  stage: string;
  system: string;
}[] = [
  { n: 1, stage: "generation", system: "balldontlie · NBA.com · Reddit · ESPN · 2KRatings · codes" },
  { n: 2, stage: "ingestion", system: "Fivetran Connector SDK" },
  { n: 3, stage: "storage", system: "MDLS · Iceberg · Glue/Polaris catalog" },
  { n: 4, stage: "transformation", system: "dbt on Iceberg — staging / intermediate / marts" },
  { n: 5, stage: "serving", system: "Next.js App Router (ISR)" },
];

export const UNDERCURRENTS = [
  "orchestration",
  "data management",
  "dataops",
  "security",
  "software engineering",
  "data architecture",
];
