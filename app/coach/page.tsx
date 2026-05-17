"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, Section, Stat, Pill } from "@/components/ui";
import { CoachAgentPanel } from "./CoachAgentPanel";
import {
  analyze,
  clearAllProgress,
  getDoneToday,
  getGoal,
  getMasteryTier,
  getName,
  PRESET_GOALS,
  relativeTime,
  setDoneToday,
  setGoal,
  setName,
  tierRingClass,
  todayKey,
  toggleDoneToday,
  type CoachAction,
  type CoachReport,
  type MasteryTierLabel,
} from "@/lib/coach";
import {
  loadState as loadDiagnosticState,
  type DailyAction,
  type DiagnosticState,
} from "@/lib/diagnose";

const DAY_MS = 24 * 3600 * 1000;

// Visible-but-editable defaults so the page renders fully on first paint
// instead of pushing setup CTAs.
const DEFAULT_NAME = "Player";
const DEFAULT_GOAL = "Diamond rep in MyCareer";

function hrefToCategory(href: string): CoachAction["category"] {
  if (href.startsWith("/shot-trainer")) return "shot";
  if (href.startsWith("/scenarios")) return "scenario";
  if (href.startsWith("/codes")) return "code";
  if (href.startsWith("/builds")) return "build";
  if (href.startsWith("/moves")) return "moves";
  if (href.startsWith("/pulse")) return "pulse";
  if (href.startsWith("/tips")) return "tips";
  return "tips";
}

// Pick today's prescription actions. dayNum is 1-based day since the diagnostic
// was taken. We pick all actions with day === dayNum, or if none, the nearest
// preceding action (so the player always has something concrete to do).
function pickPrescriptionActions(
  state: DiagnosticState,
  now: number,
): { action: DailyAction; key: string }[] {
  const ageDays = Math.floor((now - state.ts) / DAY_MS) + 1;
  const all = [...state.prescription.week1, ...state.prescription.week2];
  if (all.length === 0) return [];
  const exact = all.filter((a) => a.day === ageDays);
  if (exact.length > 0) {
    return exact.map((a) => ({ action: a, key: `rx-${a.day}-${a.href}` }));
  }
  // Fallback: nearest preceding action; if none preceding, take the first
  // upcoming. Cap at 1 fallback to keep things clean.
  const preceding = all
    .filter((a) => a.day <= ageDays)
    .sort((a, b) => b.day - a.day);
  if (preceding.length > 0) {
    const a = preceding[0];
    return [{ action: a, key: `rx-${a.day}-${a.href}` }];
  }
  const upcoming = all.sort((a, b) => a.day - b.day);
  if (upcoming.length > 0) {
    const a = upcoming[0];
    return [{ action: a, key: `rx-${a.day}-${a.href}` }];
  }
  return [];
}

// Build a prefill question for /ai based on the user's biggest gap.
function gapToQuestion(stuck: string[]): string {
  const first = (stuck[0] || "").toLowerCase();
  if (/defense/.test(first)) {
    return "What's the best defensive read in pick-and-roll right now?";
  }
  if (/shot|green/.test(first)) {
    return "How do I raise my green window in 2K26 patch 1.7?";
  }
  if (/scenario|optimal/.test(first)) {
    return "Walk me through reading a pick-and-roll coverage on offense.";
  }
  if (/streak|daily/.test(first)) {
    return "Give me a 15-minute daily routine to lock in scenario reads.";
  }
  if (/watchlist|pulse/.test(first)) {
    return "Which NBA risers should I be tracking for MyTeam this week?";
  }
  if (/code/.test(first)) {
    return "What's the fastest way to farm VC right now?";
  }
  if (/build|myplayer/.test(first)) {
    return "What's a top PG build under 6'2 for online H2H in patch 1.7?";
  }
  if (/badge/.test(first)) {
    return "Which badges should I prioritize first on a new build?";
  }
  if (/tips|learned|mechanic/.test(first)) {
    return "What hidden mechanics in 2K26 patch 1.7 give the biggest edge?";
  }
  return "What's the single biggest thing holding back most 2K26 players?";
}

export default function CoachPage() {
  const [hydrated, setHydrated] = useState(false);
  const [report, setReport] = useState<CoachReport | null>(null);
  const [name, setNameState] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [goal, setGoalState] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [tier, setTier] = useState<MasteryTierLabel>("ROOKIE");
  const [stuckExpanded, setStuckExpanded] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticState | null>(null);

  const refresh = useCallback(() => {
    setReport(analyze());
    setNameState(getName());
    setGoalState(getGoal());
    setDone(getDoneToday().ids);
    setTier(getMasteryTier());
    setDiagnostic(loadDiagnosticState());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  // Snapshot tiles -----------------------------------------------------------
  const snapshot = report?.snapshot;
  const activity = hydrated && snapshot ? snapshot.activity : null;
  const greenPct = hydrated && snapshot ? snapshot.greenPct : null;
  const optimalPct = hydrated && snapshot ? snapshot.optimalPct : null;
  const dailyStreak = hydrated && snapshot ? snapshot.dailyStreak : null;

  const growing = report?.growing ?? [];
  const stuck = report?.stuck ?? [];
  const recentWins = report?.recentWins ?? [];
  // We only show Growing / Stuck if the user has any localStorage activity
  // to derive signal from. Otherwise the section would feel like an
  // empty-state pushback ("take the diagnostic first…").
  const hasActivity = (report?.snapshot.activity ?? 0) > 0;
  const showSignal = hydrated && hasActivity;

  // Tonight's three — merge prescription actions (if a diagnostic exists)
  // ahead of the generic stuck-based actions, then top-up from the generic
  // pool to a max of 3.
  const { tonightsThree, prescriptionIds } = useMemo(() => {
    const generic = report?.tonightsThree ?? [];
    if (!diagnostic) {
      return { tonightsThree: generic, prescriptionIds: new Set<string>() };
    }
    const picks = pickPrescriptionActions(diagnostic, Date.now());
    const rxActions: CoachAction[] = picks.map(({ action, key }) => ({
      id: key,
      label: action.text,
      estMinutes: action.minutes,
      href: action.href,
      category: hrefToCategory(action.href),
    }));
    const rxHrefs = new Set(rxActions.map((a) => a.href));
    const filteredGeneric = generic.filter((g) => !rxHrefs.has(g.href));
    const merged = [...rxActions, ...filteredGeneric].slice(0, 3);
    return {
      tonightsThree: merged,
      prescriptionIds: new Set(rxActions.map((a) => a.id)),
    };
  }, [report, diagnostic]);

  // Deep link to /ai with a question prefilled from the biggest current gap.
  const aiHref = useMemo(() => {
    const q = gapToQuestion(stuck);
    return `/ai?q=${encodeURIComponent(q)}`;
  }, [stuck]);

  // Handlers -----------------------------------------------------------------
  const submitName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setEditingName(false);
      setNameInput("");
      return;
    }
    setName(trimmed);
    setNameState(trimmed);
    setNameInput("");
    setEditingName(false);
  };

  const submitGoal = (g: string) => {
    const trimmed = g.trim();
    if (!trimmed) return;
    setGoal(trimmed);
    setGoalState(trimmed);
    setEditingGoal(false);
    setGoalInput("");
    setReport(analyze()); // weights change
  };

  const onToggleDone = (id: string) => {
    const next = toggleDoneToday(id);
    setDone(next);
  };

  const clearTodayDone = () => {
    setDoneToday([]);
    setDone([]);
  };

  const onReset = () => {
    clearAllProgress();
    setConfirmingReset(false);
    refresh();
  };

  const dash = "—";

  return (
    <div className="space-y-10">
      {/* Header ------------------------------------------------------------ */}
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          Personal Scouting Report
        </div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-7xl">
          Coach
        </h1>
        <p className="mt-2 text-sm text-muted md:text-base">
          Your stats. Your gaps. Tonight&apos;s three.
        </p>
      </header>

      {/* Identity strip --------------------------------------------------- */}
      <Card className="border-line">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link
            href={aiHref}
            className="inline-flex items-center gap-1 rounded-md border border-flame/50 bg-flame/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-flame transition hover:bg-flame/20"
          >
            Ask the AI Expert →
          </Link>
          <Link
            href="/my-stats"
            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted transition hover:border-ice hover:text-ice"
          >
            Log this session
          </Link>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-12 w-12 place-items-center rounded-md bg-surface2 font-display text-lg ${tierRingClass(
                tier,
              )}`}
            >
              {tier[0]}
            </div>
            <div>
              {hydrated && editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={submitName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitName();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setNameInput("");
                      }
                    }}
                    placeholder="Your handle"
                    maxLength={24}
                    autoFocus
                    className="rounded-md border border-line bg-surface2 px-2 py-1 font-display text-2xl tracking-wider text-ink placeholder:text-muted focus:border-flame focus:outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="font-display text-3xl tracking-wider text-ink md:text-4xl">
                    {hydrated ? name || DEFAULT_NAME : DEFAULT_NAME}
                  </div>
                  {hydrated && (
                    <button
                      onClick={() => {
                        setEditingName(true);
                        setNameInput(name);
                      }}
                      className="text-[11px] uppercase tracking-wider text-muted hover:text-ice"
                    >
                      edit
                    </button>
                  )}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <Pill tone="muted" className="!text-[10px]">
                  Tier · {hydrated ? tier : dash}
                </Pill>
              </div>
            </div>
          </div>

          <div className="md:max-w-[55%]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Goal
            </div>
            {hydrated && editingGoal ? (
              <div className="mt-1 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_GOALS.map((g) => (
                    <button
                      key={g}
                      onClick={() => submitGoal(g)}
                      className="rounded-full border border-line bg-surface2 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition hover:border-flame hover:text-flame"
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitGoal(goalInput);
                      if (e.key === "Escape") setEditingGoal(false);
                    }}
                    placeholder="Custom goal…"
                    maxLength={80}
                    autoFocus
                    className="w-full rounded-md border border-line bg-surface2 px-2 py-1 text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
                  />
                  <button
                    onClick={() => submitGoal(goalInput)}
                    className="rounded-md border border-line bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink hover:border-flame hover:text-flame"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingGoal(false)}
                    className="text-[11px] uppercase tracking-wider text-muted hover:text-ink"
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-sm text-ink">
                  {hydrated ? goal || DEFAULT_GOAL : DEFAULT_GOAL}
                </span>
                {hydrated && (
                  <button
                    onClick={() => {
                      setEditingGoal(true);
                      setGoalInput(goal);
                    }}
                    className="text-[11px] uppercase tracking-wider text-muted hover:text-ice"
                  >
                    change
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Snapshot --------------------------------------------------------- */}
      <Section title="This week" subtitle="Snapshot pulled from your local state.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Activity"
            value={
              activity === null ? dash : <span className="font-mono">{activity}</span>
            }
            hint="scenarios + shots + builds"
          />
          <Stat
            label="Shot %"
            value={
              greenPct === null ? (
                dash
              ) : (
                <span className="font-mono">{greenPct}%</span>
              )
            }
            tone={greenPct !== null && greenPct >= 50 ? "lime" : "flame"}
            hint="greens / attempts"
          />
          <Stat
            label="Scenario %"
            value={
              optimalPct === null ? (
                dash
              ) : (
                <span className="font-mono">{optimalPct}%</span>
              )
            }
            tone={optimalPct !== null && optimalPct >= 60 ? "ice" : "default"}
            hint="optimal first try"
          />
          <Stat
            label="Daily Streak"
            value={
              dailyStreak === null ? (
                dash
              ) : (
                <span className="font-mono">{dailyStreak}</span>
              )
            }
            tone={dailyStreak !== null && dailyStreak >= 3 ? "gold" : "default"}
            hint="consecutive days"
          />
        </div>
      </Section>

      {/* Growing / Stuck -------------------------------------------------- */}
      {showSignal && (growing.length > 0 || stuck.length > 0) && (
        <Section
          title="Signal"
          subtitle="Where you're growing — and where you're stuck."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {growing.length > 0 && (
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-display text-2xl tracking-wider text-lime">
                    Growing
                  </div>
                  <Pill tone="lime">{growing.length}</Pill>
                </div>
                <ul className="space-y-1.5 text-sm text-ink">
                  {growing.map((g, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-lime">▸</span>
                      <span className="font-mono">{g}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {stuck.length > 0 && (
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-display text-2xl tracking-wider text-flame">
                    Stuck
                  </div>
                  <Pill tone="flame">{stuck.length}</Pill>
                </div>
                <ul className="space-y-1.5 text-sm text-ink">
                  {(stuckExpanded ? stuck : stuck.slice(0, 3)).map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-flame">▲</span>
                      <span className="font-mono">{s}</span>
                    </li>
                  ))}
                </ul>
                {stuck.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setStuckExpanded((v) => !v)}
                    className="mt-2 text-[11px] uppercase tracking-wider text-muted hover:text-flame"
                  >
                    {stuckExpanded
                      ? "show less"
                      : `+${stuck.length - 3} more`}
                  </button>
                )}
              </Card>
            )}
          </div>
        </Section>
      )}

      {/* Tonight's Three -------------------------------------------------- */}
      <Section
        title="Tonight's three"
        subtitle={`Stable for ${todayKey()}. Same three all day.`}
        right={
          hydrated && done.length > 0 ? (
            <button
              onClick={clearTodayDone}
              className="text-[11px] uppercase tracking-wider text-muted hover:text-ice"
            >
              reset · {done.length}/{tonightsThree.length}
            </button>
          ) : null
        }
      >
        {hydrated ? (
          <ul className="space-y-3">
            {tonightsThree.map((a, idx) => (
              <TonightCard
                key={a.id}
                index={idx + 1}
                action={a}
                done={done.includes(a.id)}
                fromDiagnostic={prescriptionIds.has(a.id)}
                onToggle={() => onToggleDone(a.id)}
              />
            ))}
          </ul>
        ) : (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="opacity-40">
                <div className="font-mono text-sm text-muted">{dash}</div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* Weekly plan agent ------------------------------------------------ */}
      <CoachAgentPanel />

      {/* Recent wins ------------------------------------------------------ */}
      <Section title="Recent wins" subtitle="Last 5 logged across the lab.">
        {hydrated ? (
          recentWins.length > 0 ? (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {recentWins.map((w, i) => (
                <li
                  key={`${w.ts}-${i}`}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-lime">✓</span>
                    <span className="font-mono text-sm text-ink">{w.label}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted">
                    {relativeTime(w.ts)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <div className="font-mono text-sm text-muted">
                No timestamped wins yet. Save a build or finish a drill.
              </div>
            </Card>
          )
        ) : (
          <Card>
            <div className="font-mono text-sm text-muted">{dash}</div>
          </Card>
        )}
      </Section>

      {/* Reset ------------------------------------------------------------ */}
      <div className="pt-2 text-center">
        {confirmingReset ? (
          <div className="inline-flex items-center gap-2">
            <span className="font-mono text-xs text-muted">Erase all local progress?</span>
            <button
              onClick={onReset}
              className="rounded-md border border-flame bg-flame/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-flame"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingReset(false)}
              className="rounded-md border border-line bg-surface2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            className="text-[11px] uppercase tracking-wider text-muted hover:text-flame"
          >
            Clear all progress
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Subcomponent --------------------------------------------------

function TonightCard({
  index,
  action,
  done,
  fromDiagnostic,
  onToggle,
}: {
  index: number;
  action: CoachAction;
  done: boolean;
  fromDiagnostic?: boolean;
  onToggle: () => void;
}) {
  const toneRing = useMemo(() => {
    switch (action.category) {
      case "shot":
        return "border-flame/40";
      case "scenario":
        return "border-ice/40";
      case "code":
        return "border-gold/40";
      case "build":
        return "border-lime/40";
      default:
        return "border-line";
    }
  }, [action.category]);

  return (
    <li>
      <div
        className={`rounded-xl border bg-surface p-4 shadow-card transition ${
          done ? "opacity-50" : ""
        } ${toneRing}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            aria-label={done ? "Mark not done" : "Mark done"}
            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border font-mono text-sm transition ${
              done
                ? "border-lime bg-lime/20 text-lime"
                : "border-line bg-surface2 text-muted hover:border-ice hover:text-ice"
            }`}
          >
            {done ? "✓" : index}
          </button>
          <div className="min-w-0 flex-1">
            {fromDiagnostic && (
              <div className="mb-1">
                <Pill tone="ice" className="!text-[10px]">
                  From your diagnostic
                </Pill>
              </div>
            )}
            <div
              className={`font-mono text-sm md:text-base ${
                done ? "text-muted line-through" : "text-ink"
              }`}
            >
              {action.label}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Pill tone="muted" className="!text-[10px]">
                ~{action.estMinutes} min
              </Pill>
              <Pill tone="default" className="!text-[10px]">
                {action.category}
              </Pill>
              <Link
                href={action.href}
                className="text-[11px] font-bold uppercase tracking-wider text-ice hover:text-ink"
              >
                {action.href} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
