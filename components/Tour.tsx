"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export const TOUR_STORAGE_KEY = "2klab.tour.seen";
const SLIDE_MS = 4500;
const INITIAL_DELAY_MS = 1500;

type Slide = {
  title: string;
  sub: string;
  visual: () => JSX.Element;
};

// ---------- Visuals ----------

function CountdownVisual() {
  const [seconds, setSeconds] = useState(3 * 60 + 42);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => (s <= 0 ? 3 * 60 + 42 : s - 1));
    }, 250);
    return () => window.clearInterval(id);
  }, []);
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(1, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="rounded-lg border border-flame/50 bg-flame/10 px-4 py-3 font-mono text-3xl font-bold text-flame tabular-nums shadow-glow">
        {mm}:{ss}
      </div>
      <div className="flex flex-col gap-1">
        <div className="rounded-md border border-line bg-surface2 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          LKR-2K-XYZ
        </div>
        <div className="rounded-md border border-line bg-surface2 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          FREE-MT-500
        </div>
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="self-start rounded-2xl rounded-bl-sm border border-line bg-surface2 px-3 py-2 text-xs text-ink"
        style={{ animation: "tourFadeIn 0.5s ease-out 0.1s both" }}
      >
        <span className="font-mono text-[10px] text-muted">Q · </span>
        Best PG build under 6'2?
      </div>
      <div
        className="self-end rounded-2xl rounded-br-sm border border-ice/40 bg-ice/10 px-3 py-2 text-xs text-ink"
        style={{ animation: "tourFadeIn 0.5s ease-out 0.9s both" }}
      >
        <span className="font-mono text-[10px] text-ice">A · </span>
        95 3PT cap with Quickdraw S + Volume Shooter A…
      </div>
    </div>
  );
}

function ShotMeterVisual() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-4 w-56 overflow-hidden rounded-full border border-line bg-surface2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-flame-grad"
          style={{
            animation: "tourMeterFill 1.6s ease-out forwards",
          }}
        />
        <div
          className="absolute inset-y-0 w-1 bg-ink/80"
          style={{
            left: "82%",
            animation: "tourGreenFlash 1s ease-in-out 1.6s 2 both",
          }}
        />
      </div>
      <div
        className="font-display text-2xl tracking-widest text-lime"
        style={{ animation: "tourGreenPulse 1s ease-out 1.6s both" }}
      >
        GREEN
      </div>
    </div>
  );
}

function PlayersVisual() {
  const avatars: { init: string; bg: string; fg: string }[] = [
    { init: "LJ", bg: "#552583", fg: "#FDB927" },
    { init: "SC", bg: "#1D428A", fg: "#FFC72C" },
    { init: "JT", bg: "#007A33", fg: "#FFFFFF" },
  ];
  return (
    <div className="flex items-center justify-center gap-4">
      {avatars.map((a, i) => (
        <div
          key={a.init}
          className="grid h-12 w-12 place-items-center rounded-full border border-line font-display text-lg tracking-wider shadow-card"
          style={{
            background: a.bg,
            color: a.fg,
            animation: `tourFadeIn 0.5s ease-out ${i * 0.2}s both`,
          }}
        >
          {a.init}
        </div>
      ))}
    </div>
  );
}

function ChipsVisual() {
  const chips: { label: string; tone: string }[] = [
    { label: "36 scenarios", tone: "border-flame/50 bg-flame/10 text-flame" },
    { label: "88 badges", tone: "border-gold/50 bg-gold/10 text-gold" },
    { label: "64 moves", tone: "border-ice/50 bg-ice/10 text-ice" },
    { label: "74 tips", tone: "border-lime/50 bg-lime/10 text-lime" },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {chips.map((c, i) => (
        <span
          key={c.label}
          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${c.tone}`}
          style={{ animation: `tourChipPop 0.4s ease-out ${i * 0.15}s both` }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function StackVisual() {
  return (
    <div className="flex items-center justify-center gap-2">
      {["Source", "Snowflake", "App"].map((label, i) => (
        <span key={label} className="flex items-center gap-2">
          <span
            className="rounded-md border border-line bg-surface2 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink"
            style={{ animation: `tourFadeIn 0.4s ease-out ${i * 0.25}s both` }}
          >
            {label}
          </span>
          {i < 2 && (
            <span
              className="block h-px w-6 bg-ice"
              style={{
                animation: `tourLineSlide 0.4s ease-out ${i * 0.25 + 0.2}s both`,
                transformOrigin: "left center",
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

function CheckmarkVisual() {
  return (
    <div className="grid place-items-center">
      <div
        className="grid h-14 w-14 place-items-center rounded-full border-2 border-lime bg-lime/10 font-display text-3xl text-lime"
        style={{ animation: "tourFadeIn 0.5s ease-out both" }}
      >
        ✓
      </div>
    </div>
  );
}

// ---------- Slides ----------

const SLIDES: Slide[] = [
  {
    title: "Codes that expire tonight",
    sub: "One tap to copy. Updated hourly.",
    visual: CountdownVisual,
  },
  {
    title: "AI Expert — chat with Claude about 2K",
    sub: "Add a key on /connect to enable.",
    visual: ChatVisual,
  },
  {
    title: "Shot timing in your browser",
    sub: "30 seconds. No PS5 needed.",
    visual: ShotMeterVisual,
  },
  {
    title: "71 NBA players with 2K stats",
    sub: "Compare any two. See predicted rating changes.",
    visual: PlayersVisual,
  },
  {
    title: "36 scenarios, 88 badges, 64 moves, 74 tips",
    sub: "All searchable, filtered, ready.",
    visual: ChipsVisual,
  },
  {
    title: "Live data via Fivetran + Snowflake-on-Iceberg",
    sub: "Architecture on /stack.",
    visual: StackVisual,
  },
  {
    title: "You don't have to set anything up",
    sub: "Everything works on first load. Personalize later if you want.",
    visual: CheckmarkVisual,
  },
];

// ---------- Component ----------

export function Tour() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Hydration-safe mount flag.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Decide whether to auto-open on first visit (home only).
  useEffect(() => {
    if (!mounted) return;
    if (pathname !== "/") return;
    let seen = "1";
    try {
      seen = window.localStorage.getItem(TOUR_STORAGE_KEY) ?? "";
    } catch {
      seen = "1"; // if storage unavailable, don't pester
    }
    if (seen) return;
    const id = window.setTimeout(() => {
      setIdx(0);
      setVisible(true);
    }, INITIAL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [mounted, pathname]);

  const close = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  // Auto-advance.
  useEffect(() => {
    if (!visible || paused) return;
    const id = window.setTimeout(() => {
      setIdx((i) => {
        if (i >= SLIDES.length - 1) return i; // hold on last slide; user taps "Got it"
        return i + 1;
      });
    }, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [visible, paused, idx]);

  // Keyboard.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") {
        setPaused(true);
        setIdx((i) => Math.min(i + 1, SLIDES.length - 1));
      } else if (e.key === "ArrowLeft") {
        setPaused(true);
        setIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current == null) return;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      touchStartY.current = null;
      if (dy > 60) close();
    },
    [close]
  );

  const slide = useMemo(() => SLIDES[idx], [idx]);

  if (!mounted || !visible) return null;

  const Visual = slide.visual;

  return (
    <div
      className="fixed inset-0 z-[90]"
      aria-hidden={!visible}
      data-tour-overlay
    >
      <style>{TOUR_KEYFRAMES}</style>
      {/* Scrim — click outside the card to dismiss */}
      <div
        onClick={close}
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
        aria-label="Dismiss tour"
      />

      {/* Card: mobile bottom sheet, desktop centered */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Site tour"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-card md:inset-0 md:bottom-auto md:top-1/2 md:m-auto md:max-h-[80vh] md:max-w-lg md:-translate-y-1/2 md:rounded-2xl"
        style={
          {
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
            animation: "tourSheetIn 0.3s ease-out",
          } as CSSProperties
        }
      >
        {/* Drag handle (mobile) */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line md:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
            2K LAB · Tour · {idx + 1}/{SLIDES.length}
          </div>
          <button
            type="button"
            aria-label="Skip tour"
            onClick={close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-surface2 font-mono text-base text-ink active:scale-95"
          >
            ×
          </button>
        </div>

        <h2
          key={`title-${idx}`}
          className="mt-3 font-display text-3xl leading-tight tracking-wide text-ink md:text-4xl"
          style={{ animation: "tourFadeIn 0.4s ease-out" }}
        >
          {slide.title}
        </h2>

        <div
          key={`visual-${idx}`}
          className="mt-5 grid min-h-[120px] place-items-center rounded-xl border border-line bg-surface2 p-4"
        >
          <Visual />
        </div>

        <p
          key={`sub-${idx}`}
          className="mt-4 text-sm text-ink/85"
          style={{ animation: "tourFadeIn 0.5s ease-out 0.1s both" }}
        >
          {slide.sub}
        </p>

        {/* Dots */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => {
                setPaused(true);
                setIdx(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === idx ? "w-6 bg-flame" : "w-2 bg-line"
              }`}
            />
          ))}
        </div>

        {idx === SLIDES.length - 1 && (
          <div className="mt-5">
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-flame bg-flame px-4 text-sm font-bold uppercase tracking-wider text-bg active:scale-[0.99]"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const TOUR_KEYFRAMES = `
@keyframes tourFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tourSheetIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tourMeterFill {
  from { width: 0%; }
  to   { width: 82%; }
}
@keyframes tourGreenFlash {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; box-shadow: 0 0 12px #00E676; }
}
@keyframes tourGreenPulse {
  0%   { opacity: 0; transform: scale(0.85); }
  60%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes tourChipPop {
  0%   { opacity: 0; transform: scale(0.6); }
  60%  { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes tourLineSlide {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@media (prefers-reduced-motion: reduce) {
  [data-tour-overlay] *,
  [data-tour-overlay] *::before,
  [data-tour-overlay] *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
`;

export default Tour;
