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

Real architecture:

```
Sources               Fivetran SDK         Snowflake        dbt                Next.js
─────────────         ──────────────       ──────────       ──────────         ──────────
balldontlie     ─┐
NBA Stats        ├──→  custom connectors ──→  raw schema ──→ stg/int/marts ──→  /pulse, /players
ESPN news        │     (Python)
Reddit r/NBA2K   │
2KRatings.com    │
Locker code feeds┘
```

- `fivetran/connectors/` — 6 Fivetran Connector SDK custom connectors (Python).
- `dbt/` — 7 staging models, 2 intermediates, 3 marts (Snowflake). Key mart: `mart_rating_predictions` (player_id, predicted_delta, confidence, primary_driver).
- App reads marts; for the local demo, `lib/pulse.ts` has mock data shaped exactly as the mart output.

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind
- localStorage for personal state (saved builds, redeemed codes, tier list overrides, scenario progress, favorite tips/moves/combos)
- No third-party UI libraries; primitives in `components/ui.tsx`
- Scaffolded with Claude Code in 9 parallel agents
