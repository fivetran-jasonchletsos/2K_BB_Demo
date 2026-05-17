"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NAV_GROUPS } from "@/components/Nav";
import PlayerCard from "@/components/PlayerCard";
import { Bar, Card, Pill, TierBadge } from "@/components/ui";
import { getActiveCodes, msUntilExpiry } from "@/lib/codes";
import { getRisers } from "@/lib/pulse";
import { getDailyScenarios, todayKey as scenarioTodayKey } from "@/lib/scenarios";
import {
  archetypeTopAttrs,
  archetypeTopBadges,
  latestPositiveDelta,
  metaBuildOfDay,
  sTierBadges,
  tipOfDay,
} from "@/lib/home";

type SavedBuild = {
  id: string;
  name: string;
  position: string;
  height: string;
  archetype: string;
  archetypeId?: string;
  updatedAt: number;
};

type ShotRecords = Record<string, unknown>;

const TIP_SAVED_KEY = "2klab.tips.saved";
const PLAY_EXPANDED_KEY = "2klab.home.expanded";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function Home() {
  const [now, setNow] = useState<number>(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Opt-in personalization flags. Personal panel only renders if any is true.
  const [saved, setSaved] = useState<SavedBuild[]>([]);
  const [hasName, setHasName] = useState(false);
  const [hasShotRecords, setHasShotRecords] = useState(false);

  // Tip "Save" star — interactive only after first tap.
  const [tipSaved, setTipSaved] = useState(false);

  // Expand/collapse nav groups. PLAY is open by default; others collapsed.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    play: true,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("2klab.builds");
      const parsed = raw ? (JSON.parse(raw) as SavedBuild[]) : [];
      setSaved(Array.isArray(parsed) ? parsed : []);
    } catch {
      /* ignore */
    }
    try {
      setHasName(!!(localStorage.getItem("2klab.coach.name") || "").trim());
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem("2klab.shottrainer.records");
      if (raw) {
        const parsed = JSON.parse(raw) as ShotRecords;
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          setHasShotRecords(true);
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem(PLAY_EXPANDED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setExpanded((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Today's seeded picks. Computed once per mount (date won't change in-session).
  const today = useMemo(() => new Date(), []);
  const metaBuild = useMemo(() => metaBuildOfDay(today), [today]);
  const metaBuildAttrs = useMemo(() => archetypeTopAttrs(metaBuild, 4), [metaBuild]);
  const metaBuildBadges = useMemo(() => archetypeTopBadges(metaBuild, 3), [metaBuild]);
  const todayTip = useMemo(() => tipOfDay(today), [today]);
  const topRiser = useMemo(() => getRisers()[0] ?? null, []);
  const sBadges = useMemo(() => sTierBadges(), []);
  const dailyScenario = useMemo(
    () => getDailyScenarios(scenarioTodayKey(today), 1)[0] ?? null,
    [today],
  );

  // Tip "saved" hydration (independent of personal panel).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIP_SAVED_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.includes(todayTip.id)) setTipSaved(true);
      }
    } catch {
      /* ignore */
    }
  }, [todayTip.id]);

  // Default "primary" position for the meta build link.
  const metaBuildPos = metaBuild.primaryRole[0] ?? "PG";

  const activeCodes = useMemo(() => getActiveCodes(now), [now]);
  const soonest = useMemo(() => {
    let best: { code: ReturnType<typeof getActiveCodes>[number]; ms: number } | null = null;
    for (const c of activeCodes) {
      const ms = msUntilExpiry(c, now);
      if (ms === null || ms <= 0) continue;
      if (!best || ms < best.ms) best = { code: c, ms };
    }
    return best;
  }, [activeCodes, now]);

  const copyHero = useCallback(async () => {
    if (!soonest) return;
    try {
      await navigator.clipboard.writeText(soonest.code.code);
    } catch {
      /* clipboard blocked — keep UX */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [soonest]);

  const toggleSaveTip = useCallback(() => {
    setTipSaved((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem(TIP_SAVED_KEY);
        const arr: string[] = raw ? (JSON.parse(raw) as string[]) : [];
        const set = new Set(Array.isArray(arr) ? arr : []);
        if (next) set.add(todayTip.id);
        else set.delete(todayTip.id);
        localStorage.setItem(TIP_SAVED_KEY, JSON.stringify([...set]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [todayTip.id]);

  const toggleGroup = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(PLAY_EXPANDED_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const heroMs = soonest?.ms ?? null;
  const heroToneClass =
    heroMs === null
      ? "text-lime"
      : heroMs < 3600_000
        ? "text-gold blink-1h"
        : heroMs < 24 * 3600_000
          ? "text-flame"
          : "text-ice";

  // Personal section gates strictly on opt-in localStorage state.
  const showPersonal =
    hydrated && (saved.length > 0 || hasName || hasShotRecords);

  return (
    <div className="space-y-8">
      {/* 1. Compact header */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-2xl leading-none tracking-wide text-ink md:text-3xl">
            2K LAB
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            NBA 2K26 reference
          </div>
        </div>
        <Pill tone="lime">Live</Pill>
      </header>

      {/* 2. PRIMARY: Active codes hero panel */}
      {soonest && (
        <section aria-label="Active code">
          <Card className="border-flame/40 bg-gradient-to-br from-flame/[0.12] via-surface to-surface">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pill tone="flame">Active code</Pill>
                <span className="text-[11px] uppercase tracking-wider text-muted">
                  Soonest expiry · {soonest.code.mode}
                </span>
              </div>
              <Link
                href="/codes"
                className="text-[11px] font-bold uppercase tracking-wider text-flame hover:text-ink"
              >
                All {activeCodes.length} codes →
              </Link>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Code
                </div>
                <div className="mt-1 break-all font-mono text-2xl font-bold leading-tight text-ink md:text-3xl">
                  {soonest.code.code}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {soonest.code.rewards.map((r, i) => (
                    <span
                      key={i}
                      className="rounded border border-flame/30 bg-flame/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-flame"
                    >
                      {r.qty ? `${r.qty.toLocaleString()} ${r.label}` : r.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 md:items-end">
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                    Time left
                  </div>
                  <div
                    className={`font-display text-3xl tracking-wide num md:text-5xl ${heroToneClass}`}
                  >
                    {heroMs !== null ? formatCountdown(heroMs) : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  {copied && <Pill tone="lime">Copied</Pill>}
                  <button
                    type="button"
                    onClick={copyHero}
                    className="h-12 rounded-md bg-flame px-4 text-sm font-bold uppercase tracking-wider text-black transition active:translate-y-px"
                  >
                    {copied ? "Copied" : "Copy code"}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* 3. TODAY'S META — 3 cards */}
      <section aria-label="Today's meta">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-wide text-ink md:text-2xl">
            Today's meta
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted">
            Rotates daily
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Card 1: Meta build of the day */}
          <Card className="flex flex-col gap-3 border-ice/30">
            <div className="flex items-center justify-between">
              <Pill tone="ice">Meta build</Pill>
              <span className="text-[10px] uppercase tracking-wider text-muted">
                {metaBuild.tagline}
              </span>
            </div>
            <div>
              <div className="font-display text-xl leading-tight tracking-wide text-ink md:text-2xl">
                {metaBuild.name}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                {metaBuild.primaryRole.join(" / ")} ·{" "}
                {metaBuild.focus.slice(0, 3).join(" · ")}
              </div>
            </div>
            <div className="space-y-1.5">
              {metaBuildAttrs.map((a) => (
                <div key={a.key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">{a.label}</span>
                    <span className="num text-ink">{a.value}</span>
                  </div>
                  <Bar value={a.value} tone="ice" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {metaBuildBadges.map((b) => (
                <span
                  key={b.name}
                  className="inline-flex items-center gap-1 rounded border border-line bg-surface2 px-2 py-0.5 text-[11px] text-ink"
                >
                  <span
                    className={
                      b.tier === "S"
                        ? "font-display text-gold"
                        : b.tier === "A"
                          ? "font-display text-flame"
                          : "font-display text-ice"
                    }
                  >
                    {b.tier}
                  </span>
                  {b.name}
                </span>
              ))}
            </div>
            <Link
              href={`/builds?arche=${metaBuild.id}&pos=${metaBuildPos}`}
              className="mt-auto inline-block text-[11px] font-bold uppercase tracking-wider text-ice hover:text-ink"
            >
              Build this →
            </Link>
          </Card>

          {/* Card 2: Today's top tip */}
          <Card className="flex flex-col gap-3 border-flame/30">
            <div className="flex items-center justify-between">
              <Pill tone="flame">Today's tip</Pill>
              <span className="text-[10px] uppercase tracking-wider text-muted">
                Diff {todayTip.difficulty}/3 · {todayTip.timeToExecute}
              </span>
            </div>
            <div className="font-display text-lg leading-tight tracking-wide text-ink md:text-xl">
              {todayTip.hook || todayTip.title}
            </div>
            <div className="text-xs text-muted">
              <span className="font-bold uppercase tracking-wider text-flame">
                {todayTip.value}
              </span>
            </div>
            <div className="mt-auto flex items-center justify-between">
              <Link
                href="/tips"
                className="text-[11px] font-bold uppercase tracking-wider text-flame hover:text-ink"
              >
                Read full tip →
              </Link>
              <button
                type="button"
                onClick={toggleSaveTip}
                aria-pressed={tipSaved}
                aria-label={tipSaved ? "Unsave tip" : "Save tip"}
                className={`grid h-8 w-8 place-items-center rounded-md border transition active:scale-95 ${
                  tipSaved
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-line bg-surface2 text-muted hover:border-gold/40 hover:text-gold"
                }`}
              >
                {tipSaved ? "★" : "☆"}
              </button>
            </div>
          </Card>

          {/* Card 3: Tonight's biggest mover */}
          {topRiser ? (
            <Card className="flex flex-col gap-3 border-lime/30">
              <div className="flex items-center justify-between">
                <Pill tone="lime">Biggest mover</Pill>
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  {topRiser.team} · {topRiser.position}
                </span>
              </div>
              <div className="font-display text-xl leading-tight tracking-wide text-ink md:text-2xl">
                {topRiser.displayName}
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">
                    Current
                  </div>
                  <div className="font-display text-2xl num text-ink">
                    {topRiser.currentRating}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">
                    Predicted
                  </div>
                  <div className="font-display text-2xl num text-lime">
                    ↑ +{topRiser.predictedDelta}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted">{topRiser.primaryDriver}</div>
              <Link
                href="/pulse"
                className="mt-auto inline-block text-[11px] font-bold uppercase tracking-wider text-lime hover:text-ink"
              >
                Full prediction →
              </Link>
            </Card>
          ) : (
            <Card className="border-line">
              <Pill tone="muted">Biggest mover</Pill>
              <div className="mt-2 text-sm text-muted">No risers tracked.</div>
            </Card>
          )}
        </div>
      </section>

      {/* 4. S-TIER BADGES THIS PATCH — horizontal-scroll strip */}
      <section aria-label="S-tier badges this patch">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-wide text-ink md:text-2xl">
            S-tier badges this patch
          </h2>
          <Link
            href="/badges"
            className="text-[11px] font-bold uppercase tracking-wider text-gold hover:text-ink"
          >
            All badges →
          </Link>
        </div>
        <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
          {sBadges.map((b) => {
            const delta = latestPositiveDelta(b);
            return (
              <Link
                key={b.id}
                href={`/badges#${b.id}`}
                className="block w-[220px] shrink-0 snap-start rounded-lg border border-line bg-surface p-3 transition hover:border-gold/60 hover:bg-surface2"
              >
                <div className="flex items-center justify-between gap-2">
                  <TierBadge tier="S" />
                  {delta !== null && (
                    <span className="rounded border border-lime/30 bg-lime/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime">
                      +{delta}%
                    </span>
                  )}
                </div>
                <div className="mt-2 font-display text-base leading-tight tracking-wide text-ink">
                  {b.name}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {b.category}
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] text-muted">
                  {b.effect}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. TRY IT NOW — 3 tap-action cards */}
      <section aria-label="Try it now">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-wide text-ink md:text-2xl">
            Try it now
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted">
            No setup
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link
            href="/shot-trainer"
            className="group block rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-flame/60 hover:bg-surface2"
          >
            <Pill tone="flame">Shot trainer</Pill>
            <div className="mt-2 font-display text-xl leading-tight tracking-wide text-ink md:text-2xl">
              Tap to shoot
            </div>
            <div className="mt-1 text-xs text-muted">
              30 seconds · green window timing
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-wider text-muted">
              No setup. Works in your browser.
            </div>
          </Link>

          <Link
            href="/ai"
            className="group block rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-ice/60 hover:bg-surface2"
          >
            <Pill tone="ice">Ask the AI</Pill>
            <div className="mt-2 font-display text-xl leading-tight tracking-wide text-ink md:text-2xl">
              Type a 2K question
            </div>
            <div className="mt-1 text-xs text-muted">Get an answer.</div>
            <div className="mt-3 text-[11px] uppercase tracking-wider text-muted">
              Free with API key on /connect. Worker proxy supported.
            </div>
          </Link>

          {dailyScenario ? (
            <Link
              href="/scenarios"
              className="group block rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-lime/60 hover:bg-surface2"
            >
              <Pill tone="lime">Daily scenario</Pill>
              <div className="mt-2 font-display text-lg leading-tight tracking-wide text-ink md:text-xl">
                {dailyScenario.title}
              </div>
              <div className="mt-1 text-xs text-muted">
                Difficulty {dailyScenario.difficulty}/3
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-wider text-lime">
                Try this →
              </div>
            </Link>
          ) : (
            <Link
              href="/scenarios"
              className="block rounded-xl border border-line bg-surface p-4"
            >
              <Pill tone="lime">Daily scenario</Pill>
              <div className="mt-2 font-display text-lg text-ink">
                Decision trainer
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-wider text-lime">
                Try this →
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* 6. PERSONAL — opt-in only */}
      {showPersonal && (
        <section aria-label="Your activity" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg tracking-wide text-muted">
              Your activity
            </h2>
            <Link
              href="/coach"
              className="text-[11px] font-bold uppercase tracking-wider text-flame hover:text-ink"
            >
              Today's three →
            </Link>
          </div>
          <PlayerCard />
        </section>
      )}

      {/* 7. NAV BY GROUP — collapsible */}
      <section aria-label="Sections">
        <div className="space-y-2">
          {NAV_GROUPS.map((g) => {
            const isOpen = !!expanded[g.id];
            return (
              <div key={g.id} className="rounded-lg border border-line bg-surface">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-surface2"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm uppercase tracking-[0.2em] text-ink">
                      {g.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      · {g.routes.length}
                    </span>
                  </div>
                  <span
                    className={`text-xs text-muted transition ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  >
                    ›
                  </span>
                </button>
                {isOpen && (
                  <ul className="grid grid-cols-1 gap-2 border-t border-line p-2 md:grid-cols-3">
                    {g.routes.map((r) => (
                      <li key={r.href}>
                        <Link
                          href={r.href}
                          className="group block rounded-md border border-line bg-surface2 p-2.5 transition hover:border-flame/60"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-base tracking-wide text-ink">
                              {r.label}
                            </span>
                            <span className="text-xs text-muted transition group-hover:text-flame">
                              →
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            {r.sub}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes blink2k{0%,100%{opacity:1}50%{opacity:.45}}.blink-1h{animation:blink2k 1s steps(2,end) infinite}",
        }}
      />
    </div>
  );
}
