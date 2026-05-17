"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, Pill, Stat } from "@/components/ui";
import {
  Challenge,
  ChallengeRecord,
  EMPTY_RECORDS,
  JUMPER_PRESETS,
  JumperPreset,
  Records,
  ShotKind,
  ShotResult,
  classifyShot,
  decodeChallenge,
  encodeChallenge,
  fillDurationMs,
  loadChallenges,
  loadLatency,
  loadRecords,
  resolveJumperId,
  saveChallenge,
  saveLatency,
  saveRecords,
} from "@/lib/shot-trainer";

const SHARE_BASE_URL = "https://2klab.app/";

type PracticeMode = "open" | "sprint30" | "streak" | "tempo";

const PRACTICE_MODES: { id: PracticeMode; label: string; sub: string }[] = [
  { id: "open", label: "Open Range", sub: "Infinite shots" },
  { id: "sprint30", label: "30s Sprint", sub: "Most greens in 30s" },
  { id: "streak", label: "Streak", sub: "First miss ends run" },
  { id: "tempo", label: "Game Tempo", sub: "3–7s between reps" },
];

type ShotPhase = "idle" | "filling" | "result" | "cooldown";

type LiveSession = {
  shots: ShotResult[];
  currentStreak: number;
  highStreak: number;
  greens: number;
  whites: number;
  reds: number;
  totalOffset: number;
};

const EMPTY_SESSION: LiveSession = {
  shots: [],
  currentStreak: 0,
  highStreak: 0,
  greens: 0,
  whites: 0,
  reds: 0,
  totalOffset: 0,
};

function formatOffset(ms: number): string {
  if (Math.abs(ms) < 1) return "0ms";
  const sign = ms > 0 ? "+" : "";
  return `${sign}${Math.round(ms)}ms`;
}

function offsetCoachLine(offsetMs: number, kind: ShotKind): string {
  const rounded = Math.round(offsetMs);
  if (kind === "green") {
    if (Math.abs(rounded) < 8) return `${formatOffset(rounded)}. Dead center. Repeat that.`;
    return `${formatOffset(rounded)}. Inside the green. Lock the feel.`;
  }
  if (kind === "white") {
    const dir = rounded > 0 ? "late" : "early";
    return `${formatOffset(rounded)} ${dir}. Made shot, off-timing. Aim half a frame ${
      dir === "late" ? "earlier" : "later"
    }.`;
  }
  const dir = rounded > 0 ? "late" : "early";
  return `${formatOffset(rounded)} ${dir}. Miss. Reset the cadence.`;
}

export default function ShotTrainerPage() {
  return (
    <Suspense fallback={<ShotTrainerLoading />}>
      <ShotTrainerInner />
    </Suspense>
  );
}

function ShotTrainerLoading() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
          Shot Lab
        </h1>
        <p className="mt-1 text-sm text-muted">Loading trainer…</p>
      </header>
    </div>
  );
}

function ShotTrainerInner() {
  // ----- Preset / custom controls -----
  const [presetId, setPresetId] = useState<string>("base11");
  const [customSpeed, setCustomSpeed] = useState<number>(1.0); // multiplier
  const [customGreen, setCustomGreen] = useState<number>(10); // percent
  const [customHold, setCustomHold] = useState<boolean>(true);
  const [tuneOpen, setTuneOpen] = useState<boolean>(false);

  const activePreset: JumperPreset = useMemo(() => {
    const found = JUMPER_PRESETS.find((p) => p.id === presetId);
    return found ?? JUMPER_PRESETS[0];
  }, [presetId]);

  const effectiveSpeed = presetId === "custom" ? customSpeed : activePreset.releaseSpeedMultiplier;
  const effectiveGreen = presetId === "custom" ? customGreen : activePreset.greenWindowPct;
  const effectiveHold = presetId === "custom" ? customHold : activePreset.holdMode;

  const fillMs = useMemo(() => fillDurationMs(effectiveSpeed), [effectiveSpeed]);

  // ----- Mode -----
  const [mode, setMode] = useState<PracticeMode>("open");

  // ----- Session / records -----
  const [session, setSession] = useState<LiveSession>(EMPTY_SESSION);
  const [records, setRecords] = useState<Records>(EMPTY_RECORDS);
  const [hydrated, setHydrated] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);

  // ----- Sprint / streak state -----
  const [sprintRemaining, setSprintRemaining] = useState<number>(30);
  const [sprintActive, setSprintActive] = useState<boolean>(false);
  const sprintGreensRef = useRef<number>(0);
  const [streakRunActive, setStreakRunActive] = useState<boolean>(false);

  // ----- Meter state -----
  const [phase, setPhase] = useState<ShotPhase>("idle");
  const [meterFill, setMeterFill] = useState<number>(0); // 0..1
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);
  const [flashTone, setFlashTone] = useState<ShotKind | null>(null);

  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);
  const tempoTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<ShotPhase>("idle");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ----- Friend challenge -----
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [incomingChallenge, setIncomingChallenge] = useState<Challenge | null>(null);
  const [challengeDismissed, setChallengeDismissed] = useState<boolean>(false);
  // The challenge the user is currently attempting; used to compare scores after a sprint.
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  // Last finished sprint summary (for share panel + compare banner).
  const [lastSprint, setLastSprint] = useState<{
    score: number;
    streak: number;
    jumperId: string;
    code: string;
    timestamp: number;
    vsChallenge: Challenge | null;
  } | null>(null);
  const [sharePanelOpen, setSharePanelOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<"code" | "snippet" | null>(null);
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [challengesOpen, setChallengesOpen] = useState<boolean>(false);
  const activeChallengeRef = useRef<Challenge | null>(null);
  useEffect(() => {
    activeChallengeRef.current = activeChallenge;
  }, [activeChallenge]);

  // ----- Calibration -----
  const [calibrating, setCalibrating] = useState<boolean>(false);
  const [calibrationTaps, setCalibrationTaps] = useState<number[]>([]);
  const [calibrationCountdown, setCalibrationCountdown] = useState<number | null>(null);
  const [calibrationPulse, setCalibrationPulse] = useState<number>(0);
  const calibrationStartRef = useRef<number>(0);
  const CALIBRATION_INTERVAL_MS = 600;
  const CALIBRATION_TAPS = 5;

  // ----- Hydrate -----
  useEffect(() => {
    setRecords(loadRecords());
    setLatencyMs(loadLatency());
    setChallenges(loadChallenges());
    setHydrated(true);
  }, []);

  // ----- Parse incoming challenge from ?c= -----
  useEffect(() => {
    const raw = searchParams.get("c");
    if (!raw) {
      setIncomingChallenge(null);
      return;
    }
    const decoded = decodeChallenge(raw);
    if (!decoded) {
      setIncomingChallenge(null);
      return;
    }
    setIncomingChallenge(decoded);
    setChallengeDismissed(false);
  }, [searchParams]);

  // ----- Sprint timer -----
  useEffect(() => {
    if (!sprintActive) return;
    const id = window.setInterval(() => {
      setSprintRemaining((r) => {
        if (r <= 1) {
          setSprintActive(false);
          // Finalize sprint
          const finalGreens = sprintGreensRef.current;
          const finalStreak = sessionRef.current?.highStreak ?? 0;
          const jumperId = activePresetIdRef.current;
          setRecords((prev) => {
            const next: Records = {
              ...prev,
              bestSprint30: Math.max(prev.bestSprint30, finalGreens),
            };
            saveRecords(next);
            return next;
          });
          // Build challenge code + summary
          const now = Date.now();
          const challenge: Challenge = {
            mode: "S30",
            score: finalGreens,
            streak: finalStreak,
            jumperId,
            timestamp: now,
          };
          const code = encodeChallenge(challenge);
          const vs = activeChallengeRef.current;
          setLastSprint({
            score: finalGreens,
            streak: finalStreak,
            jumperId,
            code,
            timestamp: now,
            vsChallenge: vs,
          });
          setSharePanelOpen(false);
          setCopied(null);

          // Record sent challenge (your own outgoing record)
          const sentRecord: ChallengeRecord = {
            code,
            sentAt: now,
            accepted: false,
            theirScore: finalGreens,
            jumperId,
            mode: "S30",
          };
          saveChallenge(sentRecord);

          // If this was an accepted challenge, persist the comparison.
          if (vs) {
            const result =
              finalGreens > vs.score
                ? "win"
                : finalGreens < vs.score
                ? "lose"
                : "tie";
            const acceptedRecord: ChallengeRecord = {
              code: encodeChallenge(vs),
              sentAt: vs.timestamp,
              accepted: true,
              theirScore: vs.score,
              yourScore: finalGreens,
              result,
              jumperId: vs.jumperId,
              mode: "S30",
            };
            saveChallenge(acceptedRecord);
            setActiveChallenge(null);
          }
          setChallenges(loadChallenges());
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprintActive]);

  // Keep a ref of the active preset id for use inside the sprint interval.
  const activePresetIdRef = useRef<string>(presetId);
  useEffect(() => {
    activePresetIdRef.current = presetId;
  }, [presetId]);

  // ----- Cleanup -----
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (cooldownTimerRef.current !== null) window.clearTimeout(cooldownTimerRef.current);
      if (tempoTimerRef.current !== null) window.clearTimeout(tempoTimerRef.current);
    };
  }, []);

  // ----- Reset session when mode changes -----
  useEffect(() => {
    cancelPending();
    setSession(EMPTY_SESSION);
    setPhase("idle");
    setMeterFill(0);
    setLastResult(null);
    sprintGreensRef.current = 0;
    setSprintRemaining(30);
    setSprintActive(false);
    setStreakRunActive(false);
    setLastSprint(null);
    setSharePanelOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function cancelPending() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (tempoTimerRef.current !== null) {
      window.clearTimeout(tempoTimerRef.current);
      tempoTimerRef.current = null;
    }
  }

  // ----- Core shoot loop -----
  const startShot = useCallback(() => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "cooldown") return;
    if (mode === "sprint30" && !sprintActive && sprintRemaining <= 0) return;
    if (mode === "streak" && !streakRunActive) {
      // first shot of a streak run
      setStreakRunActive(true);
    }
    setPhase("filling");
    setMeterFill(0);
    setLastResult(null);
    setFlashTone(null);
    startTimeRef.current = performance.now();

    const total = fillMs;
    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(1, elapsed / total);
      setMeterFill(pct);
      if (phaseRef.current !== "filling") return;
      if (pct >= 1.0) {
        // Auto-miss if user never released by the time meter caps + small grace
        // We let it overshoot slightly so a "late" tap is still possible.
        if (elapsed > total + (effectiveGreen / 100) * total * 1.5) {
          finalizeShot(null);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillMs, mode, sprintActive, sprintRemaining, streakRunActive, effectiveGreen]);

  const releaseShot = useCallback(() => {
    if (phaseRef.current !== "filling") return;
    const now = performance.now();
    const elapsedRaw = now - startTimeRef.current;
    // Apply user calibration: if their input lags, we treat their tap as having
    // occurred `latencyMs` earlier (i.e., subtract).
    const elapsed = elapsedRaw - latencyMs;
    finalizeShot(elapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latencyMs]);

  function finalizeShot(elapsedMs: number | null) {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const total = fillMs;
    // Perfect release = at the center of the green window which sits at the top.
    // Green band occupies [1 - greenWindowPct/100, 1] of the meter, so center is
    // at 1 - greenWindowPct/200.
    const greenFrac = effectiveGreen / 100;
    const perfectFrac = 1 - greenFrac / 2;
    const perfectMs = perfectFrac * total;

    let kind: ShotKind;
    let offsetMs: number;
    if (elapsedMs === null) {
      kind = "red";
      offsetMs = (1 - perfectFrac) * total + total * 0.5; // far late
    } else {
      offsetMs = elapsedMs - perfectMs;
      kind = classifyShot(offsetMs, effectiveGreen, total);
    }

    const result: ShotResult = {
      kind,
      offsetMs,
      atTimestamp: Date.now(),
      mode,
    };

    // Snap the bar to where the user released
    if (elapsedMs !== null) {
      setMeterFill(Math.min(1, Math.max(0, elapsedMs / total)));
    } else {
      setMeterFill(1);
    }
    setLastResult(result);
    setFlashTone(kind);
    setPhase("result");

    // Update session
    setSession((prev) => {
      const shots = [...prev.shots, result].slice(-200);
      const isMade = kind !== "red";
      const isGreen = kind === "green";
      const nextStreak = isGreen ? prev.currentStreak + 1 : 0;
      const high = Math.max(prev.highStreak, nextStreak);
      return {
        shots,
        currentStreak: nextStreak,
        highStreak: high,
        greens: prev.greens + (isGreen ? 1 : 0),
        whites: prev.whites + (kind === "white" ? 1 : 0),
        reds: prev.reds + (kind === "red" ? 1 : 0),
        totalOffset: prev.totalOffset + offsetMs,
      };
    });

    // Update sprint counter
    if (mode === "sprint30" && sprintActive && kind === "green") {
      sprintGreensRef.current += 1;
    }

    // Update all-time records
    setRecords((prev) => {
      const nextStreak = kind === "green" ? prev.totalGreens + 0 : prev.totalGreens; // not used
      const sessionStreak =
        kind === "green"
          ? (sessionRef.current?.currentStreak ?? 0) + 1
          : 0;
      const next: Records = {
        bestStreak: Math.max(prev.bestStreak, sessionStreak),
        bestSprint30: prev.bestSprint30,
        totalGreens: prev.totalGreens + (kind === "green" ? 1 : 0),
        totalShots: prev.totalShots + 1,
      };
      saveRecords(next);
      return next;
    });

    // Streak mode: end run on non-green
    if (mode === "streak" && kind !== "green") {
      setStreakRunActive(false);
    }

    // Tone flash auto-clear
    cooldownTimerRef.current = window.setTimeout(() => {
      setFlashTone(null);
      setPhase("idle");
      setMeterFill(0);
      // Game-tempo: schedule auto-arming with delay
      if (mode === "tempo") {
        const delay = 3000 + Math.random() * 4000;
        tempoTimerRef.current = window.setTimeout(() => {
          // user still needs to press to shoot; just leave idle
        }, delay);
      }
    }, 700);
  }

  // Keep a ref of session for synchronous reads inside finalizeShot
  const sessionRef = useRef<LiveSession>(EMPTY_SESSION);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // ----- Primary button handler -----
  const onPrimaryAction = useCallback(() => {
    if (calibrating) {
      onCalibrationTap();
      return;
    }
    if (phaseRef.current === "idle" || phaseRef.current === "cooldown") {
      // gating: in streak mode, after a miss, require explicit "start new run"
      if (mode === "streak" && !streakRunActive && session.shots.length > 0) {
        // require user to click "Start run" button instead
        return;
      }
      if (mode === "sprint30" && !sprintActive && sprintRemaining > 0 && session.shots.length === 0) {
        // start sprint on first tap
        setSprintActive(true);
        setSprintRemaining(30);
        sprintGreensRef.current = 0;
      }
      if (mode === "sprint30" && !sprintActive && sprintRemaining <= 0) {
        return; // sprint ended; user resets via mode button
      }
      if (effectiveHold) {
        startShot();
      } else {
        // tap mode: a single tap arms and the next tap releases.
        startShot();
      }
      return;
    }
    if (phaseRef.current === "filling") {
      releaseShot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    calibrating,
    effectiveHold,
    mode,
    session.shots.length,
    sprintActive,
    sprintRemaining,
    startShot,
    releaseShot,
    streakRunActive,
  ]);

  // For HOLD mode: pointerdown starts, pointerup releases.
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (calibrating) {
        onCalibrationTap();
        return;
      }
      if (!effectiveHold) {
        onPrimaryAction();
        return;
      }
      if (phaseRef.current === "idle" || phaseRef.current === "cooldown") {
        if (mode === "streak" && !streakRunActive && session.shots.length > 0) return;
        if (mode === "sprint30" && !sprintActive && sprintRemaining > 0 && session.shots.length === 0) {
          setSprintActive(true);
          setSprintRemaining(30);
          sprintGreensRef.current = 0;
        }
        if (mode === "sprint30" && !sprintActive && sprintRemaining <= 0) return;
        startShot();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      calibrating,
      effectiveHold,
      mode,
      onPrimaryAction,
      session.shots.length,
      sprintActive,
      sprintRemaining,
      startShot,
      streakRunActive,
    ]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (calibrating) return;
      if (!effectiveHold) return; // tap mode handles via onPointerDown
      if (phaseRef.current === "filling") {
        releaseShot();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [calibrating, effectiveHold, releaseShot]
  );

  // ----- Keyboard: Space to shoot -----
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      // ignore if user is typing
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true")
      ) {
        return;
      }
      e.preventDefault();
      if (calibrating) {
        onCalibrationTap();
        return;
      }
      if (effectiveHold) {
        if (phaseRef.current === "idle" || phaseRef.current === "cooldown") {
          if (!e.repeat) {
            if (mode === "streak" && !streakRunActive && session.shots.length > 0) return;
            if (
              mode === "sprint30" &&
              !sprintActive &&
              sprintRemaining > 0 &&
              session.shots.length === 0
            ) {
              setSprintActive(true);
              setSprintRemaining(30);
              sprintGreensRef.current = 0;
            }
            if (mode === "sprint30" && !sprintActive && sprintRemaining <= 0) return;
            startShot();
          }
        }
      } else {
        if (e.repeat) return;
        onPrimaryAction();
      }
    }
    function up(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (calibrating) return;
      if (!effectiveHold) return;
      if (phaseRef.current === "filling") {
        e.preventDefault();
        releaseShot();
      }
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    calibrating,
    effectiveHold,
    mode,
    onPrimaryAction,
    releaseShot,
    session.shots.length,
    sprintActive,
    sprintRemaining,
    startShot,
    streakRunActive,
  ]);

  // ----- Calibration -----
  function startCalibration() {
    cancelPending();
    setCalibrationTaps([]);
    setCalibrationPulse(0);
    // Visual countdown 3 · 2 · 1, then arm calibration.
    setCalibrationCountdown(3);
    let n = 3;
    const tick = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(tick);
        setCalibrationCountdown(null);
        setCalibrating(true);
        calibrationStartRef.current = performance.now();
        setCalibrationPulse((p) => p + 1);
      } else {
        setCalibrationCountdown(n);
      }
    }, 700);
  }

  // Drive the visual metronome pulse during active calibration.
  useEffect(() => {
    if (!calibrating) return;
    const id = window.setInterval(() => {
      setCalibrationPulse((p) => p + 1);
    }, CALIBRATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [calibrating, CALIBRATION_INTERVAL_MS]);

  function onCalibrationTap() {
    const now = performance.now();
    const idx = calibrationTaps.length; // tap number (0..4)
    const expected = calibrationStartRef.current + (idx + 1) * CALIBRATION_INTERVAL_MS;
    const offset = now - expected;
    const next = [...calibrationTaps, offset];
    setCalibrationTaps(next);
    if (next.length >= CALIBRATION_TAPS) {
      const avg = next.reduce((s, v) => s + v, 0) / next.length;
      const clamped = Math.max(-200, Math.min(200, avg));
      setLatencyMs(clamped);
      saveLatency(clamped);
      setCalibrating(false);
    }
  }

  function clearChallengeParam() {
    if (!searchParams.get("c")) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("c");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function dismissIncomingChallenge() {
    setIncomingChallenge(null);
    setChallengeDismissed(true);
    setActiveChallenge(null);
    clearChallengeParam();
  }

  function startIncomingChallenge() {
    if (!incomingChallenge) return;
    const canonical = resolveJumperId(incomingChallenge.jumperId);
    if (canonical) {
      setPresetId(canonical);
    }
    setMode("sprint30");
    setActiveChallenge(incomingChallenge);
    setChallengeDismissed(true);
    setIncomingChallenge(null);
    clearChallengeParam();
    // Reset session so a fresh sprint begins.
    cancelPending();
    setSession(EMPTY_SESSION);
    setPhase("idle");
    setMeterFill(0);
    setLastResult(null);
    sprintGreensRef.current = 0;
    setSprintRemaining(30);
    setSprintActive(false);
    setStreakRunActive(false);
  }

  function shareSnippet(code: string, score: number, streak: number, jumperId: string): string {
    const preset = JUMPER_PRESETS.find((p) => p.id === jumperId.toLowerCase());
    const jumperName = preset ? preset.name : jumperId;
    const url = `${SHARE_BASE_URL}shot-trainer?c=${code}`;
    return [
      "2K LAB shot challenge",
      `Mode: 30s Sprint · Jumper: ${jumperName}`,
      `Score to beat: ${score} greens · longest streak ${streak}`,
      `Code: ${code}`,
      url,
    ].join("\n");
  }

  async function copyText(text: string, kind: "code" | "snippet") {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== "undefined") {
        // Fallback for older browsers / non-secure contexts.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* noop */
    }
  }

  function resetSession() {
    cancelPending();
    setSession(EMPTY_SESSION);
    setPhase("idle");
    setMeterFill(0);
    setLastResult(null);
    sprintGreensRef.current = 0;
    setSprintRemaining(30);
    setSprintActive(false);
    setStreakRunActive(false);
    setLastSprint(null);
    setSharePanelOpen(false);
    setCopied(null);
  }

  // ----- Derived stats -----
  const totalShots = session.shots.length;
  const mades = session.greens + session.whites;
  const greenPct = totalShots > 0 ? (session.greens / totalShots) * 100 : 0;
  const avgOffset = totalShots > 0 ? session.totalOffset / totalShots : 0;

  // ----- Render helpers -----
  const greenWindowTopPct = effectiveGreen; // height (in %) of the green band at the top
  const indicatorBottomPct = meterFill * 100;
  const perfectCenterPct = 100 - effectiveGreen / 2;

  const flashClass =
    flashTone === "green"
      ? "ring-2 ring-gold shadow-glowGold"
      : flashTone === "white"
      ? "ring-2 ring-lime"
      : flashTone === "red"
      ? "ring-2 ring-flame shadow-glow"
      : "";

  const streakGlow =
    session.currentStreak >= 10
      ? "shadow-glowGold border-gold/60"
      : session.currentStreak >= 5
      ? "shadow-glowIce border-ice/40"
      : "border-line";

  // History dots (last 20)
  const historyDots = session.shots.slice(-20);

  // Primary button label
  let primaryLabel = "SHOOT";
  if (phase === "filling") primaryLabel = effectiveHold ? "RELEASE" : "TAP NOW";
  if (mode === "sprint30" && !sprintActive && sprintRemaining <= 0 && totalShots > 0)
    primaryLabel = "SPRINT DONE";
  if (mode === "streak" && !streakRunActive && totalShots > 0) primaryLabel = "RUN OVER";
  if (calibrating) primaryLabel = `TAP ${calibrationTaps.length + 1}/${CALIBRATION_TAPS}`;

  const incomingJumperName = useMemo(() => {
    if (!incomingChallenge) return "";
    const canonical = resolveJumperId(incomingChallenge.jumperId);
    const preset = JUMPER_PRESETS.find((p) => p.id === canonical);
    return preset ? preset.name : incomingChallenge.jumperId;
  }, [incomingChallenge]);

  const lastSprintJumperName = useMemo(() => {
    if (!lastSprint) return "";
    const preset = JUMPER_PRESETS.find((p) => p.id === lastSprint.jumperId);
    return preset ? preset.name : lastSprint.jumperId;
  }, [lastSprint]);

  return (
    <div className="space-y-6">
      {/* Challenge accepted banner */}
      {incomingChallenge && !challengeDismissed && (
        <Card className="border-ice/40 bg-ice/5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ice">
                Challenge received
              </div>
              <div className="mt-1 font-display text-2xl tracking-wide text-ink md:text-3xl">
                Beat{" "}
                <span className="text-gold">{incomingChallenge.score} greens</span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {incomingJumperName} · 30s Sprint · longest streak{" "}
                <span className="text-ink">{incomingChallenge.streak}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={startIncomingChallenge}
                className="rounded-md border border-flame bg-flame px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-black active:scale-[0.98]"
              >
                Start challenge
              </button>
              <button
                onClick={dismissIncomingChallenge}
                className="rounded-md border border-line bg-surface2 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted active:scale-[0.98]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Title */}
      <header>
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
          Shot Lab
        </h1>
        <p className="mt-1 text-sm text-muted">
          Browser jumper-timing trainer · 2K26 release windows
        </p>
      </header>

      {/* Jumper picker */}
      <section>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Jumper
        </div>
        <div className="flex flex-wrap gap-1.5">
          {JUMPER_PRESETS.map((p) => {
            const active = p.id === presetId;
            return (
              <button
                key={p.id}
                onClick={() => setPresetId(p.id)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition active:scale-[0.97] ${
                  active
                    ? "border-flame bg-flame text-black"
                    : "border-line bg-surface2 text-ink hover:bg-surface"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-muted">
          {activePreset.owner && (
            <span className="text-ink">{activePreset.owner} · </span>
          )}
          {activePreset.notes}
        </div>
      </section>

      {/* Tune (collapsible custom controls) */}
      <Card className="space-y-3">
        <button
          onClick={() => setTuneOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={tuneOpen}
        >
          <span className="font-display text-xl tracking-wide text-ink">Tune</span>
          <span className="text-xs text-muted">
            {presetId === "custom" ? "Custom active" : "Override preset"} · {tuneOpen ? "Hide" : "Show"}
          </span>
        </button>
        {tuneOpen && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-muted">
                  Release Speed
                </span>
                <span className="font-mono text-ink">
                  {(presetId === "custom" ? customSpeed : activePreset.releaseSpeedMultiplier).toFixed(2)}x
                  {" · "}
                  {Math.round(fillMs)}ms
                </span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.4}
                step={0.05}
                value={presetId === "custom" ? customSpeed : activePreset.releaseSpeedMultiplier}
                onChange={(e) => {
                  setPresetId("custom");
                  setCustomSpeed(Number(e.target.value));
                }}
                className="w-full accent-flame"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-muted">
                  Green Window
                </span>
                <span className="font-mono text-ink">
                  {presetId === "custom" ? customGreen : activePreset.greenWindowPct}% ·{" "}
                  {Math.round((effectiveGreen / 100) * fillMs)}ms wide
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={16}
                step={1}
                value={presetId === "custom" ? customGreen : activePreset.greenWindowPct}
                onChange={(e) => {
                  setPresetId("custom");
                  setCustomGreen(Number(e.target.value));
                }}
                className="w-full accent-gold"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Hold-or-Tap
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setPresetId("custom");
                    setCustomHold(true);
                  }}
                  className={`rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                    effectiveHold
                      ? "border-flame bg-flame text-black"
                      : "border-line bg-surface2 text-muted"
                  }`}
                >
                  Hold
                </button>
                <button
                  onClick={() => {
                    setPresetId("custom");
                    setCustomHold(false);
                  }}
                  className={`rounded-md border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                    !effectiveHold
                      ? "border-flame bg-flame text-black"
                      : "border-line bg-surface2 text-muted"
                  }`}
                >
                  Tap
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Practice mode row */}
      <section>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Mode
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {PRACTICE_MODES.map((m) => {
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-lg border p-2 text-left transition active:scale-[0.98] ${
                  active
                    ? "border-flame bg-flame/10"
                    : "border-line bg-surface"
                }`}
              >
                <div className="font-display text-lg tracking-wider text-ink">
                  {m.label}
                </div>
                <div className="text-[11px] text-muted">{m.sub}</div>
              </button>
            );
          })}
        </div>
        {mode === "sprint30" && (
          <div className="mt-2 text-xs text-muted">
            Sprint:{" "}
            <span className="font-mono text-ink">
              {sprintActive ? `${sprintRemaining}s left` : sprintRemaining <= 0 && totalShots > 0 ? "complete" : "tap SHOOT to start"}
            </span>{" "}
            · Greens this run:{" "}
            <span className="font-mono text-lime">{sprintGreensRef.current}</span>
          </div>
        )}
        {mode === "streak" && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <div className="text-muted">
              Streak run:{" "}
              <span className="font-mono text-ink">
                {streakRunActive ? "live" : totalShots > 0 ? "over" : "ready"}
              </span>{" "}
              · Current:{" "}
              <span className="font-mono text-gold">{session.currentStreak}</span>
            </div>
            {!streakRunActive && totalShots > 0 && (
              <button
                onClick={resetSession}
                className="rounded-md border border-line bg-surface2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink"
              >
                New run
              </button>
            )}
          </div>
        )}
      </section>

      {/* Meter + result */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_1fr]">
        {/* Meter (vertical) */}
        <div className="flex items-stretch justify-center">
          <div
            className={`relative h-[340px] w-20 overflow-hidden rounded-xl border bg-surface2 transition ${flashClass} ${streakGlow}`}
            aria-label="Shot meter"
            role="img"
          >
            {/* Background ticks */}
            <div className="absolute inset-0 bg-court-grid bg-[length:16px_16px] opacity-50" />

            {/* Green window band at top */}
            <div
              className="absolute inset-x-0 top-0 border-y border-gold/50 bg-gradient-to-b from-gold/40 to-lime/30"
              style={{ height: `${greenWindowTopPct}%` }}
            >
              <div
                className="absolute inset-x-0 h-px bg-gold"
                style={{ top: `${(effectiveGreen / 2 / effectiveGreen) * 100}%` }}
              />
            </div>

            {/* Fill from bottom up */}
            <div
              className={`absolute inset-x-0 bottom-0 transition-colors ${
                phase === "filling"
                  ? "bg-flame/70"
                  : flashTone === "green"
                  ? "bg-gold/80"
                  : flashTone === "white"
                  ? "bg-lime/70"
                  : flashTone === "red"
                  ? "bg-flame/80"
                  : "bg-flame/50"
              }`}
              style={{ height: `${meterFill * 100}%` }}
            />

            {/* Release tick (after shot) */}
            {lastResult && phase === "result" && (
              <div
                className="absolute inset-x-0 h-0.5 bg-ink"
                style={{
                  bottom: `${
                    Math.min(
                      100,
                      Math.max(
                        0,
                        ((((lastResult.offsetMs + (perfectCenterPct / 100) * fillMs) /
                          fillMs)) *
                          100)
                      )
                    )
                  }%`,
                }}
              />
            )}

            {/* Perfect center line */}
            <div
              className="absolute inset-x-0 h-px bg-gold/80"
              style={{ bottom: `${perfectCenterPct}%` }}
            />
          </div>
        </div>

        {/* Result + coach line */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Last release
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className={`font-display text-4xl md:text-5xl ${
                  lastResult?.kind === "green"
                    ? "text-gold"
                    : lastResult?.kind === "white"
                    ? "text-lime"
                    : lastResult?.kind === "red"
                    ? "text-flame"
                    : "text-muted"
                }`}
              >
                {lastResult ? lastResult.kind.toUpperCase() : "—"}
              </span>
              {lastResult && (
                <span className="font-mono text-sm text-ink">
                  {formatOffset(lastResult.offsetMs)}
                </span>
              )}
            </div>
            <div className="mt-2 text-sm text-muted">
              {lastResult
                ? offsetCoachLine(lastResult.offsetMs, lastResult.kind)
                : effectiveHold
                ? "Hold the button. Release when the bar hits the gold band."
                : "Tap when the bar hits the gold band."}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Pill tone="gold">
              Window: {Math.round((effectiveGreen / 100) * fillMs)}ms
            </Pill>
            <Pill tone="ice">Fill: {Math.round(fillMs)}ms</Pill>
            <Pill tone={effectiveHold ? "default" : "muted"}>
              {effectiveHold ? "Hold" : "Tap"}
            </Pill>
            {latencyMs !== 0 && (
              <Pill tone="muted">Latency: {formatOffset(latencyMs)}</Pill>
            )}
            {session.currentStreak >= 5 && (
              <Pill tone={session.currentStreak >= 10 ? "gold" : "ice"}>
                Streak: {session.currentStreak}
              </Pill>
            )}
          </div>
        </Card>
      </div>

      {/* SHOOT button (fat thumb-zone) */}
      <button
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => {
          // If dragged off while holding, treat as release
          if (effectiveHold && phaseRef.current === "filling") {
            e.preventDefault();
            releaseShot();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`flex h-16 w-full select-none items-center justify-center rounded-xl border text-xl font-display tracking-widest transition active:scale-[0.99] ${
          phase === "filling"
            ? "border-gold bg-gold text-black shadow-glowGold"
            : "border-flame bg-flame text-black hover:bg-flame/90"
        }`}
        aria-label="Shoot"
      >
        {primaryLabel}
      </button>
      <div className="-mt-3 text-center text-[11px] text-muted">
        Space bar also fires · {effectiveHold ? "press & hold, release in gold" : "single tap when meter aligns"}
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        <Stat label="Greens" value={session.greens} tone="gold" />
        <Stat label="Mades" value={mades} tone="lime" />
        <Stat label="Misses" value={session.reds} tone="flame" />
        <Stat
          label="Green %"
          value={`${greenPct.toFixed(0)}%`}
          tone="gold"
        />
        <Stat
          label="Avg Off"
          value={totalShots ? formatOffset(avgOffset) : "—"}
        />
        <Stat
          label="Hi Streak"
          value={session.highStreak}
          tone="ice"
        />
      </div>

      {/* Friend challenge panel — appears after a finished sprint */}
      {lastSprint && (
        <Card className="space-y-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Sprint complete
              </div>
              <div className="mt-1 font-display text-2xl tracking-wide text-ink">
                <span className="text-gold">{lastSprint.score} greens</span>
                <span className="text-muted"> · </span>
                <span className="text-ice">{lastSprint.streak} streak</span>
              </div>
              <div className="text-xs text-muted">
                {lastSprintJumperName} · 30s Sprint
              </div>
            </div>
            {lastSprint.vsChallenge && (
              <div
                className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${
                  lastSprint.score > lastSprint.vsChallenge.score
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : lastSprint.score < lastSprint.vsChallenge.score
                    ? "border-flame/40 bg-flame/10 text-flame"
                    : "border-line bg-surface2 text-ink"
                }`}
              >
                {(() => {
                  const you = lastSprint.score;
                  const them = lastSprint.vsChallenge.score;
                  if (you > them) {
                    return `You: ${you} greens · vs them: ${them}. You win by ${you - them}.`;
                  }
                  if (you < them) {
                    return `You: ${you} greens · vs them: ${them}. Down by ${them - you}.`;
                  }
                  return `You: ${you} greens · vs them: ${them}. Tied.`;
                })()}
              </div>
            )}
          </div>

          {!sharePanelOpen && (
            <button
              onClick={() => setSharePanelOpen(true)}
              className="w-full rounded-md border border-flame bg-flame px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-black active:scale-[0.99] md:w-auto"
            >
              Challenge a friend
            </button>
          )}

          {sharePanelOpen && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Challenge code
              </div>
              <button
                onClick={() => copyText(lastSprint.code, "code")}
                className="block w-full break-all rounded-md border border-line bg-surface2 px-3 py-3 text-left font-mono text-lg text-ink active:scale-[0.99] md:text-xl"
                aria-label="Copy challenge code"
              >
                {lastSprint.code}
              </button>
              <div className="flex flex-col gap-2 md:flex-row">
                <button
                  onClick={() =>
                    copyText(
                      shareSnippet(
                        lastSprint.code,
                        lastSprint.score,
                        lastSprint.streak,
                        lastSprint.jumperId
                      ),
                      "snippet"
                    )
                  }
                  className="flex-1 rounded-md border border-ice bg-ice/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-ice active:scale-[0.99]"
                >
                  {copied === "snippet" ? "Copied" : "Copy challenge"}
                </button>
                <button
                  onClick={() => copyText(lastSprint.code, "code")}
                  className="flex-1 rounded-md border border-line bg-surface2 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink active:scale-[0.99]"
                >
                  {copied === "code" ? "Copied code" : "Copy code only"}
                </button>
              </div>
              <div className="text-[11px] text-muted">
                Send the snippet on Discord. Your friend opens the link, taps Start challenge, and gets your jumper + 30s Sprint.
              </div>
            </div>
          )}
        </Card>
      )}

      {/* History strip */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Last 20
          </div>
          <button
            onClick={resetSession}
            className="rounded-md border border-line bg-surface2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-ink"
          >
            Reset session
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {historyDots.length === 0 && (
            <div className="text-xs text-muted">No shots yet.</div>
          )}
          {historyDots.map((s, i) => {
            const bg =
              s.kind === "green"
                ? "bg-gold"
                : s.kind === "white"
                ? "bg-lime"
                : "bg-flame";
            return (
              <div
                key={i}
                title={`${s.kind.toUpperCase()} · ${formatOffset(s.offsetMs)}`}
                className={`h-4 w-4 rounded-full ${bg}`}
              />
            );
          })}
        </div>
      </Card>

      {/* Calibration + All-time bests */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-xl tracking-wide text-ink">
                Calibrate latency
              </div>
              <div className="mt-1 text-xs text-muted">
                Tap {CALIBRATION_TAPS} times to a {CALIBRATION_INTERVAL_MS}ms metronome.
                Average offset is applied to future shots.
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-ink">
                {hydrated ? formatOffset(latencyMs) : "—"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted">
                applied
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (calibrating || calibrationCountdown !== null) {
                  setCalibrating(false);
                  setCalibrationTaps([]);
                  setCalibrationCountdown(null);
                } else {
                  startCalibration();
                }
              }}
              className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                calibrating || calibrationCountdown !== null
                  ? "border-flame bg-flame text-black"
                  : "border-line bg-surface2 text-ink"
              }`}
            >
              {calibrating || calibrationCountdown !== null ? "Cancel" : "Start calibration"}
            </button>
            {calibrating && (
              <div className="text-xs text-muted">
                Tap with the pulse · {calibrationTaps.length}/{CALIBRATION_TAPS}
              </div>
            )}
            {latencyMs !== 0 && !calibrating && calibrationCountdown === null && (
              <button
                onClick={() => {
                  setLatencyMs(0);
                  saveLatency(0);
                }}
                className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"
              >
                Clear
              </button>
            )}
          </div>

          {/* Countdown + visual metronome */}
          {calibrationCountdown !== null && (
            <div className="mt-3 flex flex-col items-center justify-center rounded-lg border border-flame/40 bg-flame/5 p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted">
                Get ready
              </div>
              <div
                key={`cd-${calibrationCountdown}`}
                className="mt-2 font-display text-7xl leading-none tracking-wide text-flame animate-scale-in"
              >
                {calibrationCountdown}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">
                tap with the pulse
              </div>
            </div>
          )}
          {calibrating && (
            <div className="mt-3 flex flex-col items-center justify-center rounded-lg border border-flame/40 bg-flame/5 p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted">
                Tap on the pulse
              </div>
              <div
                key={`pulse-${calibrationPulse}`}
                aria-hidden
                className="mt-3 h-16 w-16 rounded-full bg-flame shadow-[0_0_24px_rgba(255,91,58,0.6)] animate-scale-in"
                style={{ animationDuration: `${CALIBRATION_INTERVAL_MS}ms` }}
              />
              <div className="mt-3 font-mono text-xs text-muted">
                {calibrationTaps.length}/{CALIBRATION_TAPS} taps
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="font-display text-xl tracking-wide text-ink">
            All-time bests
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat
              label="Best Streak"
              value={hydrated ? records.bestStreak : "—"}
              tone="gold"
            />
            <Stat
              label="Best 30s"
              value={hydrated ? records.bestSprint30 : "—"}
              tone="lime"
            />
            <Stat
              label="Total Greens"
              value={hydrated ? records.totalGreens : "—"}
              tone="gold"
            />
            <Stat
              label="Total Shots"
              value={hydrated ? records.totalShots : "—"}
            />
          </div>
        </Card>
      </div>

      {/* Recent challenges */}
      <Card>
        <button
          onClick={() => setChallengesOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={challengesOpen}
        >
          <div>
            <div className="font-display text-xl tracking-wide text-ink">
              Recent challenges
            </div>
            <div className="text-xs text-muted">
              {hydrated
                ? challenges.length === 0
                  ? "No challenges yet. Finish a 30s Sprint to make one."
                  : `${Math.min(challenges.length, 5)} of ${challenges.length} shown`
                : "—"}
            </div>
          </div>
          <span className="text-xs text-muted">
            {challengesOpen ? "Hide" : "Show"}
          </span>
        </button>
        {challengesOpen && hydrated && challenges.length > 0 && (
          <ul className="mt-3 space-y-2">
            {challenges.slice(0, 5).map((rec, i) => {
              const preset = JUMPER_PRESETS.find((p) => p.id === rec.jumperId);
              const jumperName = preset ? preset.name : rec.jumperId;
              const date = new Date(rec.sentAt);
              const dateLabel = Number.isFinite(date.getTime())
                ? date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "—";
              const resultTone =
                rec.result === "win"
                  ? "text-gold"
                  : rec.result === "lose"
                  ? "text-flame"
                  : rec.result === "tie"
                  ? "text-ink"
                  : "text-muted";
              const resultText =
                rec.result === "win"
                  ? `Won ${rec.yourScore}–${rec.theirScore}`
                  : rec.result === "lose"
                  ? `Lost ${rec.yourScore}–${rec.theirScore}`
                  : rec.result === "tie"
                  ? `Tied ${rec.yourScore}–${rec.theirScore}`
                  : rec.accepted
                  ? "Accepted"
                  : `Sent · ${rec.theirScore} greens`;
              return (
                <li
                  key={`${rec.code}-${rec.accepted ? "in" : "out"}-${i}`}
                  className="flex flex-col gap-1 rounded-md border border-line bg-surface2 px-3 py-2 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-ink break-all">
                      {rec.code}
                    </div>
                    <div className="text-[11px] text-muted">
                      {jumperName} · 30s Sprint · {dateLabel}
                    </div>
                  </div>
                  <div className={`shrink-0 text-xs font-semibold ${resultTone}`}>
                    {resultText}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-[11px] leading-relaxed text-muted">
        Browser timing approximates 2K's release window. In-game latency varies by
        display and controller; calibrate before competitive play. Green window
        position varies by jumper archetype — this model assumes a standard guard
        release; center and specialized releases differ.
      </p>
    </div>
  );
}
