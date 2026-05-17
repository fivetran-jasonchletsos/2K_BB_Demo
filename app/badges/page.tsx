"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BADGES,
  BADGE_CATEGORIES,
  PATCH_NOTES,
  tierCounts,
  type Badge,
  type BadgeCategory,
  type BadgeTier,
} from "@/lib/badges";
import { Card, Pill, Stat, TierBadge } from "@/components/ui";

const TIERS: BadgeTier[] = ["S", "A", "B", "C", "D"];
const TIER_ORDER: Record<BadgeTier, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
const CATEGORY_OPTIONS: ("All" | BadgeCategory)[] = ["All", ...BADGE_CATEGORIES];

type SortKey = "tier" | "name" | "patch" | "personal";
type ViewMode = "official" | "personal";

const LS_KEY = "2klab.badgeTiers";

function latestDelta(b: Badge): number {
  return b.patchHistory.length ? b.patchHistory[0].delta : 0;
}

function tierPillTone(t: BadgeTier): "gold" | "flame" | "ice" | "lime" | "muted" {
  return ({ S: "gold", A: "flame", B: "ice", C: "lime", D: "muted" } as const)[t];
}

function shiftTier(current: BadgeTier, dir: -1 | 1): BadgeTier {
  const i = Math.max(0, Math.min(TIERS.length - 1, TIER_ORDER[current] + dir));
  return TIERS[i];
}

export default function BadgesPage() {
  // ── State ────────────────────────────────────────────────────────────────
  const [category, setCategory] = useState<"All" | BadgeCategory>("All");
  const [tierFilter, setTierFilter] = useState<Set<BadgeTier>>(new Set(TIERS));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("tier");
  const [view, setView] = useState<ViewMode>("official");
  const [personalTiers, setPersonalTiers] = useState<Record<string, BadgeTier>>({});
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  // ── Persistence ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setPersonalTiers(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(personalTiers));
    } catch {}
  }, [personalTiers]);

  // ── Derived list ────────────────────────────────────────────────────────
  const effectiveTier = (b: Badge): BadgeTier =>
    view === "personal" ? personalTiers[b.id] ?? b.tier : b.tier;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = BADGES.slice();

    if (category !== "All") list = list.filter((b) => b.category === category);
    if (q) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.effect.toLowerCase().includes(q) ||
          b.requirements.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)
      );
    }
    list = list.filter((b) => tierFilter.has(effectiveTier(b)));

    switch (sort) {
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "patch":
        list.sort((a, b) => latestDelta(b) - latestDelta(a));
        break;
      case "personal":
        list.sort(
          (a, b) =>
            TIER_ORDER[personalTiers[a.id] ?? a.tier] -
              TIER_ORDER[personalTiers[b.id] ?? b.tier] ||
            a.name.localeCompare(b.name)
        );
        break;
      case "tier":
      default:
        list.sort(
          (a, b) =>
            TIER_ORDER[effectiveTier(a)] - TIER_ORDER[effectiveTier(b)] ||
            a.name.localeCompare(b.name)
        );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, tierFilter, sort, view, personalTiers]);

  const counts = useMemo(() => {
    const list = BADGES.map((b) => ({ ...b, tier: effectiveTier(b) }));
    return tierCounts(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, personalTiers]);

  const compareBadges = compareIds
    .map((id) => BADGES.find((b) => b.id === id))
    .filter((b): b is Badge => Boolean(b));

  // ── Handlers ────────────────────────────────────────────────────────────
  const toggleTier = (t: BadgeTier) => {
    setTierFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      if (next.size === 0) return new Set(TIERS); // never empty
      return next;
    });
  };

  const bumpPersonal = (b: Badge, dir: -1 | 1) => {
    const current = personalTiers[b.id] ?? b.tier;
    const next = shiftTier(current, dir);
    if (next === b.tier) {
      setPersonalTiers((prev) => {
        const { [b.id]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setPersonalTiers((prev) => ({ ...prev, [b.id]: next }));
    }
  };

  const resetPersonal = () => setPersonalTiers({});

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-7xl px-4 pb-32 pt-6 md:px-6 md:pt-10">
      {/* Title */}
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
          Badges
        </h1>
        <p className="mt-2 text-sm text-muted">
          {BADGES.length} badges · NBA 2K26 patch 1.7
        </p>
      </header>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_OPTIONS.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                  active
                    ? "border-flame bg-flame text-black"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Tier chips + search + sort + view */}
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="flex gap-1.5">
            {TIERS.map((t) => {
              const active = tierFilter.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTier(t)}
                  aria-pressed={active}
                  className={`h-8 w-8 rounded-md border font-display text-base transition ${
                    active
                      ? "border-flame bg-flame text-black"
                      : "border-line bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or effect"
            className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ice focus:outline-none"
          />

          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-line bg-surface px-2 py-2 text-xs font-semibold uppercase tracking-wider text-ink focus:border-ice focus:outline-none"
            >
              <option value="tier">Sort: Tier</option>
              <option value="name">Sort: Name</option>
              <option value="patch">Sort: Patch delta</option>
              <option value="personal">Sort: Personal</option>
            </select>

            <div className="flex overflow-hidden rounded-md border border-line">
              <button
                onClick={() => setView("official")}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  view === "official" ? "bg-flame text-black" : "bg-surface text-muted"
                }`}
              >
                Official
              </button>
              <button
                onClick={() => setView("personal")}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  view === "personal" ? "bg-flame text-black" : "bg-surface text-muted"
                }`}
              >
                My tier list
              </button>
            </div>
          </div>
        </div>

        {view === "personal" && (
          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted">
            <span>
              Tap{" "}
              <span className="font-mono text-ink">▲</span> /{" "}
              <span className="font-mono text-ink">▼</span> on a card to move a badge between tiers.
              Saved locally.
            </span>
            <button
              onClick={resetPersonal}
              className="rounded-md border border-line bg-surface2 px-2 py-1 font-semibold uppercase tracking-wider text-muted hover:text-ink"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-5 gap-2 md:gap-3">
        <Stat label="S Tier" value={counts.S} tone="gold" />
        <Stat label="A Tier" value={counts.A} tone="flame" />
        <Stat label="B Tier" value={counts.B} tone="ice" />
        <Stat label="C Tier" value={counts.C} tone="lime" />
        <Stat label="D Tier" value={counts.D} />
      </div>

      {/* Result count */}
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span>
          <span className="font-mono text-ink">{filtered.length}</span> /{" "}
          <span className="font-mono">{BADGES.length}</span> badges
        </span>
        {compareBadges.length > 0 && (
          <button
            onClick={() => setCompareIds([])}
            className="rounded-md border border-line bg-surface px-2 py-1 font-semibold uppercase tracking-wider text-muted hover:text-ink"
          >
            Clear compare ({compareBadges.length})
          </button>
        )}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => {
          const t = effectiveTier(b);
          const delta = latestDelta(b);
          const isCompared = compareIds.includes(b.id);
          const isCustom =
            view === "personal" && personalTiers[b.id] && personalTiers[b.id] !== b.tier;

          return (
            <Card
              key={b.id}
              className={`relative flex flex-col gap-3 transition ${
                isCompared ? "ring-1 ring-ice" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-2xl leading-tight tracking-wide text-ink">
                    {b.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Pill tone="muted">{b.category}</Pill>
                    {isCustom && <Pill tone="flame">moved</Pill>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <TierBadge tier={t} />
                  {view === "personal" && (
                    <div className="flex flex-col overflow-hidden rounded-md border border-line">
                      <button
                        onClick={() => bumpPersonal(b, -1)}
                        disabled={TIER_ORDER[t] === 0}
                        aria-label="Move up a tier"
                        className="px-2 py-0.5 text-xs text-muted hover:bg-surface2 hover:text-ink disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => bumpPersonal(b, 1)}
                        disabled={TIER_ORDER[t] === TIERS.length - 1}
                        aria-label="Move down a tier"
                        className="border-t border-line px-2 py-0.5 text-xs text-muted hover:bg-surface2 hover:text-ink disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-ink">
                {b.effect}{" "}
                <span className="font-mono font-semibold text-flame">{b.effectMagnitude}%</span>
              </p>

              <dl className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-muted">Requires</dt>
                  <dd className="mt-0.5 text-ink">{b.requirements}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-muted">Unlock</dt>
                  <dd className="mt-0.5 font-mono text-ink">{b.unlockTime}</dd>
                </div>
              </dl>

              {b.synergyWith.length > 0 && (
                <div className="text-[11px]">
                  <div className="font-semibold uppercase tracking-wider text-muted">Synergy</div>
                  <div className="mt-0.5 text-ink">
                    {b.synergyWith
                      .map((id) => BADGES.find((x) => x.id === id)?.name)
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
                  {b.patchHistory.slice(0, 3).map((p) => (
                    <span key={p.patch} className="text-muted">
                      {p.patch}:{" "}
                      <span
                        className={
                          p.delta > 0
                            ? "text-lime"
                            : p.delta < 0
                              ? "text-flame"
                              : "text-ink"
                        }
                      >
                        {p.delta > 0 ? `+${p.delta}` : p.delta === 0 ? "—" : p.delta}
                        {p.delta !== 0 && "%"}
                      </span>
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => toggleCompare(b.id)}
                  className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                    isCompared
                      ? "border-ice bg-ice/10 text-ice"
                      : "border-line bg-surface2 text-muted hover:text-ink"
                  }`}
                >
                  {isCompared ? "Selected" : "Compare"}
                </button>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            No badges match these filters. Try clearing search or re-enabling tier chips.
          </div>
        )}
      </div>

      {/* Patch notes timeline */}
      <section className="mt-10 rounded-xl border border-line bg-surface">
        <button
          onClick={() => setShowPatchNotes((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div>
            <div className="font-display text-2xl tracking-wide text-ink">Patch notes</div>
            <div className="text-xs text-muted">{PATCH_NOTES.length} recent patches</div>
          </div>
          <span className="font-mono text-muted">{showPatchNotes ? "−" : "+"}</span>
        </button>
        {showPatchNotes && (
          <div className="border-t border-line p-4">
            <ol className="space-y-4">
              {PATCH_NOTES.map((p) => (
                <li key={p.patch} className="border-l-2 border-flame pl-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl tracking-wide text-ink">
                      Patch {p.patch}
                    </span>
                    <span className="font-mono text-xs text-muted">{p.date}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink">{p.summary}</p>
                  <ul className="mt-2 space-y-0.5 text-[12px] text-muted">
                    {p.changes.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span className="text-flame">·</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <p className="mt-8 text-center text-[11px] text-muted">
        Tiers reflect community consensus on 2K26 patch 1.7. Re-check after each patch.
      </p>

      {/* Compare drawer */}
      {compareBadges.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up border-t border-line bg-surface/95 backdrop-blur md:inset-x-auto md:bottom-4 md:right-4 md:max-w-md md:rounded-xl md:border">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <div className="font-display text-lg tracking-wide text-ink">Compare</div>
            <button
              onClick={() => setCompareIds([])}
              className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-line">
            {[0, 1].map((slot) => {
              const b = compareBadges[slot];
              if (!b) {
                return (
                  <div
                    key={slot}
                    className="p-4 text-center text-xs text-muted"
                  >
                    Pick another badge to compare
                  </div>
                );
              }
              const sum = b.patchHistory.reduce((acc, p) => acc + p.delta, 0);
              return (
                <div key={slot} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-lg leading-tight tracking-wide text-ink">
                      {b.name}
                    </div>
                    <TierBadge tier={b.tier} />
                  </div>
                  <Pill tone={tierPillTone(b.tier)} className="mt-1">
                    {b.category}
                  </Pill>
                  <div className="mt-2 space-y-1.5 text-[11px]">
                    <Row label="Effect" value={b.effect} />
                    <Row label="Magnitude" value={`${b.effectMagnitude}%`} mono />
                    <Row label="Unlock" value={b.unlockTime} mono />
                    <Row
                      label="Patch trajectory"
                      value={`${sum > 0 ? "+" : ""}${sum}%`}
                      mono
                      tone={sum > 0 ? "lime" : sum < 0 ? "flame" : "muted"}
                    />
                    <Row
                      label="Latest"
                      value={`${b.patchHistory[0].patch}: ${
                        b.patchHistory[0].delta > 0 ? "+" : ""
                      }${b.patchHistory[0].delta}%`}
                      mono
                      tone={
                        b.patchHistory[0].delta > 0
                          ? "lime"
                          : b.patchHistory[0].delta < 0
                            ? "flame"
                            : "muted"
                      }
                    />
                  </div>
                  <button
                    onClick={() => toggleCompare(b.id)}
                    className="mt-2 w-full rounded-md border border-line bg-surface2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  mono,
  tone = "ink",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ink" | "flame" | "lime" | "muted" | "ice";
}) {
  const toneClass = {
    ink: "text-ink",
    flame: "text-flame",
    lime: "text-lime",
    muted: "text-muted",
    ice: "text-ice",
  }[tone];
  return (
    <div>
      <div className="font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`${mono ? "font-mono" : ""} ${toneClass}`}>{value}</div>
    </div>
  );
}
