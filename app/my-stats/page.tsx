"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, Card, Pill, Section, Stat } from "@/components/ui";
import {
  addGame,
  csvToGames,
  deleteGame,
  detectNewPRs,
  fgPct,
  ftPct,
  GAME_MODES,
  gamesToCSV,
  loadCoachGoal,
  loadGames,
  loadTarget,
  personalRecords,
  saveGames,
  saveTarget,
  snapshot,
  TARGET_STAT_LABELS,
  targetAvg,
  targetProgress,
  threePct,
  todayISO,
  updateGame,
  type GameInput,
  type GameLog,
  type GameMode,
  type StatTarget,
  type TargetStat,
} from "@/lib/my-stats";

type Filter = "all" | "W" | "L";
type SortKey = "date" | "pts" | "plusMinus" | "fgPct";

const EMPTY_FORM: GameInput = {
  date: todayISO(),
  mode: "MyCareer",
  opponent: undefined,
  outcome: "W",
  pts: 0,
  reb: 0,
  ast: 0,
  stl: 0,
  blk: 0,
  to: 0,
  fgm: 0,
  fga: 0,
  threePm: 0,
  threePa: 0,
  ftm: 0,
  fta: 0,
  plusMinus: 0,
  min: 0,
  notes: undefined,
};

export default function MyStatsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [games, setGamesState] = useState<GameLog[]>([]);
  const [form, setForm] = useState<GameInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [modeFilter, setModeFilter] = useState<GameMode | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [target, setTargetState] = useState<StatTarget | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [coachGoal, setCoachGoal] = useState("");
  const [copied, setCopied] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const prTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(() => {
    setGamesState(loadGames());
    setTargetState(loadTarget());
    setCoachGoal(loadCoachGoal());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
    return () => {
      if (prTimer.current) clearTimeout(prTimer.current);
    };
  }, [refresh]);

  // ---------- Save / Edit ---------------------------------------------------

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, date: todayISO() });
    setEditingId(null);
  };

  const onSave = () => {
    if (editingId) {
      updateGame(editingId, form);
      resetForm();
      refresh();
      return;
    }
    const before = loadGames();
    const created = addGame(form);
    const prs = detectNewPRs(before, created);
    if (prs.length > 0) {
      setNewPRs(prs);
      if (prTimer.current) clearTimeout(prTimer.current);
      prTimer.current = setTimeout(() => setNewPRs([]), 3000);
    }
    resetForm();
    refresh();
  };

  const onEdit = (g: GameLog) => {
    setEditingId(g.id);
    setExpandedId(g.id);
    setForm({
      date: g.date,
      mode: g.mode,
      opponent: g.opponent,
      outcome: g.outcome,
      pts: g.pts,
      reb: g.reb,
      ast: g.ast,
      stl: g.stl,
      blk: g.blk,
      to: g.to,
      fgm: g.fgm,
      fga: g.fga,
      threePm: g.threePm,
      threePa: g.threePa,
      ftm: g.ftm,
      fta: g.fta,
      plusMinus: g.plusMinus,
      min: g.min,
      notes: g.notes,
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onDelete = (id: string) => {
    deleteGame(id);
    if (editingId === id) resetForm();
    setConfirmDeleteId(null);
    refresh();
  };

  // ---------- Snapshot / PRs ------------------------------------------------

  const snap = useMemo(() => snapshot(games, 10), [games]);
  const prs = useMemo(() => personalRecords(games), [games]);

  // ---------- Filtering / Sorting ------------------------------------------

  const filteredGames = useMemo(() => {
    let out = [...games];
    if (filter !== "all") out = out.filter((g) => g.outcome === filter);
    if (modeFilter !== "all") out = out.filter((g) => g.mode === modeFilter);
    switch (sortKey) {
      case "date":
        out.sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
        break;
      case "pts":
        out.sort((a, b) => b.pts - a.pts);
        break;
      case "plusMinus":
        out.sort((a, b) => b.plusMinus - a.plusMinus);
        break;
      case "fgPct":
        out.sort((a, b) => (fgPct(b) ?? -1) - (fgPct(a) ?? -1));
        break;
    }
    return out;
  }, [games, filter, modeFilter, sortKey]);

  // ---------- Export / Import ----------------------------------------------

  const onCopyCSV = async () => {
    const csv = gamesToCSV(games);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(csv);
      } else if (typeof document !== "undefined") {
        const ta = document.createElement("textarea");
        ta.value = csv;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const onDownloadJSON = () => {
    if (typeof document === "undefined") return;
    const blob = new Blob([JSON.stringify(games, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-stats-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: "replace" | "merge",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let incoming: GameLog[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        incoming = csvToGames(text);
      } else {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("not an array");
        incoming = (parsed as GameLog[]).map((g) => ({ ...g }));
      }
      let next: GameLog[];
      if (mode === "replace") {
        next = incoming;
      } else {
        const byId = new Map(loadGames().map((g) => [g.id, g]));
        for (const g of incoming) byId.set(g.id, g);
        next = Array.from(byId.values());
      }
      saveGames(next);
      refresh();
      setImportMsg(`Imported ${incoming.length} games (${mode}).`);
      setTimeout(() => setImportMsg(null), 2500);
    } catch {
      setImportMsg("Import failed: invalid file.");
      setTimeout(() => setImportMsg(null), 2500);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      e.target.value = "";
    }
  };

  // ---------- Render --------------------------------------------------------

  const dash = "—";
  const wlStr = snap.wlLastN ? `${snap.wlLastN.w}-${snap.wlLastN.l}` : dash;
  const pmStr =
    snap.plusMinusAvgLastN === null
      ? dash
      : `${snap.plusMinusAvgLastN >= 0 ? "+" : ""}${snap.plusMinusAvgLastN}`;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          Personal Game Log
        </div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-7xl">
          My Stats
        </h1>
        <p className="mt-2 text-sm text-muted md:text-base">
          Log your MyCareer games. See where you&apos;re improving.
        </p>
      </header>

      {/* Quick add panel (sticky on mobile) */}
      <div className="sticky top-[57px] z-30 -mx-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-xl md:border md:px-4 md:py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="font-display text-2xl tracking-wider text-ink">
            {editingId ? "Edit game" : "Log a game"}
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-[11px] uppercase tracking-wider text-muted hover:text-ice"
            >
              cancel
            </button>
          )}
        </div>

        {/* Mode chips */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {GAME_MODES.map((m) => (
            <button
              key={m}
              onClick={() => setForm((f) => ({ ...f, mode: m }))}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                form.mode === m
                  ? "border-flame bg-flame/10 text-flame"
                  : "border-line bg-surface2 text-muted hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Date + outcome + opponent */}
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
              Date
            </span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="mt-1 w-full rounded-md border border-line bg-surface2 px-2 py-1.5 font-mono text-sm text-ink focus:border-flame focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
              Result
            </span>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {(["W", "L"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, outcome: o }))}
                  className={`rounded-md border px-2 py-1.5 font-mono text-sm transition ${
                    form.outcome === o
                      ? o === "W"
                        ? "border-lime bg-lime/15 text-lime"
                        : "border-flame bg-flame/15 text-flame"
                      : "border-line bg-surface2 text-muted"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </label>
          <label className="col-span-2 block md:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
              Opponent (optional)
            </span>
            <input
              type="text"
              value={form.opponent ?? ""}
              maxLength={40}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  opponent: e.target.value || undefined,
                }))
              }
              placeholder="LAL, friend, CPU…"
              className="mt-1 w-full rounded-md border border-line bg-surface2 px-2 py-1.5 font-mono text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
            />
          </label>
        </div>

        {/* Number inputs */}
        <div className="mb-3 grid grid-cols-3 gap-2 md:grid-cols-7">
          <NumberInput label="PTS" value={form.pts} onChange={(v) => setForm((f) => ({ ...f, pts: v }))} />
          <NumberInput label="REB" value={form.reb} onChange={(v) => setForm((f) => ({ ...f, reb: v }))} />
          <NumberInput label="AST" value={form.ast} onChange={(v) => setForm((f) => ({ ...f, ast: v }))} />
          <NumberInput label="STL" value={form.stl} onChange={(v) => setForm((f) => ({ ...f, stl: v }))} />
          <NumberInput label="BLK" value={form.blk} onChange={(v) => setForm((f) => ({ ...f, blk: v }))} />
          <NumberInput label="TO" value={form.to} onChange={(v) => setForm((f) => ({ ...f, to: v }))} />
          <NumberInput label="MIN" value={form.min} onChange={(v) => setForm((f) => ({ ...f, min: v }))} />
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 md:grid-cols-7">
          <NumberInput label="FGM" value={form.fgm} onChange={(v) => setForm((f) => ({ ...f, fgm: v }))} />
          <NumberInput label="FGA" value={form.fga} onChange={(v) => setForm((f) => ({ ...f, fga: v }))} />
          <NumberInput label="3PM" value={form.threePm} onChange={(v) => setForm((f) => ({ ...f, threePm: v }))} />
          <NumberInput label="3PA" value={form.threePa} onChange={(v) => setForm((f) => ({ ...f, threePa: v }))} />
          <NumberInput label="FTM" value={form.ftm} onChange={(v) => setForm((f) => ({ ...f, ftm: v }))} />
          <NumberInput label="FTA" value={form.fta} onChange={(v) => setForm((f) => ({ ...f, fta: v }))} />
          <NumberInput label="+/−" value={form.plusMinus} onChange={(v) => setForm((f) => ({ ...f, plusMinus: v }))} allowNegative />
        </div>

        <label className="mb-3 block">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            Notes (optional)
          </span>
          <textarea
            value={form.notes ?? ""}
            maxLength={240}
            onChange={(e) =>
              setForm((f) => ({ ...f, notes: e.target.value || undefined }))
            }
            rows={2}
            placeholder="Read & react was sharp · Forced 3 lefty drives"
            className="mt-1 w-full resize-none rounded-md border border-line bg-surface2 px-2 py-1.5 font-mono text-xs text-ink placeholder:text-muted focus:border-flame focus:outline-none"
          />
        </label>

        <button
          onClick={onSave}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-flame bg-flame font-display text-2xl uppercase tracking-wider text-black transition active:scale-[0.99]"
        >
          {editingId ? "Save edits" : "Save game"}
        </button>
      </div>

      {/* Snapshot */}
      <Section
        title="Snapshot"
        subtitle="Last 10 games."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Games logged"
            value={hydrated ? <span className="font-mono">{snap.totalGames}</span> : dash}
          />
          <Stat
            label="Avg PTS (10)"
            value={
              hydrated && snap.avgPtsLastN !== null ? (
                <span className="font-mono">{snap.avgPtsLastN}</span>
              ) : (
                dash
              )
            }
            tone="flame"
          />
          <Stat
            label="W-L (10)"
            value={hydrated ? <span className="font-mono">{wlStr}</span> : dash}
            tone={
              hydrated && snap.wlLastN && snap.wlLastN.w > snap.wlLastN.l
                ? "lime"
                : "default"
            }
          />
          <Stat
            label="+/− (10)"
            value={hydrated ? <span className="font-mono">{pmStr}</span> : dash}
            tone={
              hydrated && snap.plusMinusAvgLastN !== null && snap.plusMinusAvgLastN >= 0
                ? "lime"
                : "flame"
            }
          />
        </div>
      </Section>

      {/* Trend charts */}
      <Section title="Trends" subtitle="Last 20 games. Oldest → newest.">
        {hydrated && games.length >= 2 ? (
          <Card>
            <Trends games={games} />
          </Card>
        ) : (
          <Card>
            <div className="font-mono text-sm text-muted">
              {hydrated
                ? "Log at least 2 games to see trends."
                : dash}
            </div>
          </Card>
        )}
      </Section>

      {/* Personal records */}
      <Section title="Personal records" subtitle="Career highs across all logged games.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {prs.map((pr) => {
            const isNew = newPRs.includes(pr.key);
            return (
              <div key={pr.key} className="relative">
                <Stat
                  label={pr.label}
                  value={
                    <span className="font-mono">
                      {hydrated ? pr.value : dash}
                    </span>
                  }
                  tone={isNew ? "lime" : "default"}
                />
                {isNew && (
                  <span className="pointer-events-none absolute -right-1 -top-1 inline-flex animate-fade-in items-center gap-1 rounded-full border border-lime/40 bg-lime/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime">
                    New PR!
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Game log */}
      <Section
        title="Game log"
        subtitle="Tap a row to see splits."
        right={
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted">
              {hydrated ? filteredGames.length : dash} / {hydrated ? games.length : dash}
            </span>
          </div>
        }
      >
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {(["all", "W", "L"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                    filter === f
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-line bg-surface2 text-muted hover:text-ink"
                  }`}
                >
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
            <select
              value={modeFilter}
              onChange={(e) =>
                setModeFilter(e.target.value as GameMode | "all")
              }
              className="rounded-md border border-line bg-surface2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-ink focus:border-flame focus:outline-none"
            >
              <option value="all">All modes</option>
              {GAME_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted">
                Sort
              </span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-md border border-line bg-surface2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-ink focus:border-flame focus:outline-none"
              >
                <option value="date">Date</option>
                <option value="pts">PTS</option>
                <option value="plusMinus">+/−</option>
                <option value="fgPct">FG%</option>
              </select>
            </div>
          </div>

          {!hydrated ? (
            <div className="font-mono text-sm text-muted">{dash}</div>
          ) : filteredGames.length === 0 ? (
            <div className="font-mono text-sm text-muted">
              {games.length === 0
                ? "No games yet. Log your first game above."
                : "No games match these filters."}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filteredGames.map((g) => {
                const open = expandedId === g.id;
                const fg = fgPct(g);
                const tp = threePct(g);
                const ft = ftPct(g);
                const pmTxt = (g.plusMinus >= 0 ? "+" : "") + g.plusMinus;
                return (
                  <li key={g.id} className="py-2">
                    <button
                      onClick={() => setExpandedId(open ? null : g.id)}
                      className="grid w-full grid-cols-[auto_auto_1fr_auto] items-center gap-3 text-left"
                    >
                      <span className="font-mono text-xs text-muted">
                        {g.date}
                      </span>
                      <span
                        className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          g.outcome === "W"
                            ? "border-lime/40 bg-lime/10 text-lime"
                            : "border-flame/40 bg-flame/10 text-flame"
                        }`}
                      >
                        {g.outcome}
                      </span>
                      <span className="truncate font-mono text-sm text-ink">
                        {g.pts} / {g.reb} / {g.ast}
                        <span className="ml-2 text-[10px] text-muted">
                          {g.mode}
                        </span>
                      </span>
                      <span
                        className={`font-mono text-xs ${
                          g.plusMinus >= 0 ? "text-lime" : "text-flame"
                        }`}
                      >
                        {pmTxt}
                      </span>
                    </button>
                    {open && (
                      <div className="mt-2 rounded-md border border-line bg-surface2 p-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 font-mono text-ink md:grid-cols-4">
                          <div>
                            <span className="text-muted">FG </span>
                            {g.fgm}/{g.fga}
                            {fg !== null && (
                              <span className="text-muted"> · {fg.toFixed(1)}%</span>
                            )}
                          </div>
                          <div>
                            <span className="text-muted">3P </span>
                            {g.threePm}/{g.threePa}
                            {tp !== null && (
                              <span className="text-muted"> · {tp.toFixed(1)}%</span>
                            )}
                          </div>
                          <div>
                            <span className="text-muted">FT </span>
                            {g.ftm}/{g.fta}
                            {ft !== null && (
                              <span className="text-muted"> · {ft.toFixed(1)}%</span>
                            )}
                          </div>
                          <div>
                            <span className="text-muted">MIN </span>
                            {g.min}
                          </div>
                          <div>
                            <span className="text-muted">STL </span>
                            {g.stl}
                          </div>
                          <div>
                            <span className="text-muted">BLK </span>
                            {g.blk}
                          </div>
                          <div>
                            <span className="text-muted">TO </span>
                            {g.to}
                          </div>
                          <div>
                            <span className="text-muted">OPP </span>
                            {g.opponent ?? "—"}
                          </div>
                        </div>
                        {g.notes && (
                          <div className="mt-2 font-mono text-ink">
                            <span className="text-muted">Notes </span>
                            {g.notes}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => onEdit(g)}
                            className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink hover:border-ice hover:text-ice"
                          >
                            Edit
                          </button>
                          {confirmDeleteId === g.id ? (
                            <>
                              <button
                                onClick={() => onDelete(g.id)}
                                className="rounded-md border border-flame bg-flame/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-flame"
                              >
                                Confirm delete
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[11px] uppercase tracking-wider text-muted hover:text-ink"
                              >
                                cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(g.id)}
                              className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted hover:border-flame hover:text-flame"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Section>

      {/* Export */}
      <Section title="Export & backup" subtitle="Take your data with you.">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onCopyCSV}
              className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink hover:border-ice hover:text-ice"
            >
              {copied ? "Copied!" : "Copy as CSV"}
            </button>
            <button
              onClick={onDownloadJSON}
              className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink hover:border-ice hover:text-ice"
            >
              Download .json
            </button>
            <label className="cursor-pointer rounded-md border border-line bg-surface2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink hover:border-ice hover:text-ice">
              Import (merge)
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={(e) => onImportFile(e, "merge")}
                className="hidden"
              />
            </label>
            <label className="cursor-pointer rounded-md border border-line bg-surface2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted hover:border-flame hover:text-flame">
              Import (replace)
              <input
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={(e) => onImportFile(e, "replace")}
                className="hidden"
              />
            </label>
            {importMsg && (
              <span className="font-mono text-[11px] text-muted">{importMsg}</span>
            )}
          </div>
        </Card>
      </Section>

      {/* Goal panel */}
      <Section title="Goal" subtitle="From Coach + a stat target.">
        <Card>
          <div className="mb-3 flex items-start gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Coach goal
            </span>
            <span className="font-mono text-sm text-ink">
              {hydrated ? coachGoal || "— (set one on /coach)" : dash}
            </span>
          </div>
          <TargetPanel
            target={target}
            games={games}
            hydrated={hydrated}
            editing={editingTarget}
            onEdit={() => setEditingTarget(true)}
            onSave={(t) => {
              saveTarget(t);
              setTargetState(t);
              setEditingTarget(false);
            }}
            onClear={() => {
              saveTarget(null);
              setTargetState(null);
              setEditingTarget(false);
            }}
            onCancel={() => setEditingTarget(false)}
          />
        </Card>
      </Section>
    </div>
  );
}

// ---------- NumberInput ---------------------------------------------------

function NumberInput({
  label,
  value,
  onChange,
  allowNegative = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  allowNegative?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        type="number"
        inputMode={allowNegative ? "numeric" : "numeric"}
        value={Number.isFinite(value) ? value : 0}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || raw === "-") {
            onChange(0);
            return;
          }
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          onChange(allowNegative ? n : Math.max(0, n));
        }}
        className="mt-1 w-full rounded-md border border-line bg-surface2 px-2 py-1.5 text-center font-mono text-base text-ink focus:border-flame focus:outline-none"
      />
    </label>
  );
}

// ---------- Trends (small multiples) --------------------------------------

function Trends({ games }: { games: GameLog[] }) {
  // last 20 chronological (oldest → newest)
  const chrono = useMemo(() => {
    const sorted = [...games].sort(
      (a, b) => a.date.localeCompare(b.date) || a.ts - b.ts,
    );
    return sorted.slice(Math.max(0, sorted.length - 20));
  }, [games]);

  const pts = chrono.map((g) => g.pts);
  const fg = chrono.map((g) => fgPct(g) ?? 0);
  const pm = chrono.map((g) => g.plusMinus);

  return (
    <div className="space-y-4">
      <Sparkline
        title="PPG"
        values={pts}
        kind="line"
        tone="flame"
        format={(v) => String(Math.round(v))}
      />
      <Sparkline
        title="FG%"
        values={fg}
        kind="line"
        tone="ice"
        format={(v) => `${v.toFixed(0)}%`}
      />
      <Sparkline
        title="+/−"
        values={pm}
        kind="bar"
        tone="lime"
        format={(v) => (v >= 0 ? `+${v}` : String(v))}
        zeroLine
      />
    </div>
  );
}

function Sparkline({
  title,
  values,
  kind,
  tone,
  format,
  zeroLine = false,
}: {
  title: string;
  values: number[];
  kind: "line" | "bar";
  tone: "flame" | "ice" | "lime";
  format: (v: number) => string;
  zeroLine?: boolean;
}) {
  const W = 320;
  const H = 80;
  const PAD_X = 6;
  const PAD_Y = 10;
  const toneStroke = { flame: "#FF3D00", ice: "#00E5FF", lime: "#00E676" }[tone];
  const toneFill = { flame: "#FF3D00", ice: "#00E5FF", lime: "#00E676" }[tone];

  if (values.length === 0) {
    return (
      <div className="font-mono text-xs text-muted">{title} — no data</div>
    );
  }

  const min = Math.min(...values, zeroLine ? 0 : Infinity);
  const max = Math.max(...values, zeroLine ? 0 : -Infinity);
  const span = max - min || 1;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const n = values.length;
  const step = n > 1 ? innerW / (n - 1) : 0;

  const x = (i: number) => PAD_X + (n === 1 ? innerW / 2 : i * step);
  const y = (v: number) => PAD_Y + innerH - ((v - min) / span) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  const first = values[0];
  const last = values[values.length - 1];

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {title}
        </div>
        <div className="font-mono text-[11px] text-muted">
          {n} game{n === 1 ? "" : "s"}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[80px] w-full"
        role="img"
        aria-label={`${title} trend over last ${n} games`}
      >
        {zeroLine && min < 0 && max > 0 && (
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={y(0)}
            y2={y(0)}
            stroke="#26262F"
            strokeWidth={1}
          />
        )}
        {kind === "line" ? (
          <>
            <polyline
              points={points}
              fill="none"
              stroke={toneStroke}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={1.5} fill={toneStroke} />
            ))}
          </>
        ) : (
          <>
            {values.map((v, i) => {
              const xc = x(i);
              const barW = Math.max(2, step * 0.7);
              const y0 = y(0);
              const yv = y(v);
              const top = Math.min(y0, yv);
              const height = Math.max(1, Math.abs(yv - y0));
              const color = v >= 0 ? "#00E676" : "#FF3D00";
              return (
                <rect
                  key={i}
                  x={xc - barW / 2}
                  y={top}
                  width={barW}
                  height={height}
                  fill={color}
                  opacity={0.85}
                />
              );
            })}
          </>
        )}
        {/* direct labels: first + last */}
        <text
          x={x(0)}
          y={Math.max(10, y(first) - 4)}
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill="#71717A"
          textAnchor="start"
        >
          {format(first)}
        </text>
        <text
          x={x(n - 1)}
          y={Math.max(10, y(last) - 4)}
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill={toneFill}
          textAnchor="end"
        >
          {format(last)}
        </text>
      </svg>
    </div>
  );
}

// ---------- Target panel --------------------------------------------------

const TARGET_STATS: TargetStat[] = [
  "pts",
  "reb",
  "ast",
  "stl",
  "blk",
  "plusMinus",
  "fgPct",
  "threePct",
  "ftPct",
];

function TargetPanel({
  target,
  games,
  hydrated,
  editing,
  onEdit,
  onSave,
  onClear,
  onCancel,
}: {
  target: StatTarget | null;
  games: GameLog[];
  hydrated: boolean;
  editing: boolean;
  onEdit: () => void;
  onSave: (t: StatTarget) => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<StatTarget>(
    target ?? { stat: "pts", threshold: 25, lookback: 20 },
  );

  useEffect(() => {
    if (target) setDraft(target);
  }, [target]);

  if (!hydrated) {
    return <div className="font-mono text-sm text-muted">—</div>;
  }

  if (!editing && target) {
    const cur = targetAvg(games, target);
    const pct = targetProgress(games, target);
    const curTxt =
      cur === null
        ? "—"
        : target.stat === "fgPct" ||
            target.stat === "threePct" ||
            target.stat === "ftPct"
          ? `${cur.toFixed(1)}%`
          : cur.toFixed(1);
    const thresholdTxt =
      target.stat === "fgPct" ||
      target.stat === "threePct" ||
      target.stat === "ftPct"
        ? `${target.threshold}%`
        : String(target.threshold);
    return (
      <div>
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Target
          </span>
          <span className="font-mono text-sm text-ink">
            Avg {TARGET_STAT_LABELS[target.stat]} ≥ {thresholdTxt} over last{" "}
            {target.lookback} games
          </span>
          <button
            onClick={onEdit}
            className="text-[11px] uppercase tracking-wider text-muted hover:text-ice"
          >
            edit
          </button>
          <button
            onClick={onClear}
            className="text-[11px] uppercase tracking-wider text-muted hover:text-flame"
          >
            clear
          </button>
        </div>
        <div className="mb-1 flex items-center justify-between font-mono text-xs">
          <span className="text-muted">
            Current: <span className="text-ink">{curTxt}</span>
          </span>
          <span className="text-muted">{pct.toFixed(0)}%</span>
        </div>
        <Bar value={pct} max={100} tone={pct >= 100 ? "lime" : "flame"} />
      </div>
    );
  }

  if (!editing && !target) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-muted">No target set.</span>
        <button
          onClick={onEdit}
          className="rounded-md border border-line bg-surface2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink hover:border-flame hover:text-flame"
        >
          Set target
        </button>
      </div>
    );
  }

  // editing
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            Stat
          </span>
          <select
            value={draft.stat}
            onChange={(e) =>
              setDraft((d) => ({ ...d, stat: e.target.value as TargetStat }))
            }
            className="mt-1 w-full rounded-md border border-line bg-surface2 px-2 py-1.5 font-mono text-sm text-ink focus:border-flame focus:outline-none"
          >
            {TARGET_STATS.map((s) => (
              <option key={s} value={s}>
                {TARGET_STAT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            Threshold
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={draft.threshold}
            onChange={(e) =>
              setDraft((d) => ({ ...d, threshold: Number(e.target.value) || 0 }))
            }
            className="mt-1 w-full rounded-md border border-line bg-surface2 px-2 py-1.5 font-mono text-sm text-ink focus:border-flame focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            Lookback (games)
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={draft.lookback}
            min={1}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                lookback: Math.max(1, Number(e.target.value) || 1),
              }))
            }
            className="mt-1 w-full rounded-md border border-line bg-surface2 px-2 py-1.5 font-mono text-sm text-ink focus:border-flame focus:outline-none"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(draft)}
          className="rounded-md border border-flame bg-flame px-3 py-1 text-xs font-bold uppercase tracking-wider text-black"
        >
          Save target
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] uppercase tracking-wider text-muted hover:text-ink"
        >
          cancel
        </button>
        {target && (
          <button
            onClick={onClear}
            className="ml-auto text-[11px] uppercase tracking-wider text-muted hover:text-flame"
          >
            clear target
          </button>
        )}
      </div>
      {target && (
        <Pill tone="muted" className="!text-[10px]">
          Pill preview: Avg {TARGET_STAT_LABELS[draft.stat]} ≥ {draft.threshold}{" "}
          over {draft.lookback}
        </Pill>
      )}
    </div>
  );
}
