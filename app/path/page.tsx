"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Pill } from "@/components/ui";
import {
  TIERS,
  TIER_ORDER,
  computeTier,
  estimateDaysToNext,
  getTier,
  isCriterionMet,
  loadSnapshot,
  saveCurrentTier,
  tierIndex,
  tierMetCount,
  type Criterion,
  type MasterySnapshot,
  type TierDef,
  type TierId,
  type TierResult,
} from "@/lib/path";

// ---------- Empty / pre-hydration snapshot ----------
const EMPTY_SNAPSHOT: MasterySnapshot = {
  siteVisited: false,
  savedBuilds: 0,
  scenariosPlayed: 0,
  scenariosOptimal: 0,
  scenariosOptimalPct: 0,
  scenariosBestStreak: 0,
  scenariosDailyStreak: 0,
  scenariosCategoriesTouched: 0,
  scenariosCategoriesTotal: 7,
  totalGreens: 0,
  shotBestStreak: 0,
  savedCombos: 0,
  favoriteMovesCount: 0,
  favoriteTipsCount: 0,
  redeemedCodesCount: 0,
  badgeOverridesCount: 0,
  watchlistCount: 0,
};

// ---------- Tier color helpers ----------

function tierMarkerStyle(tier: TierDef): React.CSSProperties {
  if (tier.gradient) {
    return { background: tier.gradient };
  }
  if (tier.isToken) {
    // Tailwind tokens — resolve via CSS variables would be ideal, but a hex
    // mirror is fine here.
    const tokenMap: Record<string, string> = {
      gold: "#FFD60A",
      ice: "#00E5FF",
      flame: "#FF3D00",
      lime: "#00E676",
    };
    return { background: tokenMap[tier.color] ?? tier.color };
  }
  return { background: tier.color };
}

function tierTextStyle(tier: TierDef): React.CSSProperties {
  if (tier.gradient) {
    return {
      backgroundImage: tier.gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    };
  }
  if (tier.isToken) {
    const tokenMap: Record<string, string> = {
      gold: "#FFD60A",
      ice: "#00E5FF",
      flame: "#FF3D00",
      lime: "#00E676",
    };
    return { color: tokenMap[tier.color] ?? tier.color };
  }
  return { color: tier.color };
}

// ---------- Skeleton ----------

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-10 w-40 rounded bg-surface2" />
      <div className="mb-2 h-4 w-72 rounded bg-surface2" />
      <Card className="mt-6">
        <div className="h-20 w-40 rounded bg-surface2" />
        <div className="mt-3 h-2 w-full rounded bg-surface2" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-2/3 rounded bg-surface2" />
          <div className="h-3 w-1/2 rounded bg-surface2" />
        </div>
      </Card>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <div className="h-6 w-28 rounded bg-surface2" />
            <div className="mt-3 h-3 w-3/4 rounded bg-surface2" />
            <div className="mt-2 h-3 w-1/2 rounded bg-surface2" />
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- Tier card ----------

function CriterionRow({
  criterion,
  snapshot,
}: {
  criterion: Criterion;
  snapshot: MasterySnapshot;
}) {
  const cur = criterion.currentValueFn(snapshot);
  const met = isCriterionMet(criterion, snapshot);
  const unit = criterion.unit ? ` ${criterion.unit}` : "";
  return (
    <li className="flex items-start justify-between gap-3 py-1.5">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
            met
              ? "border-lime/60 bg-lime/15 text-lime"
              : "border-line bg-surface2 text-muted"
          }`}
          aria-hidden
        >
          {met ? (
            <span className="text-[10px] leading-none">✓</span>
          ) : (
            <span className="text-[10px] leading-none">·</span>
          )}
        </span>
        <span className="text-sm text-ink">{criterion.label}</span>
      </div>
      <span
        className={`shrink-0 font-mono text-[11px] tabular-nums ${
          met ? "text-lime" : "text-muted"
        }`}
      >
        {cur}/{criterion.threshold}
        {unit}
      </span>
    </li>
  );
}

function TierCardItem({
  tier,
  snapshot,
  status,
  expanded,
  onToggle,
  estimate,
}: {
  tier: TierDef;
  snapshot: MasterySnapshot;
  status: "earned" | "current" | "locked";
  expanded: boolean;
  onToggle: () => void;
  estimate?: string | null;
}) {
  const { met, total } = tierMetCount(tier, snapshot);
  const pct = total > 0 ? Math.round((met / total) * 100) : 0;

  const statusPill = (() => {
    if (status === "earned") return <Pill tone="lime">Earned</Pill>;
    if (status === "current") return <Pill tone="flame">Current</Pill>;
    return <Pill tone="muted">Locked</Pill>;
  })();

  return (
    <Card className="relative overflow-hidden p-0">
      {/* Tier color marker (left bar) */}
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={tierMarkerStyle(tier)}
        aria-hidden
      />

      <button
        type="button"
        onClick={onToggle}
        className="block w-full pl-5 pr-4 py-4 text-left transition active:bg-surface2/50"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="font-display text-2xl leading-none tracking-wide md:text-3xl"
              style={tierTextStyle(tier)}
            >
              {tier.name}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">
              {met}/{total} criteria · {pct}%
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {statusPill}
            <span
              className={`text-muted transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
              aria-hidden
            >
              ›
            </span>
          </div>
        </div>

        {!expanded && (
          <div className="mt-2 text-[11px] text-muted">
            Reward: <span className="text-ink">{tier.reward}</span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-line pl-5 pr-4 py-3">
          <ul className="divide-y divide-line/60">
            {tier.criteria.map((cr) => (
              <CriterionRow key={cr.key} criterion={cr} snapshot={snapshot} />
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span>
              Reward: <span className="text-ink">{tier.reward}</span>
            </span>
            {status === "current" && estimate && (
              <>
                <span aria-hidden>·</span>
                <span className="text-ice">{estimate}</span>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- Page ----------

export default function PathPage() {
  const [hydrated, setHydrated] = useState(false);
  const [snapshot, setSnapshot] = useState<MasterySnapshot>(EMPTY_SNAPSHOT);
  const [expanded, setExpanded] = useState<Set<TierId>>(new Set());

  // Hydrate from localStorage
  useEffect(() => {
    const snap = loadSnapshot();
    setSnapshot(snap);
    setHydrated(true);
  }, []);

  const result: TierResult = useMemo(
    () => computeTier(snapshot),
    [snapshot],
  );

  const currentTier = useMemo(() => getTier(result.current), [result.current]);
  const currentIdx = tierIndex(result.current);

  // Persist current tier whenever it changes (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    saveCurrentTier(result.current);
  }, [hydrated, result.current]);

  // Auto-expand current tier on first hydration.
  useEffect(() => {
    if (!hydrated) return;
    setExpanded((prev) => {
      if (prev.has(result.current)) return prev;
      const next = new Set(prev);
      next.add(result.current);
      return next;
    });
  }, [hydrated, result.current]);

  function toggle(id: TierId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!hydrated) return <Skeleton />;

  const estimate = estimateDaysToNext(result, snapshot);
  const nextTierName = result.next ? getTier(result.next).name : null;

  return (
    <div>
      {/* Header */}
      <header className="mb-6">
        <h1 className="font-display text-4xl tracking-wide text-ink md:text-5xl">
          Path
        </h1>
        <p className="mt-1 text-sm text-muted">
          Mastery tiers. Concrete criteria. Earn the badge.
        </p>
      </header>

      {/* Current tier strip */}
      <Card
        className="relative overflow-hidden border-2 p-0"
        // The border color is set via inline style so each tier can use its
        // signature color/gradient.
      >
        <div
          className="absolute inset-0 -z-0 opacity-[0.06]"
          style={tierMarkerStyle(currentTier)}
          aria-hidden
        />
        <div
          className="absolute inset-y-0 left-0 w-2"
          style={tierMarkerStyle(currentTier)}
          aria-hidden
        />
        <div className="relative z-10 pl-6 pr-4 py-5 md:pl-7 md:pr-6 md:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Current tier
              </div>
              <div
                className="mt-1 font-display text-5xl leading-none tracking-wide md:text-7xl"
                style={tierTextStyle(currentTier)}
              >
                {currentTier.name}
              </div>
              <div className="mt-2 text-[11px] text-muted">
                Reward: <span className="text-ink">{currentTier.reward}</span>
              </div>
            </div>
            <Pill tone="flame">
              {currentIdx + 1}/{TIER_ORDER.length}
            </Pill>
          </div>

          {/* Progress to next */}
          {nextTierName ? (
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted">
                <span>Next: {nextTierName}</span>
                <span className="font-mono tabular-nums text-ink">
                  {result.met}/{result.total} · {result.pctToNext}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full"
                  style={{
                    width: `${result.pctToNext}%`,
                    ...tierMarkerStyle(
                      getTier(result.next ?? currentTier.id),
                    ),
                  }}
                />
              </div>
              {estimate && (
                <div className="mt-2 text-[11px] text-ice">{estimate}</div>
              )}

              {/* Top unmet criteria */}
              {result.nextCriteria.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Next tier requires
                  </div>
                  <ul className="mt-2 space-y-1">
                    {result.nextCriteria.slice(0, 5).map((cr) => {
                      const cur = cr.currentValueFn(snapshot);
                      const unit = cr.unit ? ` ${cr.unit}` : "";
                      return (
                        <li
                          key={cr.key}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span className="text-ink">{cr.label}</span>
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                            {cur}/{cr.threshold}
                            {unit}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 text-sm text-ink">
              Top of the mountain. All tiers earned.
            </div>
          )}
        </div>
      </Card>

      {/* Tier tree */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl tracking-wide text-ink md:text-3xl">
            Tier tree
          </h2>
          <div className="text-[11px] text-muted">Tap a tier to expand</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {TIERS.map((tier, i) => {
            const status: "earned" | "current" | "locked" =
              i < currentIdx
                ? "earned"
                : i === currentIdx
                ? "current"
                : "locked";
            return (
              <TierCardItem
                key={tier.id}
                tier={tier}
                snapshot={snapshot}
                status={status}
                expanded={expanded.has(tier.id)}
                onToggle={() => toggle(tier.id)}
                estimate={status === "current" ? estimate : null}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
