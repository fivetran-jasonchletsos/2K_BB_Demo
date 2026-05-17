"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  END_TO_END_TIMING,
  ENGINES,
  HIGHLIGHT_MARTS,
  LIFECYCLE_STAGES,
  LINEAGE,
  MART_SCHEMA_SNIPPETS,
  MODELS,
  PIPELINE_STATS,
  SOURCES,
  UNDERCURRENTS,
  type Model,
  type Source,
} from "@/lib/stack";

// ───────────────────────────────────────────────────────────────────────────
// Code receipts — used in <details> blocks
// ───────────────────────────────────────────────────────────────────────────

const CONNECTOR_PY = `from fivetran_connector_sdk import Connector
from fivetran_connector_sdk import Logging as log
from fivetran_connector_sdk import Operations as op
import requests
from datetime import datetime, timezone

# Lands rows into MDLS Iceberg bronze tables. The downstream dbt project
# targets Snowflake-on-Iceberg over the same Polaris catalog.
BASE_URL = "https://api.balldontlie.io/v1"
DESTINATION_SCHEMA = "mdls.bronze_balldontlie"  # Iceberg, Polaris catalog

def schema(configuration: dict):
    # Bronze layout — one Iceberg table per source table. Snowflake reads
    # these via EXTERNAL VOLUME + CATALOG INTEGRATION (table_type='iceberg').
    return [
        {"table": "players", "primary_key": ["id"]},
        {"table": "games",   "primary_key": ["id"]},
        {"table": "stats",   "primary_key": ["id"]},
    ]

def _headers(configuration: dict) -> dict:
    api_key = configuration.get("api_key")
    if not api_key:
        raise ValueError("Missing required configuration field: api_key")
    return {"Authorization": api_key, "Accept": "application/json"}

def update(configuration: dict, state: dict):
    cursor = state.get("stats_cursor") or "1970-01-01T00:00:00Z"
    log.info(f"balldontlie sync -> {DESTINATION_SCHEMA} (cursor={cursor})")
    yield from _sync_players(configuration)
    yield from _sync_games(configuration, state)
    yield from _sync_stats(configuration, state, cursor)`;

const MART_SQL = `-- Snowflake-on-Iceberg mart. Snowflake writes Iceberg files into the
-- MDLS external volume and registers them in the Polaris catalog
-- integration. Athena/Databricks/Trino can read the same table from the
-- same catalog without re-ingest.
{{ config(
    materialized='incremental',
    unique_key='player_id',
    table_type='iceberg',
    external_volume='mdls_ext_vol',
    catalog='polaris_catalog_int',
    base_location_subpath='marts/mart_rating_predictions',
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
        round(coalesce(form_z, 0) * 1.5, 2) as d_form,
        case when injury_flag then -2.0 else 0 end as d_injury,
        round(coalesce(news_score, 0) * 1.0, 2) as d_news
    from baseline
)
select
    player_id,
    current_rating,
    greatest(-5.0, least(5.0, d_form + d_injury + d_news))::number(3,1)
        as predicted_delta,
    current_timestamp() as computed_at
from form_delta`;

const PULSE_TSX = `// app/pulse/page.tsx — reads mart_rating_predictions
import { getPredictions } from "@/lib/marts";
import { Pill } from "@/components/ui";

export default async function PulsePage() {
  const rows = await getPredictions({ limit: 25 });
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.player_id} className="flex items-center gap-3">
          <div className="font-display text-2xl text-ink num">
            {r.full_name}
          </div>
          <Pill tone={r.predicted_delta >= 0 ? "lime" : "flame"}>
            {r.predicted_delta >= 0 ? "+" : ""}
            {r.predicted_delta.toFixed(1)}
          </Pill>
          <span className="ml-auto text-xs text-muted num">
            conf {Math.round(r.confidence * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}`;

// ───────────────────────────────────────────────────────────────────────────
// Primitives
// ───────────────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: Source["status"] }) {
  const cls =
    status === "green"
      ? "bg-lime"
      : status === "amber"
      ? "bg-gold"
      : "bg-flame";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
      <span className="text-[10px] uppercase tracking-wider text-muted">
        {status}
      </span>
    </span>
  );
}

// Sparkline for freshness7d (minutes of staleness; 0 = fresh)
function FreshnessSpark({ series }: { series: number[] }) {
  const max = Math.max(1, ...series);
  return (
    <span className="inline-flex items-end gap-[2px] align-middle">
      {series.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * 18));
        const tone = v === 0 ? "bg-line" : v > max * 0.6 ? "bg-flame" : "bg-muted";
        return (
          <span
            key={i}
            className={`inline-block w-[3px] ${tone}`}
            style={{ height: `${h}px` }}
            aria-hidden
          />
        );
      })}
    </span>
  );
}

// Bullet graph: actual horizontal bar with a tick at threshold
function BulletErr({
  pct,
  threshold,
}: {
  pct: number;
  threshold: number;
}) {
  const scale = Math.max(2, threshold * 2);
  const barW = Math.min(100, (pct / scale) * 100);
  const tickX = Math.min(100, (threshold / scale) * 100);
  const tone = pct > threshold ? "bg-flame" : pct > threshold * 0.8 ? "bg-gold" : "bg-lime";
  return (
    <span className="relative inline-block h-2 w-16 align-middle bg-surface2">
      <span className={`absolute left-0 top-0 h-full ${tone}`} style={{ width: `${barW}%` }} />
      <span
        className="absolute top-[-1px] h-[10px] w-px bg-ink"
        style={{ left: `${tickX}%` }}
        aria-hidden
      />
    </span>
  );
}

// Bullet graph for timing (actual vs target seconds, shared scale)
function BulletTiming({
  actual,
  target,
  scaleMax,
}: {
  actual: number;
  target: number;
  scaleMax: number;
}) {
  const barW = Math.min(100, (actual / scaleMax) * 100);
  const tickX = Math.min(100, (target / scaleMax) * 100);
  const tone = actual > target ? "bg-flame" : "bg-lime";
  return (
    <span className="relative inline-block h-2 w-full align-middle bg-surface2">
      <span className={`absolute left-0 top-0 h-full ${tone}`} style={{ width: `${barW}%` }} />
      <span
        className="absolute top-[-1px] h-[10px] w-px bg-ink"
        style={{ left: `${tickX}%` }}
        aria-hidden
      />
    </span>
  );
}

function formatAgo(sec: number) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

// ───────────────────────────────────────────────────────────────────────────
// 3. Sources box-score
// ───────────────────────────────────────────────────────────────────────────

function SourcesBoxScore() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs num">
        <thead>
          <tr className="border-b border-line/60 text-[10px] uppercase tracking-wider text-muted">
            <th className="py-2 pr-3 text-left font-semibold">src</th>
            <th className="py-2 pr-3 text-left font-semibold">kind</th>
            <th className="py-2 pr-3 text-left font-semibold">sched</th>
            <th className="py-2 pr-3 text-right font-semibold">rows/d</th>
            <th className="py-2 pr-3 text-left font-semibold">fresh 7d</th>
            <th className="py-2 pr-3 text-left font-semibold">err</th>
            <th className="py-2 pr-3 text-right font-semibold">err%</th>
            <th className="py-2 text-left font-semibold">status</th>
          </tr>
        </thead>
        <tbody>
          {SOURCES.map((s) => {
            const isOpen = open === s.id;
            return (
              <Fragment key={s.id}>
                <tr
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="cursor-pointer border-b border-line/40 align-middle hover:bg-surface2/40"
                  style={{ minHeight: 44 }}
                >
                  <td className="py-3 pr-3 font-mono text-ink">{s.id}</td>
                  <td className="py-3 pr-3 font-mono text-muted">{s.sourceKind}</td>
                  <td className="py-3 pr-3 font-mono text-muted">{s.cadence}</td>
                  <td className="py-3 pr-3 text-right font-mono text-ink">
                    {s.rowsPerDay.toLocaleString()}
                  </td>
                  <td className="py-3 pr-3">
                    <FreshnessSpark series={s.freshness7d} />
                  </td>
                  <td className="py-3 pr-3">
                    <BulletErr pct={s.errorPct} threshold={s.errorThresholdPct} />
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-ink">
                    {s.errorPct.toFixed(1)}
                  </td>
                  <td className="py-3">
                    <StatusDot status={s.status} />
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-line/40 bg-surface/60">
                    <td colSpan={8} className="px-1 py-3">
                      <div className="grid gap-3 text-[11px] md:grid-cols-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted">
                            vendor
                          </div>
                          <div className="font-mono text-ink">{s.vendor}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted">
                            schema
                          </div>
                          <div className="font-mono text-ink">{s.schema}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted">
                            last sync
                          </div>
                          <div className="font-mono text-ink num">
                            {formatAgo(s.lastSyncSecondsAgo)} ago
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted">
                            tables
                          </div>
                          <div className="font-mono text-ink">
                            {s.tables.join(", ")}
                          </div>
                        </div>
                        <div className="md:col-span-4">
                          <div className="text-[10px] uppercase tracking-wider text-muted">
                            notes
                          </div>
                          <div className="text-muted">{s.notes}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 3b. Read engines (catalog-compatible)
// ───────────────────────────────────────────────────────────────────────────

function EnginesBlock() {
  const primary = ENGINES.find((e) => e.status === "enabled");
  const compatible = ENGINES.filter((e) => e.status !== "enabled");
  return (
    <div className="space-y-3">
      {primary && (
        <div className="border border-ice/60 bg-surface p-4 md:p-5">
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl leading-none text-ink md:text-3xl">
                {primary.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-lime">
                primary engine
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              reads MDLS Iceberg · dbt target
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 text-[12px] md:grid-cols-[120px_1fr]">
            <dt className="text-muted">reader</dt>
            <dd className="font-mono text-ink">{primary.catalogReader}</dd>
            <dt className="text-muted">adapter</dt>
            <dd className="font-mono text-ink">{primary.dbtAdapter}</dd>
            <dt className="text-muted">table_type</dt>
            <dd className="font-mono text-ink">iceberg</dd>
          </dl>
        </div>
      )}

      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">
          Compatible engines · read the same Iceberg tables via the catalog
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {compatible.map((e) => (
            <div
              key={e.id}
              className="border border-line/60 bg-surface/60 px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink">
                  {e.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  compatible
                </span>
              </div>
              <dl className="mt-1 grid grid-cols-[56px_1fr] gap-x-2 gap-y-0.5 text-[10.5px]">
                <dt className="text-muted">reader</dt>
                <dd className="font-mono text-ink">{e.catalogReader}</dd>
                <dt className="text-muted">adapter</dt>
                <dd className="font-mono text-ink">{e.dbtAdapter}</dd>
              </dl>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-muted">
        one Iceberg catalog in MDLS · 1 engine wired in dbt (Snowflake-on-Iceberg) ·{" "}
        {compatible.length} catalog-readable without re-ingest
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 4. Lineage graph
// ───────────────────────────────────────────────────────────────────────────

function matSuffix(m: Model["materialization"]) {
  return m === "incremental" ? ".inc" : m === "table" ? ".tbl" : m === "view" ? ".view" : ".eph";
}

function LineageGraph() {
  const [focus, setFocus] = useState<string | null>(null);

  const layers = useMemo(() => {
    const g: Record<string, Model[]> = { staging: [], intermediate: [], marts: [] };
    for (const m of MODELS) g[m.layer].push(m);
    return g;
  }, []);

  // Compute related set for focused node (ancestors + descendants)
  const related = useMemo(() => {
    if (!focus) return null;
    const up = new Set<string>();
    const down = new Set<string>();
    const stackUp = [focus];
    while (stackUp.length) {
      const node = stackUp.pop()!;
      for (const e of LINEAGE) {
        if (e.to === node && !up.has(e.from)) {
          up.add(e.from);
          stackUp.push(e.from);
        }
      }
    }
    const stackDown = [focus];
    while (stackDown.length) {
      const node = stackDown.pop()!;
      for (const e of LINEAGE) {
        if (e.from === node && !down.has(e.to)) {
          down.add(e.to);
          stackDown.push(e.to);
        }
      }
    }
    const all = new Set<string>([focus, ...up, ...down]);
    return all;
  }, [focus]);

  const isDim = (id: string) => related !== null && !related.has(id);

  return (
    <div>
      <div className="space-y-4">
        {(["staging", "intermediate", "marts"] as const).map((layer) => (
          <div key={layer}>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted">
              {layer}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {layers[layer].map((m) => {
                const focused = focus === m.id;
                const dim = isDim(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFocus(focused ? null : m.id)}
                    className={`rounded border px-2 py-1 font-mono text-[11px] transition ${
                      focused
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-line bg-surface text-ink hover:border-muted"
                    } ${dim ? "opacity-40" : ""}`}
                    style={{ minHeight: 28 }}
                  >
                    {m.name}
                    <span className="ml-1 text-[10px] text-muted">
                      {matSuffix(m.materialization)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-muted">
        tap a model to highlight its upstream and downstream chain · {LINEAGE.length} edges
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 5. Marts (small multiples)
// ───────────────────────────────────────────────────────────────────────────

function MartsGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {HIGHLIGHT_MARTS.map((m) => {
        const cols = MART_SCHEMA_SNIPPETS[m.name] ?? [];
        return (
          <div
            key={m.id}
            className="border border-line bg-surface p-3"
          >
            <div className="font-mono text-[12px] uppercase tracking-wider text-ink">
              {m.name}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <dt className="text-muted">grain</dt>
              <dd className="text-right font-mono text-ink">{m.grain}</dd>
              <dt className="text-muted">mat</dt>
              <dd className="text-right font-mono text-ink">{m.materialization}</dd>
              <dt className="text-muted">refresh</dt>
              <dd className="text-right font-mono text-ink num">{m.refreshCadence}</dd>
              <dt className="text-muted">rows</dt>
              <dd className="text-right font-mono text-ink num">
                {m.rowCount.toLocaleString()}
              </dd>
            </dl>
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted">schema</div>
              <table className="mt-1 w-full text-[11px]">
                <tbody>
                  {cols.map((c) => (
                    <tr key={c.col} className="border-b border-line/40 last:border-0">
                      <td className="py-1 font-mono text-ink">{c.col}</td>
                      <td className="py-1 text-right font-mono text-muted">{c.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted">consumed</div>
              <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px] text-ink">
                {m.usedBy.map((u) => (
                  <span key={u}>{u}</span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 6. End-to-end timing (small-multiple bullet graphs)
// ───────────────────────────────────────────────────────────────────────────

function TimingBullets() {
  const scaleMax = Math.max(...END_TO_END_TIMING.map((t) => Math.max(t.actualSeconds, t.targetSeconds))) * 1.15;
  return (
    <div className="border-t border-b border-line/60 py-3">
      <div className="space-y-2">
        {END_TO_END_TIMING.map((t) => (
          <div key={t.stage} className="grid grid-cols-[120px_1fr_64px] items-center gap-3 text-[11px]">
            <div className="font-mono text-muted">{t.label}</div>
            <BulletTiming
              actual={t.actualSeconds}
              target={t.targetSeconds}
              scaleMax={scaleMax}
            />
            <div className="text-right font-mono text-ink num">
              {t.actualSeconds}s
              <span className="ml-1 text-muted">/ {t.targetSeconds}s</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-muted">
        bar = actual · tick = target · shared x-scale {Math.round(scaleMax)}s
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 8. Code receipts
// ───────────────────────────────────────────────────────────────────────────

function CodeReceipt({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  return (
    <details className="border border-line bg-surface">
      <summary
        className="cursor-pointer list-none px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink"
        style={{ minHeight: 44 }}
      >
        <span className="text-ink">›</span> {label}
      </summary>
      <pre className="overflow-x-auto border-t border-line/60 p-3 font-mono text-[11px] leading-snug text-ink">
        <code>{body}</code>
      </pre>
    </details>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Header strip
// ───────────────────────────────────────────────────────────────────────────

function HeaderStrip() {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted">
          Data Engineering Lifecycle / NBA 2K26 ODI
        </div>
        <h1 className="mt-1 font-display text-6xl leading-none tracking-wide text-ink md:text-7xl">
          STACK
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Six sources, three marts. Snowflake-on-Iceberg engine reading MDLS.
          Three other engines compatible via the same catalog.
        </p>
      </div>
      <div className="flex gap-6 md:gap-8">
        <StatLine label="latency p95" value="4m" />
        <StatLine label="sources" value={String(PIPELINE_STATS.sources)} />
        <StatLine
          label="rows/day"
          value={`${Math.round(PIPELINE_STATS.dailyRowsIngested / 1000)}k`}
        />
      </div>
    </header>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display text-3xl leading-none text-ink num md:text-4xl">
        {value}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Lifecycle strip
// ───────────────────────────────────────────────────────────────────────────

function LifecycleStrip() {
  return (
    <div className="relative">
      <div className="absolute left-0 right-0 top-[14px] hidden h-px bg-line md:block" aria-hidden />
      <ol className="relative grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {LIFECYCLE_STAGES.map((s) => (
          <li key={s.n} className="relative bg-bg md:px-2">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl leading-none text-ink num">
                {s.n}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink">
                {s.stage}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted">{s.system}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Section heading (lean, no chrome)
// ───────────────────────────────────────────────────────────────────────────

function H({
  n,
  title,
  hint,
}: {
  n: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-3 border-t border-line/60 pt-4">
      <span className="font-mono text-[11px] text-muted num">{n}</span>
      <h2 className="font-display text-2xl leading-none tracking-wide text-ink md:text-3xl">
        {title}
      </h2>
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Animated architecture diagram
// ───────────────────────────────────────────────────────────────────────────

// Source badge abbreviations — keep typographic, no logos.
const SOURCE_BADGES: { abbr: string; label: string }[] = [
  { abbr: "BDL", label: "balldontlie" },
  { abbr: "NBA", label: "stats.nba.com" },
  { abbr: "RDT", label: "reddit r/NBA2k" },
  { abbr: "ESN", label: "ESPN News" },
  { abbr: "2KR", label: "2KRatings" },
  { abbr: "LCK", label: "locker codes" },
];

// Five stages. Used for both the diagram and the per-stage cards below.
type StageKey = "sources" | "fivetran" | "mdls" | "snowflake" | "serve";

const STAGES: {
  key: StageKey;
  num: string;
  short: string;
  label: string;
  sub: string;
}[] = [
  { key: "sources", num: "01", short: "SRC", label: "SOURCES", sub: "6 connectors" },
  { key: "fivetran", num: "02", short: "SDK", label: "FIVETRAN", sub: "Connector SDK" },
  { key: "mdls", num: "03", short: "ICE", label: "MDLS", sub: "Iceberg / Parquet" },
  { key: "snowflake", num: "04", short: "SNO", label: "SNOWFLAKE", sub: "on-Iceberg" },
  { key: "serve", num: "05", short: "APP", label: "dbt → APP", sub: "models · Next.js" },
];

// Pure-CSS keyframes. Injected via a <style> tag because Tailwind doesn't
// support the kind of multi-stop, multi-axis travel we want here. No deps.
const DIAGRAM_CSS = `
@keyframes stagePulse {
  0%, 80%, 100% { box-shadow: 0 0 0 0 rgba(0,229,255,0); }
  10%           { box-shadow: 0 0 0 0 rgba(0,229,255,0.45); }
  40%           { box-shadow: 0 0 0 10px rgba(0,229,255,0); }
}
@keyframes parquetShimmer {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
@keyframes tracePulse {
  0%   { transform: scale(0.4); opacity: 0; }
  20%  { transform: scale(1.15); opacity: 1; }
  60%  { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.6); opacity: 0; }
}
.diagram-stage-pulse { animation: stagePulse 5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .diagram-packet,
  .diagram-stage-pulse,
  .diagram-parquet-stripe,
  .trace-packet {
    animation: none !important;
  }
  .diagram-packet { opacity: 0.6; }
}
`;

// Generate a stable, deterministic set of packet configurations so SSR and
// client output match (no Math.random in render path).
type PacketTone = "ink" | "flame" | "ice" | "gold";
type Packet = { delay: number; tone: PacketTone };

function buildPackets(count: number, period: number): Packet[] {
  // Evenly stagger; sprinkle 2 rare tones deterministically.
  const tones: PacketTone[] = ["ink", "ink", "ink", "flame", "ink", "ice", "ink", "gold"];
  return Array.from({ length: count }, (_, i) => ({
    delay: -(i * (period / count)),
    tone: tones[i % tones.length],
  }));
}

const PACKET_PERIOD_S = 5; // total travel time per packet
const PACKET_COUNT = 8;

function toneClass(t: PacketTone) {
  if (t === "flame") return "bg-flame";
  if (t === "ice") return "bg-ice";
  if (t === "gold") return "bg-gold";
  return "bg-ink";
}

function ArchitectureDiagram({ replayKey }: { replayKey: number }) {
  const packets = useMemo(() => buildPackets(PACKET_COUNT, PACKET_PERIOD_S), []);

  // Horizontal (desktop) packet rail spans across the SVG.
  // Container is the diagram width; we offset packets via percent positioning.
  return (
    <div
      key={replayKey}
      className="relative border border-line bg-surface/60"
      aria-label="Architecture data flow diagram"
    >
      {/* Desktop: horizontal flow */}
      <div className="relative hidden md:block">
        <div className="grid grid-cols-5 gap-0">
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className="relative px-4 py-6"
              style={{
                borderRight: i < STAGES.length - 1 ? "1px solid #26262F" : "none",
              }}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted num">
                {s.num}
              </div>
              <div className="mt-1 font-display text-xl tracking-wide text-ink">
                {s.label}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted">{s.sub}</div>
              <div className="mt-4">
                <StageVisual stage={s.key} />
              </div>
            </div>
          ))}
        </div>

        {/* Packet rail: absolute, runs across the full diagram width */}
        <div
          className="pointer-events-none absolute left-0 right-0"
          style={{ top: "calc(100% - 38px)" }}
          aria-hidden
        >
          <div className="relative mx-4 h-[2px] bg-line/60">
            {packets.map((p, idx) => (
              <span
                key={`h-${idx}-${replayKey}`}
                className={`diagram-packet absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${toneClass(p.tone)}`}
                style={{
                  left: 0,
                  animation: `flowHorizPct ${PACKET_PERIOD_S}s linear ${p.delay}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: vertical flow */}
      <div className="relative md:hidden">
        <div className="flex flex-col">
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className="relative px-4 py-4"
              style={{
                borderBottom: i < STAGES.length - 1 ? "1px solid #26262F" : "none",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted num">
                    {s.num}
                  </div>
                  <div className="mt-1 font-display text-base tracking-wide text-ink">
                    {s.label}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] text-muted">
                    {s.sub}
                  </div>
                </div>
                <div className="flex-1">
                  <StageVisual stage={s.key} compact />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vertical packet rail */}
        <div
          className="pointer-events-none absolute bottom-0 top-0"
          style={{ left: "14px" }}
          aria-hidden
        >
          <div className="relative h-full w-[2px] bg-line/60">
            {packets.map((p, idx) => (
              <span
                key={`v-${idx}-${replayKey}`}
                className={`diagram-packet absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ${toneClass(p.tone)}`}
                style={{
                  top: 0,
                  animation: `flowVertPct ${PACKET_PERIOD_S}s linear ${p.delay}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── per-stage inline visuals (drawn in stage column)

function StageVisual({
  stage,
  compact,
}: {
  stage: StageKey;
  compact?: boolean;
}) {
  if (stage === "sources") {
    return (
      <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "max-w-[180px]"}`}>
        {SOURCE_BADGES.map((b) => (
          <span
            key={b.abbr}
            title={b.label}
            className="inline-flex h-6 min-w-[34px] items-center justify-center border border-line bg-bg px-1.5 font-mono text-[10px] tracking-wider text-ink"
          >
            {b.abbr}
          </span>
        ))}
      </div>
    );
  }
  if (stage === "fivetran") {
    // Hex / diamond shape, CSS-clipped
    return (
      <div className="flex items-center justify-start">
        <div
          className="diagram-stage-pulse relative flex h-16 w-16 items-center justify-center border border-flame/70 bg-flame/10"
          style={{
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          }}
        >
          <span className="font-display text-sm tracking-widest text-flame">
            SDK
          </span>
        </div>
      </div>
    );
  }
  if (stage === "mdls") {
    // Tall rectangle with horizontal stripes (Parquet/Iceberg layout)
    const stripes = [0, 1, 2, 3, 4, 5];
    return (
      <div className="flex items-start">
        <div className="diagram-stage-pulse relative flex h-20 w-16 flex-col justify-between border border-ice/70 bg-ice/5 p-1.5">
          {stripes.map((i) => (
            <span
              key={i}
              className="diagram-parquet-stripe block h-[2px] w-full bg-ice/80"
              style={{
                animation: `parquetShimmer 3s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
          <span className="absolute -bottom-4 left-0 font-mono text-[9px] uppercase tracking-wider text-ice/80">
            iceberg
          </span>
        </div>
      </div>
    );
  }
  if (stage === "snowflake") {
    return (
      <div className="flex items-center">
        <div className="diagram-stage-pulse relative flex h-16 w-20 items-center justify-center border border-gold/70 bg-gold/5">
          <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-[2px] opacity-70">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="bg-gold/40" />
            ))}
          </div>
          <span className="relative font-display text-xs tracking-widest text-gold">
            SNO·ICE
          </span>
        </div>
      </div>
    );
  }
  // serve: dbt branch + app
  return (
    <div className="flex items-center gap-2">
      <div className="diagram-stage-pulse relative flex h-12 w-12 items-center justify-center border border-lime/70 bg-lime/5">
        <span className="font-display text-xs tracking-widest text-lime">dbt</span>
      </div>
      <span className="font-mono text-[10px] text-muted">→</span>
      <div className="relative flex h-12 w-14 items-center justify-center border border-ink/40 bg-bg">
        <span className="font-display text-xs tracking-wide text-ink">APP</span>
      </div>
    </div>
  );
}

// Percentage-based flow keyframes (separate so we don't need CSS vars in JS).
const DIAGRAM_CSS_PCT = `
@keyframes flowHorizPct {
  0%   { left: 0%;   opacity: 0; transform: translateY(-50%) scale(0.6); }
  6%   { opacity: 1; transform: translateY(-50%) scale(1); }
  94%  { left: 100%; opacity: 1; transform: translateY(-50%) translateX(-100%) scale(1); }
  100% { left: 100%; opacity: 0; transform: translateY(-50%) translateX(-100%) scale(0.6); }
}
@keyframes flowVertPct {
  0%   { top: 0%;   opacity: 0; transform: translateX(-50%) scale(0.6); }
  6%   { opacity: 1; transform: translateX(-50%) scale(1); }
  94%  { top: 100%; opacity: 1; transform: translateX(-50%) translateY(-100%) scale(1); }
  100% { top: 100%; opacity: 0; transform: translateX(-50%) translateY(-100%) scale(0.6); }
}
`;

function DiagramStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: DIAGRAM_CSS + DIAGRAM_CSS_PCT,
      }}
    />
  );
}

function AnimatedArchitecture() {
  const [replayKey, setReplayKey] = useState(0);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
          flow · sources → fivetran sdk → mdls iceberg → snowflake-on-iceberg → dbt → next.js
        </div>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="font-mono text-[10px] uppercase tracking-wider text-ice hover:text-ink"
          style={{ minHeight: 28 }}
        >
          ▶ replay
        </button>
      </div>
      <ArchitectureDiagram replayKey={replayKey} />
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-wider text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink" /> standard row
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-flame" /> high-volume stat
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ice" /> social signal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gold" /> rare drop
        </span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Interactive packet trace simulator
// ───────────────────────────────────────────────────────────────────────────

type TraceKey = "stat" | "reddit" | "locker";

type TraceLine = { t: string; text: string };

const TRACES: Record<
  TraceKey,
  { label: string; tone: PacketTone; lines: TraceLine[] }
> = {
  stat: {
    label: "Trace a player stat",
    tone: "flame",
    lines: [
      { t: "00:00.05", text: "Fetched from balldontlie.io GET /v1/stats?player_ids=237" },
      { t: "00:00.18", text: "Fivetran SDK upsert -> bronze_balldontlie.stats" },
      { t: "00:00.21", text: "Written to MDLS as Iceberg parquet (s3://fivetran-mdls-2k-lab/bronze/...)" },
      { t: "00:00.28", text: "Glue/Polaris catalog snapshot updated" },
      { t: "00:00.31", text: "Snowflake-on-Iceberg query returns row via EXTERNAL VOLUME" },
      { t: "00:00.42", text: "dbt staging view stg_nba__player_stats projects + casts" },
      { t: "00:00.48", text: "mart_rating_predictions incremental merge (clamp [-5,+5])" },
      { t: "00:00.51", text: "Next.js /pulse ISR revalidate -> renders new predicted_delta" },
    ],
  },
  reddit: {
    label: "Trace a Reddit post",
    tone: "ice",
    lines: [
      { t: "00:00.04", text: "OAuth2 token refresh -> reddit.com/api/v1/access_token" },
      { t: "00:00.12", text: "Fetched from /r/NBA2k/new.json (limit=100)" },
      { t: "00:00.23", text: "Fivetran SDK upsert -> bronze_reddit_2k.posts" },
      { t: "00:00.27", text: "Iceberg parquet written, snapshot committed" },
      { t: "00:00.35", text: "Snowflake-on-Iceberg reads via catalog integration" },
      { t: "00:00.46", text: "stg_reddit__posts lowercases title+body, normalizes tz" },
      { t: "00:00.58", text: "int_player_news_signal scores keyword + sentiment" },
      { t: "00:00.69", text: "mart_player_360 merges news_score; /players revalidates" },
    ],
  },
  locker: {
    label: "Trace a locker code",
    tone: "gold",
    lines: [
      { t: "00:00.03", text: "Aggregator JSON GET /api/codes (cadence=5m)" },
      { t: "00:00.09", text: "Fivetran SDK upsert -> bronze_locker_codes.drops" },
      { t: "00:00.14", text: "Iceberg snapshot committed (1 new row, 0 deletes)" },
      { t: "00:00.19", text: "Snowflake-on-Iceberg picks up new snapshot" },
      { t: "00:00.27", text: "stg_locker_codes__drops parses expires_at -> TIMESTAMP_TZ" },
      { t: "00:00.33", text: "mart_locker_codes_active view filters expired, ranks by expiry" },
      { t: "00:00.38", text: "Next.js /codes ISR revalidate -> code visible" },
    ],
  },
};

function TraceSimulator() {
  const [active, setActive] = useState<TraceKey | null>(null);
  const [lines, setLines] = useState<TraceLine[]>([]);
  const [packetPos, setPacketPos] = useState(0); // 0..1
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const queueRef = useRef<TraceKey[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const runTrace = useCallback(
    (key: TraceKey, onDone?: () => void) => {
      clearTimers();
      setActive(key);
      setLines([]);
      setPacketPos(0);
      const trace = TRACES[key];
      const total = trace.lines.length;
      // Total visual duration ~3.2s
      const step = 3200 / total;
      trace.lines.forEach((ln, i) => {
        const tm = setTimeout(() => {
          setLines((prev) => [...prev, ln]);
          setPacketPos((i + 1) / total);
        }, step * (i + 1));
        timers.current.push(tm);
      });
      const endTm = setTimeout(() => {
        if (onDone) onDone();
      }, step * total + 250);
      timers.current.push(endTm);
    },
    [clearTimers]
  );

  const runOne = useCallback(
    (key: TraceKey) => {
      queueRef.current = [];
      runTrace(key);
    },
    [runTrace]
  );

  const runAll = useCallback(() => {
    const order: TraceKey[] = ["stat", "reddit", "locker"];
    queueRef.current = [...order];
    const step = () => {
      const next = queueRef.current.shift();
      if (!next) return;
      runTrace(next, () => {
        setTimeout(step, 400);
      });
    };
    step();
  }, [runTrace]);

  const tone = active ? TRACES[active].tone : "ink";
  const stages: StageKey[] = ["sources", "fivetran", "mdls", "snowflake", "serve"];

  return (
    <div className="border border-line bg-surface/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/60 p-3">
        {(Object.keys(TRACES) as TraceKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => runOne(k)}
            className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
              active === k
                ? "border-ice bg-ice/10 text-ice"
                : "border-line bg-bg text-ink hover:border-muted"
            }`}
            style={{ minHeight: 32 }}
          >
            {TRACES[k].label}
          </button>
        ))}
        <button
          type="button"
          onClick={runAll}
          className="ml-auto border border-flame/60 bg-bg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-flame hover:bg-flame/10"
          style={{ minHeight: 32 }}
        >
          ▶ trace all
        </button>
      </div>

      <div className="grid gap-0 md:grid-cols-[1fr_minmax(0,1.2fr)]">
        {/* Track */}
        <div className="relative border-b border-line/60 p-4 md:border-b-0 md:border-r">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted">
            packet track
          </div>
          <div className="relative">
            <div className="grid grid-cols-5 gap-1 text-center">
              {stages.map((s) => {
                const stageInfo = STAGES.find((x) => x.key === s)!;
                return (
                  <div key={s} className="flex flex-col items-center gap-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                      {stageInfo.short}
                    </span>
                    <span className="block h-3 w-3 rounded-full border border-line bg-bg" />
                  </div>
                );
              })}
            </div>
            {/* Rail */}
            <div className="pointer-events-none absolute left-0 right-0 top-[24px] mx-[10%] h-[2px] bg-line/70" />
            {/* Packet */}
            <span
              className={`pointer-events-none absolute top-[18px] h-3 w-3 rounded-full ${toneClass(
                tone
              )} ${active ? "" : "opacity-30"}`}
              style={{
                left: `calc(10% + ${packetPos * 80}% - 6px)`,
                transition: "left 380ms cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow:
                  active && packetPos > 0
                    ? "0 0 0 4px rgba(0,229,255,0.18)"
                    : undefined,
              }}
              aria-hidden
            />
          </div>
          <div className="mt-4 font-mono text-[10px] text-muted">
            {active ? (
              <>
                <span className="text-ink">{TRACES[active].label}</span>
                <span className="ml-2">
                  · step {lines.length} / {TRACES[active].lines.length}
                </span>
              </>
            ) : (
              "tap a trace button to fire a packet"
            )}
          </div>
        </div>

        {/* Log */}
        <div className="p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            log
          </div>
          <pre className="min-h-[180px] whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink">
            {lines.length === 0 ? (
              <span className="text-muted">
                {"// awaiting trace…\n// each line = one stage hop in the pipeline"}
              </span>
            ) : (
              lines.map((ln) => (
                <div key={ln.t}>
                  <span className="text-muted">[{ln.t}]</span> {ln.text}
                </div>
              ))
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Per-stage cards
// ───────────────────────────────────────────────────────────────────────────

const STAGE_CARDS: {
  key: StageKey;
  n: string;
  label: string;
  blurb: string;
  tech: string[];
  lives: string;
}[] = [
  {
    key: "sources",
    n: "01",
    label: "SOURCES",
    blurb:
      "Six independent producers across REST, OAuth, JSON, and HTML scrapes. Each has its own cadence, cursor, and authentication model.",
    tech: ["REST", "OAuth2", "JSON", "HTML scrape"],
    lives: "balldontlie · stats.nba.com · reddit r/NBA2k · ESPN · 2KRatings · locker codes aggregator.",
  },
  {
    key: "fivetran",
    n: "02",
    label: "FIVETRAN",
    blurb:
      "Single Python connector per source built on the Fivetran Connector SDK. Schema + update generator + cursor state, lands rows as upserts.",
    tech: ["fivetran-connector-sdk", "Python", "schema()", "update()"],
    lives: "fivetran/<source>/connector.py · per-source api_key in configuration · cursor state per stream.",
  },
  {
    key: "mdls",
    n: "03",
    label: "MDLS · Iceberg",
    blurb:
      "Managed Data Lake Service. Fivetran lands rows directly as Apache Iceberg tables on object storage, registered in a REST catalog.",
    tech: ["Apache Iceberg", "Parquet", "Glue / Polaris catalog", "S3"],
    lives: "s3://fivetran-mdls-2k-lab/bronze/<source>/<table>/ · one Iceberg table per source table · catalog snapshot on every commit.",
  },
  {
    key: "snowflake",
    n: "04",
    label: "SNOWFLAKE-on-ICEBERG",
    blurb:
      "Snowflake reads the MDLS Iceberg tables in place via an external volume and catalog integration. No copy, no re-ingest.",
    tech: ["EXTERNAL VOLUME", "CATALOG INTEGRATION", "table_type='iceberg'", "dbt-snowflake"],
    lives: "external volume mdls_ext_vol · catalog integration polaris_catalog_int · dbt writes new marts back to Iceberg in the same lake.",
  },
  {
    key: "serve",
    n: "05",
    label: "dbt → Next.js",
    blurb:
      "dbt builds staging views, intermediate tables, and incremental marts on Snowflake-on-Iceberg. Next.js App Router consumes the marts via ISR.",
    tech: ["dbt-snowflake", "incremental merge", "Next.js App Router", "ISR"],
    lives: "dbt/models/{staging,intermediate,marts} · app/pulse, app/players, app/codes read mart_* tables.",
  },
];

function StageIcon({ stage }: { stage: StageKey }) {
  // CSS-drawn icons, no SVG libs.
  if (stage === "sources") {
    // beaker
    return (
      <div className="relative h-10 w-10" aria-hidden>
        <span className="absolute left-3 top-0 h-2 w-4 border border-flame/80 bg-flame/10" />
        <span
          className="absolute left-1 top-2 h-7 w-8 border border-flame/80 bg-flame/5"
          style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" }}
        />
        <span className="absolute bottom-1 left-2 h-2 w-6 bg-flame/40" />
      </div>
    );
  }
  if (stage === "fivetran") {
    // hexagon
    return (
      <div className="relative h-10 w-10" aria-hidden>
        <span
          className="absolute inset-0 border border-flame/80 bg-flame/10"
          style={{
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          }}
        />
      </div>
    );
  }
  if (stage === "mdls") {
    // layered cube — three stacked rhombi
    return (
      <div className="relative h-10 w-10" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute left-1 h-3 w-8 border border-ice/80 bg-ice/10"
            style={{
              top: `${4 + i * 8}px`,
              transform: "skewX(-20deg)",
            }}
          />
        ))}
      </div>
    );
  }
  if (stage === "snowflake") {
    // snowflake glyph: 3 rotated bars
    return (
      <div className="relative h-10 w-10" aria-hidden>
        {[0, 60, 120].map((deg) => (
          <span
            key={deg}
            className="absolute left-1/2 top-1/2 h-[2px] w-8 bg-gold"
            style={{
              transform: `translate(-50%, -50%) rotate(${deg}deg)`,
            }}
          />
        ))}
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold" />
      </div>
    );
  }
  // dbt: forked branch
  return (
    <div className="relative h-10 w-10" aria-hidden>
      <span className="absolute bottom-1 left-1 h-2 w-2 rounded-full bg-lime" />
      <span
        className="absolute left-2 top-2 h-[2px] w-6 bg-lime"
        style={{ transform: "rotate(-30deg)", transformOrigin: "left center" }}
      />
      <span
        className="absolute left-2 top-2 h-[2px] w-6 bg-lime"
        style={{ transform: "rotate(30deg)", transformOrigin: "left center" }}
      />
      <span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-lime" />
      <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-lime" />
    </div>
  );
}

function StageCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      {STAGE_CARDS.map((c) => (
        <div
          key={c.key}
          className="flex flex-col border border-line bg-surface p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted num">
                {c.n}
              </div>
              <div className="mt-1 font-display text-xl leading-none tracking-wide text-ink">
                {c.label}
              </div>
            </div>
            <StageIcon stage={c.key} />
          </div>
          <p className="mt-3 text-[11.5px] leading-snug text-muted">{c.blurb}</p>
          <div className="mt-3">
            <div className="text-[9px] uppercase tracking-wider text-muted">tech</div>
            <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10.5px] text-ink">
              {c.tech.map((t) => (
                <span key={t} className="border border-line/60 bg-bg px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[9px] uppercase tracking-wider text-muted">
              what lives here
            </div>
            <div className="mt-1 font-mono text-[11px] leading-snug text-ink">
              {c.lives}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────────────────────────────

export default function StackPage() {
  return (
    <div className="space-y-8">
      <DiagramStyles />
      <HeaderStrip />

      <section>
        <H n="00" title="architecture" hint="sources → fivetran sdk → mdls iceberg → snowflake → dbt → app" />
        <AnimatedArchitecture />
      </section>

      <section>
        <H n="00b" title="trace a row" hint="simulate a single packet through the pipeline" />
        <TraceSimulator />
      </section>

      <section>
        <H n="00c" title="stages" hint="five steps · tech · what lives at each layer" />
        <StageCards />
      </section>

      <section>
        <H n="01" title="lifecycle" hint="generation → ingestion → storage → engine → transformation → serving" />
        <LifecycleStrip />
      </section>

      <section>
        <H
          n="02"
          title="sources"
          hint={`${SOURCES.length} connectors · tap row for detail`}
        />
        <SourcesBoxScore />
      </section>

      <section>
        <H
          n="03"
          title="read engines"
          hint="Snowflake-on-Iceberg primary · 3 compatible readers"
        />
        <EnginesBlock />
      </section>

      <section>
        <H n="04" title="lineage" hint={`${MODELS.length} models · ${LINEAGE.length} edges`} />
        <LineageGraph />
      </section>

      <section>
        <H n="05" title="marts" hint="schema · grain · refresh · consumers" />
        <MartsGrid />
      </section>

      <section>
        <H n="06" title="timing" hint="seconds per stage · bar=actual · tick=target" />
        <TimingBullets />
      </section>

      <section>
        <H n="07" title="undercurrents" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          {UNDERCURRENTS.map((u, i) => (
            <span key={u} className="font-mono">
              {u}
              {i < UNDERCURRENTS.length - 1 && (
                <span className="ml-2 text-line">·</span>
              )}
            </span>
          ))}
        </div>
      </section>

      <section>
        <H n="08" title="receipts" hint="tap to expand" />
        <div className="space-y-2">
          <CodeReceipt label="fivetran/balldontlie/connector.py · update()" body={CONNECTOR_PY} />
          <CodeReceipt label="dbt/marts/mart_rating_predictions.sql" body={MART_SQL} />
          <CodeReceipt label="app/pulse/page.tsx" body={PULSE_TSX} />
        </div>
      </section>

      <footer className="border-t border-line/60 pt-4 font-mono text-[10px] text-muted">
        Repo: github.com/fivetran-jasonchletsos/2K_BB_Demo · Scaffolded with Claude Code · Sources audited 2026-05-16
      </footer>
    </div>
  );
}
