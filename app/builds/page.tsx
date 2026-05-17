"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, Card, Pill, TierBadge } from "@/components/ui";
import {
  ARCHETYPES,
  Build,
  HEIGHT_MAX,
  HEIGHT_MIN,
  POSITIONS,
  Position,
  WEIGHT_MAX,
  WEIGHT_MIN,
  WINGSPAN_MAX,
  WINGSPAN_MIN,
  comparablePlayer,
  computeAttributes,
  decodeBuild,
  defaultBuild,
  encodeBuild,
  formatHeight,
  formatWingspan,
  getArchetype,
  loadSavedBuilds,
  recommendedBadges,
  saveBuilds,
  strengthsWeaknesses,
  vcCost,
} from "@/lib/builds";

// ---------- small controls ----------

function PositionPills({
  value,
  onChange,
}: {
  value: Position;
  onChange: (p: Position) => void;
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
            className={`h-12 min-h-[44px] rounded-lg border font-display text-2xl tracking-wider transition-colors ${
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
}: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            {label}
          </div>
          {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
        </div>
        <div className="font-display text-3xl text-ink num leading-none">
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
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const a = getArchetype(id);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[112px] rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-flame bg-flame/10 shadow-glow"
          : "border-line bg-surface hover:bg-surface2"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-md font-display text-2xl ${
            selected ? "bg-flame text-black" : "bg-surface2 text-ink"
          }`}
          aria-hidden
        >
          {a.icon}
        </div>
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
      </div>
      <div className="mt-2 font-display text-lg leading-tight tracking-wide text-ink">
        {a.name}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{a.tagline}</div>
    </button>
  );
}

// ---------- main page ----------

export default function BuildLabPage() {
  const [build, setBuild] = useState<Build>(() => defaultBuild());
  const [saved, setSaved] = useState<Build[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [shareInput, setShareInput] = useState("");
  const toastTimer = useRef<number | null>(null);

  // Load saved builds on mount
  useEffect(() => {
    setSaved(loadSavedBuilds());
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const attrs = useMemo(() => computeAttributes(build), [build]);
  const cost = useMemo(() => vcCost(attrs), [attrs]);
  const arche = useMemo(() => getArchetype(build.archetypeId), [build.archetypeId]);
  const badges = useMemo(() => recommendedBadges(arche, build), [arche, build]);
  const compare = useMemo(() => comparablePlayer(build), [build]);
  const sw = useMemo(() => strengthsWeaknesses(attrs), [attrs]);
  const code = useMemo(() => encodeBuild(build), [build]);

  const update = (patch: Partial<Build>) =>
    setBuild((b) => ({ ...b, ...patch, updatedAt: Date.now() }));

  const handleSave = () => {
    const name = `${build.position} ${formatHeight(build.heightIn)} ${arche.name}`;
    const next: Build = { ...build, name, updatedAt: Date.now() };
    const list = [next, ...saved.filter((s) => s.id !== build.id)].slice(0, 12);
    setSaved(list);
    saveBuilds(list);
    showToast(`Saved · ${name}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Copied · ${code}`);
    } catch {
      showToast(code);
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

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pt-10">
      {/* header */}
      <header className="mb-4">
        <h1 className="font-display text-5xl tracking-wider text-ink md:text-6xl">
          Build Lab
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Pick a position, set body, choose archetype. Caps, badges and VC cost
          recompute live.
        </p>
      </header>

      {/* sticky summary bar */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-flame font-display text-2xl text-black">
              {build.position}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-xl tracking-wide text-ink leading-none">
                {arche.name}
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted">
                {formatHeight(build.heightIn)} · {build.weightLb} lb · wingspan{" "}
                {formatWingspan(build.wingspanDelta)}
              </div>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end pr-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              VC Cost
            </div>
            <div className="font-display text-2xl text-gold num leading-none">
              {cost.toLocaleString()}
            </div>
          </div>
          <div className="flex w-full gap-2 md:w-auto">
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
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-xs text-ink shadow-card animate-fade-in">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT: controls */}
        <div className="space-y-4 lg:col-span-5">
          {/* Position */}
          <Card>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              Position
            </div>
            <PositionPills
              value={build.position}
              onChange={(p) => update({ position: p })}
            />
          </Card>

          {/* Body sliders */}
          <SliderRow
            label="Height"
            display={formatHeight(build.heightIn)}
            min={HEIGHT_MIN}
            max={HEIGHT_MAX}
            step={1}
            value={build.heightIn}
            onChange={(n) => update({ heightIn: n })}
            hint="Taller = slower, longer = more interior"
          />
          <SliderRow
            label="Weight"
            display={`${build.weightLb} lb`}
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            step={5}
            value={build.weightLb}
            onChange={(n) => update({ weightLb: n })}
            hint="Heavier = stronger, less vertical"
          />
          <SliderRow
            label="Wingspan"
            display={formatWingspan(build.wingspanDelta)}
            min={WINGSPAN_MIN}
            max={WINGSPAN_MAX}
            step={1}
            value={build.wingspanDelta}
            onChange={(n) => update({ wingspanDelta: n })}
            hint="Relative to height. Long arms hurt shooting touch."
          />

          {/* Archetype */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <div className="font-display text-2xl tracking-wide text-ink">
                Archetype
              </div>
              <div className="font-mono text-[11px] text-muted">
                {ARCHETYPES.length} total
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ARCHETYPES.map((a) => (
                <ArchetypeCard
                  key={a.id}
                  id={a.id}
                  selected={build.archetypeId === a.id}
                  onSelect={() => update({ archetypeId: a.id })}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: outputs */}
        <div className="space-y-6 lg:col-span-7">
          {/* Strengths / weaknesses */}
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

          {/* VC + comparable */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                VC Cost
              </div>
              <div className="mt-1 font-display text-4xl text-gold num leading-none md:text-5xl">
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

          {/* Attribute bars */}
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

          {/* Badges */}
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
                    <div className="mt-0.5 text-[12px] text-muted">{b.effect}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Share code load */}
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

          {/* Saved builds drawer */}
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

      <p className="mt-10 text-center font-mono text-[11px] text-muted">
        Caps are modeled approximations of NBA 2K26 patch X — verify in MyCareer
        before committing VC.
      </p>
    </main>
  );
}
