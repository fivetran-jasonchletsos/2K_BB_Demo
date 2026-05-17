"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Pill } from "@/components/ui";
import {
  QUESTIONS,
  FOCUS_LABEL,
  analyze,
  loadState,
  saveState,
  clearState,
  isStateFresh,
  type DailyAction,
  type DiagnosticState,
  type DrillAResult,
  type DrillBResult,
  type FocusArea,
  type Question,
  type QuestionId,
  type ResponseMap,
} from "@/lib/diagnose";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";

type Step = "intro" | "questions" | "drillA" | "drillB" | "result";

const FILL_MS = 1200; // Drill A bar fill duration
const GREEN_ZONE_START = 0.88; // top 12%
const DRILL_A_TARGET_ATTEMPTS = 5;

export default function DiagnosePage() {
  const [step, setStep] = useState<Step>("intro");
  const [responses, setResponses] = useState<ResponseMap>({});
  const [qIndex, setQIndex] = useState(0);
  const [drillA, setDrillA] = useState<DrillAResult>({
    attempts: 0,
    greens: 0,
    avgOffsetMs: 0,
  });
  const [drillB, setDrillB] = useState<DrillBResult | null>(null);
  const [savedState, setSavedState] = useState<DiagnosticState | null>(null);

  // Pick a stable scenario for drill B for the lifetime of this attempt.
  const scenarioForDrill = useRef<Scenario | null>(null);
  if (!scenarioForDrill.current) {
    scenarioForDrill.current =
      SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  }
  const scenario = scenarioForDrill.current;

  // Hydrate from localStorage on mount. If fresh, default to result view.
  useEffect(() => {
    const s = loadState();
    if (s && isStateFresh(s)) {
      setSavedState(s);
      setStep("result");
    } else if (s) {
      // expired
      clearState();
    }
  }, []);

  const finalize = useCallback(
    (finalDrillB: DrillBResult) => {
      const { focus, summary, prescription } = analyze(
        responses,
        drillA,
        finalDrillB,
      );
      const newState: DiagnosticState = {
        ts: Date.now(),
        responses,
        drillResults: { drillA, drillB: finalDrillB },
        focus,
        summary,
        prescription,
      };
      saveState(newState);
      setSavedState(newState);
      setStep("result");
    },
    [responses, drillA],
  );

  function pickAnswer(qid: QuestionId, value: string) {
    const next: ResponseMap = { ...responses, [qid]: value };
    setResponses(next);
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      setStep("drillA");
    }
  }

  function startOver() {
    clearState();
    setSavedState(null);
    setResponses({});
    setQIndex(0);
    setDrillA({ attempts: 0, greens: 0, avgOffsetMs: 0 });
    setDrillB(null);
    scenarioForDrill.current =
      SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    setStep("intro");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          Path to mastery · intake
        </div>
        <h1 className="font-display text-4xl leading-none tracking-wide text-ink md:text-5xl">
          Diagnose
        </h1>
        <p className="text-sm text-muted">
          5 questions + 2 quick drills. Output: your focus area and a 2-week plan.
        </p>
      </header>

      {step === "intro" && (
        <IntroStep
          savedState={savedState}
          onStart={() => {
            setResponses({});
            setQIndex(0);
            setDrillA({ attempts: 0, greens: 0, avgOffsetMs: 0 });
            setDrillB(null);
            setStep("questions");
          }}
          onShowSaved={() => setStep("result")}
        />
      )}

      {step === "questions" && (
        <QuestionStep
          q={QUESTIONS[qIndex]}
          index={qIndex}
          total={QUESTIONS.length}
          selected={responses[QUESTIONS[qIndex].id]}
          onBack={
            qIndex > 0
              ? () => setQIndex(qIndex - 1)
              : () => setStep("intro")
          }
          onPick={(v) => pickAnswer(QUESTIONS[qIndex].id, v)}
        />
      )}

      {step === "drillA" && (
        <DrillAStep
          onComplete={(result) => {
            setDrillA(result);
            setStep("drillB");
          }}
        />
      )}

      {step === "drillB" && (
        <DrillBStep
          scenario={scenario}
          onComplete={(result) => {
            setDrillB(result);
            finalize(result);
          }}
        />
      )}

      {step === "result" && savedState && (
        <ResultStep state={savedState} onRetake={startOver} />
      )}
    </div>
  );
}

/* ---------------- Intro ---------------- */

function IntroStep({
  savedState,
  onStart,
  onShowSaved,
}: {
  savedState: DiagnosticState | null;
  onStart: () => void;
  onShowSaved: () => void;
}) {
  const hasFresh = savedState && isStateFresh(savedState);
  return (
    <Card>
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            What you get
          </div>
          <ul className="space-y-1 text-sm text-ink">
            <li>· Diagnosed focus area (1 of 5)</li>
            <li>· 2-week prescription with day-by-day actions</li>
            <li>· Deep links into Shot Lab, Scenarios, Build Lab, Codes</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="h-14 w-full rounded-md bg-flame text-base font-bold uppercase tracking-wider text-black transition active:translate-y-px"
        >
          {hasFresh ? "Refresh diagnostic" : "Start"}
        </button>
        {hasFresh && (
          <button
            type="button"
            onClick={onShowSaved}
            className="h-12 w-full rounded-md border border-line bg-surface2 text-xs font-bold uppercase tracking-wider text-ink"
          >
            View saved result
          </button>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Questions ---------------- */

function QuestionStep({
  q,
  index,
  total,
  selected,
  onPick,
  onBack,
}: {
  q: Question;
  index: number;
  total: number;
  selected: string | undefined;
  onPick: (v: string) => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] font-bold uppercase tracking-wider text-muted hover:text-ink"
          >
            ← Back
          </button>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted num">
            {index + 1} / {total}
          </div>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full bg-flame transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <h2 className="font-display text-2xl tracking-wide text-ink md:text-3xl">
          {q.prompt}
        </h2>
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const isSelected = selected === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onPick(opt)}
                className={`h-14 rounded-md border px-4 text-left text-sm font-semibold uppercase tracking-wider transition active:translate-y-px ${
                  isSelected
                    ? "border-flame bg-flame/10 text-flame"
                    : "border-line bg-surface2 text-ink hover:border-flame/60"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Drill A: timing meter ---------------- */

function DrillAStep({
  onComplete,
}: {
  onComplete: (r: DrillAResult) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"idle" | "filling" | "result">("idle");
  const [pct, setPct] = useState(0); // 0..1
  const [lastOffsetMs, setLastOffsetMs] = useState<number | null>(null);
  const [lastGreen, setLastGreen] = useState<boolean | null>(null);
  const [greens, setGreens] = useState(0);
  const [offsets, setOffsets] = useState<number[]>([]);

  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startFill = useCallback(() => {
    setPhase("filling");
    setPct(0);
    setLastOffsetMs(null);
    setLastGreen(null);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(1, elapsed / FILL_MS);
      setPct(p);
      if (p >= 1) {
        // missed — record as late by 100ms past green center
        stopRaf();
        recordResult(120, false);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf]);

  const recordResult = useCallback(
    (offsetMs: number, isGreen: boolean) => {
      setPhase("result");
      setLastOffsetMs(offsetMs);
      setLastGreen(isGreen);
      const nextGreens = greens + (isGreen ? 1 : 0);
      const nextOffsets = [...offsets, offsetMs];
      setGreens(nextGreens);
      setOffsets(nextOffsets);
      const nextAttempt = attempt + 1;

      // Auto-advance after a beat so users see feedback.
      setTimeout(() => {
        if (nextAttempt >= DRILL_A_TARGET_ATTEMPTS) {
          const sum = nextOffsets.reduce((a, b) => a + b, 0);
          const avg = nextOffsets.length > 0 ? sum / nextOffsets.length : 0;
          onComplete({
            attempts: nextAttempt,
            greens: nextGreens,
            avgOffsetMs: avg,
          });
        } else {
          setAttempt(nextAttempt);
          setPhase("idle");
          setPct(0);
        }
      }, 700);
    },
    [attempt, greens, offsets, onComplete],
  );

  const handleTap = useCallback(() => {
    if (phase !== "filling") return;
    stopRaf();
    const elapsed = performance.now() - startRef.current;
    const centerMs = FILL_MS * ((GREEN_ZONE_START + 1) / 2); // center of green zone
    const offset = Math.round(elapsed - centerMs);
    const greenMin = FILL_MS * GREEN_ZONE_START;
    const isGreen = elapsed >= greenMin && elapsed <= FILL_MS;
    // Freeze the bar where it stopped
    setPct(Math.min(1, elapsed / FILL_MS));
    recordResult(offset, isGreen);
  }, [phase, recordResult, stopRaf]);

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Drill A · timing
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted num">
            Rep {attempt + 1} / {DRILL_A_TARGET_ATTEMPTS}
          </div>
        </div>
        <h2 className="font-display text-2xl tracking-wide text-ink md:text-3xl">
          Tap when the bar hits the green zone
        </h2>
        <p className="text-xs text-muted">
          Top 12% of the bar is green. 5 reps.
        </p>

        {/* Meter */}
        <div className="relative h-10 w-full overflow-hidden rounded-md border border-line bg-surface2">
          {/* Green zone marker */}
          <div
            aria-hidden
            className="absolute top-0 bottom-0 bg-lime/15"
            style={{
              left: `${GREEN_ZONE_START * 100}%`,
              right: 0,
            }}
          />
          <div
            aria-hidden
            className="absolute top-0 bottom-0 w-px bg-lime"
            style={{ left: `${GREEN_ZONE_START * 100}%` }}
          />
          {/* Fill */}
          <div
            className={`h-full transition-none ${
              lastGreen === true
                ? "bg-lime"
                : lastGreen === false
                  ? "bg-flame"
                  : "bg-ice"
            }`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border border-line bg-surface2 p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Greens
            </div>
            <div className="font-display text-xl text-lime num">
              {greens}/{attempt + (phase === "result" ? 0 : 0)}
            </div>
          </div>
          <div className="rounded-md border border-line bg-surface2 p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Last offset
            </div>
            <div
              className={`font-display text-xl num ${
                lastGreen === true ? "text-lime" : "text-ink"
              }`}
            >
              {lastOffsetMs === null
                ? "—"
                : `${lastOffsetMs > 0 ? "+" : ""}${lastOffsetMs}ms`}
            </div>
          </div>
          <div className="rounded-md border border-line bg-surface2 p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Status
            </div>
            <div className="font-display text-xl text-ink">
              {phase === "filling"
                ? "Live"
                : phase === "result"
                  ? lastGreen
                    ? "Green"
                    : "Miss"
                  : "Ready"}
            </div>
          </div>
        </div>

        {/* Action button */}
        {phase === "idle" && (
          <button
            type="button"
            onClick={startFill}
            className="h-14 w-full rounded-md bg-flame text-base font-bold uppercase tracking-wider text-black transition active:translate-y-px"
          >
            Start rep
          </button>
        )}
        {phase === "filling" && (
          <button
            type="button"
            onClick={handleTap}
            className="h-14 w-full rounded-md bg-ice text-base font-bold uppercase tracking-wider text-black transition active:translate-y-px"
          >
            Tap now
          </button>
        )}
        {phase === "result" && (
          <button
            type="button"
            disabled
            className="h-14 w-full rounded-md border border-line bg-surface2 text-base font-bold uppercase tracking-wider text-muted"
          >
            {lastGreen ? "Green" : "Miss"} · next…
          </button>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Drill B: scenario ---------------- */

function DrillBStep({
  scenario,
  onComplete,
}: {
  scenario: Scenario;
  onComplete: (r: DrillBResult) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
  }

  const result = picked !== null ? scenario.options[picked] : null;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Drill B · decision
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
            1 scenario
          </div>
        </div>
        <h2 className="font-display text-2xl tracking-wide text-ink md:text-3xl">
          {scenario.title}
        </h2>
        <ul className="space-y-0.5 text-xs text-muted">
          {scenario.situation.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
        {scenario.context && (
          <p className="rounded-md border border-line bg-surface2 p-2 text-xs text-ink">
            {scenario.context}
          </p>
        )}
        <div className="text-sm font-bold uppercase tracking-wider text-flame">
          {scenario.question}
        </div>
        <div className="grid gap-2">
          {scenario.options.map((opt, i) => {
            const isPicked = picked === i;
            const showColor = picked !== null;
            const isCorrect = opt.isOptimal;
            const cls = !showColor
              ? "border-line bg-surface2 text-ink hover:border-flame/60"
              : isCorrect
                ? "border-lime bg-lime/10 text-lime"
                : isPicked
                  ? "border-flame bg-flame/10 text-flame"
                  : "border-line bg-surface2 text-muted";
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                disabled={picked !== null}
                className={`min-h-14 rounded-md border px-4 py-3 text-left text-sm transition ${cls}`}
              >
                <div className="font-semibold uppercase tracking-wider">
                  {opt.label}
                </div>
                {opt.sub && (
                  <div className="mt-0.5 text-[11px] normal-case opacity-80">
                    {opt.sub}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Pill tone={result.isOptimal ? "lime" : "flame"}>
                {result.isOptimal ? "Optimal" : "Suboptimal"}
              </Pill>
              <span className="text-xs text-muted">
                Picked: {result.label}
              </span>
            </div>
            <p className="text-xs text-ink">{scenario.coachingNote}</p>
            <button
              type="button"
              onClick={() =>
                onComplete({
                  scenarioId: scenario.id,
                  pickedLabel: result.label,
                  optimal: result.isOptimal,
                })
              }
              className="h-14 w-full rounded-md bg-flame text-base font-bold uppercase tracking-wider text-black transition active:translate-y-px"
            >
              See result
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Result ---------------- */

function ResultStep({
  state,
  onRetake,
}: {
  state: DiagnosticState;
  onRetake: () => void;
}) {
  const focus: FocusArea = state.focus;
  const ageDays = useMemo(
    () => Math.floor((Date.now() - state.ts) / (1000 * 60 * 60 * 24)),
    [state.ts],
  );

  return (
    <div className="space-y-4">
      <Card className="border-flame/40 bg-gradient-to-br from-flame/[0.10] via-surface to-surface">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Pill tone="flame">Focus</Pill>
          <span className="text-[11px] uppercase tracking-wider text-muted num">
            {ageDays === 0 ? "Today" : `${ageDays}d ago`}
          </span>
        </div>
        <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
          Focus area
        </div>
        <div className="mt-1 font-display text-4xl leading-tight tracking-wide text-ink md:text-5xl">
          {FOCUS_LABEL[focus]}
        </div>
        <p className="mt-3 text-sm text-ink">{state.summary}</p>
      </Card>

      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
              Week 1
            </div>
            <span className="text-[11px] uppercase tracking-wider text-muted num">
              {state.prescription.week1.length} actions
            </span>
          </div>
          <ActionList actions={state.prescription.week1} />
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-ice">
              Week 2
            </div>
            <span className="text-[11px] uppercase tracking-wider text-muted num">
              {state.prescription.week2.length} actions
            </span>
          </div>
          <ActionList actions={state.prescription.week2} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onRetake}
          className="h-14 rounded-md border border-line bg-surface2 text-sm font-bold uppercase tracking-wider text-ink"
        >
          Retake
        </button>
        <Link
          href="/coach"
          className="grid h-14 place-items-center rounded-md bg-flame text-sm font-bold uppercase tracking-wider text-black"
        >
          Open Coach
        </Link>
      </div>
    </div>
  );
}

function ActionList({ actions }: { actions: DailyAction[] }) {
  return (
    <ul className="space-y-2">
      {actions.map((a) => (
        <li key={a.day}>
          <Link
            href={a.href}
            className="block rounded-md border border-line bg-surface2 p-3 transition hover:border-flame/60"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted num">
                Day {a.day}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-flame num">
                {a.minutes} min
              </div>
            </div>
            <div className="mt-1 text-sm text-ink">{a.text}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ice">
              {a.href} →
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
