"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Pill, Stat } from "@/components/ui";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  EMPTY_PROGRESS,
  Option,
  ProgressState,
  SCENARIOS,
  Scenario,
  ScenarioCategory,
  computeProgressStats,
} from "@/lib/scenarios";

const STORAGE_KEY = "2klab.scenarios";

type CategoryFilter = "all" | ScenarioCategory;

type AnswerState = {
  picked: number | null;
  revealed: boolean;
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

function difficultyDots(d: 1 | 2 | 3) {
  return "●".repeat(d) + "○".repeat(3 - d);
}

export default function ScenariosPage() {
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [showOnlyUnlearned, setShowOnlyUnlearned] = useState(false);
  const [randomize, setRandomize] = useState(false);
  const [orderSeed, setOrderSeed] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [answer, setAnswer] = useState<AnswerState>({ picked: null, revealed: false });

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveProgress(progress);
  }, [progress, hydrated]);

  const pool: Scenario[] = useMemo(() => {
    let base = filter === "all" ? SCENARIOS : SCENARIOS.filter((s) => s.category === filter);
    if (showOnlyUnlearned) {
      base = base.filter((s) => progress.perScenarioStatus[s.id] !== "learned");
    }
    if (randomize) {
      // deterministic shuffle keyed by orderSeed for stable re-renders
      const arr = [...base];
      let seed = orderSeed || 1;
      const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    return base;
  }, [filter, showOnlyUnlearned, randomize, orderSeed, progress.perScenarioStatus]);

  // Clamp cursor when pool changes
  useEffect(() => {
    if (cursor >= pool.length && pool.length > 0) setCursor(0);
    setAnswer({ picked: null, revealed: false });
  }, [pool, cursor]);

  const current: Scenario | undefined = pool[cursor];
  const stats = useMemo(() => computeProgressStats(progress), [progress]);

  function pick(optIdx: number) {
    if (!current || answer.revealed) return;
    const opt = current.options[optIdx];
    const wasOptimal = opt.isOptimal;
    setAnswer({ picked: optIdx, revealed: true });

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

      // Only count first answer per scenario for played + optimal counters
      if (!alreadyAnswered) {
        next.played = prev.played + 1;
        if (wasOptimal) next.optimal = prev.optimal + 1;
      } else if (prevStatus === "suboptimal" && wasOptimal) {
        // upgrade: bump optimal count
        next.optimal = prev.optimal + 1;
      } else if (prevStatus === "optimal" && !wasOptimal) {
        next.optimal = Math.max(0, prev.optimal - 1);
      }

      // Streak math: reset on suboptimal, increment on optimal (first time only)
      if (wasOptimal) {
        next.streak = prev.streak + 1;
        next.bestStreak = Math.max(prev.bestStreak, next.streak);
      } else {
        next.streak = 0;
      }

      return next;
    });
  }

  function nextScenario() {
    setAnswer({ picked: null, revealed: false });
    setCursor((c) => (pool.length === 0 ? 0 : (c + 1) % pool.length));
  }

  function markLearned() {
    if (!current) return;
    setProgress((prev) => ({
      ...prev,
      perScenarioStatus: { ...prev.perScenarioStatus, [current.id]: "learned" },
    }));
    nextScenario();
  }

  function skip() {
    if (!current) return;
    setProgress((prev) => {
      const prevStatus = prev.perScenarioStatus[current.id];
      if (prevStatus === "optimal" || prevStatus === "suboptimal" || prevStatus === "learned") {
        return prev;
      }
      return {
        ...prev,
        perScenarioStatus: { ...prev.perScenarioStatus, [current.id]: "skipped" },
      };
    });
    nextScenario();
  }

  function resetProgress() {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Reset all scenario progress?");
      if (!ok) return;
    }
    setProgress(EMPTY_PROGRESS);
    setCursor(0);
    setAnswer({ picked: null, revealed: false });
  }

  function reshuffle() {
    setOrderSeed(Math.floor(Math.random() * 100000) + 1);
    setCursor(0);
  }

  const total = SCENARIOS.length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          NBA 2K26 · Decision Drills
        </div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-6xl">
          Scenarios
        </h1>
        <p className="mt-2 text-sm text-muted">
          Decision drills · expected-value reads
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat
          label="Played"
          value={`${stats.played}/${total}`}
          hint={hydrated ? "Saved locally" : "Loading…"}
        />
        <Stat
          label="Optimal %"
          value={`${stats.pctOptimal}%`}
          tone={stats.pctOptimal >= 70 ? "lime" : stats.pctOptimal >= 40 ? "gold" : "flame"}
          hint={`${stats.optimal} of ${stats.played || 0}`}
        />
        <Stat
          label="Streak"
          value={stats.streak}
          tone={stats.streak >= 3 ? "lime" : "default"}
          hint={`Best ${stats.bestStreak}`}
        />
        <Stat
          label="Category Best"
          value={stats.categoryBest ? `${stats.categoryBest.pct}%` : "—"}
          tone="ice"
          hint={stats.categoryBest ? stats.categoryBest.label : "No data yet"}
        />
      </div>

      {/* Category tabs */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2">
          <CategoryTab
            active={filter === "all"}
            onClick={() => {
              setFilter("all");
              setCursor(0);
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
                  setCursor(0);
                }}
                label={CATEGORY_LABEL[cat]}
                count={count}
              />
            );
          })}
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FilterToggle
          active={showOnlyUnlearned}
          onClick={() => setShowOnlyUnlearned((v) => !v)}
          label="Unlearned only"
        />
        <FilterToggle
          active={randomize}
          onClick={() => {
            setRandomize((v) => {
              const next = !v;
              if (next && orderSeed === 0) setOrderSeed(Math.floor(Math.random() * 100000) + 1);
              return next;
            });
            setCursor(0);
          }}
          label="Randomize"
        />
        {randomize && (
          <button
            onClick={reshuffle}
            className="rounded-full border border-line bg-surface2 px-3 py-1 font-semibold uppercase tracking-wider text-muted hover:text-ink"
          >
            Reshuffle
          </button>
        )}
        <div className="ml-auto font-mono text-[11px] text-muted">
          {pool.length > 0 ? `${cursor + 1} / ${pool.length}` : "0 / 0"}
        </div>
      </div>

      {/* Scenario card */}
      {current ? (
        <ScenarioCard
          scenario={current}
          answer={answer}
          status={progress.perScenarioStatus[current.id]}
          onPick={pick}
          onNext={nextScenario}
          onSkip={skip}
          onLearned={markLearned}
        />
      ) : (
        <Card className="text-center text-muted">
          No scenarios match this filter.
        </Card>
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
          : "border-line bg-surface2 text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function ScenarioCard({
  scenario,
  answer,
  status,
  onPick,
  onNext,
  onSkip,
  onLearned,
}: {
  scenario: Scenario;
  answer: AnswerState;
  status: string | undefined;
  onPick: (i: number) => void;
  onNext: () => void;
  onSkip: () => void;
  onLearned: () => void;
}) {
  const diffTone =
    scenario.difficulty === 3 ? "flame" : scenario.difficulty === 2 ? "gold" : "lime";

  return (
    <Card className="animate-scale-in flex min-h-[60vh] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="default">{CATEGORY_LABEL[scenario.category]}</Pill>
        <Pill tone={diffTone as any}>
          {difficultyDots(scenario.difficulty)} · D{scenario.difficulty}
        </Pill>
        {status === "learned" && <Pill tone="ice">Learned</Pill>}
        {status === "optimal" && !answer.revealed && (
          <Pill tone="lime">Previously optimal</Pill>
        )}
        {status === "suboptimal" && !answer.revealed && (
          <Pill tone="flame">Previously missed</Pill>
        )}
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
          Mark as learned
        </button>
        <button
          onClick={onNext}
          disabled={!answer.revealed && status !== "learned"}
          className={`ml-auto rounded-md px-4 py-2 text-[12px] font-bold uppercase tracking-wider transition ${
            answer.revealed || status === "learned"
              ? "border border-flame bg-flame text-black hover:bg-flameDim"
              : "cursor-not-allowed border border-line bg-surface2 text-muted"
          }`}
        >
          Next →
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
  // Pre-reveal styling
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
      // bad pick (picked but not optimal)
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
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const href =
    kind === "player"
      ? `/players#${slug}`
      : kind === "build"
      ? `/builds#${slug}`
      : `/badges#${slug}`;
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
