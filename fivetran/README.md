# Fivetran Custom Connectors

Six custom connectors built with the **Fivetran Connector SDK** that land data
into **MDLS** (Managed Data Lake Service) — Fivetran's managed S3 + Iceberg +
catalog destination — for the 2K Lab demo.

## Why MDLS

MDLS is Fivetran's managed data lake destination. Each connector writes
directly into an Iceberg-formatted S3 bucket, and Fivetran registers the
tables in a managed catalog (AWS Glue, Snowflake Polaris, or AWS Lake
Formation). Any engine with an Iceberg catalog reader — Snowflake,
Databricks, Athena, Trino, BigQuery — can then read the **same** tables
without copying data.

- One copy of the data, in open Iceberg format on S3
- Catalog is managed by Fivetran (Glue or Polaris)
- Bronze schemas one-per-source, e.g. `bronze_balldontlie`, `bronze_nba_stats`
- No vendor lock-in: swap the query engine without re-ingesting

```
                       ┌──────────────────────────────┐
                       │   MDLS destination           │
  Fivetran connectors  │   ──────────────────────     │   Query engines
  ───────────────────  │   S3 (Parquet, Iceberg)      │   ──────────────
  balldontlie          │   + managed catalog          │   Snowflake
  nba_stats         ─▶ │     (Glue / Polaris)         │ ─▶ Databricks  ─▶ dbt ─▶ app
  reddit_2k            │                              │   Athena
  twokratings          │   bronze_<source>.<table>    │   Trino
  espn_news            │                              │
  locker_codes         └──────────────────────────────┘
```

## Layout

```
fivetran/
├── connectors/
│   ├── balldontlie/    # NBA stats REST API (api.balldontlie.io)
│   ├── nba_stats/      # stats.nba.com (browser-headers, rate-limited)
│   ├── reddit_2k/      # r/NBA2k + r/NBA2k26 via OAuth
│   ├── twokratings/    # 2KRatings.com HTML scrape (community-curated)
│   ├── espn_news/      # ESPN public JSON endpoints
│   └── locker_codes/   # 2K locker code aggregator
└── destinations/
    └── mdls.md         # MDLS destination configuration reference
```

Each connector folder contains:

- `connector.py`     — SDK entrypoint defining `schema()` + `update()`
- `requirements.txt` — pip deps (always includes `fivetran-connector-sdk`)
- `configuration.json` — example **source** config shape (api_key, etc.)

The connector SDK is destination-agnostic. `op.upsert(...)` and
`op.checkpoint(state)` are translated by Fivetran into Iceberg writes against
the MDLS bucket; the connector code itself does not reference S3, Iceberg, or
the catalog directly.

## Destination configuration (one-time)

Destination config lives in the Fivetran UI, **not** in `configuration.json`.
The connector config only carries source credentials. To wire a connector to
MDLS:

1. In Fivetran, create a destination of type **Managed Data Lake (MDLS)**.
2. Provide:
   - S3 bucket (e.g. `fivetran-mdls-2k-lab`)
   - AWS region (e.g. `us-east-1`)
   - Catalog type (`glue` or `polaris`)
   - IAM role ARN with read/write to the bucket
3. When deploying each connector, select the MDLS destination and set the
   target **schema** to `bronze_<source>` (e.g. `bronze_balldontlie`).

See [`destinations/mdls.md`](destinations/mdls.md) for full destination
configuration, bucket layout, and engine-side catalog wiring.

## Target schemas and table mapping

| Connector       | MDLS schema           | Tables landed                                                   |
| --------------- | --------------------- | --------------------------------------------------------------- |
| balldontlie     | `bronze_balldontlie`  | `teams`, `players`, `games`, `stats`, `season_averages`         |
| nba_stats       | `bronze_nba_stats`    | `box_scores`, `play_by_play`, `lineups`, `shot_chart_detail`    |
| reddit_2k       | `bronze_reddit_2k`    | `posts`, `comments`                                             |
| twokratings     | `bronze_twokratings`  | `player_ratings`, `rating_history`                              |
| espn_news       | `bronze_espn_news`    | `articles`, `headlines`                                         |
| locker_codes    | `bronze_locker_codes` | `drops`                                                         |

## Local run

```bash
pip install fivetran-connector-sdk
cd fivetran/connectors/balldontlie
# fill in configuration.json with a real api_key
fivetran debug --configuration configuration.json
```

`fivetran debug` prints upsert and checkpoint operations to stdout and
emulates a real sync. To exercise an end-to-end Iceberg write, point the
debug run at a developer MDLS destination configured in your Fivetran
account.

## Deploy

Use `fivetran deploy` from each connector directory to publish the connector
to your Fivetran account, selecting the MDLS destination and the appropriate
`bronze_<source>` schema. State (cursors) is persisted between syncs by
Fivetran; do not put cursor values in `configuration.json`.

## Schedules

| Connector       | Cadence          | Cursor field        |
| --------------- | ---------------- | ------------------- |
| balldontlie     | every 15 min     | `updated_at`        |
| nba_stats       | every 30 min     | `game_date`         |
| reddit_2k       | every 10 min     | `created_utc`       |
| twokratings     | daily 06:00 UTC  | `scraped_at` (full) |
| espn_news       | every 5 min      | `published`         |
| locker_codes    | every 5 min      | `seen_at`           |

## Notes

- **twokratings** is a community-maintained site, scraped with BeautifulSoup.
  We treat it as advisory ground-truth, not as official 2K data.
- **nba_stats** requires browser-like headers and is aggressively
  rate-limited; the connector backs off on HTTP 429.
- **reddit_2k** uses OAuth2 script-app credentials. Provide
  `client_id`, `client_secret`, and `refresh_token` in the connector config.
- **locker_codes** consumes from a community aggregator JSON endpoint; the
  endpoint URL is configurable so the connector can be repointed without
  re-deploying.
- All six connectors land into the same MDLS destination; downstream dbt
  models read the Iceberg tables via whichever query engine the project
  selects.
