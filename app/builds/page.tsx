"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bar, Card, Pill, TierBadge } from "@/components/ui";
import {
  ARCHETYPES,
  AttrGroupKey,
  AttributeCaps,
  BadgeRec,
  Build,
  HEIGHT_MAX,
  HEIGHT_MIN,
  POSITIONS,
  Position,
  SubDelta,
  WEIGHT_MAX,
  WEIGHT_MIN,
  WINGSPAN_MAX,
  WINGSPAN_MIN,
  comparablePlayer,
  computeAttributes,
  decodeBuild,
  defaultBuild,
  diffAttributes,
  diffBadges,
  encodeBuild,
  formatHeight,
  formatWingspan,
  getArchetype,
  loadSavedBuilds,
  recommendedBadges,
  saveBuilds,
  strengthsWeaknesses,
  topAbsDeltas,
  vcCost,
} from "@/lib/builds";

// ---------- shared helpers ----------

function vcColorClass(cost: number): string {
  if (cost > 150000) return "text-gold";
  if (cost < 80000) return "text-ice";
  return "text-ink";
}

function deltaSign(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

function deltaColor(n: number): string {
  if (n > 0) return "text-lime";
  if (n < 0) return "text-flame";
  return "text-muted";
}

// ---------- small controls ----------

function PositionPills({
  value,
  onChange,
  compact = false,
}: {
  value: Position;
  onChange: (p: Position) => void;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {POSITIONS.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`${
              compact ? "h-10 text-xl" : "h-12 text-2xl"
            } min-h-[40px] rounded-lg border font-display tracking-wider transition-colors ${
              active
                ? "border-flame bg-flame text-black shadow-glow"
                : "border-line bg-surface text-ink hover:bg-surface2"
            }`}
            aria-pressed={active}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function SliderRow({
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
  hint,
  compact = false,
}: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <Card className={compact ? "p-3" : "p-4"}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            {label}
          </div>
          {hint && !compact && (
            <div className="mt-0.5 text-[11px] text-muted">{hint}</div>
          )}
        </div>
        <div
          className={`font-display ${
            compact ? "text-2xl" : "text-3xl"
          } text-ink num leading-none`}
        >
          {display}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full appearance-none h-3 rounded-full bg-surface2 accent-flame cursor-pointer"
        style={{
          WebkitAppearance: "none",
        }}
      />
      <div className="mt-1 flex justify-between text-[10px] font-mono text-muted">
        <span>{label === "Height" ? formatHeight(min) : min}</span>
        <span>{label === "Height" ? formatHeight(max) : max}</span>
      </div>
    </Card>
  );
}

function ArchetypeCard({
  id,
  selected,
  onSelect,
  compact = false,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const a = getArchetype(id);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${
        compact ? "min-h-[88px] p-2" : "min-h-[112px] p-3"
      } rounded-xl border text-left transition-colors ${
        selected
          ? "border-flame bg-flame/10 shadow-glow"
          : "border-line bg-surface hover:bg-surface2"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex items-center justify-center rounded-md font-display ${
            compact ? "h-7 w-7 text-lg" : "h-9 w-9 text-2xl"
          } ${selected ? "bg-flame text-black" : "bg-surface2 text-ink"}`}
          aria-hidden
        >
          {a.icon}
        </div>
        {!compact && (
          <div className="flex flex-wrap justify-end gap-1">
            {a.primaryRole.slice(0, 2).map((p) => (
              <span
                key={p}
                className="rounded border border-line bg-bg/40 px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        className={`mt-2 font-display leading-tight tracking-wide text-ink ${
          compact ? "text-sm" : "text-lg"
        }`}
      >
        {a.name}
      </div>
      {!compact && (
        <div className="mt-0.5 text-[11px] text-muted">{a.tagline}</div>
      )}
    </button>
  );
}

// ---------- Build editor (shared by single + compare) ----------

function BuildEditor({
  build,
  onChange,
  saved,
  onLoadSaved,
  label,
  compact = false,
}: {
  build: Build;
  onChange: (patch: Partial<Build>) => void;
  saved: Build[];
  onLoadSaved: (b: Build) => void;
  label?: string;
  compact?: boolean;
}) {
  const [showLoad, setShowLoad] = useState(false);

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl tracking-wide text-ink">
            {label}
          </div>
          <button
            onClick={() => setShowLoad((v) => !v)}
            className="h-8 rounded-md border border-line bg-surface px-2 font-mono text-[11px] text-muted hover:text-ink"
          >
            {showLoad ? "close" : `load (${saved.length})`}
          </button>
        </div>
      )}
      {showLoad && (
        <Card className="p-2">
          {saved.length === 0 ? (
            <div className="px-2 py-3 font-mono text-[11px] text-muted">
              No saved builds.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {saved.map((s) => {
                const a = getArchetype(s.archetypeId);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      onLoadSaved(s);
                      setShowLoad(false);
                    }}
                    className="flex items-center gap-2 rounded-md border border-line bg-bg px-2 py-1.5 text-left hover:bg-surface2"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface2 font-display text-sm text-flame">
                      {s.position}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm text-ink">
                        {a.name}
                      </div>
                      <div className="font-mono text-[10px] text-muted">
                        {formatHeight(s.heightIn)} · {s.weightLb} · wing{" "}
                        {formatWingspan(s.wingspanDelta)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card className={compact ? "p-3" : undefined}>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Position
        </div>
        <PositionPills
          value={build.position}
          onChange={(p) => onChange({ position: p })}
          compact={compact}
        />
      </Card>

      <SliderRow
        label="Height"
        display={formatHeight(build.heightIn)}
        min={HEIGHT_MIN}
        max={HEIGHT_MAX}
        step={1}
        value={build.heightIn}
        onChange={(n) => onChange({ heightIn: n })}
        hint="Taller = slower, longer = more interior"
        compact={compact}
      />
      <SliderRow
        label="Weight"
        display={`${build.weightLb} lb`}
        min={WEIGHT_MIN}
        max={WEIGHT_MAX}
        step={5}
        value={build.weightLb}
        onChange={(n) => onChange({ weightLb: n })}
        hint="Heavier = stronger, less vertical"
        compact={compact}
      />
      <SliderRow
        label="Wingspan"
        display={formatWingspan(build.wingspanDelta)}
        min={WINGSPAN_MIN}
        max={WINGSPAN_MAX}
        step={1}
        value={build.wingspanDelta}
        onChange={(n) => onChange({ wingspanDelta: n })}
        hint="Relative to height. Long arms hurt shooting touch."
        compact={compact}
      />

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <div
            className={`font-display tracking-wide text-ink ${
              compact ? "text-lg" : "text-2xl"
            }`}
          >
            Archetype
          </div>
          <div className="font-mono text-[11px] text-muted">
            {ARCHETYPES.length} total
          </div>
        </div>
        <div
          className={`grid gap-2 ${
            compact
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          }`}
        >
          {ARCHETYPES.map((a) => (
            <ArchetypeCard
              key={a.id}
              id={a.id}
              selected={build.archetypeId === a.id}
              onSelect={() => onChange({ archetypeId: a.id })}
              compact={compact}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Compare summary card ----------

function CompareSummary({
  letter,
  build,
  attrs,
  cost,
  compare,
}: {
  letter: "A" | "B";
  build: Build;
  attrs: AttributeCaps;
  cost: number;
  compare: string;
}) {
  const arche = getArchetype(build.archetypeId);
  const top = useMemo(() => {
    const flat: { label: string; value: number }[] = [];
    (Object.keys(attrs) as AttrGroupKey[]).forEach((k) =>
      attrs[k].forEach((s) => flat.push({ label: s.label, value: s.value })),
    );
    return [...flat].sort((x, y) => y.value - x.value).slice(0, 3);
  }, [attrs]);

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-display text-2xl ${
            letter === "A" ? "bg-flame text-black" : "bg-ice text-black"
          }`}
        >
          {letter}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg tracking-wide text-ink leading-none">
            {arche.name}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted">
            {build.position} · {formatHeight(build.heightIn)} · {build.weightLb}lb · wing{" "}
            {formatWingspan(build.wingspanDelta)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted">
            VC
          </div>
          <div
            className={`font-mono text-base font-semibold leading-none ${vcColorClass(
              cost,
            )}`}
          >
            {cost.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {top.map((s) => (
          <span
            key={s.label}
            className="rounded border border-line bg-bg/40 px-1.5 py-0.5 font-mono text-[10px] text-ink"
          >
            {s.label} {s.value}
          </span>
        ))}
      </div>
      <div className="mt-2 font-mono text-[10px] text-muted">
        plays like {compare}
      </div>
    </Card>
  );
}

// ---------- main page ----------

type Mode = "build" | "compare";

export default function BuildLabPage() {
  return (
    <Suspense fallback={null}>
      <BuildLabPageInner />
    </Suspense>
  );
}

function BuildLabPageInner() {
  const [mode, setMode] = useState<Mode>("build");
  const [build, setBuild] = useState<Build>(() => defaultBuild());
  const [buildB, setBuildB] = useState<Build>(() => {
    // Slightly different default for B so the compare view is interesting on first load.
    const d = defaultBuild();
    return {
      ...d,
      id: `b_${Date.now().toString(36)}_b`,
      archetypeId: "lockdown",
      position: "SG",
      heightIn: 78,
      weightLb: 200,
      wingspanDelta: 4,
    };
  });

  const [saved, setSaved] = useState<Build[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [shareInput, setShareInput] = useState("");
  const [overflowOpen, setOverflowOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const deltaRef = useRef<HTMLDivElement | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (
        overflowRef.current &&
        !overflowRef.current.contains(e.target as Node)
      ) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [overflowOpen]);

  useEffect(() => {
    setSaved(loadSavedBuilds());
  }, []);

  // Preselect archetype from ?arche= query param (e.g. from Players → Open in Build Lab).
  const searchParams = useSearchParams();
  const preselectArche = searchParams?.get("arche") ?? null;
  const didPreselectArche = useRef(false);
  useEffect(() => {
    if (didPreselectArche.current) return;
    if (!preselectArche) return;
    const match = ARCHETYPES.find((a) => a.id === preselectArche);
    if (!match) return;
    didPreselectArche.current = true;
    setBuild((b) => ({ ...b, archetypeId: match.id, updatedAt: Date.now() }));
  }, [preselectArche]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  // --- A side memos ---
  const attrs = useMemo(() => computeAttributes(build), [build]);
  const cost = useMemo(() => vcCost(attrs), [attrs]);
  const arche = useMemo(() => getArchetype(build.archetypeId), [build.archetypeId]);
  const badges = useMemo(() => recommendedBadges(arche, build), [arche, build]);
  const compare = useMemo(() => comparablePlayer(build), [build]);
  const sw = useMemo(() => strengthsWeaknesses(attrs), [attrs]);
  const code = useMemo(() => encodeBuild(build), [build]);

  // --- B side memos (only used in compare mode but cheap to compute) ---
  const attrsB = useMemo(() => computeAttributes(buildB), [buildB]);
  const costB = useMemo(() => vcCost(attrsB), [attrsB]);
  const archeB = useMemo(
    () => getArchetype(buildB.archetypeId),
    [buildB.archetypeId],
  );
  const badgesB = useMemo(
    () => recommendedBadges(archeB, buildB),
    [archeB, buildB],
  );
  const compareB = useMemo(() => comparablePlayer(buildB), [buildB]);
  const codeB = useMemo(() => encodeBuild(buildB), [buildB]);

  // --- diff memos ---
  const attrDiff = useMemo(() => diffAttributes(attrs, attrsB), [attrs, attrsB]);
  const vcDelta = cost - costB;
  const badgeOverlap = useMemo(
    () => diffBadges(badges, badgesB),
    [badges, badgesB],
  );
  const topDeltas = useMemo(() => topAbsDeltas(attrDiff, 3), [attrDiff]);
  const topDeltaKeys = useMemo(
    () => new Set(topDeltas.map((d) => d.key)),
    [topDeltas],
  );

  const update = (patch: Partial<Build>) =>
    setBuild((b) => ({ ...b, ...patch, updatedAt: Date.now() }));
  const updateB = (patch: Partial<Build>) =>
    setBuildB((b) => ({ ...b, ...patch, updatedAt: Date.now() }));

  const persistSave = (b: Build, arc: { name: string }) => {
    const name = `${b.position} ${formatHeight(b.heightIn)} ${arc.name}`;
    const next: Build = { ...b, name, updatedAt: Date.now() };
    return next;
  };

  const handleSave = () => {
    const next = persistSave(build, arche);
    const list = [next, ...saved.filter((s) => s.id !== build.id)].slice(0, 12);
    setSaved(list);
    saveBuilds(list);
    showToast(`Saved · ${next.name}`);
  };

  const handleSaveBoth = () => {
    const nextA = persistSave(build, arche);
    const nextB = persistSave(buildB, archeB);
    const list = [
      nextA,
      nextB,
      ...saved.filter((s) => s.id !== build.id && s.id !== buildB.id),
    ].slice(0, 12);
    setSaved(list);
    saveBuilds(list);
    showToast(`Saved A + B`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Copied · ${code}`);
    } catch {
      showToast(code);
    }
  };

  const handleCopyCompare = async () => {
    const str = `vs[${code}][${codeB}]`;
    try {
      await navigator.clipboard.writeText(str);
      showToast(`Copied · ${str}`);
    } catch {
      showToast(str);
    }
  };

  const handleReset = () => {
    setBuild(defaultBuild());
    showToast("Reset to default");
  };

  const handleLoad = (b: Build) => {
    setBuild({ ...b, updatedAt: Date.now() });
    showToast(`Loaded · ${b.name}`);
  };

  const handleLoadInto = (which: "A" | "B", b: Build) => {
    if (which === "A") {
      setBuild({ ...b, updatedAt: Date.now() });
    } else {
      setBuildB({ ...b, updatedAt: Date.now() });
    }
    showToast(`Loaded ${which} · ${b.name}`);
  };

  const handleDelete = (id: string) => {
    const list = saved.filter((s) => s.id !== id);
    setSaved(list);
    saveBuilds(list);
  };

  const handleShareLoad = () => {
    const decoded = decodeBuild(shareInput);
    if (!decoded) {
      showToast("Invalid share code");
      return;
    }
    setBuild(decoded);
    setShareInput("");
    showToast(`Loaded · ${decoded.position} ${formatHeight(decoded.heightIn)}`);
  };

  const scrollToDelta = () => {
    deltaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // The sticky bar shows A's summary in both modes.
  const stickyArche = arche;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pt-10">
      {/* header */}
      <header className="mb-4">
        <h1 className="font-display text-5xl tracking-wider text-ink md:text-6xl">
          Build Lab
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Pick a position, adjust dimensions, choose archetype. Caps, badges and VC cost
          recompute live.
        </p>
      </header>

      {/* mode tabs */}
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-line bg-surface p-1">
          <button
            onClick={() => setMode("build")}
            className={`h-9 rounded-md px-4 font-display text-base tracking-wide transition-colors ${
              mode === "build"
                ? "bg-flame text-black"
                : "text-muted hover:text-ink"
            }`}
            aria-pressed={mode === "build"}
          >
            Build
          </button>
          <button
            onClick={() => setMode("compare")}
            className={`h-9 rounded-md px-4 font-display text-base tracking-wide transition-colors ${
              mode === "compare"
                ? "bg-flame text-black"
                : "text-muted hover:text-ink"
            }`}
            aria-pressed={mode === "compare"}
          >
            Compare
          </button>
        </div>
        {mode === "compare" && (
          <div className="font-mono text-[11px] text-muted">
            A vs B · live delta
          </div>
        )}
      </div>

      {/* sticky summary bar */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-flame font-display text-2xl text-black">
              {build.position}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-xl tracking-wide text-ink leading-none">
                {stickyArche.name}
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted">
                {formatHeight(build.heightIn)} · {build.weightLb} lb · wingspan{" "}
                {formatWingspan(build.wingspanDelta)}
              </div>
            </div>
          </div>

          {/* Always-visible VC (mobile + desktop) */}
          <div className="flex shrink-0 flex-col items-end pr-1 md:pr-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted leading-none">
              VC
            </div>
            <div
              className={`font-mono text-lg md:text-2xl font-semibold leading-none mt-0.5 ${vcColorClass(
                cost,
              )}`}
            >
              {cost.toLocaleString()}
            </div>
            {mode === "compare" && (
              <div
                className={`mt-0.5 font-mono text-[10px] leading-none ${deltaColor(
                  vcDelta,
                )}`}
              >
                Δ {deltaSign(vcDelta)}
              </div>
            )}
          </div>

          {mode === "build" ? (
            <>
              {/* Mobile: Save + overflow */}
              <div className="flex w-full gap-2 md:hidden">
                <button
                  onClick={handleSave}
                  className="flex-1 h-11 min-w-[88px] rounded-lg bg-flame px-4 font-display text-lg tracking-wide text-black hover:bg-flame/90 active:scale-[0.98]"
                >
                  Save
                </button>
                <div className="relative" ref={overflowRef}>
                  <button
                    onClick={() => setOverflowOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={overflowOpen}
                    aria-label="More actions"
                    className="h-11 w-11 rounded-lg border border-line bg-surface font-display text-xl tracking-wide text-ink hover:bg-surface2 active:scale-[0.98]"
                  >
                    ⋯
                  </button>
                  {overflowOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-lg border border-line bg-surface shadow-card"
                    >
                      <button
                        role="menuitem"
                        onClick={() => {
                          setOverflowOpen(false);
                          handleCopy();
                        }}
                        className="block w-full px-3 py-2.5 text-left font-display text-base tracking-wide text-ink hover:bg-surface2"
                      >
                        Copy Code
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setOverflowOpen(false);
                          handleReset();
                        }}
                        className="block w-full border-t border-line px-3 py-2.5 text-left font-display text-base tracking-wide text-muted hover:bg-surface2 hover:text-ink"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Desktop md+: full inline */}
              <div className="hidden gap-2 md:flex md:w-auto">
                <button
                  onClick={handleSave}
                  className="flex-1 h-11 min-w-[88px] rounded-lg bg-flame px-4 font-display text-lg tracking-wide text-black hover:bg-flame/90 active:scale-[0.98]"
                >
                  Save
                </button>
                <button
                  onClick={handleCopy}
                  className="flex-1 h-11 min-w-[88px] rounded-lg border border-line bg-surface px-4 font-display text-lg tracking-wide text-ink hover:bg-surface2"
                >
                  Copy Code
                </button>
                <button
                  onClick={handleReset}
                  className="h-11 min-w-[44px] rounded-lg border border-line bg-surface px-3 font-display text-lg tracking-wide text-muted hover:text-ink"
                  aria-label="Reset"
                  title="Reset"
                >
                  R
                </button>
              </div>
            </>
          ) : (
            <div className="flex w-full gap-2 md:w-auto">
              <button
                onClick={handleSaveBoth}
                className="flex-1 h-11 min-w-[88px] rounded-lg bg-flame px-3 font-display text-base tracking-wide text-black hover:bg-flame/90 active:scale-[0.98]"
              >
                Save A+B
              </button>
              <button
                onClick={handleCopyCompare}
                className="flex-1 h-11 min-w-[88px] rounded-lg border border-line bg-surface px-3 font-display text-base tracking-wide text-ink hover:bg-surface2"
              >
                Copy vs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-xs text-ink shadow-card animate-fade-in">
          {toast}
        </div>
      )}

      {/* mobile-only "jump to delta" button (compare mode) */}
      {mode === "compare" && (
        <button
          onClick={scrollToDelta}
          className="fixed bottom-4 right-4 z-30 h-11 rounded-full border border-line bg-surface px-4 font-mono text-xs text-ink shadow-card hover:bg-surface2 md:hidden"
          aria-label="Jump to Delta view"
        >
          Δ view
        </button>
      )}

      {mode === "build" ? (
        // -------------------- SINGLE BUILD --------------------
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT: controls */}
          <div className="space-y-4 lg:col-span-5">
            <BuildEditor
              build={build}
              onChange={update}
              saved={saved}
              onLoadSaved={handleLoad}
            />
          </div>

          {/* RIGHT: outputs */}
          <div className="space-y-6 lg:col-span-7">
            <Card>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-lime">
                    Strengths
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sw.strengths.map((s) => (
                      <Pill key={s} tone="lime">
                        {s}
                      </Pill>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-flame">
                    Weaknesses
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sw.weaknesses.map((s) => (
                      <Pill key={s} tone="flame">
                        {s}
                      </Pill>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  VC Cost
                </div>
                <div
                  className={`mt-1 font-display text-4xl num leading-none md:text-5xl ${vcColorClass(
                    cost,
                  )}`}
                >
                  {cost.toLocaleString()}
                </div>
                <div className="mt-2 text-[11px] text-muted">
                  Approx. to cap every attribute from base.
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Plays Like
                </div>
                <div className="mt-1 font-display text-2xl tracking-wide text-ink leading-tight md:text-3xl">
                  {compare}
                </div>
                <div className="mt-2 text-[11px] text-muted">
                  Closest real {build.position} for this archetype.
                </div>
              </Card>
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <div className="font-display text-2xl tracking-wide text-ink">
                  Attribute Caps
                </div>
                <div className="font-mono text-[11px] text-muted">live</div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    ["finishing", "Finishing", "flame"],
                    ["shooting", "Shooting", "gold"],
                    ["playmaking", "Playmaking", "ice"],
                    ["defense", "Defense / Rebound", "lime"],
                    ["athleticism", "Athleticism", "ice"],
                    ["physicals", "Physicals", "flame"],
                  ] as const
                ).map(([key, label, tone]) => (
                  <Card key={key} className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-display text-lg tracking-wide text-ink">
                        {label}
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        {Math.round(
                          attrs[key].reduce((acc, s) => acc + s.value, 0) /
                            attrs[key].length,
                        )}{" "}
                        avg
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {attrs[key].map((s) => (
                        <div key={s.key}>
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="text-muted">{s.label}</span>
                            <span
                              className={`num font-mono font-semibold ${
                                s.value >= 90
                                  ? "text-gold"
                                  : s.value >= 80
                                    ? "text-ink"
                                    : "text-muted"
                              }`}
                            >
                              {s.value}
                            </span>
                          </div>
                          <div className="transition-all duration-300">
                            <Bar value={s.value} tone={tone} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <div className="font-display text-2xl tracking-wide text-ink">
                  Recommended Badges
                </div>
                <div className="font-mono text-[11px] text-muted">top 8</div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {badges.map((b) => (
                  <Card key={b.name} className="flex items-start gap-3 p-3">
                    <TierBadge tier={b.tier} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-display text-lg tracking-wide text-ink">
                          {b.name}
                        </div>
                        <Pill
                          tone={
                            b.category === "Shooting"
                              ? "gold"
                              : b.category === "Defense"
                                ? "lime"
                                : b.category === "Playmaking"
                                  ? "ice"
                                  : b.category === "Finishing"
                                    ? "flame"
                                    : "muted"
                          }
                        >
                          {b.category}
                        </Pill>
                      </div>
                      <div className="mt-0.5 text-[12px] text-muted">
                        {b.effect}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Card>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                Load Share Code
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={shareInput}
                  onChange={(e) => setShareInput(e.target.value)}
                  placeholder={code}
                  className="h-11 flex-1 rounded-lg border border-line bg-bg px-3 font-mono text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
                />
                <button
                  onClick={handleShareLoad}
                  disabled={!shareInput}
                  className="h-11 rounded-lg border border-line bg-surface px-4 font-display text-lg tracking-wide text-ink hover:bg-surface2 disabled:opacity-40"
                >
                  Load
                </button>
              </div>
              <div className="mt-2 font-mono text-[11px] text-muted">
                Current code: {code}
              </div>
            </Card>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <div className="font-display text-2xl tracking-wide text-ink">
                  Saved Builds
                </div>
                <div className="font-mono text-[11px] text-muted">
                  {saved.length} / 12
                </div>
              </div>
              {saved.length === 0 ? (
                <Card>
                  <div className="text-sm text-muted">
                    Nothing saved yet. Tap{" "}
                    <span className="font-display tracking-wide text-ink">
                      Save
                    </span>{" "}
                    in the top bar.
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {saved.map((b) => {
                    const a = getArchetype(b.archetypeId);
                    return (
                      <Card key={b.id} className="flex items-center gap-3 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface2 font-display text-xl text-flame">
                          {b.position}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-display text-base tracking-wide text-ink">
                            {a.name}
                          </div>
                          <div className="font-mono text-[10px] text-muted">
                            {formatHeight(b.heightIn)} · {b.weightLb} · wing{" "}
                            {formatWingspan(b.wingspanDelta)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleLoad(b)}
                          className="h-9 rounded-md border border-line bg-bg px-3 font-display text-sm tracking-wide text-ink hover:bg-surface2"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="h-9 w-9 rounded-md border border-line bg-bg font-display text-sm text-muted hover:text-flame"
                          aria-label="Delete"
                          title="Delete"
                        >
                          X
                        </button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // -------------------- COMPARE MODE --------------------
        <CompareView
          buildA={build}
          buildB={buildB}
          attrsA={attrs}
          attrsB={attrsB}
          costA={cost}
          costB={costB}
          archeA={arche}
          archeB={archeB}
          badgesA={badges}
          badgesB={badgesB}
          compareA={compare}
          compareB={compareB}
          codeA={code}
          codeB={codeB}
          updateA={update}
          updateB={updateB}
          saved={saved}
          onLoadInto={handleLoadInto}
          attrDiff={attrDiff}
          vcDelta={vcDelta}
          badgeOverlap={badgeOverlap}
          topDeltaKeys={topDeltaKeys}
          deltaRef={deltaRef}
        />
      )}

      <p className="mt-10 text-center font-mono text-[11px] text-muted">
        Caps are modeled approximations of NBA 2K26 patch X — verify in MyCareer
        before committing VC.
      </p>
    </main>
  );
}

// ---------- Compare view (sub-component) ----------

function CompareView({
  buildA,
  buildB,
  attrsA,
  attrsB,
  costA,
  costB,
  archeA,
  archeB,
  badgesA,
  badgesB,
  compareA,
  compareB,
  codeA,
  codeB,
  updateA,
  updateB,
  saved,
  onLoadInto,
  attrDiff,
  vcDelta,
  badgeOverlap,
  topDeltaKeys,
  deltaRef,
}: {
  buildA: Build;
  buildB: Build;
  attrsA: AttributeCaps;
  attrsB: AttributeCaps;
  costA: number;
  costB: number;
  archeA: { name: string };
  archeB: { name: string };
  badgesA: BadgeRec[];
  badgesB: BadgeRec[];
  compareA: string;
  compareB: string;
  codeA: string;
  codeB: string;
  updateA: (p: Partial<Build>) => void;
  updateB: (p: Partial<Build>) => void;
  saved: Build[];
  onLoadInto: (which: "A" | "B", b: Build) => void;
  attrDiff: ReturnType<typeof diffAttributes>;
  vcDelta: number;
  badgeOverlap: ReturnType<typeof diffBadges>;
  topDeltaKeys: Set<string>;
  deltaRef: React.RefObject<HTMLDivElement>;
}) {
  const groupMeta: { key: AttrGroupKey; label: string }[] = [
    { key: "finishing", label: "Finishing" },
    { key: "shooting", label: "Shooting" },
    { key: "playmaking", label: "Playmaking" },
    { key: "defense", label: "Defense / Rebound" },
    { key: "athleticism", label: "Athleticism" },
    { key: "physicals", label: "Physicals" },
  ];

  // Empty state if either side is missing a position/archetype (always populated here,
  // but we still surface a friendly notice if for some reason A or B has zero attrs).
  const aEmpty = !buildA?.archetypeId;
  const bEmpty = !buildB?.archetypeId;

  return (
    <div className="space-y-6">
      {/* editors side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {aEmpty ? (
            <Card>
              <div className="text-sm text-muted">Set a build.</div>
            </Card>
          ) : (
            <BuildEditor
              build={buildA}
              onChange={updateA}
              saved={saved}
              onLoadSaved={(b) => onLoadInto("A", b)}
              label="Build A"
              compact
            />
          )}
        </div>
        <div className="space-y-3">
          {bEmpty ? (
            <Card>
              <div className="text-sm text-muted">Set a build.</div>
            </Card>
          ) : (
            <BuildEditor
              build={buildB}
              onChange={updateB}
              saved={saved}
              onLoadSaved={(b) => onLoadInto("B", b)}
              label="Build B"
              compact
            />
          )}
        </div>
      </div>

      {/* summary row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CompareSummary
          letter="A"
          build={buildA}
          attrs={attrsA}
          cost={costA}
          compare={compareA}
        />
        <CompareSummary
          letter="B"
          build={buildB}
          attrs={attrsB}
          cost={costB}
          compare={compareB}
        />
      </div>

      {/* VC delta headline */}
      <Card className="p-4">
        <div className="grid grid-cols-3 items-end gap-2">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted">
              VC A
            </div>
            <div
              className={`font-mono text-2xl font-semibold leading-none ${vcColorClass(
                costA,
              )}`}
            >
              {costA.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted">
              Δ VC
            </div>
            <div
              className={`font-mono text-3xl font-semibold leading-none ${deltaColor(
                vcDelta,
              )}`}
            >
              {deltaSign(vcDelta)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted">
              VC B
            </div>
            <div
              className={`font-mono text-2xl font-semibold leading-none ${vcColorClass(
                costB,
              )}`}
            >
              {costB.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="mt-2 font-mono text-[10px] text-muted">
          A {codeA} · B {codeB}
        </div>
      </Card>

      {/* Delta panel */}
      <div ref={deltaRef}>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display text-2xl tracking-wide text-ink">
            Δ Attributes
          </div>
          <div className="font-mono text-[11px] text-muted">
            A − B · {topDeltaKeys.size > 0 ? `top ${topDeltaKeys.size}` : "live"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groupMeta.map((g) => {
            const rows = attrDiff[g.key];
            const groupAvgDelta = Math.round(
              rows.reduce((acc, r) => acc + r.delta, 0) / rows.length,
            );
            return (
              <Card key={g.key} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-display text-lg tracking-wide text-ink">
                    {g.label}
                  </div>
                  <div
                    className={`font-mono text-[11px] ${deltaColor(
                      groupAvgDelta,
                    )}`}
                  >
                    Δ avg {deltaSign(groupAvgDelta)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {rows.map((r) => (
                    <DeltaRow
                      key={r.key}
                      row={r}
                      highlight={topDeltaKeys.has(r.key)}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* badge overlap */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-display text-2xl tracking-wide text-ink">
            Badge Overlap
          </div>
          <div className="font-mono text-[11px] text-muted">
            {badgeOverlap.shared.length} shared ·{" "}
            {badgeOverlap.onlyA.length} A-only · {badgeOverlap.onlyB.length}{" "}
            B-only
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <BadgeColumn
            title="Shared"
            tone="gold"
            badges={badgeOverlap.shared}
            emptyLabel="No overlap"
          />
          <BadgeColumn
            title="Only A"
            tone="flame"
            badges={badgeOverlap.onlyA}
            emptyLabel="None"
          />
          <BadgeColumn
            title="Only B"
            tone="ice"
            badges={badgeOverlap.onlyB}
            emptyLabel="None"
          />
        </div>
      </div>

      {/* plays-like side by side */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            A plays like
          </div>
          <div className="mt-1 font-display text-2xl tracking-wide text-ink leading-tight md:text-3xl">
            {compareA}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            B plays like
          </div>
          <div className="mt-1 font-display text-2xl tracking-wide text-ink leading-tight md:text-3xl">
            {compareB}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DeltaRow({ row, highlight }: { row: SubDelta; highlight: boolean }) {
  const sign = row.delta > 0 ? "▲" : row.delta < 0 ? "▼" : "·";
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px]">
      <div className="truncate text-muted">{row.label}</div>
      <div className="flex items-center gap-2 font-mono">
        <span
          className={`num w-7 text-right ${
            row.a >= 90
              ? "text-gold"
              : row.a >= 80
                ? "text-ink"
                : "text-muted"
          }`}
        >
          {row.a}
        </span>
        <span
          className={`num w-12 text-center text-[10px] font-semibold ${deltaColor(
            row.delta,
          )}`}
        >
          {deltaSign(row.delta)}
        </span>
        <span
          className={`num w-7 text-right ${
            row.b >= 90
              ? "text-gold"
              : row.b >= 80
                ? "text-ink"
                : "text-muted"
          }`}
        >
          {row.b}
        </span>
        {highlight && (
          <span
            className={`rounded border border-line bg-bg/40 px-1 py-0.5 text-[9px] font-semibold ${deltaColor(
              row.delta,
            )}`}
          >
            {sign} {deltaSign(row.delta)}
          </span>
        )}
      </div>
    </div>
  );
}

function BadgeColumn({
  title,
  tone,
  badges,
  emptyLabel,
}: {
  title: string;
  tone: "gold" | "flame" | "ice";
  badges: BadgeRec[];
  emptyLabel: string;
}) {
  const toneText =
    tone === "gold" ? "text-gold" : tone === "flame" ? "text-flame" : "text-ice";
  return (
    <Card className="p-3">
      <div
        className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${toneText}`}
      >
        {title} · {badges.length}
      </div>
      {badges.length === 0 ? (
        <div className="font-mono text-[11px] text-muted">{emptyLabel}</div>
      ) : (
        <div className="space-y-1.5">
          {badges.map((b) => (
            <div key={b.name} className="flex items-center gap-2">
              <TierBadge tier={b.tier} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm tracking-wide text-ink">
                  {b.name}
                </div>
                <div className="truncate font-mono text-[10px] text-muted">
                  {b.category}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
