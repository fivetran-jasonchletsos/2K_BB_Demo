# Fivetran Custom Connectors

Six custom connectors built with the **Fivetran Connector SDK** that land data
into Snowflake for the 2K Lab demo.

## Layout

```
fivetran/connectors/
├── balldontlie/    # NBA stats REST API (api.balldontlie.io)
├── nba_stats/      # stats.nba.com (browser-headers, rate-limited)
├── reddit_2k/      # r/NBA2k + r/NBA2k26 via OAuth
├── twokratings/    # 2KRatings.com HTML scrape (community-curated)
├── espn_news/      # ESPN public JSON endpoints
└── locker_codes/   # 2K locker code aggregator
```

Each folder contains:

- `connector.py`     — SDK entrypoint defining `schema()` + `update()`
- `requirements.txt` — pip deps (always includes `fivetran-connector-sdk`)
- `configuration.json` *(balldontlie only)* — example config shape

## Local run

```bash
pip install fivetran-connector-sdk
cd fivetran/connectors/balldontlie
# fill in configuration.json with a real api_key
fivetran debug --configuration configuration.json
```

`fivetran debug` will print upsert and checkpoint operations to stdout
and emulate a real sync against your developer Snowflake destination.

## Deploy

Use `fivetran deploy` from each connector directory to publish the connector
to your Fivetran account. State (cursors) is persisted between syncs by
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
