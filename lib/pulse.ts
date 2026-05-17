// =============================================================================
// Pulse — Live NBA Stats → predicted 2K rating changes
// =============================================================================
// This module mocks the output of an ODI (Operational Data Intelligence) pipeline:
//
//   Fivetran connectors -> Snowflake (raw schemas) -> dbt models -> marts
//
// The shapes/types here mirror what the downstream dbt marts will return so the
// UI can swap mocks for real queries without refactor. Each export block has a
// header listing the Fivetran source(s) and the dbt mart(s) it represents.
// =============================================================================

export type GameId = string;

/**
 * Source: Fivetran connector `balldontlie` → schema `nba_raw`
 *   Tables: games, teams
 * Also enriched by: Fivetran connector `nba_stats` → schema `nba_stats_raw`
 *   Tables: scoreboard, live_score_feed
 * dbt marts:
 *   - mart_games_today (one row per game on the current NBA slate)
 *     fields: game_id, game_date, away_team, home_team, away_score, home_score,
 *             status, tipoff_et, projected_away_score, projected_home_score
 */
export interface NbaGame {
  id: GameId;
  date: string; // ISO date (YYYY-MM-DD)
  away: { team: string; score?: number; projected?: number };
  home: { team: string; score?: number; projected?: number };
  status: "scheduled" | "live" | "final";
  tipoffEt: string; // e.g. "7:30 PM ET"
  watchImpactPlayers: number; // count of players in PREDICTIONS with stake in game
}

/**
 * Sources:
 *   - Fivetran `balldontlie` → schema `nba_raw` (games, players, stats)
 *   - Fivetran `nba_stats`   → schema `nba_stats_raw` (player_game_logs, advanced_box)
 *   - Fivetran `espn_news`   → schema `espn_raw` (articles, injury_feed)
 *   - Fivetran `reddit_2k`   → schema `reddit_raw` (posts, comments from r/NBA2k)
 *
 * dbt marts:
 *   - mart_player_360
 *       one row per player; current 2K rating + season baseline averages.
 *       fields: player_id, display_name, team, position, current_rating,
 *               season_pts, season_reb, season_ast, season_usg, season_net_rtg
 *   - mart_rating_predictions
 *       one row per player; output of the rating-delta model.
 *       fields: player_id, predicted_delta_pts, confidence,
 *               primary_driver, driver_scoring, driver_defense,
 *               driver_efficiency, driver_news,
 *               next_update_eta, computed_at
 *   - mart_player_last5
 *       five most recent games per player; line + plus/minus.
 *   - mart_source_contributions
 *       fan-out of which Fivetran source contributed weight to each prediction.
 */
export interface RatingPrediction {
  playerId: string;
  displayName: string;
  team: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  currentRating: number;
  predictedDelta: number; // signed integer rating points
  confidence: number; // 0..1
  primaryDriver: string;
  driverBreakdown: {
    scoring: number;
    defense: number;
    efficiency: number;
    news: number;
  };
  last5: {
    date: string;
    opp: string;
    line: string; // e.g. "34/9/6 · 12/22 FG"
    plusMinus: number;
  }[];
  sourceContribs: {
    source: "balldontlie" | "nba_stats" | "espn_news" | "reddit_2k";
    weight: number; // 0..1
  }[];
  nextUpdateEta: string; // e.g. "Thu 5/22"
  computedAt: string; // ISO timestamp
  recentForm: number; // 0..100 composite for sorting
}

/**
 * Source: Fivetran control plane (sync metadata) + per-connector heartbeats.
 * dbt marts:
 *   - mart_pulse_sources (one row per active connector;
 *       fields: source_id, label, last_sync_seconds_ago, rows_today)
 */
export interface PulseSource {
  id: "balldontlie" | "nba_stats" | "espn_news" | "reddit_2k";
  label: string;
  lastSyncSecondsAgo: number;
  rowsIngestedToday: number;
}

// -----------------------------------------------------------------------------
// TONIGHT_GAMES — mart_games_today
// -----------------------------------------------------------------------------
export const TONIGHT_GAMES: NbaGame[] = [
  {
    id: "g_phi_bos",
    date: "2026-05-16",
    away: { team: "PHI", projected: 112 },
    home: { team: "BOS", projected: 119 },
    status: "scheduled",
    tipoffEt: "7:00 PM ET",
    watchImpactPlayers: 5,
  },
  {
    id: "g_okc_den",
    date: "2026-05-16",
    away: { team: "OKC", projected: 116 },
    home: { team: "DEN", projected: 114 },
    status: "scheduled",
    tipoffEt: "8:30 PM ET",
    watchImpactPlayers: 4,
  },
  {
    id: "g_lal_min",
    date: "2026-05-16",
    away: { team: "LAL", projected: 108 },
    home: { team: "MIN", projected: 113 },
    status: "scheduled",
    tipoffEt: "9:00 PM ET",
    watchImpactPlayers: 4,
  },
  {
    id: "g_dal_nyk",
    date: "2026-05-16",
    away: { team: "DAL", score: 58, projected: 117 },
    home: { team: "NYK", score: 61, projected: 115 },
    status: "live",
    tipoffEt: "Q2 4:12",
    watchImpactPlayers: 3,
  },
  {
    id: "g_sas_gsw",
    date: "2026-05-16",
    away: { team: "SAS", projected: 110 },
    home: { team: "GSW", projected: 116 },
    status: "scheduled",
    tipoffEt: "10:00 PM ET",
    watchImpactPlayers: 4,
  },
  {
    id: "g_cle_ind",
    date: "2026-05-16",
    away: { team: "CLE", projected: 114 },
    home: { team: "IND", projected: 121 },
    status: "scheduled",
    tipoffEt: "7:30 PM ET",
    watchImpactPlayers: 3,
  },
  {
    id: "g_mia_atl",
    date: "2026-05-16",
    away: { team: "MIA", projected: 106 },
    home: { team: "ATL", projected: 112 },
    status: "scheduled",
    tipoffEt: "7:30 PM ET",
    watchImpactPlayers: 2,
  },
];

// -----------------------------------------------------------------------------
// PREDICTIONS — mart_rating_predictions ⨝ mart_player_360 ⨝ mart_player_last5
//                 ⨝ mart_source_contributions
// -----------------------------------------------------------------------------
export const PREDICTIONS: RatingPrediction[] = [
  {
    playerId: "maxey_t",
    displayName: "Tyrese Maxey",
    team: "PHI",
    position: "PG",
    currentRating: 90,
    predictedDelta: 2,
    confidence: 0.86,
    primaryDriver: "31/8/7 over last 5, 33% USG, +14 net rating",
    driverBreakdown: { scoring: 1.1, defense: 0.2, efficiency: 0.6, news: 0.1 },
    last5: [
      { date: "5/15", opp: "@MIA", line: "34/7/9 · 12/22", plusMinus: 18 },
      { date: "5/13", opp: "vs ORL", line: "29/8/6 · 10/19", plusMinus: 11 },
      { date: "5/11", opp: "@CHI", line: "33/9/8 · 13/24", plusMinus: 14 },
      { date: "5/09", opp: "vs MIL", line: "28/7/5 · 11/21", plusMinus: 8 },
      { date: "5/07", opp: "@BKN", line: "31/9/7 · 12/22", plusMinus: 16 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 92,
  },
  {
    playerId: "wembanyama_v",
    displayName: "Victor Wembanyama",
    team: "SAS",
    position: "C",
    currentRating: 93,
    predictedDelta: 3,
    confidence: 0.91,
    primaryDriver: "27/12/4 w/ 4.8 BPG over last 5; DRtg 98",
    driverBreakdown: { scoring: 0.9, defense: 1.5, efficiency: 0.5, news: 0.1 },
    last5: [
      { date: "5/15", opp: "@LAC", line: "29/13/5 · 6 BLK", plusMinus: 19 },
      { date: "5/13", opp: "vs PHX", line: "24/11/3 · 5 BLK", plusMinus: 12 },
      { date: "5/11", opp: "@HOU", line: "31/14/4 · 4 BLK", plusMinus: 21 },
      { date: "5/09", opp: "vs UTA", line: "26/12/5 · 5 BLK", plusMinus: 17 },
      { date: "5/07", opp: "@MEM", line: "25/10/3 · 4 BLK", plusMinus: 9 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.5 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 95,
  },
  {
    playerId: "sga_s",
    displayName: "Shai Gilgeous-Alexander",
    team: "OKC",
    position: "PG",
    currentRating: 96,
    predictedDelta: 1,
    confidence: 0.78,
    primaryDriver: "MVP-line 32/6/7 on 56% TS; +9.4 on/off",
    driverBreakdown: { scoring: 0.5, defense: 0.2, efficiency: 0.4, news: 0.0 },
    last5: [
      { date: "5/15", opp: "vs MIN", line: "34/5/8 · 13/22", plusMinus: 14 },
      { date: "5/13", opp: "@POR", line: "30/6/7 · 11/20", plusMinus: 22 },
      { date: "5/11", opp: "vs SAC", line: "29/7/6 · 10/19", plusMinus: 8 },
      { date: "5/09", opp: "@NOP", line: "33/4/9 · 12/21", plusMinus: 11 },
      { date: "5/07", opp: "vs DAL", line: "35/8/5 · 13/24", plusMinus: 17 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 90,
  },
  {
    playerId: "jokic_n",
    displayName: "Nikola Jokic",
    team: "DEN",
    position: "C",
    currentRating: 98,
    predictedDelta: 0,
    confidence: 0.94,
    primaryDriver: "Steady 28/13/10; ratings already at ceiling",
    driverBreakdown: { scoring: 0.1, defense: 0.0, efficiency: 0.1, news: 0.0 },
    last5: [
      { date: "5/15", opp: "@OKC", line: "27/14/11 · 11/18", plusMinus: 6 },
      { date: "5/13", opp: "vs LAL", line: "29/13/9 · 12/19", plusMinus: 13 },
      { date: "5/11", opp: "@PHX", line: "26/12/10 · 10/17", plusMinus: 4 },
      { date: "5/09", opp: "vs MEM", line: "31/15/12 · 13/20", plusMinus: 19 },
      { date: "5/07", opp: "@UTA", line: "28/14/9 · 11/19", plusMinus: 11 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.4 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.05 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 88,
  },
  {
    playerId: "embiid_j",
    displayName: "Joel Embiid",
    team: "PHI",
    position: "C",
    currentRating: 95,
    predictedDelta: -2,
    confidence: 0.82,
    primaryDriver: "Knee management, 4 DNP last 10; minutes capped at 28",
    driverBreakdown: { scoring: -0.4, defense: -0.3, efficiency: -0.2, news: -1.1 },
    last5: [
      { date: "5/15", opp: "@MIA", line: "DNP · rest", plusMinus: 0 },
      { date: "5/13", opp: "vs ORL", line: "19/6/3 · 6/15", plusMinus: -4 },
      { date: "5/11", opp: "@CHI", line: "DNP · knee", plusMinus: 0 },
      { date: "5/09", opp: "vs MIL", line: "22/8/4 · 7/16", plusMinus: -8 },
      { date: "5/07", opp: "@BKN", line: "21/7/2 · 7/17", plusMinus: -3 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.25 },
      { source: "nba_stats", weight: 0.3 },
      { source: "espn_news", weight: 0.35 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 41,
  },
  {
    playerId: "luka_d",
    displayName: "Luka Doncic",
    team: "DAL",
    position: "PG",
    currentRating: 97,
    predictedDelta: 0,
    confidence: 0.88,
    primaryDriver: "30/9/8 baseline holding; no rating runway",
    driverBreakdown: { scoring: 0.2, defense: -0.1, efficiency: 0.0, news: 0.0 },
    last5: [
      { date: "5/15", opp: "@NYK", line: "29/8/9 · 11/22", plusMinus: 5 },
      { date: "5/13", opp: "vs HOU", line: "33/10/7 · 12/24", plusMinus: 12 },
      { date: "5/11", opp: "@MEM", line: "27/9/11 · 9/21", plusMinus: -2 },
      { date: "5/09", opp: "vs LAC", line: "31/7/8 · 11/23", plusMinus: 8 },
      { date: "5/07", opp: "@OKC", line: "28/8/6 · 10/22", plusMinus: -6 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 78,
  },
  {
    playerId: "edwards_a",
    displayName: "Anthony Edwards",
    team: "MIN",
    position: "SG",
    currentRating: 92,
    predictedDelta: 2,
    confidence: 0.84,
    primaryDriver: "29/5/5 over last 5, 41% from 3, +11 net",
    driverBreakdown: { scoring: 1.0, defense: 0.3, efficiency: 0.6, news: 0.1 },
    last5: [
      { date: "5/15", opp: "vs LAL", line: "31/6/5 · 12/22 · 5/10 3P", plusMinus: 13 },
      { date: "5/13", opp: "@POR", line: "28/4/6 · 10/19", plusMinus: 9 },
      { date: "5/11", opp: "vs SAC", line: "27/5/4 · 9/18", plusMinus: 6 },
      { date: "5/09", opp: "@HOU", line: "32/6/5 · 12/23", plusMinus: 14 },
      { date: "5/07", opp: "vs DEN", line: "29/4/6 · 10/21", plusMinus: 8 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.5 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 89,
  },
  {
    playerId: "tatum_j",
    displayName: "Jayson Tatum",
    team: "BOS",
    position: "SF",
    currentRating: 95,
    predictedDelta: 1,
    confidence: 0.81,
    primaryDriver: "28/9/6, +18 net rating, clutch +14 EFG%",
    driverBreakdown: { scoring: 0.5, defense: 0.2, efficiency: 0.4, news: 0.0 },
    last5: [
      { date: "5/15", opp: "vs PHI", line: "31/8/7 · 11/22", plusMinus: 15 },
      { date: "5/13", opp: "@TOR", line: "26/9/5 · 9/19", plusMinus: 11 },
      { date: "5/11", opp: "vs WAS", line: "30/10/6 · 11/21", plusMinus: 22 },
      { date: "5/09", opp: "@DET", line: "27/8/7 · 10/20", plusMinus: 17 },
      { date: "5/07", opp: "vs ATL", line: "29/9/6 · 10/21", plusMinus: 13 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 86,
  },
  {
    playerId: "haliburton_t",
    displayName: "Tyrese Haliburton",
    team: "IND",
    position: "PG",
    currentRating: 89,
    predictedDelta: -1,
    confidence: 0.72,
    primaryDriver: "AST down to 8.4 from 11.2; TS% 53%",
    driverBreakdown: { scoring: -0.2, defense: -0.1, efficiency: -0.5, news: -0.2 },
    last5: [
      { date: "5/15", opp: "vs CLE", line: "16/3/8 · 6/16", plusMinus: -4 },
      { date: "5/13", opp: "@CHI", line: "21/4/9 · 8/18", plusMinus: 3 },
      { date: "5/11", opp: "vs DET", line: "14/3/7 · 5/14", plusMinus: -8 },
      { date: "5/09", opp: "@MIL", line: "19/4/10 · 7/17", plusMinus: 5 },
      { date: "5/07", opp: "vs CHA", line: "17/3/8 · 7/16", plusMinus: -2 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.4 },
      { source: "espn_news", weight: 0.15 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 58,
  },
  {
    playerId: "mitchell_d",
    displayName: "Donovan Mitchell",
    team: "CLE",
    position: "SG",
    currentRating: 91,
    predictedDelta: 1,
    confidence: 0.75,
    primaryDriver: "26/5/6 on 58% TS; +13 on/off",
    driverBreakdown: { scoring: 0.4, defense: 0.1, efficiency: 0.4, news: 0.0 },
    last5: [
      { date: "5/15", opp: "@IND", line: "28/6/6 · 10/20", plusMinus: 10 },
      { date: "5/13", opp: "vs MIL", line: "24/4/7 · 9/19", plusMinus: 6 },
      { date: "5/11", opp: "@DET", line: "27/5/5 · 10/21", plusMinus: 14 },
      { date: "5/09", opp: "vs CHI", line: "25/5/6 · 9/19", plusMinus: 8 },
      { date: "5/07", opp: "@TOR", line: "26/6/7 · 10/20", plusMinus: 11 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 83,
  },
  {
    playerId: "brunson_j",
    displayName: "Jalen Brunson",
    team: "NYK",
    position: "PG",
    currentRating: 91,
    predictedDelta: 2,
    confidence: 0.83,
    primaryDriver: "30/4/7 last 5; clutch FG% .58",
    driverBreakdown: { scoring: 0.9, defense: 0.1, efficiency: 0.6, news: 0.2 },
    last5: [
      { date: "5/15", opp: "vs DAL", line: "32/4/8 · 12/22", plusMinus: 11 },
      { date: "5/13", opp: "@BKN", line: "29/5/7 · 11/20", plusMinus: 9 },
      { date: "5/11", opp: "vs CHA", line: "31/3/6 · 12/21", plusMinus: 14 },
      { date: "5/09", opp: "@PHI", line: "28/4/8 · 10/19", plusMinus: 4 },
      { date: "5/07", opp: "vs MIA", line: "30/5/7 · 11/22", plusMinus: 7 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.5 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 87,
  },
  {
    playerId: "curry_s",
    displayName: "Stephen Curry",
    team: "GSW",
    position: "PG",
    currentRating: 94,
    predictedDelta: 0,
    confidence: 0.7,
    primaryDriver: "Holding 27/4/5; age curve drag offsets form",
    driverBreakdown: { scoring: 0.3, defense: -0.1, efficiency: 0.1, news: -0.3 },
    last5: [
      { date: "5/15", opp: "@SAC", line: "26/4/5 · 9/20", plusMinus: 3 },
      { date: "5/13", opp: "vs LAC", line: "29/3/6 · 10/22", plusMinus: 9 },
      { date: "5/11", opp: "@PHX", line: "24/5/4 · 8/19", plusMinus: -4 },
      { date: "5/09", opp: "vs UTA", line: "28/4/5 · 10/21", plusMinus: 11 },
      { date: "5/07", opp: "@LAL", line: "27/3/4 · 9/20", plusMinus: 6 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.4 },
      { source: "espn_news", weight: 0.2 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 75,
  },
  {
    playerId: "lebron_j",
    displayName: "LeBron James",
    team: "LAL",
    position: "SF",
    currentRating: 94,
    predictedDelta: -1,
    confidence: 0.79,
    primaryDriver: "Minutes down to 31, scoring -3.1; load management",
    driverBreakdown: { scoring: -0.4, defense: -0.2, efficiency: -0.1, news: -0.3 },
    last5: [
      { date: "5/15", opp: "@MIN", line: "21/8/9 · 8/16", plusMinus: -5 },
      { date: "5/13", opp: "vs DEN", line: "24/7/8 · 9/17", plusMinus: 2 },
      { date: "5/11", opp: "@POR", line: "DNP · rest", plusMinus: 0 },
      { date: "5/09", opp: "vs GSW", line: "23/9/7 · 9/18", plusMinus: 6 },
      { date: "5/07", opp: "@PHX", line: "22/8/8 · 8/17", plusMinus: -3 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.35 },
      { source: "espn_news", weight: 0.25 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 64,
  },
  {
    playerId: "morant_j",
    displayName: "Ja Morant",
    team: "MEM",
    position: "PG",
    currentRating: 88,
    predictedDelta: 3,
    confidence: 0.74,
    primaryDriver: "Return from injury: 27/5/8 over 4 games, USG 32%",
    driverBreakdown: { scoring: 1.2, defense: 0.2, efficiency: 0.7, news: 0.9 },
    last5: [
      { date: "5/15", opp: "@NOP", line: "28/4/9 · 11/21", plusMinus: 12 },
      { date: "5/13", opp: "vs SAS", line: "26/6/7 · 10/19", plusMinus: 7 },
      { date: "5/11", opp: "@HOU", line: "29/5/8 · 11/20", plusMinus: 9 },
      { date: "5/09", opp: "vs DAL", line: "25/4/9 · 10/19", plusMinus: 4 },
      { date: "5/07", opp: "@POR", line: "DNP · return mgmt", plusMinus: 0 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.25 },
      { source: "nba_stats", weight: 0.4 },
      { source: "espn_news", weight: 0.25 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 84,
  },
  {
    playerId: "banchero_p",
    displayName: "Paolo Banchero",
    team: "ORL",
    position: "PF",
    currentRating: 87,
    predictedDelta: 2,
    confidence: 0.77,
    primaryDriver: "24/8/5 on 56% TS; usage up to 30%",
    driverBreakdown: { scoring: 0.9, defense: 0.3, efficiency: 0.5, news: 0.1 },
    last5: [
      { date: "5/15", opp: "vs CHA", line: "26/9/4 · 10/19", plusMinus: 8 },
      { date: "5/13", opp: "@PHI", line: "22/7/5 · 9/18", plusMinus: -3 },
      { date: "5/11", opp: "vs WAS", line: "27/10/6 · 11/20", plusMinus: 14 },
      { date: "5/09", opp: "@ATL", line: "21/7/4 · 8/18", plusMinus: 2 },
      { date: "5/07", opp: "vs MIA", line: "25/8/5 · 10/19", plusMinus: 6 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 81,
  },
  {
    playerId: "siakam_p",
    displayName: "Pascal Siakam",
    team: "IND",
    position: "PF",
    currentRating: 87,
    predictedDelta: 1,
    confidence: 0.69,
    primaryDriver: "22/7/4 on 60% TS; quietly steady",
    driverBreakdown: { scoring: 0.3, defense: 0.1, efficiency: 0.5, news: 0.0 },
    last5: [
      { date: "5/15", opp: "vs CLE", line: "23/8/4 · 9/17", plusMinus: 5 },
      { date: "5/13", opp: "@CHI", line: "21/6/3 · 8/16", plusMinus: 2 },
      { date: "5/11", opp: "vs DET", line: "24/7/5 · 10/18", plusMinus: 9 },
      { date: "5/09", opp: "@MIL", line: "19/8/3 · 7/16", plusMinus: -2 },
      { date: "5/07", opp: "vs CHA", line: "22/7/4 · 9/17", plusMinus: 7 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.4 },
      { source: "nba_stats", weight: 0.4 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 73,
  },
  {
    playerId: "george_p",
    displayName: "Paul George",
    team: "PHI",
    position: "SF",
    currentRating: 89,
    predictedDelta: -2,
    confidence: 0.71,
    primaryDriver: "Shooting slump: 38% FG over last 5; minutes capped",
    driverBreakdown: { scoring: -0.6, defense: -0.2, efficiency: -0.7, news: -0.3 },
    last5: [
      { date: "5/15", opp: "@MIA", line: "16/4/3 · 6/17", plusMinus: -8 },
      { date: "5/13", opp: "vs ORL", line: "19/5/4 · 7/19", plusMinus: -2 },
      { date: "5/11", opp: "@CHI", line: "14/3/2 · 5/16", plusMinus: -11 },
      { date: "5/09", opp: "vs MIL", line: "18/4/3 · 7/18", plusMinus: -4 },
      { date: "5/07", opp: "@BKN", line: "17/5/4 · 6/17", plusMinus: -6 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.4 },
      { source: "espn_news", weight: 0.2 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 38,
  },
  {
    playerId: "fox_d",
    displayName: "De'Aaron Fox",
    team: "SAS",
    position: "PG",
    currentRating: 89,
    predictedDelta: 1,
    confidence: 0.7,
    primaryDriver: "25/4/6 since trade; pace +4 with Wemby",
    driverBreakdown: { scoring: 0.4, defense: 0.0, efficiency: 0.3, news: 0.2 },
    last5: [
      { date: "5/15", opp: "@LAC", line: "27/4/7 · 10/21", plusMinus: 11 },
      { date: "5/13", opp: "vs PHX", line: "23/5/6 · 9/19", plusMinus: 4 },
      { date: "5/11", opp: "@HOU", line: "26/3/7 · 10/20", plusMinus: 9 },
      { date: "5/09", opp: "vs UTA", line: "24/5/5 · 9/20", plusMinus: 7 },
      { date: "5/07", opp: "@MEM", line: "25/4/6 · 10/21", plusMinus: 3 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.15 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 79,
  },
  {
    playerId: "trae_y",
    displayName: "Trae Young",
    team: "ATL",
    position: "PG",
    currentRating: 88,
    predictedDelta: -1,
    confidence: 0.66,
    primaryDriver: "Defense liability widening: 118 DRtg, -6 on/off",
    driverBreakdown: { scoring: 0.3, defense: -1.0, efficiency: 0.0, news: -0.3 },
    last5: [
      { date: "5/15", opp: "vs MIA", line: "27/3/10 · 9/22", plusMinus: -4 },
      { date: "5/13", opp: "@BOS", line: "22/2/9 · 7/20", plusMinus: -12 },
      { date: "5/11", opp: "vs DET", line: "29/3/8 · 10/22", plusMinus: 2 },
      { date: "5/09", opp: "@CHA", line: "26/2/11 · 9/21", plusMinus: -1 },
      { date: "5/07", opp: "vs CLE", line: "24/3/9 · 8/20", plusMinus: -7 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.15 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 60,
  },
  {
    playerId: "mobley_e",
    displayName: "Evan Mobley",
    team: "CLE",
    position: "PF",
    currentRating: 87,
    predictedDelta: 2,
    confidence: 0.81,
    primaryDriver: "DPOY trajectory: 2.1 BPG, opp FG -8% at rim",
    driverBreakdown: { scoring: 0.3, defense: 1.2, efficiency: 0.4, news: 0.1 },
    last5: [
      { date: "5/15", opp: "@IND", line: "18/11/3 · 3 BLK", plusMinus: 12 },
      { date: "5/13", opp: "vs MIL", line: "21/10/4 · 4 BLK", plusMinus: 9 },
      { date: "5/11", opp: "@DET", line: "16/12/3 · 2 BLK", plusMinus: 14 },
      { date: "5/09", opp: "vs CHI", line: "19/11/4 · 3 BLK", plusMinus: 6 },
      { date: "5/07", opp: "@TOR", line: "17/10/3 · 3 BLK", plusMinus: 11 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.5 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 85,
  },
  {
    playerId: "holmgren_c",
    displayName: "Chet Holmgren",
    team: "OKC",
    position: "C",
    currentRating: 87,
    predictedDelta: 1,
    confidence: 0.73,
    primaryDriver: "Stretch 5 efficiency: 39% from 3, 2.4 BPG",
    driverBreakdown: { scoring: 0.4, defense: 0.5, efficiency: 0.3, news: 0.0 },
    last5: [
      { date: "5/15", opp: "vs MIN", line: "20/9/3 · 3 BLK", plusMinus: 10 },
      { date: "5/13", opp: "@POR", line: "18/8/2 · 2 BLK", plusMinus: 16 },
      { date: "5/11", opp: "vs SAC", line: "22/10/3 · 3 BLK", plusMinus: 6 },
      { date: "5/09", opp: "@NOP", line: "17/9/2 · 2 BLK", plusMinus: 7 },
      { date: "5/07", opp: "vs DAL", line: "21/8/3 · 4 BLK", plusMinus: 12 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.5 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 82,
  },
  {
    playerId: "lillard_d",
    displayName: "Damian Lillard",
    team: "MIL",
    position: "PG",
    currentRating: 91,
    predictedDelta: -2,
    confidence: 0.76,
    primaryDriver: "TS% 51% over last 10; -7 on/off",
    driverBreakdown: { scoring: -0.5, defense: -0.4, efficiency: -0.7, news: -0.2 },
    last5: [
      { date: "5/15", opp: "@WAS", line: "19/3/6 · 7/19", plusMinus: -2 },
      { date: "5/13", opp: "vs IND", line: "22/4/7 · 8/21", plusMinus: -8 },
      { date: "5/11", opp: "@BKN", line: "17/3/5 · 6/18", plusMinus: -11 },
      { date: "5/09", opp: "vs PHI", line: "21/4/6 · 8/20", plusMinus: -4 },
      { date: "5/07", opp: "@DET", line: "20/3/7 · 7/19", plusMinus: 3 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.3 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.15 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 49,
  },
  {
    playerId: "antetokounmpo_g",
    displayName: "Giannis Antetokounmpo",
    team: "MIL",
    position: "PF",
    currentRating: 97,
    predictedDelta: 0,
    confidence: 0.92,
    primaryDriver: "30/12/6 on 64% TS; rating ceiling",
    driverBreakdown: { scoring: 0.2, defense: 0.1, efficiency: 0.1, news: 0.0 },
    last5: [
      { date: "5/15", opp: "@WAS", line: "32/13/7 · 13/21", plusMinus: 14 },
      { date: "5/13", opp: "vs IND", line: "29/11/5 · 12/20", plusMinus: 6 },
      { date: "5/11", opp: "@BKN", line: "31/12/6 · 12/22", plusMinus: 9 },
      { date: "5/09", opp: "vs PHI", line: "28/14/8 · 11/20", plusMinus: 11 },
      { date: "5/07", opp: "@DET", line: "30/12/4 · 12/21", plusMinus: 17 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.4 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.05 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 91,
  },
  {
    playerId: "butler_j",
    displayName: "Jimmy Butler",
    team: "MIA",
    position: "SF",
    currentRating: 90,
    predictedDelta: -1,
    confidence: 0.68,
    primaryDriver: "Minutes 30, scoring -2.4; conserving for postseason",
    driverBreakdown: { scoring: -0.3, defense: 0.0, efficiency: -0.3, news: -0.4 },
    last5: [
      { date: "5/15", opp: "vs PHI", line: "18/5/4 · 7/15", plusMinus: -2 },
      { date: "5/13", opp: "@ATL", line: "21/6/5 · 8/16", plusMinus: 4 },
      { date: "5/11", opp: "vs CHA", line: "DNP · rest", plusMinus: 0 },
      { date: "5/09", opp: "@ORL", line: "19/4/6 · 7/17", plusMinus: 2 },
      { date: "5/07", opp: "vs NYK", line: "20/5/4 · 8/16", plusMinus: -6 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.25 },
      { source: "nba_stats", weight: 0.35 },
      { source: "espn_news", weight: 0.3 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 62,
  },
  {
    playerId: "barnes_s",
    displayName: "Scottie Barnes",
    team: "TOR",
    position: "PF",
    currentRating: 85,
    predictedDelta: 2,
    confidence: 0.74,
    primaryDriver: "22/8/7 with 1.6 STL; expanded playmaking role",
    driverBreakdown: { scoring: 0.5, defense: 0.6, efficiency: 0.4, news: 0.1 },
    last5: [
      { date: "5/15", opp: "vs BOS", line: "24/9/8 · 10/19", plusMinus: -4 },
      { date: "5/13", opp: "@DET", line: "21/7/6 · 8/17", plusMinus: 2 },
      { date: "5/11", opp: "vs MIL", line: "23/8/7 · 9/18", plusMinus: -8 },
      { date: "5/09", opp: "@NYK", line: "19/9/9 · 7/17", plusMinus: -3 },
      { date: "5/07", opp: "vs CLE", line: "22/8/6 · 9/18", plusMinus: 1 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 76,
  },
  {
    playerId: "white_d",
    displayName: "Derrick White",
    team: "BOS",
    position: "SG",
    currentRating: 86,
    predictedDelta: 1,
    confidence: 0.72,
    primaryDriver: "Quiet riser: 18/3/5 · 1.8 BPG · 41% from 3",
    driverBreakdown: { scoring: 0.3, defense: 0.4, efficiency: 0.4, news: 0.0 },
    last5: [
      { date: "5/15", opp: "vs PHI", line: "20/4/5 · 7/14", plusMinus: 13 },
      { date: "5/13", opp: "@TOR", line: "17/3/6 · 6/14", plusMinus: 9 },
      { date: "5/11", opp: "vs WAS", line: "19/4/5 · 7/15", plusMinus: 16 },
      { date: "5/09", opp: "@DET", line: "16/3/4 · 6/13", plusMinus: 11 },
      { date: "5/07", opp: "vs ATL", line: "18/3/5 · 6/14", plusMinus: 8 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.5 },
      { source: "espn_news", weight: 0.05 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 80,
  },
  {
    playerId: "randle_j",
    displayName: "Julius Randle",
    team: "MIN",
    position: "PF",
    currentRating: 85,
    predictedDelta: 0,
    confidence: 0.65,
    primaryDriver: "Volume even, efficiency flat; no signal either way",
    driverBreakdown: { scoring: 0.0, defense: 0.1, efficiency: -0.1, news: 0.0 },
    last5: [
      { date: "5/15", opp: "vs LAL", line: "19/8/4 · 7/17", plusMinus: 4 },
      { date: "5/13", opp: "@POR", line: "21/9/3 · 8/18", plusMinus: 8 },
      { date: "5/11", opp: "vs SAC", line: "18/7/5 · 7/16", plusMinus: -2 },
      { date: "5/09", opp: "@HOU", line: "20/8/4 · 8/17", plusMinus: 5 },
      { date: "5/07", opp: "vs DEN", line: "19/9/3 · 7/16", plusMinus: -3 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.4 },
      { source: "nba_stats", weight: 0.4 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 68,
  },
  {
    playerId: "porzingis_k",
    displayName: "Kristaps Porzingis",
    team: "BOS",
    position: "C",
    currentRating: 88,
    predictedDelta: -1,
    confidence: 0.67,
    primaryDriver: "Calf soreness, minutes restricted to 26",
    driverBreakdown: { scoring: -0.2, defense: -0.1, efficiency: 0.0, news: -0.5 },
    last5: [
      { date: "5/15", opp: "vs PHI", line: "16/6/2 · 6/13", plusMinus: 4 },
      { date: "5/13", opp: "@TOR", line: "DNP · calf", plusMinus: 0 },
      { date: "5/11", opp: "vs WAS", line: "18/7/3 · 7/14", plusMinus: 11 },
      { date: "5/09", opp: "@DET", line: "14/5/2 · 5/12", plusMinus: 6 },
      { date: "5/07", opp: "vs ATL", line: "17/8/2 · 6/13", plusMinus: 9 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.25 },
      { source: "nba_stats", weight: 0.35 },
      { source: "espn_news", weight: 0.3 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 55,
  },
  {
    playerId: "cunningham_c",
    displayName: "Cade Cunningham",
    team: "DET",
    position: "PG",
    currentRating: 84,
    predictedDelta: 2,
    confidence: 0.75,
    primaryDriver: "25/6/9 last 10; AST% 38, TS% 58",
    driverBreakdown: { scoring: 0.7, defense: 0.1, efficiency: 0.5, news: 0.2 },
    last5: [
      { date: "5/15", opp: "vs IND", line: "27/5/10 · 10/20", plusMinus: 4 },
      { date: "5/13", opp: "@BOS", line: "23/7/8 · 9/19", plusMinus: -6 },
      { date: "5/11", opp: "vs CHI", line: "26/6/11 · 10/21", plusMinus: 7 },
      { date: "5/09", opp: "@CLE", line: "24/5/9 · 9/20", plusMinus: 2 },
      { date: "5/07", opp: "vs MIL", line: "25/6/8 · 10/20", plusMinus: -4 },
    ],
    sourceContribs: [
      { source: "balldontlie", weight: 0.35 },
      { source: "nba_stats", weight: 0.45 },
      { source: "espn_news", weight: 0.1 },
      { source: "reddit_2k", weight: 0.1 },
    ],
    nextUpdateEta: "Thu 5/22",
    computedAt: "2026-05-16T16:00:00Z",
    recentForm: 82,
  },
];

// -----------------------------------------------------------------------------
// SOURCES — mart_pulse_sources
// -----------------------------------------------------------------------------
export const SOURCES: PulseSource[] = [
  {
    id: "balldontlie",
    label: "balldontlie",
    lastSyncSecondsAgo: 47,
    rowsIngestedToday: 184,
  },
  {
    id: "nba_stats",
    label: "nba_stats",
    lastSyncSecondsAgo: 112,
    rowsIngestedToday: 142,
  },
  {
    id: "espn_news",
    label: "espn_news",
    lastSyncSecondsAgo: 318,
    rowsIngestedToday: 41,
  },
  {
    id: "reddit_2k",
    label: "reddit_2k",
    lastSyncSecondsAgo: 92,
    rowsIngestedToday: 45,
  },
];

// -----------------------------------------------------------------------------
// Helpers — equivalent to parameterized queries against mart_rating_predictions
// -----------------------------------------------------------------------------
export function getRisers(min = 1): RatingPrediction[] {
  return [...PREDICTIONS]
    .filter((p) => p.predictedDelta >= min)
    .sort((a, b) => b.predictedDelta - a.predictedDelta || b.confidence - a.confidence);
}

export function getFallers(max = -1): RatingPrediction[] {
  return [...PREDICTIONS]
    .filter((p) => p.predictedDelta <= max)
    .sort((a, b) => a.predictedDelta - b.predictedDelta || b.confidence - a.confidence);
}

export function getHighConfidence(threshold = 0.8): RatingPrediction[] {
  return [...PREDICTIONS]
    .filter((p) => p.confidence >= threshold && p.predictedDelta !== 0)
    .sort((a, b) => b.confidence - a.confidence);
}

export function getThisWeek(): RatingPrediction[] {
  // Returns predictions ordered by absolute delta size (week-impact view).
  return [...PREDICTIONS].sort(
    (a, b) => Math.abs(b.predictedDelta) - Math.abs(a.predictedDelta) || b.confidence - a.confidence,
  );
}

export function getByTeam(team: string): RatingPrediction[] {
  return PREDICTIONS.filter((p) => p.team === team);
}

export function searchPlayers(q: string): RatingPrediction[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return PREDICTIONS;
  return PREDICTIONS.filter(
    (p) =>
      p.displayName.toLowerCase().includes(needle) ||
      p.team.toLowerCase().includes(needle) ||
      p.position.toLowerCase().includes(needle),
  );
}

export function getMethodology(): string {
  return [
    "rating_delta = ",
    "  Σ position_weight[i] × (recent_form[i] − season_baseline[i])",
    "  + novelty_bonus(return_from_injury, new_role)",
    "  − news_penalty(injury_severity, role_reduction)",
    "",
    "recent_form is the trailing-5 z-score across scoring, defense, and efficiency",
    "vectors pulled from mart_player_360. position_weight is tuned per archetype",
    "(e.g. PG over-indexes on AST and USG; C over-indexes on BLK and rim FG%).",
    "Final delta is clamped to [-4, +4] and rounded to whole rating points to",
    "match how 2K typically ships in-season updates.",
  ].join("\n");
}

export const TEAMS_IN_PLAY: string[] = Array.from(
  new Set(PREDICTIONS.map((p) => p.team)),
).sort();

export const POSITIONS: ("PG" | "SG" | "SF" | "PF" | "C")[] = [
  "PG",
  "SG",
  "SF",
  "PF",
  "C",
];

// Team accent colors — used for initials avatars.
// Source: static reference, not from a Fivetran feed.
export const TEAM_COLOR: Record<string, string> = {
  PHI: "#006BB6",
  BOS: "#007A33",
  OKC: "#007AC1",
  DEN: "#FEC524",
  LAL: "#552583",
  MIN: "#236192",
  DAL: "#00538C",
  NYK: "#F58426",
  SAS: "#C4CED4",
  GSW: "#1D428A",
  CLE: "#860038",
  IND: "#FDBB30",
  MIA: "#98002E",
  ATL: "#E03A3E",
  MEM: "#5D76A9",
  ORL: "#0077C0",
  MIL: "#00471B",
  TOR: "#CE1141",
  DET: "#C8102E",
  HOU: "#CE1141",
  CHI: "#CE1141",
  BKN: "#000000",
  WAS: "#002B5C",
  CHA: "#1D1160",
  PHX: "#1D1160",
  POR: "#E03A3E",
  SAC: "#5A2D81",
  UTA: "#002B5C",
  NOP: "#0C2340",
  LAC: "#C8102E",
};
