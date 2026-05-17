"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Pill, Section, TierBadge } from "@/components/ui";
import {
  Direction,
  InputStep,
  MOVES,
  MOVE_CATEGORIES,
  Move,
  bumpComboReps,
  decodeCombo,
  encodeCombo,
  getActiveCombo,
  getComboReps,
  getTopMoves,
  moveById,
  setActiveCombo,
} from "@/lib/moves";

// ---------------------------------------------------------------------------
// Input glyph rendering
// ---------------------------------------------------------------------------

const DIR_ARROW: Record<Direction, string> = {
  N: "↑",
  S: "↓",
  E: "→",
  W: "←",
  NE: "↗",
  NW: "↖",
  SE: "↘",
  SW: "↙",
};

function FaceBadge({
  symbol,
  color,
  size = "sm",
}: {
  symbol: string;
  color: string; // bg tailwind class
  size?: "sm" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-16 w-16 text-3xl"
      : "h-7 w-7 text-[13px]";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold leading-none text-white ${color} ${cls} shadow-card`}
      aria-hidden
    >
      {symbol}
    </span>
  );
}

function MonoPill({
  children,
  size = "sm",
}: {
  children: React.ReactNode;
  size?: "sm" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-16 min-w-16 px-3 text-lg"
      : "h-7 min-w-7 px-2 text-[11px]";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border border-line bg-surface2 font-mono font-semibold text-ink ${cls}`}
    >
      {children}
    </span>
  );
}

function InputGlyph({
  step,
  size = "sm",
}: {
  step: InputStep;
  size?: "sm" | "lg";
}) {
  const { btn, dir, hold, flick, label } = step;
  const prefix = hold ? "Hold " : flick ? "Flick " : "";

  let core: React.ReactNode;
  switch (btn) {
    case "CIRCLE":
      core = <FaceBadge symbol="●" color="bg-red-500" size={size} />;
      break;
    case "CROSS":
      core = <FaceBadge symbol="✕" color="bg-blue-500" size={size} />;
      break;
    case "TRIANGLE":
      core = <FaceBadge symbol="▲" color="bg-lime-500" size={size} />;
      break;
    case "SQUARE":
      core = <FaceBadge symbol="■" color="bg-pink-500" size={size} />;
      break;
    case "L1":
    case "L2":
    case "R1":
    case "R2":
      core = <MonoPill size={size}>{btn}</MonoPill>;
      break;
    case "LS":
    case "RS":
      core = (
        <MonoPill size={size}>
          {btn}
          {dir ? DIR_ARROW[dir] : ""}
        </MonoPill>
      );
      break;
  }

  return (
    <span className="inline-flex items-center gap-1">
      {prefix && (
        <span
          className={
            size === "lg"
              ? "text-xs font-bold uppercase tracking-wider text-muted"
              : "text-[10px] font-bold uppercase tracking-wider text-muted"
          }
        >
          {prefix}
        </span>
      )}
      {core}
      {label && size === "sm" && (
        <span className="hidden text-[10px] uppercase tracking-wider text-muted md:inline">
          {label}
        </span>
      )}
    </span>
  );
}

function InputSequence({ inputs }: { inputs: InputStep[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      {inputs.map((step, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <InputGlyph step={step} />
          {i < inputs.length - 1 && (
            <span className="text-muted">·</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Difficulty dots
// ---------------------------------------------------------------------------

function DiffDots({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Difficulty ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2 w-2 rounded-full ${
            n <= level ? "bg-gold" : "bg-line"
          }`}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Saved combos type
// ---------------------------------------------------------------------------

type SavedCombo = {
  id: string;
  name: string;
  moveIds: string[];
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Practice Timer
// ---------------------------------------------------------------------------

type PracticeProps = {
  comboName: string;
  moves: Move[];
  comboKey: string; // saved combo id, or "active"
  onClose: () => void;
  onRepCompleted: (newCount: number) => void;
  initialReps: number;
};

function PracticeTimer({
  comboName,
  moves,
  comboKey,
  onClose,
  onRepCompleted,
  initialReps,
}: PracticeProps) {
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5>(1);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0); // ms
  const [paused, setPaused] = useState(false);
  const [loop, setLoop] = useState(false);
  const [reps, setReps] = useState(initialReps);
  const [done, setDone] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const current = moves[stepIdx];
  const stepDuration = current ? current.durationMs : 0;

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    lastTsRef.current = null;
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (paused) return;
    if (countdown <= 0) {
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 800);
    return () => clearTimeout(t);
  }, [countdown, paused]);

  // Step timer effect
  useEffect(() => {
    if (countdown !== null) return;
    if (done) return;
    if (paused) {
      clearTick();
      return;
    }
    if (!current) return;

    lastTsRef.current = performance.now();
    tickRef.current = setInterval(() => {
      const now = performance.now();
      const last = lastTsRef.current ?? now;
      const dt = (now - last) * speed;
      lastTsRef.current = now;
      setStepElapsed((prev) => {
        const next = prev + dt;
        if (next >= stepDuration) {
          // advance
          if (stepIdx + 1 < moves.length) {
            setStepIdx(stepIdx + 1);
            return 0;
          }
          // completed full combo
          const newReps = reps + 1;
          setReps(newReps);
          onRepCompleted(newReps);
          if (loop) {
            setStepIdx(0);
            return 0;
          }
          setDone(true);
          return stepDuration;
        }
        return next;
      });
    }, 50);

    return () => clearTick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, paused, stepIdx, speed, loop, done, stepDuration, moves.length]);

  // Cleanup on unmount
  useEffect(() => clearTick, []);

  const restart = useCallback(() => {
    clearTick();
    setStepIdx(0);
    setStepElapsed(0);
    setDone(false);
    setPaused(false);
    setCountdown(3);
  }, []);

  const totalMs = moves.reduce((a, m) => a + m.durationMs, 0);
  const elapsedTotal =
    moves.slice(0, stepIdx).reduce((a, m) => a + m.durationMs, 0) + stepElapsed;
  const stepPct = stepDuration > 0 ? Math.min(100, (stepElapsed / stepDuration) * 100) : 0;
  const totalPct = totalMs > 0 ? Math.min(100, (elapsedTotal / totalMs) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="font-display text-2xl tracking-wide text-ink">Practice</div>
          <div className="text-xs text-muted">
            {comboName} · {moves.length} steps · {(totalMs / 1000).toFixed(1)}s
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted hover:text-flame"
        >
          Close
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {countdown !== null ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted">
                Ready
              </div>
              <div className="mt-4 font-display text-9xl leading-none tracking-wide text-flame">
                {countdown > 0 ? countdown : "GO"}
              </div>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted">
                Combo complete
              </div>
              <div className="font-display text-6xl tracking-wide text-lime">
                {reps}
              </div>
              <div className="text-sm text-muted">
                {reps === 1 ? "rep" : "reps"} this session
              </div>
              <div className="mt-2 flex flex-col items-center gap-3">
                <button
                  onClick={restart}
                  className="rounded-md border border-flame bg-flame/10 px-5 py-2 text-xs font-bold uppercase tracking-wider text-flame hover:bg-flame/20"
                >
                  Run again
                </button>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={loop}
                    onChange={(e) => setLoop(e.target.checked)}
                    className="h-4 w-4 accent-flame"
                  />
                  Drill X times (auto-loop)
                </label>
              </div>
            </div>
          ) : current ? (
            <>
              {/* Step indicator — prominent */}
              <div className="flex items-baseline gap-3">
                <div className="font-display text-3xl leading-none tracking-wide text-flame md:text-4xl">
                  Step {stepIdx + 1}
                </div>
                <div className="font-display text-xl leading-none tracking-wide text-muted md:text-2xl">
                  of {moves.length}
                </div>
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                {current.name} · {(stepDuration / 1000).toFixed(1)}s
              </div>
              <div className="mt-2 font-display text-3xl tracking-wide text-ink md:text-4xl">
                {current.name}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {current.owner} signature · {current.situation}
              </div>

              {/* Big input glyphs */}
              <div className="mt-6 rounded-xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center gap-3">
                  {current.inputs.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-3">
                      <InputGlyph step={s} size="lg" />
                      {i < current.inputs.length - 1 && (
                        <span className="text-xl text-muted">·</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step progress */}
              <div className="mt-5">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
                  <span>Step progress</span>
                  <span className="font-mono">
                    {(stepElapsed / 1000).toFixed(1)}s / {(stepDuration / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full bg-flame transition-[width] duration-75"
                    style={{ width: `${stepPct}%` }}
                  />
                </div>
              </div>

              {/* Combo progress */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
                  <span>Combo progress</span>
                  <span className="font-mono">
                    {(elapsedTotal / 1000).toFixed(1)}s / {(totalMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full bg-ice transition-[width] duration-75"
                    style={{ width: `${totalPct}%` }}
                  />
                </div>
              </div>

              {/* Up next */}
              {stepIdx + 1 < moves.length && (
                <div className="mt-5 rounded-md border border-dashed border-line bg-surface2/50 p-3 text-xs text-muted">
                  <span className="text-ink">Next:</span> {moves[stepIdx + 1].name}{" "}
                  · {(moves[stepIdx + 1].durationMs / 1000).toFixed(1)}s
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Footer controls */}
      <div className="border-t border-line bg-surface/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setPaused((p) => !p)}
              disabled={countdown !== null || done}
              className="rounded-md border border-flame bg-flame/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-flame hover:bg-flame/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={restart}
              className="rounded-md border border-line bg-surface2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink hover:text-flame"
            >
              Restart
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Speed
            </span>
            {([0.5, 1, 1.5] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                  speed === s
                    ? "border-ice bg-ice/10 text-ice"
                    : "border-line bg-surface2 text-muted hover:text-ink"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="h-4 w-4 accent-flame"
            />
            Loop
          </label>

          <div className="font-mono text-xs text-muted">
            Reps: <span className="text-gold">{reps}</span>
          </div>
        </div>
        <div className="mx-auto mt-2 max-w-2xl text-[10px] uppercase tracking-wider text-muted">
          Key: {comboKey}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MovesPage() {
  const [cat, setCat] = useState<Move["category"]>("dribble");
  const [query, setQuery] = useState("");
  const [sizeFilter, setSizeFilter] = useState<"ALL" | "G" | "W" | "B">("ALL");
  const [diffFilter, setDiffFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [reqBadgeOnly, setReqBadgeOnly] = useState(false);

  const [favorites, setFavorites] = useState<string[]>([]);
  const [combo, setCombo] = useState<string[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const [savedCombos, setSavedCombos] = useState<SavedCombo[]>([]);
  const [comboName, setComboName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [comboRestored, setComboRestored] = useState(false);
  const [reps, setReps] = useState<Record<string, number>>({});

  // Practice state
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceComboKey, setPracticeComboKey] = useState<string>("active");
  const [practiceMoves, setPracticeMoves] = useState<Move[]>([]);
  const [practiceName, setPracticeName] = useState("Active combo");

  // Refs to move cards (for scroll-to)
  const moveRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ---- Load persisted state -------------------------------------------------
  useEffect(() => {
    try {
      const f = localStorage.getItem("2klab.favoriteMoves");
      if (f) setFavorites(JSON.parse(f));
      const c = localStorage.getItem("2klab.combos");
      if (c) setSavedCombos(JSON.parse(c));
    } catch {}
    const active = getActiveCombo();
    if (active && active.moveIds.length > 0) {
      setCombo(active.moveIds);
      setComboOpen(true);
    }
    setComboRestored(true);
    setReps(getComboReps());
  }, []);

  // ---- Persist favorites ----------------------------------------------------
  useEffect(() => {
    try {
      localStorage.setItem("2klab.favoriteMoves", JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  // ---- Toast auto-dismiss --------------------------------------------------
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Highlight auto-dismiss ----------------------------------------------
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightId]);

  // ---- Filter list ----------------------------------------------------------
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return MOVES.filter((m) => {
      if (m.category !== cat) return false;
      if (sizeFilter !== "ALL") {
        if (m.sizeReq !== sizeFilter && m.sizeReq !== "ANY") return false;
      }
      if (diffFilter !== 0 && m.difficulty !== diffFilter) return false;
      if (reqBadgeOnly && !m.requiresBadge) return false;
      if (term) {
        const blob =
          m.name.toLowerCase() +
          " " +
          m.owner.toLowerCase() +
          " " +
          m.situation.toLowerCase() +
          " " +
          m.tags.join(" ").toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [cat, query, sizeFilter, diffFilter, reqBadgeOnly]);

  // ---- Top moves ------------------------------------------------------------
  const topMoves = useMemo(() => getTopMoves(10), []);

  // ---- Combo derived --------------------------------------------------------
  const comboMoves = useMemo(
    () => combo.map((id) => moveById(id)).filter(Boolean) as Move[],
    [combo]
  );
  const comboMs = comboMoves.reduce((acc, m) => acc + m.durationMs, 0);
  const comboInputs: InputStep[] = comboMoves.flatMap((m) => m.inputs);

  // Recommended timing note based on first move
  const timingNote = useMemo(() => {
    if (comboMoves.length === 0) return null;
    const first = comboMoves[0];
    if (first.tags.includes("hesi") || first.name.toLowerCase().includes("hesi"))
      return "Wait for defender to commit before chaining.";
    if (first.tags.includes("ankle"))
      return "Sell the first move — defender needs to bite.";
    if (first.category === "post")
      return "Establish post position before the first stick input.";
    if (first.tags.includes("three"))
      return "Square shoulders before release.";
    return "Chain the next input as the previous animation completes.";
  }, [comboMoves]);

  // ---- Persist active combo -------------------------------------------------
  useEffect(() => {
    if (!comboRestored) return; // skip first paint before restore
    if (combo.length === 0) {
      setActiveCombo(null);
      return;
    }
    setActiveCombo({
      moveIds: combo,
      timingNote: timingNote ?? null,
      updatedAt: Date.now(),
    });
  }, [combo, timingNote, comboRestored]);

  // ---- Handlers -------------------------------------------------------------
  const toggleFav = (id: string) =>
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const addToCombo = (id: string) => {
    if (combo.length >= 6) {
      setToast("Max 6 moves");
      return;
    }
    if (combo.includes(id)) {
      setToast("Already in combo");
      return;
    }
    setCombo((prev) => [...prev, id]);
    setComboOpen(true);
  };

  const removeFromCombo = (idx: number) =>
    setCombo((prev) => prev.filter((_, i) => i !== idx));

  const moveInCombo = (idx: number, dir: -1 | 1) => {
    setCombo((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const saveCombo = () => {
    if (combo.length === 0) return;
    const name = comboName.trim() || `Combo ${savedCombos.length + 1}`;
    const next: SavedCombo[] = [
      ...savedCombos,
      {
        id: `${Date.now()}`,
        name,
        moveIds: combo,
        createdAt: Date.now(),
      },
    ];
    setSavedCombos(next);
    try {
      localStorage.setItem("2klab.combos", JSON.stringify(next));
    } catch {}
    setComboName("");
    setToast("Saved");
  };

  const shareCombo = async () => {
    const code = encodeCombo(combo);
    try {
      await navigator.clipboard.writeText(code);
      setToast("Code copied");
    } catch {
      setToast(code);
    }
  };

  const loadShared = (code: string) => {
    const ids = decodeCombo(code).filter((id) => moveById(id));
    if (ids.length === 0) {
      setToast("Bad code");
      return;
    }
    setCombo(ids.slice(0, 6));
    setComboOpen(true);
    setToast("Loaded");
  };

  const clearCombo = () => {
    setCombo([]);
    setActiveCombo(null);
    setToast("Cleared");
  };

  const jumpToMove = useCallback((m: Move) => {
    setCat(m.category);
    setQuery("");
    setSizeFilter("ALL");
    setDiffFilter(0);
    setReqBadgeOnly(false);
    setHighlightId(m.id);
    // Wait for re-render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = moveRefs.current[m.id];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }, []);

  const startPractice = (
    moves: Move[],
    key: string,
    name: string
  ) => {
    if (moves.length < 2) {
      setToast("Need 2+ moves");
      return;
    }
    setPracticeMoves(moves);
    setPracticeComboKey(key);
    setPracticeName(name);
    setPracticeOpen(true);
  };

  return (
    <main className="min-h-screen bg-bg pb-40 text-ink">
      {/* Header */}
      <div className="border-b border-line bg-surface/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
            Moves
          </h1>
          <p className="mt-1 text-sm text-muted">
            PS5 inputs · NBA 2K26
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        {/* TOP 10 — promoted above filters */}
        <div className="mb-6">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl tracking-wide text-ink">
                Top 10
              </h2>
              <p className="text-xs text-muted">
                Most-used moves · tap to jump
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              swipe →
            </span>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <div className="flex w-max gap-2">
              {topMoves.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => jumpToMove(m)}
                  className="flex w-44 shrink-0 flex-col gap-1.5 rounded-lg border border-line bg-surface p-3 text-left transition hover:border-flame hover:shadow-glow"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[10px] text-gold">
                      pop {m.popularity}
                    </span>
                  </div>
                  <div className="font-display text-lg leading-tight tracking-wide text-ink">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-ink">{m.owner}</div>
                  <div className="line-clamp-1 text-[11px] text-muted">
                    {m.situation}
                  </div>
                  <div className="mt-auto pt-1">
                    <DiffDots level={m.difficulty} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category tabs (horizontally scrollable on mobile) */}
        <div className="-mx-4 mb-5 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {MOVE_CATEGORIES.map((c) => {
              const active = c.key === cat;
              return (
                <button
                  key={c.key}
                  onClick={() => setCat(c.key)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? "border-flame bg-flame/15 text-flame shadow-glow"
                      : "border-line bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter row */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
            <div className="md:col-span-5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                Search
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name · owner · situation"
                className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                Size
              </label>
              <div className="mt-1 flex gap-1">
                {(["ALL", "G", "W", "B"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSizeFilter(s)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                      sizeFilter === s
                        ? "border-ice bg-ice/10 text-ice"
                        : "border-line bg-surface2 text-muted hover:text-ink"
                    }`}
                  >
                    {s === "ALL" ? "All" : s === "G" ? "Guard" : s === "W" ? "Wing" : "Big"}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                Difficulty
              </label>
              <div className="mt-1 flex gap-1">
                {([0, 1, 2, 3, 4, 5] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiffFilter(d)}
                    className={`flex-1 rounded-md border px-1.5 py-1.5 text-xs font-bold transition ${
                      diffFilter === d
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-line bg-surface2 text-muted hover:text-ink"
                    }`}
                  >
                    {d === 0 ? "Any" : d}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                Badge
              </label>
              <button
                onClick={() => setReqBadgeOnly((v) => !v)}
                className={`mt-1 w-full rounded-md border px-2 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  reqBadgeOnly
                    ? "border-flame bg-flame/10 text-flame"
                    : "border-line bg-surface2 text-muted hover:text-ink"
                }`}
                title="Show only moves that require a badge"
              >
                Req
              </button>
            </div>
          </div>
        </Card>

        {/* Result count */}
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span>
            {filtered.length} {filtered.length === 1 ? "move" : "moves"}
          </span>
          {favorites.length > 0 && (
            <span className="text-gold">
              {favorites.length} favorited
            </span>
          )}
        </div>

        {/* Move list */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((m) => {
            const isFav = favorites.includes(m.id);
            const inCombo = combo.includes(m.id);
            const highlighted = highlightId === m.id;
            return (
              <div
                key={m.id}
                ref={(el) => {
                  moveRefs.current[m.id] = el;
                }}
                className={`rounded-lg transition ${
                  highlighted ? "ring-2 ring-flame shadow-glow" : ""
                }`}
              >
                <Card className="flex flex-col gap-3 transition hover:border-flame/40">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-2xl leading-none tracking-wide text-ink">
                        {m.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        <span className="text-ink">{m.owner}</span> signature
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFav(m.id)}
                      aria-label={isFav ? "Unfavorite" : "Favorite"}
                      className={`shrink-0 rounded-md border px-2 py-1 text-base transition ${
                        isFav
                          ? "border-gold/50 bg-gold/10 text-gold"
                          : "border-line bg-surface2 text-muted hover:text-gold"
                      }`}
                    >
                      {isFav ? "★" : "☆"}
                    </button>
                  </div>

                  {/* Inputs */}
                  <div className="rounded-md border border-line bg-bg/60 p-3">
                    <InputSequence inputs={m.inputs} />
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <DiffDots level={m.difficulty} />
                    <span className="text-muted">·</span>
                    <span className="font-mono text-muted">
                      {(m.durationMs / 1000).toFixed(1)}s
                    </span>
                    {m.sizeReq && m.sizeReq !== "ANY" && (
                      <Pill tone="ice">
                        {m.sizeReq === "G" ? "Guard" : m.sizeReq === "W" ? "Wing" : "Big"}
                      </Pill>
                    )}
                    {m.requiresBadge && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface2 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink">
                        <TierBadge tier={m.requiresBadge.tier} />
                        <span className="px-1">{m.requiresBadge.badge}</span>
                      </span>
                    )}
                  </div>

                  {/* Situation */}
                  <p className="text-sm text-muted">
                    <span className="text-ink">Use:</span> {m.situation}
                  </p>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2">
                    <button
                      onClick={() => addToCombo(m.id)}
                      disabled={inCombo}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                        inCombo
                          ? "cursor-not-allowed border-line bg-surface2 text-muted"
                          : "border-flame bg-flame/10 text-flame hover:bg-flame/20"
                      }`}
                    >
                      {inCombo ? "In Combo" : "+ Add to Combo"}
                    </button>
                    <span className="font-mono text-[10px] text-muted">
                      pop {m.popularity}
                    </span>
                  </div>
                </Card>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-md border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
              No moves match these filters.
            </div>
          )}
        </div>

        {/* Saved combos */}
        {savedCombos.length > 0 && (
          <Section title="Saved" subtitle="Your stored combos">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {savedCombos.map((c) => {
                const moves = c.moveIds
                  .map((id) => moveById(id))
                  .filter(Boolean) as Move[];
                const ms = moves.reduce((a, m) => a + m.durationMs, 0);
                const repCount = reps[c.id] ?? 0;
                return (
                  <Card key={c.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display text-xl tracking-wide">
                          {c.name}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          {moves.map((m) => m.name).join(" → ")}
                        </div>
                      </div>
                      <div className="shrink-0 text-right font-mono text-xs text-muted">
                        {(ms / 1000).toFixed(1)}s
                        {repCount > 0 && (
                          <div className="text-gold">{repCount} reps</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setCombo(c.moveIds);
                          setComboOpen(true);
                        }}
                        className="rounded-md border border-line bg-surface2 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink hover:border-flame hover:text-flame"
                      >
                        Load
                      </button>
                      {moves.length >= 2 && (
                        <button
                          onClick={() => startPractice(moves, c.id, c.name)}
                          className="rounded-md border border-flame bg-flame/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-flame hover:bg-flame/20"
                        >
                          Practice
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const next = savedCombos.filter(
                            (x) => x.id !== c.id
                          );
                          setSavedCombos(next);
                          try {
                            localStorage.setItem(
                              "2klab.combos",
                              JSON.stringify(next)
                            );
                          } catch {}
                        }}
                        className="rounded-md border border-line bg-surface2 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted hover:text-flame"
                      >
                        Delete
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Section>
        )}

        {/* Disclaimer */}
        <p className="mt-12 border-t border-line pt-4 text-xs text-muted">
          Inputs verified against NBA 2K26 patch 1.7. Re-check after future
          patches.
        </p>
      </div>

      {/* Combo builder — sticky bottom panel ----------------------------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-6xl px-3 pb-3">
          <div
            className={`pointer-events-auto rounded-2xl border border-line bg-surface/95 shadow-card backdrop-blur transition ${
              comboOpen ? "" : ""
            }`}
          >
            {/* Header bar */}
            <button
              onClick={() => setComboOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-xl tracking-wide text-ink">
                  Combo
                </span>
                <span className="font-mono text-xs text-muted">
                  {combo.length}/6
                </span>
                {combo.length > 0 && (
                  <span className="font-mono text-xs text-gold">
                    {(comboMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">
                {comboOpen ? "▾ Collapse" : "▴ Expand"}
              </span>
            </button>

            {comboOpen && (
              <div className="border-t border-line px-4 py-3">
                {combo.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted">
                    Add moves to start chaining.
                  </p>
                ) : (
                  <>
                    {/* Chain list */}
                    <ol className="space-y-2">
                      {comboMoves.map((m, idx) => (
                        <li
                          key={`${m.id}-${idx}`}
                          className="flex items-center gap-2 rounded-md border border-line bg-bg/60 p-2"
                        >
                          <span className="w-5 shrink-0 text-center font-mono text-xs text-muted">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-display text-base tracking-wide text-ink">
                              {m.name}
                            </div>
                            <div className="truncate text-[10px] uppercase tracking-wider text-muted">
                              {m.owner} · {(m.durationMs / 1000).toFixed(1)}s
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => moveInCombo(idx, -1)}
                              disabled={idx === 0}
                              className="h-7 w-7 rounded border border-line bg-surface2 text-xs text-muted hover:text-ink disabled:opacity-30"
                              aria-label="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveInCombo(idx, 1)}
                              disabled={idx === combo.length - 1}
                              className="h-7 w-7 rounded border border-line bg-surface2 text-xs text-muted hover:text-ink disabled:opacity-30"
                              aria-label="Move down"
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => removeFromCombo(idx)}
                              className="h-7 w-7 rounded border border-line bg-surface2 text-xs text-muted hover:border-flame hover:text-flame"
                              aria-label="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>

                    {/* Full input string */}
                    <div className="mt-3 rounded-md border border-line bg-bg/60 p-3">
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                        Full Input Sequence
                      </div>
                      <InputSequence inputs={comboInputs} />
                    </div>

                    {timingNote && (
                      <p className="mt-3 text-xs text-muted">
                        <span className="text-ice">Timing:</span> {timingNote}
                      </p>
                    )}

                    {/* Practice button — show when 2+ moves */}
                    {comboMoves.length >= 2 && (
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            startPractice(
                              comboMoves,
                              "active",
                              comboName.trim() || "Active combo"
                            )
                          }
                          className="w-full rounded-md border border-flame bg-flame/15 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-flame hover:bg-flame/25"
                        >
                          ▶ Practice combo
                        </button>
                      </div>
                    )}

                    {/* Save + share row */}
                    <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                      <input
                        value={comboName}
                        onChange={(e) => setComboName(e.target.value)}
                        placeholder="Combo name"
                        className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none md:flex-1"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveCombo}
                          className="flex-1 rounded-md border border-lime bg-lime/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-lime hover:bg-lime/20 md:flex-none"
                        >
                          Save
                        </button>
                        <button
                          onClick={shareCombo}
                          className="flex-1 rounded-md border border-ice bg-ice/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-ice hover:bg-ice/20 md:flex-none"
                        >
                          Share Code
                        </button>
                        <button
                          onClick={clearCombo}
                          className="flex-1 rounded-md border border-line bg-surface2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted hover:text-flame md:flex-none"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Load shared */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Load from code
                      </summary>
                      <div className="mt-2 flex gap-2">
                        <input
                          placeholder="Paste combo code"
                          className="flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              loadShared((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                        />
                      </div>
                    </details>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Practice modal */}
      {practiceOpen && (
        <PracticeTimer
          comboName={practiceName}
          moves={practiceMoves}
          comboKey={practiceComboKey}
          initialReps={
            practiceComboKey === "active" ? 0 : reps[practiceComboKey] ?? 0
          }
          onRepCompleted={(newCount) => {
            if (practiceComboKey === "active") return;
            const updated = bumpComboReps(practiceComboKey, 1);
            setReps(updated);
            void newCount;
          }}
          onClose={() => setPracticeOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center">
          <div className="rounded-full border border-line bg-surface2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink shadow-card">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}
