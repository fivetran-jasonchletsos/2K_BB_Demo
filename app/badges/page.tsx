"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BADGES,
  BADGE_CATEGORIES,
  PATCH_NOTES,
  parseTierList,
  serializeTierList,
  tierCounts,
  type Badge,
  type BadgeCategory,
  type BadgeTier,
} from "@/lib/badges";
import { ARCHETYPES } from "@/lib/builds";
import { Card, Pill, Stat, TierBadge } from "@/components/ui";

const TIERS: BadgeTier[] = ["S", "A", "B", "C", "D"];
const TIER_ORDER: Record<BadgeTier, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
const CATEGORY_OPTIONS: ("All" | BadgeCategory)[] = ["All", ...BADGE_CATEGORIES];

// Pre-index which Build Lab archetypes feature each badge name.
// Top 3 by tier (S → A → B → ...) so links surface the strongest fit first.
const BADGE_ARCHE_INDEX: Record<string, { id: string; name: string }[]> = (() => {
  const rank: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
  const acc: Record<string, { id: string; name: string; tier: string }[]> = {};
  for (const a of ARCHETYPES) {
    for (const b of a.badges) {
      const arr = acc[b.name] ?? (acc[b.name] = []);
      arr.push({ id: a.id, name: a.name, tier: b.tier });
    }
  }
  const out: Record<string, { id: string; name: string }[]> = {};
  for (const [name, list] of Object.entries(acc)) {
    list.sort((x, y) => rank[x.tier] - rank[y.tier]);
    out[name] = list.slice(0, 3).map((x) => ({ id: x.id, name: x.name }));
  }
  return out;
})();

type SortKey = "tier" | "name" | "patch" | "personal";
type ViewMode = "official" | "personal";
type ShareMode = "diff" | "full";

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

// Split a patch change string into buff vs nerf based on first signed % token.
function classifyChange(change: string): "buff" | "nerf" | "neutral" {
  const m = change.match(/([+-])\d+%/);
  if (!m) return "neutral";
  return m[1] === "+" ? "buff" : "nerf";
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [buffedOnly, setBuffedOnly] = useState<boolean>(false);

  const latestPatch = PATCH_NOTES[0]?.patch ?? "";

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>("diff");
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

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

  // ── Derived ────────────────────────────────────────────────────────────
  const effectiveTier = (b: Badge): BadgeTier =>
    view === "personal" ? personalTiers[b.id] ?? b.tier : b.tier;

  const overrideCount = useMemo(
    () =>
      BADGES.reduce(
        (n, b) =>
          personalTiers[b.id] && personalTiers[b.id] !== b.tier ? n + 1 : n,
        0
      ),
    [personalTiers]
  );

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
    if (buffedOnly) {
      list = list.filter((b) => {
        const latest = b.patchHistory[0];
        return latest && latest.delta > 0;
      });
    }

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
  }, [category, query, tierFilter, sort, view, personalTiers, buffedOnly]);

  const counts = useMemo(() => {
    const list = BADGES.map((b) => ({ ...b, tier: effectiveTier(b) }));
    return tierCounts(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, personalTiers]);

  const compareBadges = compareIds
    .map((id) => BADGES.find((b) => b.id === id))
    .filter((b): b is Badge => Boolean(b));

  const shareText = useMemo(
    () => serializeTierList(personalTiers, shareMode),
    [personalTiers, shareMode]
  );

  const canShare = view === "personal" && overrideCount > 0;

  // ── Handlers ────────────────────────────────────────────────────────────
  const toggleTier = (t: BadgeTier) => {
    setTierFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      if (next.size === 0) return new Set(TIERS);
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

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyMsg("Copied");
    } catch {
      setCopyMsg("Copy failed");
    }
    setTimeout(() => setCopyMsg(null), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([shareText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "2klab-tier-list.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const parsed = parseTierList(importText);
    const keys = Object.keys(parsed);
    if (keys.length === 0) {
      setImportMsg("No matching badges found.");
      return;
    }
    setPersonalTiers((prev) => ({ ...prev, ...parsed }));
    setImportMsg(`Applied ${keys.length} badge${keys.length === 1 ? "" : "s"}.`);
    setImportText("");
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const recent = PATCH_NOTES[0];
  const older = PATCH_NOTES.slice(1);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-32 pt-6 md:px-6 md:pt-10">
      {/* Title + share button */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
            Badges
          </h1>
          <p className="mt-2 text-sm text-muted">
            {BADGES.length} badges · NBA 2K26 patch 1.7
          </p>
        </div>
        {canShare && (
          <button
            onClick={() => {
              setShareOpen(true);
              setImportMsg(null);
            }}
            className="inline-flex items-center gap-2 rounded-md border border-flame bg-flame/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-flame transition hover:bg-flame hover:text-black"
          >
            <span aria-hidden className="font-mono">↗</span>
            Share my tier list
          </button>
        )}
      </header>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-5 gap-2 md:gap-3">
        <Stat label="S Tier" value={counts.S} tone="gold" />
        <Stat label="A Tier" value={counts.A} tone="flame" />
        <Stat label="B Tier" value={counts.B} tone="ice" />
        <Stat label="C Tier" value={counts.C} tone="lime" />
        <Stat label="D Tier" value={counts.D} />
      </div>

      {/* Patch notes — recent expanded, older collapsed */}
      <section className="mb-6 rounded-xl border border-line bg-surface">
        <div className="border-b border-line p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl tracking-wide text-ink">
                  Patch {recent.patch}
                </span>
                <span className="font-mono text-xs text-muted">{recent.date}</span>
              </div>
              <p className="mt-1 text-sm text-ink">{recent.summary}</p>
            </div>
            <Pill tone="flame">Latest</Pill>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-lime">
                Buffs
              </div>
              <ul className="space-y-0.5 text-[12px] text-ink">
                {recent.changes
                  .filter((c) => classifyChange(c) === "buff")
                  .map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-lime">+</span>
                      <span>{c}</span>
                    </li>
                  ))}
                {recent.changes.filter((c) => classifyChange(c) === "buff").length ===
                  0 && <li className="text-muted">None this patch.</li>}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-flame">
                Nerfs
              </div>
              <ul className="space-y-0.5 text-[12px] text-ink">
                {recent.changes
                  .filter((c) => classifyChange(c) === "nerf")
                  .map((c) => (
                    <li key={c} className="flex gap-2">
                      <span className="text-flame">−</span>
                      <span>{c}</span>
                    </li>
                  ))}
                {recent.changes.filter((c) => classifyChange(c) === "nerf").length ===
                  0 && <li className="text-muted">None this patch.</li>}
              </ul>
            </div>
          </div>
        </div>

        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink">
            <span>Older patches ({older.length})</span>
            <span className="font-mono transition group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-line p-4">
            <ol className="space-y-4">
              {older.map((p) => (
                <li key={p.patch} className="border-l-2 border-line pl-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl tracking-wide text-ink">
                      Patch {p.patch}
                    </span>
                    <span className="font-mono text-xs text-muted">{p.date}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink">{p.summary}</p>
                  <ul className="mt-2 space-y-0.5 text-[12px] text-muted">
                    {p.changes.map((c) => {
                      const k = classifyChange(c);
                      return (
                        <li key={c} className="flex gap-2">
                          <span
                            className={
                              k === "buff"
                                ? "text-lime"
                                : k === "nerf"
                                  ? "text-flame"
                                  : "text-muted"
                            }
                          >
                            {k === "buff" ? "+" : k === "nerf" ? "−" : "·"}
                          </span>
                          <span>{c}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </details>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-[57px] z-40 -mx-4 mb-6 border-b border-line/60 bg-bg/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-bg/70 md:-mx-6 md:px-6">
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
          <div className="flex flex-wrap items-center gap-1.5">
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
            {latestPatch && (
              <button
                type="button"
                onClick={() => setBuffedOnly((v) => !v)}
                aria-pressed={buffedOnly}
                className={`h-8 rounded-md border px-2.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                  buffedOnly
                    ? "border-lime bg-lime/15 text-lime"
                    : "border-lime/40 bg-lime/5 text-lime/70 hover:text-lime"
                }`}
                title={`Show only badges buffed in patch ${latestPatch}`}
              >
                Buffed {latestPatch}
              </button>
            )}
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

      {/* Badge grid — collapsed by default */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => {
          const t = effectiveTier(b);
          const isCompared = compareIds.includes(b.id);
          const isCustom =
            view === "personal" && personalTiers[b.id] && personalTiers[b.id] !== b.tier;
          const isOpen = expanded.has(b.id);

          const tierBorderClass = {
            S: "border-l-tierS",
            A: "border-l-tierA",
            B: "border-l-tierB",
            C: "border-l-tierC",
            D: "border-l-tierD",
          }[t];

          const usedBy = BADGE_ARCHE_INDEX[b.name] ?? [];

          return (
            <Card
              key={b.id}
              id={b.id}
              className={`relative flex flex-col gap-3 border-0 border-l-2 ${tierBorderClass} transition ${
                isCompared ? "ring-1 ring-ice" : ""
              }`}
            >
              {/* Header row — always visible. Tap area to expand excludes tier arrows. */}
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(b.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 text-left"
                >
                  <h3 className="font-display text-2xl leading-tight tracking-wide text-ink">
                    {b.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Pill tone="muted">{b.category}</Pill>
                    {isCustom && <Pill tone="flame">moved</Pill>}
                    <span className="font-mono text-[11px] font-semibold text-flame">
                      {b.effectMagnitude}%
                    </span>
                  </div>
                </button>

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

              {/* Effect summary — always visible, tap to expand */}
              <button
                type="button"
                onClick={() => toggleExpanded(b.id)}
                aria-expanded={isOpen}
                className="-mt-1 text-left text-sm text-ink"
              >
                {b.effect}{" "}
                <span className="font-mono font-semibold text-flame">
                  {b.effectMagnitude}%
                </span>
                <span className="ml-1 font-mono text-[11px] text-muted">
                  {isOpen ? "[−]" : "[+]"}
                </span>
              </button>

              {isOpen && (
                <>
                  <dl className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <dt className="font-semibold uppercase tracking-wider text-muted">
                        Requires
                      </dt>
                      <dd className="mt-0.5 text-ink">{b.requirements}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wider text-muted">
                        Unlock
                      </dt>
                      <dd className="mt-0.5 font-mono text-ink">{b.unlockTime}</dd>
                    </div>
                  </dl>

                  {b.synergyWith.length > 0 && (
                    <div className="text-[11px]">
                      <div className="font-semibold uppercase tracking-wider text-muted">
                        Synergy
                      </div>
                      <div className="mt-0.5 text-ink">
                        {b.synergyWith
                          .map((id) => BADGES.find((x) => x.id === id)?.name)
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  )}

                  {usedBy.length > 0 && (
                    <div className="text-[11px]">
                      <div className="font-semibold uppercase tracking-wider text-muted">
                        Used by
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {usedBy.map((a, i) => (
                          <span key={a.id} className="text-muted">
                            <Link
                              href={`/builds?arche=${a.id}`}
                              className="text-ink hover:text-flame hover:underline"
                            >
                              {a.name}
                            </Link>
                            {i < usedBy.length - 1 ? " · " : ""}
                          </span>
                        ))}
                        <Link
                          href="/builds"
                          className="text-muted hover:text-ink"
                        >
                          all builds →
                        </Link>
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
                </>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            No badges match these filters. Try clearing search or re-enabling tier chips.
          </div>
        )}
      </div>

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
                  <div key={slot} className="p-4 text-center text-xs text-muted">
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

      {/* Share modal */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-xl border border-line bg-surface md:rounded-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <div className="font-display text-xl tracking-wide text-ink">
                  My tier list
                </div>
                <div className="text-[11px] text-muted">
                  {overrideCount} override{overrideCount === 1 ? "" : "s"}
                </div>
              </div>
              <button
                onClick={() => setShareOpen(false)}
                className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 p-4">
              {/* Mode toggle */}
              <div className="flex overflow-hidden rounded-md border border-line text-xs">
                <button
                  onClick={() => setShareMode("diff")}
                  className={`flex-1 px-3 py-2 font-semibold uppercase tracking-wider transition ${
                    shareMode === "diff"
                      ? "bg-flame text-black"
                      : "bg-surface2 text-muted"
                  }`}
                >
                  Differences only
                </button>
                <button
                  onClick={() => setShareMode("full")}
                  className={`flex-1 px-3 py-2 font-semibold uppercase tracking-wider transition ${
                    shareMode === "full"
                      ? "bg-flame text-black"
                      : "bg-surface2 text-muted"
                  }`}
                >
                  Full list
                </button>
              </div>

              {/* Text preview */}
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-bg p-3 font-mono text-[12px] leading-relaxed text-ink">
                {shareText}
              </pre>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 rounded-md border border-flame bg-flame px-3 py-2 text-xs font-semibold uppercase tracking-wider text-black transition hover:bg-flame/90"
                >
                  {copyMsg ?? "Copy"}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 rounded-md border border-line bg-surface2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink hover:border-ice"
                >
                  Download .txt
                </button>
              </div>

              {/* Import */}
              <div className="border-t border-line pt-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Apply tier list
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setImportMsg(null);
                  }}
                  rows={4}
                  placeholder={"S: Clamps, Deadeye\nA: Dimer, Challenger"}
                  className="w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12px] text-ink placeholder:text-muted focus:border-ice focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted">
                    {importMsg ?? "Unknown badge names are skipped."}
                  </span>
                  <button
                    onClick={handleImport}
                    disabled={!importText.trim()}
                    className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition hover:border-ice disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
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
