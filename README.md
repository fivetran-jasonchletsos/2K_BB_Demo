# 2K LAB

NBA 2K26 reference site + ODI demo. Builds, badges, locker codes, moves, players, scenarios, secrets, and live NBA stats with predicted 2K rating changes.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 on your laptop, or visit it from your phone on the same Wi-Fi at `http://<your-mac-ip>:3000`.

To deploy publicly: push to GitHub, import the repo at https://vercel.com — one click, free, gives him a shareable URL like `2k-lab.vercel.app`.

## Pages

| Route | What it does |
|---|---|
| `/` | Dashboard: saved builds, sections, expiring codes callout |
| `/builds` | Interactive MyPlayer build optimizer — sliders, archetypes, attribute caps, badge picks, VC cost |
| `/badges` | 80-badge tier list — filter, search, personal tier list mode, compare drawer |
| `/codes` | Active locker codes — live countdowns, copy-to-clipboard, redeemed tracking |
| `/moves` | PS5 dribble/post/sig moves — combo builder, favorites, share codes |
| `/players` | 60 NBA players — search, filter, compare, expand for full attributes + game log |
| `/scenarios` | 24 end-game decision drills — EV math, streak tracking |
| `/tips` | 50 tips & secrets — daily top 3, search, favorites, learned tracking |
| `/pulse` | Live NBA → predicted 2K rating deltas (Fivetran-fed) |
| `/stack` | ODI demo backbone: architecture, sources, dbt models, code preview |

## ODI demo angle

Real architecture — Fivetran SDK lands six sources into **MDLS** (Managed
Data Lake Service: S3 + Iceberg + catalog), and any compute engine reads
the same Iceberg tables. dbt runs against whichever engine is wired up;
Next.js consumes either pre-built JSON snapshots or a live engine query.

```
   Sources                  Fivetran SDK
   ─────────────            ──────────────
   balldontlie       ─┐
   NBA Stats          │
   ESPN news          ├──→  6 custom connectors  ─┐
   Reddit r/NBA2K     │     (Python)               │
   2KRatings.com      │                            │
   Locker code feeds ─┘                            │
                                                   ▼
                       ┌──────────────────────────────────────────────┐
                       │  MDLS destination                            │
                       │  ──────────────────────────────────────────  │
                       │  S3 · Apache Iceberg · Glue/Polaris Catalog  │
                       │  bronze_<source>.<table>                     │
                       └─────────────────┬────────────────────────────┘
                                         │  one Iceberg table set,
                                         │  many readers
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼              ▼
                    ┌──────────┐  ┌──────────┐   ┌──────────┐   ┌──────────┐
                    │Snowflake │  │  Athena  │   │Databricks│   │  Trino   │
                    │on-Iceberg│  │          │   │          │   │          │
                    └────┬─────┘  └────┬─────┘   └────┬─────┘   └────┬─────┘
                         └─────────────┴───────┬──────┴──────────────┘
                                               ▼
                                       ┌────────────────┐
                                       │  dbt           │
                                       │  multi-engine  │
                                       │  Snowflake +   │
                                       │  Athena profiles│
                                       │  stg/int/marts │
                                       └───────┬────────┘
                                               ▼
                                       ┌────────────────┐
                                       │  Next.js       │
                                       │  /pulse,       │
                                       │  /players,     │
                                       │  /stack        │
                                       │  (JSON snapshot│
                                       │   or live query)│
                                       └────────────────┘
```

### Why MDLS

One Iceberg table set, written once by the Fivetran connectors, readable
by any engine with an Iceberg catalog client. No engine lock-in: the same
mart definitions run on Snowflake-on-Iceberg or Athena (and could be
pointed at Databricks or Trino without re-ingesting). The demo can be
shown against whichever compute platform the audience cares about.

- `fivetran/connectors/` — 6 Fivetran Connector SDK custom connectors (Python).
- `dbt/` — 7 staging models, 2 intermediates, 3 marts; profiles for
  Snowflake-on-Iceberg (primary) and Athena (alternative), same model SQL
  on both. Key mart: `mart_rating_predictions` (player_id, predicted_delta,
  confidence, primary_driver).
- App reads marts via JSON snapshots in `public/data/`; if an MDLS
  destination + engine are configured, the same shape is served from a
  live query.

## Stack

- **Data layer** — Fivetran SDK + MDLS (S3 + Iceberg + Glue/Polaris catalog)
- **Transformation** — dbt; Snowflake-on-Iceberg primary, Athena alternative,
  same models on both
- **Frontend** — Next.js 14 (App Router) · TypeScript · Tailwind, static export
- **Deploy** — GitHub Pages via `.github/workflows/deploy.yml`
- **Demo data** — pre-built JSON snapshots in `public/data/`; the same
  pipeline runs live when MDLS + an engine are configured
- localStorage for personal state (saved builds, redeemed codes, tier list
  overrides, scenario progress, favorite tips/moves/combos)
- No third-party UI libraries; primitives in `components/ui.tsx`
- Scaffolded with Claude Code in 9 parallel agents
