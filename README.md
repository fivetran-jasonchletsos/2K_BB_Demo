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
Data Lake Service: S3 + Iceberg + catalog). **Snowflake-on-Iceberg** is
the primary read engine: it attaches to the MDLS Polaris catalog via an
external volume + catalog integration, dbt runs there, and Next.js
consumes the marts. Athena, Databricks, and Trino can read the same
Iceberg tables from the same catalog if needed — no re-ingest.

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
                                         │  one Iceberg catalog
                                         ▼
                              ┌─────────────────────────┐
                              │  Snowflake-on-Iceberg   │  <-- primary
                              │  external volume +      │      read engine
                              │  catalog integration    │
                              │  (table_type='iceberg') │
                              └───────────┬─────────────┘
                                          ▼
                                  ┌────────────────┐
                                  │  dbt           │
                                  │  on Snowflake- │
                                  │  on-Iceberg    │
                                  │  stg/int/marts │
                                  └───────┬────────┘
                                          ▼
                                  ┌────────────────┐
                                  │  Next.js       │
                                  │  /pulse,       │
                                  │  /players,     │
                                  │  /stack        │
                                  └────────────────┘

   ┌─ Compatible (catalog-readable, not the active dbt target) ──────────┐
   │  Athena  ·  Databricks SQL  ·  Trino                                │
   │  attach to the same Polaris/Glue Iceberg catalog · same tables      │
   └─────────────────────────────────────────────────────────────────────┘
```

### Why MDLS

One Iceberg table set, written once by the Fivetran connectors, readable
by any engine with an Iceberg catalog client. We demo
Snowflake-on-Iceberg here. Athena, Databricks, and Trino read the same
catalog if needed — no re-ingest.

- `fivetran/connectors/` — 6 Fivetran Connector SDK custom connectors (Python).
- `dbt/` — 7 staging models, 2 intermediates, 3 marts. Primary target is
  Snowflake-on-Iceberg; Athena is retained as an alternative profile for
  multi-engine demos. Key mart: `mart_rating_predictions` (player_id,
  predicted_delta, confidence, primary_driver).
- App reads marts via JSON snapshots in `public/data/`; if an MDLS
  destination + engine are configured, the same shape is served from a
  live query.

## Stack

- **Data layer** — Fivetran SDK + MDLS (S3 + Iceberg + Glue/Polaris catalog)
- **Transformation** — dbt on Snowflake-on-Iceberg (Athena alternative profile retained)
- **Frontend** — Next.js 14 (App Router) · TypeScript · Tailwind, static export
- **Deploy** — GitHub Pages via `.github/workflows/deploy.yml`
- **AI backend** — optional Cloudflare Worker in `proxy/` that holds the
  Anthropic API key as a CF secret and forwards `POST /v1/messages`. The
  static site calls the Worker; the Worker calls Anthropic. Avoids the
  browser-CORS gate and keeps the key off the device. See **Production:
  deploy the Worker** below.
- **Demo data** — pre-built JSON snapshots in `public/data/`; the same
  pipeline runs live when MDLS + an engine are configured
- localStorage for personal state (saved builds, redeemed codes, tier list
  overrides, scenario progress, favorite tips/moves/combos)
- No third-party UI libraries; primitives in `components/ui.tsx`
- Scaffolded with Claude Code in 9 parallel agents

### Production: deploy the Worker

The site can call Claude two ways: a Worker proxy (preferred — no CORS,
no key in the browser) or a direct browser call with a per-device API
key. To stand up the Worker:

```bash
cd proxy
npx wrangler@latest login
npx wrangler@latest secret put ANTHROPIC_API_KEY
npx wrangler@latest deploy
```

The deploy command prints a URL like
`https://twok-lab-proxy.<your-sub>.workers.dev`. Paste that into the
**Worker proxy URL** card on the site's `/connect` page. From then on
the site routes Claude requests through the Worker and ignores any
in-browser Anthropic key.

Full details, custom-domain setup, and local-dev instructions live in
[`proxy/README.md`](proxy/README.md).
