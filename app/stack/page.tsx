"use client";

import { Fragment, useMemo, useState } from "react";
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
// Page
// ───────────────────────────────────────────────────────────────────────────

export default function StackPage() {
  return (
    <div className="space-y-8">
      <HeaderStrip />

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
