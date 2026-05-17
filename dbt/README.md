# dbt project: `nba_2k_lab`

Snowflake-targeted dbt project that models data landed by the custom
Fivetran connectors in `../fivetran/`.

## Layout

```
dbt/
├── dbt_project.yml
├── profiles.example.yml
└── models/
    ├── sources.yml                  # 6 source schemas, 14 source tables
    ├── staging/                     # 7 views, one per source table family
    ├── intermediate/                # 2 tables (recent_form, news_signal)
    └── marts/                       # 3 marts + _models.yml tests
```

## Layer schemas

`dbt_project.yml` overrides `+schema:` per layer. Combined with the base
schema in your profile (`schema: nba`) you'll get:

| Layer        | Snowflake schema  |
| ------------ | ----------------- |
| staging      | `nba_raw_stg`     |
| intermediate | `nba_int`         |
| marts        | `nba_marts`       |

## Run

```bash
pip install dbt-snowflake
cp profiles.example.yml ~/.dbt/profiles.yml
# edit account, user, password/key

cd dbt
dbt deps
dbt seed       # no seeds yet, but harmless
dbt build      # runs models + tests in DAG order
```

## Marts

- **mart_player_360** — incremental. One row per player. Profile + recent
  form (last 5 / last 30d) + news signal + 2KRatings join.
- **mart_rating_predictions** — incremental. Delta forecast vs current 2K
  rating with `primary_driver` attribution. Delta clamped to `[-5, +5]`.
- **mart_locker_codes_active** — view. Currently-active locker codes
  ranked by time to expiry.

## Tests

`models/marts/_models.yml` covers:
- `unique` + `not_null` on every PK
- `accepted_values` on `primary_driver`
- `relationships` between `mart_rating_predictions.player_id` and
  `mart_player_360.player_id`

Source-level `unique` + `not_null` tests on natural keys live in
`models/sources.yml`. Source freshness SLAs are declared for the three
high-cadence sources (balldontlie 30m/2h, reddit 30m/3h, twokratings
36h/72h).

## SQL conventions

- Snowflake dialect throughout (`qualify`, `try_cast`, `try_to_timestamp_tz`,
  `object_construct`, `datediff(unit, ...)`, range-windowed `interval`).
- Staging filters `_fivetran_deleted = false` and dedupes with
  `qualify row_number() over (partition by <pk> order by _fivetran_synced desc) = 1`.
- Incremental marts use `unique_key` + `on_schema_change='append_new_columns'`
  and gate work on `updated_at` / `computed_at` watermarks.
