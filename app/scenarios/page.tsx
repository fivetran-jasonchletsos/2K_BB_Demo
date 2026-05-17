"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Pill } from "@/components/ui";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  EMPTY_PROGRESS,
  Option,
  ProgressState,
  SCENARIOS,
  Scenario,
  ScenarioCategory,
  getDailyScenarios,
  todayKey,
  yesterdayKey,
} from "@/lib/scenarios";
import { getPlayerIdByName } from "@/lib/players";
import { ARCHETYPES } from "@/lib/builds";

// Slugify same way the badges page generates ids (lib/badges.ts).
const refSlug = (n: string) =>
  n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Map a scenario "build" reference name to a Build Lab archetype id.
// Tries exact (case-insensitive) match on archetype name, then slug match.
function buildArcheIdFromName(name: string): string | null {
  const target = name.trim().toLowerCase();
  if (!target) return null;
  const exact = ARCHETYPES.find((a) => a.name.toLowerCase() === target);
  if (exact) return exact.id;
  const slug = refSlug(name);
  return ARCHETYPES.find((a) => refSlug(a.name) === slug)?.id ?? null;
}

const STORAGE_KEY = "2klab.scenarios";
const POINTS_KEY = "2klab.scenarios.points";
const DAILY_KEY = "2klab.scenarios.daily";
const DAILY_STREAK_KEY = "2klab.scenarios.dailyStreak";
const LAST_COMPLETED_KEY = "2klab.scenarios.lastCompletedDate";

const PTS_FIRST_TRY = 100;
const PTS_AFTER_RETRY = 50;
const PTS_TRY = 25;

type CategoryFilter = "all" | ScenarioCategory;

type AnswerState = {
  picked: number | null;
  revealed: boolean;
  attempts: number; // attempts on the current scenario
};

type DailyRecord = {
  date: string;
  correct: number; // optimal-first-try count
  total: number;
  timeMs: number;
};

function loadProgress(): ProgressState {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      ...EMPTY_PROGRESS,
      ...parsed,
      perScenarioStatus: parsed.perScenarioStatus ?? {},
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function saveProgress(p: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

function loadPoints(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function savePoints(n: number) {
  try {
    localStorage.setItem(POINTS_KEY, String(n));
  } catch {
    /* noop */
  }
}

function loadDaily(): Record<string, DailyRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DailyRecord>;
  } catch {
    return {};
  }
}

function saveDaily(map: Record<string, DailyRecord>) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

function loadDailyStreak(): { streak: number; last: string | null } {
  if (typeof window === "undefined") return { streak: 0, last: null };
  try {
    const s = parseInt(localStorage.getItem(DAILY_STREAK_KEY) || "0", 10);
    const last = localStorage.getItem(LAST_COMPLETED_KEY);
    return {
      streak: Number.isFinite(s) ? s : 0,
      last: last || null,
    };
  } catch {
    return { streak: 0, last: null };
  }
}

function saveDailyStreak(streak: number, last: string) {
  try {
    localStorage.setItem(DAILY_STREAK_KEY, String(streak));
    localStorage.setItem(LAST_COMPLETED_KEY, last);
  } catch {
    /* noop */
  }
}

function difficultyDots(d: 1 | 2 | 3) {
  return "●".repeat(d) + "○".repeat(3 - d);
}

// Fisher-Yates with seeded RNG. Used for session randomization.
function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  const rand = () => {
    s = (Math.imul(s, 9301) + 49297) >>> 0;
    s = s % 233280;
    return s / 233280;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Mode =
  | { kind: "free" }
  | {
      kind: "daily";
      scenarios: Scenario[];
      index: number;
      correct: number;
      startedAt: number;
    };

export default function ScenariosPage() {
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS);
  const [points, setPoints] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [showOnlyUnlearned, setShowOnlyUnlearned] = useState(false);

  // Session order (random, non-repeating in session)
  const [sessionSeed, setSessionSeed] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const [answer, setAnswer] = useState<AnswerState>({
    picked: null,
    revealed: false,
    attempts: 0,
  });

  // Daily drill state
  const [dailyMap, setDailyMap] = useState<Record<string, DailyRecord>>({});
  const [dailyStreak, setDailyStreak] = useState(0);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "free" });
  const [dailyResult, setDailyResult] = useState<DailyRecord | null>(null);

  const today = useMemo(() => todayKey(), []);
  const dailyScenarios = useMemo(() => getDailyScenarios(today, 3), [today]);

  // Hydrate from localStorage
  useEffect(() => {
    setProgress(loadProgress());
    setPoints(loadPoints());
    setDailyMap(loadDaily());
    const ds = loadDailyStreak();
    setDailyStreak(ds.streak);
    setLastCompleted(ds.last);
    setSessionSeed(Math.floor(Math.random() * 100000) + 1);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveProgress(progress);
  }, [progress, hydrated]);

  useEffect(() => {
    if (hydrated) savePoints(points);
  }, [points, hydrated]);

  const completedToday = !!dailyMap[today];

  // Build the free-mode pool: filter, shuffle by sessionSeed, drop seen.
  const freePool: Scenario[] = useMemo(() => {
    let base =
      filter === "all" ? SCENARIOS : SCENARIOS.filter((s) => s.category === filter);
    if (showOnlyUnlearned) {
      base = base.filter((s) => progress.perScenarioStatus[s.id] !== "learned");
    }
    const shuffled = shuffle(base, sessionSeed || 1);
    const unseen = shuffled.filter((s) => !seenIds.has(s.id));
    // If user exhausts the pool, reset seen set silently and reshuffle.
    return unseen.length > 0 ? unseen : shuffled;
  }, [filter, showOnlyUnlearned, sessionSeed, seenIds, progress.perScenarioStatus]);

  // Pick the current scenario for the active mode.
  const current: Scenario | undefined =
    mode.kind === "daily" ? mode.scenarios[mode.index] : freePool[0];

  // When the current scenario changes, reset answer state.
  const currentId = current?.id;
  useEffect(() => {
    setAnswer({ picked: null, revealed: false, attempts: 0 });
  }, [currentId]);

  const awardPoints = useCallback((delta: number) => {
    setPoints((p) => p + delta);
  }, []);

  function pick(optIdx: number) {
    if (!current) return;
    if (answer.revealed) return;
    const opt = current.options[optIdx];
    const wasOptimal = opt.isOptimal;
    const attemptsBefore = answer.attempts;
    const newAttempts = attemptsBefore + 1;
    setAnswer({ picked: optIdx, revealed: true, attempts: newAttempts });

    // Points: 100 first-try optimal, 50 optimal after retry, 25 for trying (non-optimal).
    if (wasOptimal && newAttempts === 1) awardPoints(PTS_FIRST_TRY);
    else if (wasOptimal && newAttempts > 1) awardPoints(PTS_AFTER_RETRY);
    else awardPoints(PTS_TRY);

    // Daily-mode bookkeeping
    if (mode.kind === "daily") {
      // Track first-try optimal correctness inside the drill
      if (wasOptimal && newAttempts === 1) {
        setMode({ ...mode, correct: mode.correct + 1 });
      }
    }

    setProgress((prev) => {
      const prevStatus = prev.perScenarioStatus[current.id];
      const alreadyAnswered = prevStatus === "optimal" || prevStatus === "suboptimal";

      const next: ProgressState = {
        ...prev,
        perScenarioStatus: {
          ...prev.perScenarioStatus,
          [current.id]: wasOptimal ? "optimal" : "suboptimal",
        },
      };

      if (!alreadyAnswered) {
        next.played = prev.played + 1;
        if (wasOptimal) next.optimal = prev.optimal + 1;
      } else if (prevStatus === "suboptimal" && wasOptimal) {
        next.optimal = prev.optimal + 1;
      } else if (prevStatus === "optimal" && !wasOptimal) {
        next.optimal = Math.max(0, prev.optimal - 1);
      }

      if (wasOptimal && newAttempts === 1) {
        next.streak = prev.streak + 1;
        next.bestStreak = Math.max(prev.bestStreak, next.streak);
      } else if (!wasOptimal && newAttempts === 1) {
        next.streak = 0;
      }

      return next;
    });
  }

  function tryAgain() {
    setAnswer((a) => ({ picked: null, revealed: false, attempts: a.attempts }));
  }

  function advance() {
    if (mode.kind === "daily") {
      const nextIdx = mode.index + 1;
      if (nextIdx >= mode.scenarios.length) {
        // Drill complete
        const elapsed = Date.now() - mode.startedAt;
        const record: DailyRecord = {
          date: today,
          correct: mode.correct,
          total: mode.scenarios.length,
          timeMs: elapsed,
        };
        const nextMap = { ...dailyMap, [today]: record };
        setDailyMap(nextMap);
        saveDaily(nextMap);

        // Daily streak: +1 if yesterday was completed, else reset to 1.
        const wasConsecutive = lastCompleted === yesterdayKey();
        const newStreak = wasConsecutive ? dailyStreak + 1 : 1;
        setDailyStreak(newStreak);
        setLastCompleted(today);
        saveDailyStreak(newStreak, today);

        setDailyResult(record);
        setMode({ kind: "free" });
      } else {
        setMode({ ...mode, index: nextIdx });
      }
      return;
    }

    // Free mode: mark scenario as seen and move on.
    if (current) {
      setSeenIds((prev) => {
        const next = new Set(prev);
        next.add(current.id);
        return next;
      });
    }
  }

  function markLearned() {
    if (!current) return;
    setProgress((prev) => ({
      ...prev,
      perScenarioStatus: { ...prev.perScenarioStatus, [current.id]: "learned" },
    }));
    if (mode.kind === "free") {
      setSeenIds((prev) => {
        const next = new Set(prev);
        next.add(current.id);
        return next;
      });
    } else {
      advance();
    }
  }

  function skip() {
    if (!current) return;
    if (mode.kind === "free") {
      setSeenIds((prev) => {
        const next = new Set(prev);
        next.add(current.id);
        return next;
      });
    } else {
      advance();
    }
  }

  function resetProgress() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Reset all scenario progress, points, and daily streak?");
      if (!ok) return;
    }
    setProgress(EMPTY_PROGRESS);
    setPoints(0);
    setSeenIds(new Set());
    setDailyMap({});
    setDailyStreak(0);
    setLastCompleted(null);
    setDailyResult(null);
    setMode({ kind: "free" });
    setAnswer({ picked: null, revealed: false, attempts: 0 });
    try {
      localStorage.removeItem(DAILY_KEY);
      localStorage.removeItem(DAILY_STREAK_KEY);
      localStorage.removeItem(LAST_COMPLETED_KEY);
    } catch {
      /* noop */
    }
  }

  function startDaily() {
    setDailyResult(null);
    setMode({
      kind: "daily",
      scenarios: dailyScenarios,
      index: 0,
      correct: 0,
      startedAt: Date.now(),
    });
    setAnswer({ picked: null, revealed: false, attempts: 0 });
  }

  function exitDaily() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Quit the daily drill? Progress won't be saved.");
      if (!ok) return;
    }
    setMode({ kind: "free" });
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Scoreboard header */}
      <Scoreboard
        points={points}
        streak={progress.streak}
        bestStreak={progress.bestStreak}
        dailyStreak={dailyStreak}
        hydrated={hydrated}
      />

      {/* Title */}
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          NBA 2K26 · Decision Drills
        </div>
        <h1 className="mt-1 font-display text-4xl leading-none tracking-wide text-ink md:text-5xl">
          Scenarios
        </h1>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Fan-made approximations · verify in-game
        </p>
      </header>

      {/* Daily Drill strip */}
      {mode.kind === "free" && (
        <DailyDrillStrip
          today={today}
          scenarios={dailyScenarios}
          completed={hydrated && completedToday}
          dailyStreak={dailyStreak}
          lastResult={dailyMap[today]}
          hydrated={hydrated}
          onStart={startDaily}
        />
      )}

      {/* Last daily result card (shown briefly after finishing) */}
      {dailyResult && mode.kind === "free" && (
        <DailyResultCard
          record={dailyResult}
          streak={dailyStreak}
          onDismiss={() => setDailyResult(null)}
        />
      )}

      {/* Daily mode progress bar */}
      {mode.kind === "daily" && (
        <div className="flex items-center justify-between rounded-lg border border-flame/40 bg-flame/10 px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-flame">
          <span>
            Daily Drill · {mode.index + 1} / {mode.scenarios.length}
          </span>
          <button
            onClick={exitDaily}
            className="rounded-md border border-flame/40 px-2 py-0.5 text-[10px] text-flame hover:bg-flame/20"
          >
            Quit
          </button>
        </div>
      )}

      {/* Category tabs (free mode only) */}
      {mode.kind === "free" && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-2">
            <CategoryTab
              active={filter === "all"}
              onClick={() => {
                setFilter("all");
                setSeenIds(new Set());
              }}
              label="All"
              count={SCENARIOS.length}
            />
            {CATEGORY_ORDER.map((cat) => {
              const count = SCENARIOS.filter((s) => s.category === cat).length;
              return (
                <CategoryTab
                  key={cat}
                  active={filter === cat}
                  onClick={() => {
                    setFilter(cat);
                    setSeenIds(new Set());
                  }}
                  label={CATEGORY_LABEL[cat]}
                  count={count}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsed filters (free mode only) */}
      {mode.kind === "free" && (
        <details className="group rounded-lg border border-line bg-surface2">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted hover:text-ink">
            <span>Filters</span>
            <span className="font-mono text-[10px] opacity-70 group-open:hidden">+</span>
            <span className="hidden font-mono text-[10px] opacity-70 group-open:inline">−</span>
          </summary>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-3">
            <FilterToggle
              active={showOnlyUnlearned}
              onClick={() => {
                setShowOnlyUnlearned((v) => !v);
                setSeenIds(new Set());
              }}
              label="Hide learned"
            />
            <button
              onClick={() => {
                setSessionSeed(Math.floor(Math.random() * 100000) + 1);
                setSeenIds(new Set());
              }}
              className="rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
            >
              Reshuffle
            </button>
          </div>
        </details>
      )}

      {/* Scenario card */}
      {current ? (
        <ScenarioCard
          key={current.id}
          scenario={current}
          answer={answer}
          status={progress.perScenarioStatus[current.id]}
          mode={mode.kind}
          onPick={pick}
          onNext={advance}
          onSkip={skip}
          onLearned={markLearned}
          onTryAgain={tryAgain}
        />
      ) : (
        <Card className="text-center text-muted">No scenarios available.</Card>
      )}

      {/* Disclaimer + reset */}
      <div className="space-y-3 border-t border-line pt-6 text-xs text-muted">
        <p>
          Scenarios reflect 2K26 sim math approximations. EV values are modeled
          off historical PPP, lineup matchups, and shot-quality priors. Real
          gameplay variance applies.
        </p>
        <button
          onClick={resetProgress}
          className="rounded-md border border-flame/40 bg-flame/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-flame hover:bg-flame/20"
        >
          Reset progress
        </button>
      </div>
    </div>
  );
}

/* ---------- Scoreboard ---------- */

function Scoreboard({
  points,
  streak,
  bestStreak,
  dailyStreak,
  hydrated,
}: {
  points: number;
  streak: number;
  bestStreak: number;
  dailyStreak: number;
  hydrated: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface shadow-card">
      {/* Top row: STREAK as the hero */}
      <div className="flex items-end justify-between gap-4 px-4 pt-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Streak
          </div>
          <div
            className={`font-display leading-none num text-6xl md:text-7xl ${
              hydrated && streak >= 3 ? "text-lime" : "text-ink"
            }`}
          >
            {hydrated ? streak : "—"}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">
            Best {hydrated ? bestStreak : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Points
          </div>
          <div className="font-display leading-none num text-4xl text-gold md:text-5xl">
            {hydrated ? points.toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">
            Daily streak {hydrated ? `${dailyStreak}d` : "—"}
          </div>
        </div>
      </div>
      {/* Footer line: legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted">
        <span className="text-lime">+100</span>
        <span>first-try optimal</span>
        <span className="text-gold">+50</span>
        <span>optimal after retry</span>
        <span className="text-muted">+25</span>
        <span>for trying</span>
      </div>
    </div>
  );
}

/* ---------- Daily Drill Strip ---------- */

function DailyDrillStrip({
  today,
  scenarios,
  completed,
  dailyStreak,
  lastResult,
  hydrated,
  onStart,
}: {
  today: string;
  scenarios: Scenario[];
  completed: boolean;
  dailyStreak: number;
  lastResult: { correct: number; total: number; timeMs: number } | undefined;
  hydrated: boolean;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-flame/40 bg-flame/5 p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Daily Drill · {today}
        </div>
        <div className="mt-1 font-display text-2xl tracking-wide text-ink md:text-3xl">
          3 questions. One shot.
        </div>
        <div className="mt-1 truncate text-[11px] text-muted">
          {scenarios.map((s) => s.title).join(" · ")}
        </div>
      </div>
      <div className="shrink-0">
        {completed ? (
          <div className="rounded-lg border border-lime/40 bg-lime/10 px-3 py-2 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-lime">
              Done today
            </div>
            <div className="font-display text-xl text-ink">
              {lastResult ? `${lastResult.correct}/${lastResult.total}` : "✓"}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Streak · {hydrated ? `${dailyStreak}d` : "—"}
            </div>
          </div>
        ) : (
          <button
            onClick={onStart}
            className="w-full rounded-md border border-flame bg-flame px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-black hover:bg-flameDim md:w-auto"
          >
            Start daily drill →
          </button>
        )}
      </div>
    </div>
  );
}

function DailyResultCard({
  record,
  streak,
  onDismiss,
}: {
  record: { correct: number; total: number; timeMs: number };
  streak: number;
  onDismiss: () => void;
}) {
  const secs = Math.round(record.timeMs / 1000);
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");
  const pct = Math.round((record.correct / Math.max(1, record.total)) * 100);
  const tone =
    pct === 100 ? "lime" : pct >= 67 ? "gold" : pct >= 34 ? "ice" : "flame";

  return (
    <Card className="animate-scale-in flex flex-col gap-3 border-2 border-flame/40">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Daily Drill Complete
        </div>
        <button
          onClick={onDismiss}
          className="rounded-md border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-ink"
        >
          Close
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultCell label="Score" value={`${record.correct}/${record.total}`} tone={tone} />
        <ResultCell label="Accuracy" value={`${pct}%`} tone={tone} />
        <ResultCell label="Time" value={`${mm}:${ss}`} tone="default" />
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
        Daily streak · <span className="text-ink">{streak}d</span> · come back tomorrow.
      </div>
    </Card>
  );
}

function ResultCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "flame" | "ice" | "gold" | "lime";
}) {
  const toneClass = {
    default: "text-ink",
    flame: "text-flame",
    ice: "text-ice",
    gold: "text-gold",
    lime: "text-lime",
  }[tone];
  return (
    <div className="rounded-lg border border-line bg-surface2 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl num ${toneClass}`}>{value}</div>
    </div>
  );
}

/* ---------- Category + filter chips ---------- */

function CategoryTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
        active
          ? "border-flame bg-flame/15 text-flame"
          : "border-line bg-surface2 text-muted hover:text-ink"
      }`}
    >
      {label}
      <span className="ml-1.5 font-mono text-[10px] opacity-70">{count}</span>
    </button>
  );
}

function FilterToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
        active
          ? "border-ice/50 bg-ice/10 text-ice"
          : "border-line bg-surface text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

/* ---------- Scenario card ---------- */

function ScenarioCard({
  scenario,
  answer,
  status,
  mode,
  onPick,
  onNext,
  onSkip,
  onLearned,
  onTryAgain,
}: {
  scenario: Scenario;
  answer: AnswerState;
  status: string | undefined;
  mode: "free" | "daily";
  onPick: (i: number) => void;
  onNext: () => void;
  onSkip: () => void;
  onLearned: () => void;
  onTryAgain: () => void;
}) {
  const diffTone =
    scenario.difficulty === 3 ? "flame" : scenario.difficulty === 2 ? "gold" : "lime";
  const pickedOpt =
    answer.picked != null ? scenario.options[answer.picked] : null;
  const pickedWasOptimal = pickedOpt?.isOptimal === true;

  return (
    <Card className="animate-scale-in flex min-h-[60vh] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="default">{CATEGORY_LABEL[scenario.category]}</Pill>
        <Pill tone={diffTone as "flame" | "gold" | "lime"}>
          {difficultyDots(scenario.difficulty)} · D{scenario.difficulty}
        </Pill>
        {status === "learned" && <Pill tone="ice">Got it</Pill>}
      </div>

      <h2 className="font-display text-2xl tracking-wide text-ink md:text-3xl">
        {scenario.title}
      </h2>

      {/* Situation block */}
      <div className="rounded-lg border border-line bg-surface2 p-3 font-mono text-[12px] leading-relaxed text-ink md:text-[13px]">
        {scenario.situation.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <div className="mt-2 border-t border-line pt-2 text-muted">
          <div>
            <span className="text-ice">You:</span> {scenario.myTeam.join(", ")}
          </div>
          <div>
            <span className="text-flame">Them:</span> {scenario.theirTeam.join(", ")}
          </div>
        </div>
        {scenario.context && (
          <div className="mt-2 border-t border-line pt-2 text-muted">
            {scenario.context}
          </div>
        )}
      </div>

      {/* Question */}
      <div className="font-display text-xl tracking-wide text-gold md:text-2xl">
        {scenario.question}
      </div>

      {/* Options */}
      <div className="grid gap-2">
        {scenario.options.map((opt, i) => (
          <OptionRow
            key={i}
            option={opt}
            picked={answer.picked === i}
            revealed={answer.revealed}
            onClick={() => onPick(i)}
          />
        ))}
      </div>

      {/* After-answer block */}
      {answer.revealed && (
        <div className="animate-slide-up space-y-3">
          <div className="rounded-lg border border-line bg-surface2 p-3 text-sm leading-relaxed text-ink">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              Coaching note
            </div>
            {scenario.coachingNote}
          </div>

          {scenario.references && scenario.references.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="font-bold uppercase tracking-wider">Reference</span>
              {scenario.references.map((r, i) => (
                <ReferenceLink key={i} kind={r.kind} name={r.name} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {mode === "free" && (
          <>
            <button
              onClick={onSkip}
              className="rounded-md border border-line bg-surface2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted hover:text-ink"
            >
              Skip
            </button>
            <button
              onClick={onLearned}
              className="rounded-md border border-ice/40 bg-ice/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ice hover:bg-ice/20"
            >
              Got it ✓
            </button>
          </>
        )}

        {answer.revealed && !pickedWasOptimal && mode === "free" && (
          <button
            onClick={onTryAgain}
            className="rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gold hover:bg-gold/20"
          >
            Try again
          </button>
        )}

        <button
          onClick={onNext}
          disabled={!answer.revealed}
          className={`ml-auto rounded-md px-4 py-2 text-[12px] font-bold uppercase tracking-wider transition ${
            answer.revealed
              ? "border border-flame bg-flame text-black hover:bg-flameDim"
              : "cursor-not-allowed border border-line bg-surface2 text-muted"
          }`}
        >
          {mode === "daily" ? "Next →" : "Next →"}
        </button>
      </div>
    </Card>
  );
}

function OptionRow({
  option,
  picked,
  revealed,
  onClick,
}: {
  option: Option;
  picked: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  let cls =
    "w-full rounded-lg border border-line bg-surface2 p-3 text-left transition hover:border-ink/40 active:scale-[0.99]";
  let evCls = "text-muted";
  let mark = "";

  if (revealed) {
    if (option.isOptimal) {
      cls = "w-full rounded-lg border-2 border-lime bg-lime/15 p-3 text-left";
      evCls = "text-lime font-bold";
      mark = "✓";
    } else if (picked) {
      const isBad = option.ev < 1.0;
      cls = isBad
        ? "w-full rounded-lg border-2 border-flame bg-flame/10 p-3 text-left"
        : "w-full rounded-lg border-2 border-gold/60 bg-gold/10 p-3 text-left";
      evCls = isBad ? "text-flame font-bold" : "text-gold font-bold";
      mark = "✗";
    } else {
      cls = "w-full rounded-lg border border-line bg-surface p-3 text-left opacity-60";
      evCls = "text-muted";
    }
  }

  return (
    <button onClick={onClick} disabled={revealed} className={cls}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-ink">
            {mark && <span className="font-mono text-base">{mark}</span>}
            <span>{option.label}</span>
          </div>
          {option.sub && (
            <div className="mt-0.5 text-[12px] text-muted">{option.sub}</div>
          )}
        </div>
        {revealed && (
          <div className={`shrink-0 font-mono text-[12px] ${evCls}`}>
            EV {option.ev.toFixed(2)}
          </div>
        )}
      </div>
    </button>
  );
}

function ReferenceLink({ kind, name }: { kind: "player" | "build" | "badge"; name: string }) {
  let href = "";
  if (kind === "player") {
    const id = getPlayerIdByName(name);
    href = id ? `/players?id=${id}` : "/players";
  } else if (kind === "build") {
    const archeId = buildArcheIdFromName(name);
    href = archeId ? `/builds?arche=${archeId}` : "/builds";
  } else {
    href = `/badges#${refSlug(name)}`;
  }
  const tone =
    kind === "player" ? "ice" : kind === "build" ? "gold" : "lime";
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
        tone === "ice"
          ? "border-ice/40 bg-ice/10 text-ice"
          : tone === "gold"
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-lime/40 bg-lime/10 text-lime"
      }`}
    >
      {kind} · {name}
    </a>
  );
}
