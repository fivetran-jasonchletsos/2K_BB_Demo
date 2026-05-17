"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, Card, Pill, Section, Stat } from "@/components/ui";
import {
  POSITIONS,
  PREDICTIONS,
  RatingPrediction,
  SOURCES,
  TEAMS_IN_PLAY,
  TEAM_COLOR,
  TONIGHT_GAMES,
  getFallers,
  getHighConfidence,
  getMethodology,
  getRisers,
  getThisWeek,
} from "@/lib/pulse";

type TabId = "risers" | "fallers" | "confidence" | "week";
type SortId = "delta" | "confidence" | "form";

const TABS: { id: TabId; label: string }[] = [
  { id: "risers", label: "Risers" },
  { id: "fallers", label: "Fallers" },
  { id: "confidence", label: "High confidence" },
  { id: "week", label: "This week" },
];

function fmtAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, "0")}m ago`;
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

function DeltaArrow({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="font-mono font-bold tabular-nums text-lime">
        <span className="text-[10px]">▲</span> +{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="font-mono font-bold tabular-nums text-flame">
        <span className="text-[10px]">▼</span> {delta}
      </span>
    );
  }
  return (
    <span className="font-mono font-bold tabular-nums text-muted">
      <span className="text-[10px]">◯</span> 0
    </span>
  );
}

function Avatar({ name, team }: { name: string; team: string }) {
  const color = TEAM_COLOR[team] ?? "#26262F";
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-display text-base tracking-wider text-white shadow-card"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initialsOf(name)}
    </div>
  );
}

function PulsingDot() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime" />
    </span>
  );
}

function SourcePill({ id, label }: { id: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ice/30 bg-ice/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ice">
      <span className="h-1 w-1 rounded-full bg-ice" />
      {label}
    </span>
  );
}

function GameRow({
  game,
}: {
  game: (typeof TONIGHT_GAMES)[number];
}) {
  const isLive = game.status === "live";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface2/40 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex items-center gap-1.5 font-display text-lg tracking-wider">
          <span
            className="inline-block h-4 w-1 rounded-sm"
            style={{ backgroundColor: TEAM_COLOR[game.away.team] ?? "#26262F" }}
          />
          <span>{game.away.team}</span>
          <span className="text-muted">@</span>
          <span>{game.home.team}</span>
          <span
            className="inline-block h-4 w-1 rounded-sm"
            style={{ backgroundColor: TEAM_COLOR[game.home.team] ?? "#26262F" }}
          />
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          {isLive ? (
            <>
              <span className="text-ink tabular-nums">
                {game.away.score}–{game.home.score}
              </span>
              <span className="inline-flex items-center gap-1 text-lime">
                <PulsingDot /> {game.tipoffEt}
              </span>
            </>
          ) : (
            <>
              <span className="tabular-nums">
                proj {game.away.projected}–{game.home.projected}
              </span>
              <span>· {game.tipoffEt}</span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-ice transition hover:text-ink"
      >
        watch impact · {game.watchImpactPlayers}
      </button>
    </div>
  );
}

function DriverBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const sign = value >= 0 ? "+" : "";
  const pct = Math.min(100, (Math.abs(value) / max) * 100);
  const tone = value >= 0 ? "bg-lime" : "bg-flame";
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
        <span className="text-muted">{label}</span>
        <span className={value >= 0 ? "text-lime" : "text-flame"}>
          {sign}
          {value.toFixed(1)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PlayerRow({
  p,
  expanded,
  onToggle,
}: {
  p: RatingPrediction;
  expanded: boolean;
  onToggle: () => void;
}) {
  const driverMax = useMemo(
    () =>
      Math.max(
        0.5,
        ...[
          Math.abs(p.driverBreakdown.scoring),
          Math.abs(p.driverBreakdown.defense),
          Math.abs(p.driverBreakdown.efficiency),
          Math.abs(p.driverBreakdown.news),
        ],
      ),
    [p],
  );

  return (
    <div className="rounded-xl border border-line bg-surface transition hover:border-line/80">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-3 text-left md:p-4"
      >
        <Avatar name={p.displayName} team={p.team} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-display text-lg tracking-wide text-ink md:text-xl">
              {p.displayName}
            </div>
            <Pill tone="muted" className="hidden md:inline-flex">
              {p.team}
            </Pill>
            <Pill tone="muted" className="hidden md:inline-flex">
              {p.position}
            </Pill>
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-muted md:hidden">
            <span>{p.team}</span>
            <span>·</span>
            <span>{p.position}</span>
            <span>·</span>
            <span>{p.currentRating} OVR</span>
          </div>
          <div className="mt-1.5 line-clamp-2 text-xs text-muted md:text-sm">
            {p.primaryDriver}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="w-24 md:w-32">
              <Bar value={p.confidence * 100} max={100} tone="ice" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {Math.round(p.confidence * 100)}% conf
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="hidden font-mono text-xs text-muted md:block">
            {p.currentRating} OVR
          </div>
          <div className="font-display text-2xl leading-none md:text-3xl">
            <DeltaArrow delta={p.predictedDelta} />
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
            predicted
          </div>
        </div>
      </button>

      {expanded && (
        <div className="animate-slide-up border-t border-line p-3 md:p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                Last 5 games
              </div>
              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-surface2 text-[10px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-2 py-1.5">Date</th>
                      <th className="px-2 py-1.5">Opp</th>
                      <th className="px-2 py-1.5">Line</th>
                      <th className="px-2 py-1.5 text-right">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.last5.map((g) => (
                      <tr key={`${p.playerId}-${g.date}-${g.opp}`} className="border-t border-line">
                        <td className="px-2 py-1.5 text-muted tabular-nums">{g.date}</td>
                        <td className="px-2 py-1.5">{g.opp}</td>
                        <td className="px-2 py-1.5 text-ink">{g.line}</td>
                        <td
                          className={`px-2 py-1.5 text-right tabular-nums ${
                            g.plusMinus > 0
                              ? "text-lime"
                              : g.plusMinus < 0
                                ? "text-flame"
                                : "text-muted"
                          }`}
                        >
                          {g.plusMinus > 0 ? "+" : ""}
                          {g.plusMinus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                  Delta breakdown
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <DriverBar
                    label="Scoring"
                    value={p.driverBreakdown.scoring}
                    max={driverMax}
                  />
                  <DriverBar
                    label="Defense"
                    value={p.driverBreakdown.defense}
                    max={driverMax}
                  />
                  <DriverBar
                    label="Efficiency"
                    value={p.driverBreakdown.efficiency}
                    max={driverMax}
                  />
                  <DriverBar
                    label="News"
                    value={p.driverBreakdown.news}
                    max={driverMax}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-line bg-surface2/60 px-3 py-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  Next 2K update
                </div>
                <div className="font-mono text-xs text-ink">{p.nextUpdateEta}</div>
              </div>

              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                  Source attribution
                </div>
                <div className="space-y-1.5">
                  {p.sourceContribs.map((s) => (
                    <div key={s.source} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wider text-ice">
                        {s.source}
                      </span>
                      <div className="flex-1">
                        <Bar value={s.weight * 100} max={100} tone="ice" />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted">
                        {Math.round(s.weight * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PulsePage() {
  const [tab, setTab] = useState<TabId>("risers");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // Filters
  const [query, setQuery] = useState("");
  const [positions, setPositions] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Set<string>>(new Set());
  const [minConfidence, setMinConfidence] = useState(0);
  const [sort, setSort] = useState<SortId>("delta");

  // Live tick — sync clock + per-source sync ages.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 30), 30_000);
    return () => clearInterval(t);
  }, []);

  const tabResults = useMemo(() => {
    switch (tab) {
      case "risers":
        return getRisers();
      case "fallers":
        return getFallers();
      case "confidence":
        return getHighConfidence();
      case "week":
        return getThisWeek();
    }
  }, [tab]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let rows = tabResults.filter((p) => {
      if (needle) {
        const hay = `${p.displayName} ${p.team} ${p.position}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (positions.size && !positions.has(p.position)) return false;
      if (teams.size && !teams.has(p.team)) return false;
      if (p.confidence * 100 < minConfidence) return false;
      return true;
    });

    if (sort === "delta") {
      rows = [...rows].sort(
        (a, b) =>
          Math.abs(b.predictedDelta) - Math.abs(a.predictedDelta) ||
          b.confidence - a.confidence,
      );
    } else if (sort === "confidence") {
      rows = [...rows].sort((a, b) => b.confidence - a.confidence);
    } else {
      rows = [...rows].sort((a, b) => b.recentForm - a.recentForm);
    }
    return rows;
  }, [tabResults, query, positions, teams, minConfidence, sort]);

  const totalRows = SOURCES.reduce((s, x) => s + x.rowsIngestedToday, 0);
  const minSync = Math.min(...SOURCES.map((s) => s.lastSyncSecondsAgo + tick));

  const togglePosition = (pos: string) => {
    setPositions((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  };

  const toggleTeam = (team: string) => {
    setTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setPositions(new Set());
    setTeams(new Set());
    setMinConfidence(0);
  };

  const filterCount =
    (query ? 1 : 0) +
    positions.size +
    teams.size +
    (minConfidence > 0 ? 1 : 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime">
            ODI · Operational Data Intelligence
          </div>
          <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-7xl">
            PULSE
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted md:text-base">
            Real NBA performance → predicted 2K rating deltas. Fivetran lands the
            stats, dbt computes the model, this page reads the marts.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <Stat label="Sources" value={SOURCES.length} tone="ice" />
          <Stat label="Rows / day" value={totalRows} tone="lime" />
          <Stat
            label="Tracked"
            value={PREDICTIONS.length}
            hint="players"
          />
        </div>
      </header>

      {/* Live indicator row */}
      <Card className="!p-3 md:!p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="inline-flex items-center gap-2">
            <PulsingDot />
            <span className="font-mono text-[11px] uppercase tracking-wider text-lime">
              Live
            </span>
          </div>
          <div className="font-mono text-[11px] text-muted">
            last sync <span className="text-ink">{fmtAgo(minSync)}</span>
          </div>
          <div className="font-mono text-[11px] text-muted">
            <span className="text-ink">{SOURCES.length}</span> sources
          </div>
          <div className="font-mono text-[11px] text-muted">
            <span className="text-ink tabular-nums">{totalRows}</span> rows
            ingested today
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {SOURCES.map((s) => (
              <SourcePill key={s.id} id={s.id} label={s.label} />
            ))}
          </div>
        </div>
      </Card>

      {/* Tonight's slate */}
      <Section
        title="Tonight's slate"
        subtitle={`${TONIGHT_GAMES.length} games on the NBA schedule`}
        right={
          <Pill tone="lime">
            <PulsingDot /> live feed
          </Pill>
        }
      >
        <div className="grid gap-2 md:grid-cols-2">
          {TONIGHT_GAMES.map((g) => (
            <GameRow key={g.id} game={g} />
          ))}
        </div>
      </Section>

      {/* Top movers */}
      <Section
        title="Top movers"
        subtitle="Tap a row for the breakdown"
        right={
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {filtered.length} of {PREDICTIONS.length}
          </span>
        }
      >
        {/* Tabs */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setExpandedId(null);
              }}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition ${
                tab === t.id
                  ? "border-lime/60 bg-lime/10 text-lime"
                  : "border-line bg-surface2 text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <Card className="mb-4 !p-3 md:!p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">
                  Search
                </label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="player, team, position"
                  className="w-full rounded-lg border border-line bg-surface2 px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-ice focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">
                  Positions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POSITIONS.map((p) => {
                    const on = positions.has(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePosition(p)}
                        className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition ${
                          on
                            ? "border-ice/60 bg-ice/10 text-ice"
                            : "border-line bg-surface2 text-muted hover:text-ink"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">
                  Teams
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TEAMS_IN_PLAY.map((t) => {
                    const on = teams.has(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTeam(t)}
                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition ${
                          on
                            ? "border-lime/60 bg-lime/10 text-lime"
                            : "border-line bg-surface2 text-muted hover:text-ink"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
                  <span>Min confidence</span>
                  <span className="text-ink tabular-nums">{minConfidence}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full accent-lime"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  Sort
                </span>
                <div className="flex gap-1">
                  {(
                    [
                      { id: "delta", label: "Δ" },
                      { id: "confidence", label: "Conf" },
                      { id: "form", label: "Form" },
                    ] as { id: SortId; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSort(s.id)}
                      className={`rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
                        sort === s.id
                          ? "border-ice/60 bg-ice/10 text-ice"
                          : "border-line bg-surface2 text-muted hover:text-ink"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {filterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-mono text-[10px] uppercase tracking-wider text-flame hover:text-ink"
                >
                  clear {filterCount} filter{filterCount === 1 ? "" : "s"}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Leaderboard */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <div className="py-8 text-center font-mono text-xs text-muted">
                No players match the current filters.
              </div>
            </Card>
          ) : (
            filtered.map((p) => (
              <PlayerRow
                key={p.playerId}
                p={p}
                expanded={expandedId === p.playerId}
                onToggle={() =>
                  setExpandedId((id) => (id === p.playerId ? null : p.playerId))
                }
              />
            ))
          )}
        </div>
      </Section>

      {/* Methodology */}
      <Section title="Methodology" subtitle="How the predicted delta is built">
        <Card>
          <button
            type="button"
            onClick={() => setMethodologyOpen((o) => !o)}
            aria-expanded={methodologyOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <div className="font-display text-xl tracking-wide text-ink">
                rating_delta formula
              </div>
              <div className="mt-0.5 text-xs text-muted">
                weighted recent form vs season baseline, position-adjusted, news-penalized
              </div>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-ice">
              {methodologyOpen ? "hide" : "show"}
            </span>
          </button>
          {methodologyOpen && (
            <div className="animate-slide-up mt-4 space-y-3">
              <pre className="overflow-x-auto rounded-lg border border-line bg-surface2 p-3 font-mono text-[11px] leading-relaxed text-ink">
                {getMethodology()}
              </pre>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="ice">balldontlie · box stats</Pill>
                <Pill tone="ice">nba_stats · advanced</Pill>
                <Pill tone="gold">espn_news · injury feed</Pill>
                <Pill tone="lime">reddit_2k · community signal</Pill>
              </div>
              <a
                href="/stack"
                className="inline-flex font-mono text-[11px] uppercase tracking-wider text-ice hover:text-ink"
              >
                → full pipeline at /stack
              </a>
            </div>
          )}
        </Card>
      </Section>

      {/* Freshness footer */}
      <Section title="Data freshness" subtitle="Per-source sync clock">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((s) => {
            const ageSec = s.lastSyncSecondsAgo + tick;
            const stale = ageSec > 300;
            return (
              <div
                key={s.id}
                className="rounded-lg border border-line bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ice">
                    {s.label}
                  </span>
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      stale ? "bg-flame" : "bg-lime"
                    } ${stale ? "" : "animate-pulse"}`}
                  />
                </div>
                <div className="mt-2 font-display text-2xl tabular-nums text-ink">
                  {fmtAgo(ageSec)}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                  {s.rowsIngestedToday} rows today
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Disclaimer */}
      <p className="border-t border-line pt-4 text-center font-mono text-[10px] uppercase tracking-wider text-muted">
        Predictions modeled on real NBA stats; actual 2K rating updates determined
        by 2K Sports.
      </p>
    </div>
  );
}
