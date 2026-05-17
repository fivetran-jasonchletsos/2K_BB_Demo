"use client";

import { useMemo, useState } from "react";
import { Card, Pill, Section, Stat } from "@/components/ui";
import {
  HIGHLIGHT_MARTS,
  LINEAGE,
  MODELS,
  PIPELINE_STATS,
  SOURCES,
  type Model,
} from "@/lib/stack";

const SNIPPETS: Record<string, { label: string; lang: string; body: string }> = {
  connector: {
    label: "balldontlie/connector.py",
    lang: "python",
    body: `from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op
import requests
from datetime import datetime, timezone

BASE_URL = "https://api.balldontlie.io/v1"

def schema(configuration: dict):
    return [
        {"table": "players", "primary_key": ["id"]},
        {"table": "teams",   "primary_key": ["id"]},
        {"table": "games",   "primary_key": ["id"]},
        {"table": "stats",   "primary_key": ["id"]},
        {"table": "season_averages", "primary_key": ["player_id", "season"]},
    ]

def _headers(configuration: dict) -> dict:
    api_key = configuration.get("api_key")
    if not api_key:
        raise ValueError("Missing required configuration field: api_key")
    return {"Authorization": api_key, "Accept": "application/json"}

def update(configuration: dict, state: dict):
    cursor = state.get("stats_cursor") or "1970-01-01T00:00:00Z"
    log.info(f"balldontlie sync starting from cursor={cursor}")
    yield from _sync_players(configuration)
    yield from _sync_games(configuration, state)
    yield from _sync_stats(configuration, state, cursor)`,
  },
  staging: {
    label: "stg_nba__player_stats.sql",
    lang: "sql",
    body: `{{ config(materialized='view') }}

with src as (
    select * from {{ source('nba_balldontlie', 'stats') }}
    where coalesce(_fivetran_deleted, false) = false
),
games as (
    select id as game_id, date as game_date, season, home_team_id, visitor_team_id
    from {{ ref('stg_nba__games') }}
)
select
    s.id::number              as stat_id,
    s.player_id::number       as player_id,
    s.team_id::number         as team_id,
    s.game_id::number         as game_id,
    g.game_date::date         as game_date,
    g.season::number          as season,
    s.min::string             as minutes_str,
    try_cast(split_part(s.min, ':', 1) as number) as minutes_played,
    s.pts::number             as pts,
    s.reb::number             as reb,
    s.ast::number             as ast,
    s.stl::number             as stl,
    s.blk::number             as blk,
    s.turnover::number        as tov,
    s.fgm::number             as fgm,
    s.fga::number             as fga,
    s.fg3m::number            as fg3m,
    s.fg3a::number            as fg3a,
    s.ftm::number             as ftm,
    s.fta::number             as fta,
    (s.plus_minus)::number    as plus_minus,
    s._fivetran_synced::timestamp_tz as _synced_at
from src s
left join games g on g.game_id = s.game_id
qualify row_number() over (
    partition by s.id order by s._fivetran_synced desc
) = 1`,
  },
  mart: {
    label: "mart_rating_predictions.sql",
    lang: "sql",
    body: `{{ config(
    materialized='incremental',
    unique_key='player_id',
    on_schema_change='append_new_columns'
) }}

with p360 as (
    select * from {{ ref('mart_player_360') }}
),
baseline as (
    select
        player_id,
        coalesce(current_2k_rating, 75) as current_rating,
        form_z,
        news_score,
        injury_flag
    from p360
),
form_delta as (
    select
        player_id,
        current_rating,
        -- z * 1.5 maps ~+/-2 sigma to ~+/-3 rating points
        round(coalesce(form_z, 0) * 1.5, 2) as d_form,
        case when injury_flag then -2.0 else 0 end as d_injury,
        round(coalesce(news_score, 0) * 1.0, 2) as d_news
    from baseline
),
combined as (
    select
        player_id,
        current_rating,
        d_form, d_injury, d_news,
        greatest(-5.0, least(5.0,
            d_form + d_injury + d_news
        )) as predicted_delta,
        case
            when abs(d_injury) >= abs(d_form) and abs(d_injury) >= abs(d_news)
                then 'injury'
            when abs(d_form) >= abs(d_news) then 'recent_form'
            else 'news_sentiment'
        end as primary_driver,
        least(1.0, 0.4
            + (abs(d_form) * 0.15)
            + (abs(d_news) * 0.10)
            + (case when d_injury <> 0 then 0.15 else 0 end)
        ) as confidence
    from form_delta
)
select
    player_id,
    current_rating,
    predicted_delta::number(3,1) as predicted_delta,
    confidence::float            as confidence,
    primary_driver,
    object_construct(
        'form',   d_form,
        'injury', d_injury,
        'news',   d_news
    ) as driver_breakdown_json,
    current_timestamp()          as computed_at
from combined
{% if is_incremental() %}
  where player_id in (select player_id from p360
                      where updated_at > (select coalesce(max(computed_at), '1970-01-01') from {{ this }}))
{% endif %}`,
  },
  app: {
    label: "app/pulse/page.tsx (excerpt)",
    lang: "tsx",
    body: `// Pulse renders mart_rating_predictions joined to mart_player_360.
// In production this is fetched server-side from Snowflake via a
// thin API route; the demo uses a cached JSON snapshot.

import { getPredictions } from "@/lib/marts";
import { Card, Pill } from "@/components/ui";

export default async function PulsePage() {
  const rows = await getPredictions({ limit: 25 });
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.player_id} className="flex items-center gap-3">
          <div className="font-display text-2xl text-ink">{r.full_name}</div>
          <Pill tone={r.predicted_delta >= 0 ? "lime" : "flame"}>
            {r.predicted_delta >= 0 ? "+" : ""}
            {r.predicted_delta.toFixed(1)}
          </Pill>
          <span className="ml-auto text-xs text-muted">
            driver: {r.primary_driver} · conf {Math.round(r.confidence * 100)}%
          </span>
        </Card>
      ))}
    </div>
  );
}`,
  },
};

function ArchDiagram() {
  const cols: { title: string; nodes: { label: string; sub?: string; tone?: string }[] }[] = [
    {
      title: "Sources",
      nodes: SOURCES.filter((s) => s.id !== "snowflake_internal").map((s) => ({
        label: s.name,
        sub: s.vendor,
      })),
    },
    {
      title: "Fivetran",
      nodes: SOURCES.filter((s) => s.id !== "snowflake_internal").map((s) => ({
        label: s.id,
        sub: `${s.kind.toUpperCase()} · ${s.schedule}`,
      })),
    },
    {
      title: "Snowflake",
      nodes: [
        { label: "RAW_NBA", sub: "nba_balldontlie / nba_stats" },
        { label: "RAW_SOCIAL", sub: "reddit_2k / espn_news" },
        { label: "RAW_2K", sub: "twokratings / locker_codes" },
      ],
    },
    {
      title: "dbt",
      nodes: [
        { label: "staging", sub: "7 views" },
        { label: "intermediate", sub: "2 tables" },
        { label: "marts", sub: "3 models" },
      ],
    },
    {
      title: "App",
      nodes: [
        { label: "/players", sub: "mart_player_360" },
        { label: "/pulse", sub: "mart_rating_predictions" },
        { label: "/codes", sub: "mart_locker_codes_active" },
      ],
    },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-5 gap-3">
        {cols.map((col, i) => (
          <div key={col.title} className="flex flex-col">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              {col.title}
            </div>
            <div
              className={`flex flex-1 flex-col gap-2 rounded-lg border border-line bg-surface p-2 ${
                i < cols.length - 1 ? "border-r-2 border-r-flame/30" : ""
              }`}
            >
              {col.nodes.map((n) => (
                <div
                  key={n.label}
                  className="rounded-md border border-line bg-surface2 px-2 py-1.5"
                >
                  <div className="text-xs font-semibold text-ink">{n.label}</div>
                  {n.sub && (
                    <div className="text-[10px] text-muted">{n.sub}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid min-w-[720px] grid-cols-5 gap-3 text-center text-[10px] text-muted">
        <span>raw JSON / HTML</span>
        <span>incremental upsert</span>
        <span>RAW schema</span>
        <span>SELECT / window / incremental</span>
        <span>Next.js App Router</span>
      </div>
    </div>
  );
}

function ModelsTree() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    staging: true,
    intermediate: true,
    marts: true,
  });
  const grouped = useMemo(() => {
    const g: Record<string, Model[]> = { staging: [], intermediate: [], marts: [] };
    for (const m of MODELS) g[m.layer].push(m);
    return g;
  }, []);
  const matTone = (m: Model["materialization"]) =>
    m === "incremental" ? "flame" : m === "table" ? "gold" : m === "view" ? "ice" : "muted";

  return (
    <div className="divide-y divide-line rounded-lg border border-line bg-surface">
      {(["staging", "intermediate", "marts"] as const).map((layer) => (
        <div key={layer}>
          <button
            type="button"
            onClick={() => setOpen((o) => ({ ...o, [layer]: !o[layer] }))}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span className="font-display text-lg tracking-wide text-ink">
              {layer}
            </span>
            <span className="text-xs text-muted">
              {grouped[layer].length} model{grouped[layer].length === 1 ? "" : "s"} ·{" "}
              {open[layer] ? "hide" : "show"}
            </span>
          </button>
          {open[layer] && (
            <ul className="divide-y divide-line/60 border-t border-line bg-bg/30">
              {grouped[layer].map((m) => (
                <li key={m.id} className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-ink">{m.name}</span>
                    <Pill tone={matTone(m.materialization) as any}>{m.materialization}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted">{m.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function CodeTabs() {
  const keys = Object.keys(SNIPPETS);
  const [active, setActive] = useState(keys[0]);
  const snippet = SNIPPETS[active];
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap gap-1 border-b border-line p-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActive(k)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
              active === k
                ? "bg-flame text-black"
                : "bg-surface2 text-muted hover:text-ink"
            }`}
          >
            {SNIPPETS[k].label}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed text-ink">
        <code className="font-mono">{snippet.body}</code>
      </pre>
    </div>
  );
}

function SourcesTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-surface2 text-[10px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Connector</th>
            <th className="px-3 py-2">Schedule</th>
            <th className="px-3 py-2 text-right">Rows today</th>
            <th className="px-3 py-2">Last sync</th>
            <th className="px-3 py-2">Tables</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-surface">
          {SOURCES.map((s) => (
            <tr key={s.id} className="hover:bg-surface2/50">
              <td className="px-3 py-2">
                <div className="font-semibold text-ink">{s.name}</div>
                <div className="text-[10px] text-muted">{s.vendor}</div>
              </td>
              <td className="px-3 py-2">
                <Pill tone={s.kind === "sdk" ? "flame" : "ice"}>
                  {s.kind === "sdk" ? "Connector SDK" : "Native"}
                </Pill>
              </td>
              <td className="px-3 py-2 text-muted">{s.schedule}</td>
              <td className="px-3 py-2 text-right font-mono text-ink">
                {s.rowsToday.toLocaleString()}
              </td>
              <td className="px-3 py-2 font-mono text-muted">{s.lastSync}</td>
              <td className="px-3 py-2 text-[11px] text-muted">
                {s.tables.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MartHighlights() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {HIGHLIGHT_MARTS.map((m) => (
        <Card key={m.id} className="flex flex-col gap-3">
          <div>
            <div className="font-mono text-xs text-flame">{m.name}</div>
            <p className="mt-1 text-xs text-muted">{m.description}</p>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              Columns
            </div>
            <ul className="divide-y divide-line/60 rounded-md border border-line">
              {m.columns.map((c) => (
                <li
                  key={c.name}
                  className="flex items-baseline justify-between gap-2 px-2 py-1 text-[11px]"
                >
                  <span className="font-mono text-ink">{c.name}</span>
                  <span className="font-mono text-muted">{c.type}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              Used by
            </div>
            <div className="flex flex-wrap gap-1">
              {m.usedBy.map((u) => (
                <span
                  key={u}
                  className="rounded border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[10px] text-ink"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LineageList() {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
        Lineage edges ({LINEAGE.length})
      </div>
      <ul className="grid gap-1 md:grid-cols-2">
        {LINEAGE.map((e, i) => (
          <li
            key={i}
            className="flex items-center gap-2 font-mono text-[11px] text-ink"
          >
            <span>{e.from}</span>
            <span className="text-flame">→</span>
            <span>{e.to}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StackPage() {
  return (
    <div className="space-y-10">
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          2K Lab · Reference architecture
        </div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-6xl">
          Stack
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          How Pulse is built: Fivetran &rarr; Snowflake &rarr; dbt &rarr; Next.js.
        </p>
      </header>

      <Section title="Pipeline" subtitle="End-to-end counts across today's run window.">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Stat label="Sources" value={PIPELINE_STATS.sources} tone="flame" />
          <Stat
            label="Tables ingested"
            value={PIPELINE_STATS.tablesIngested}
          />
          <Stat label="dbt models" value={PIPELINE_STATS.models} tone="ice" />
          <Stat
            label="Rows / day"
            value={PIPELINE_STATS.dailyRowsIngested.toLocaleString()}
            tone="gold"
          />
          <Stat
            label="Latency p50 / p95"
            value={`${PIPELINE_STATS.latencyMinutesP50}m / ${PIPELINE_STATS.latencyMinutesP95}m`}
            hint="source row to mart"
            tone="lime"
          />
        </div>
      </Section>

      <Section
        title="Architecture"
        subtitle="Four hops: extract, land, model, serve."
      >
        <Card>
          <ArchDiagram />
        </Card>
      </Section>

      <Section
        title="Sources"
        subtitle="Six SDK connectors and one native Snowflake meta connector."
      >
        <SourcesTable />
      </Section>

      <Section title="dbt models" subtitle="Click a layer to expand.">
        <ModelsTree />
        <div className="mt-3">
          <LineageList />
        </div>
      </Section>

      <Section
        title="Key marts"
        subtitle="The three marts the front-end reads from."
      >
        <MartHighlights />
      </Section>

      <Section title="Code" subtitle="Slices of the actual files in this repo.">
        <CodeTabs />
      </Section>

      <footer className="border-t border-line pt-4 text-xs text-muted">
        Repo scaffolded with Claude Code in 9 parallel agents.
      </footer>
    </div>
  );
}
