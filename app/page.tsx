"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NAV_GROUPS, ROUTES } from "@/components/Nav";
import PlayerCard from "@/components/PlayerCard";
import { Card, Pill, Stat } from "@/components/ui";
import { getActiveCodes, getExpiringWithin, msUntilExpiry } from "@/lib/codes";
import { getRisers } from "@/lib/pulse";

type SavedBuild = {
  id: string;
  name: string;
  position: string;
  height: string;
  archetype: string;
  archetypeId?: string;
  updatedAt: number;
};

const ONBOARD_STEPS: { num: number; title: string; sub: string; href: string }[] = [
  {
    num: 1,
    title: "Set your handle",
    sub: "Personalize Coach and the AI Expert.",
    href: "/coach",
  },
  {
    num: 2,
    title: "Take the 2-minute diagnostic",
    sub: "Find your gap, get a 14-day plan.",
    href: "/diagnose",
  },
  {
    num: 3,
    title: "Ask the AI Expert",
    sub: "Builds, badges, jumpers, on demand.",
    href: "/ai",
  },
];

const AI_DISMISS_KEY = "2klab.ai.quickChatDismissed";

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
  const [saved, setSaved] = useState<SavedBuild[] | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasDiagnose, setHasDiagnose] = useState(false);
  const [hasName, setHasName] = useState(false);
  const [aiApiKeySet, setAiApiKeySet] = useState(false);
  const [aiLastAssistant, setAiLastAssistant] = useState<string | null>(null);
  const [aiQuickDismissed, setAiQuickDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("2klab.builds");
      setSaved(raw ? (JSON.parse(raw) as SavedBuild[]) : []);
    } catch {
      setSaved([]);
    }
    try {
      setHasDiagnose(!!localStorage.getItem("2klab.diagnose"));
    } catch {
      /* ignore */
    }
    try {
      setHasName(!!(localStorage.getItem("2klab.coach.name") || "").trim());
    } catch {
      /* ignore */
    }
    try {
      setAiApiKeySet(!!(localStorage.getItem("2klab.ai.apiKey") || "").trim());
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem("2klab.ai.history");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (let i = arr.length - 1; i >= 0; i--) {
            const m = arr[i];
            if (m && m.role === "assistant" && typeof m.content === "string") {
              setAiLastAssistant(m.content);
              break;
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
    try {
      setAiQuickDismissed(localStorage.getItem(AI_DISMISS_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const showOnboarding = hydrated && !hasDiagnose && !hasName;
  const showAiQuick = hydrated && aiApiKeySet && !aiQuickDismissed;

  const dismissAiQuick = () => {
    setAiQuickDismissed(true);
    try {
      localStorage.setItem(AI_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const activeCodes = useMemo(() => getActiveCodes(now), [now]);

  // Soonest-expiring active code (smallest positive msUntilExpiry)
  const soonest = useMemo(() => {
    let best: { code: ReturnType<typeof getActiveCodes>[number]; ms: number } | null = null;
    for (const c of activeCodes) {
      const ms = msUntilExpiry(c, now);
      if (ms === null || ms <= 0) continue;
      if (!best || ms < best.ms) best = { code: c, ms };
    }
    return best;
  }, [activeCodes, now]);

  const expiringTonight = useMemo(
    () => getExpiringWithin(24, now, activeCodes).length,
    [activeCodes, now],
  );
  const risersCount = useMemo(() => getRisers().length, []);

  async function copyHero() {
    if (!soonest) return;
    try {
      await navigator.clipboard.writeText(soonest.code.code);
    } catch {
      /* clipboard blocked — keep UX */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const heroMs = soonest?.ms ?? null;
  const heroToneClass =
    heroMs === null
      ? "text-lime"
      : heroMs < 3600_000
        ? "text-gold blink-1h"
        : heroMs < 24 * 3600_000
          ? "text-flame"
          : "text-ice";

  return (
    <div className="space-y-10">
      <header className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
            NBA 2K26 · Reference & Analytics
          </div>
          <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-7xl">
            2K LAB
          </h1>
          <p className="mt-2 max-w-xl text-base text-muted md:text-sm">
            NBA 2K26 reference · live data refreshed hourly
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Pill tone="lime">Live</Pill>
          <span className="num">Last sync 00:47 ago</span>
          <span aria-hidden>·</span>
          <span className="num">8 sources</span>
        </div>
      </header>

      {showOnboarding && (
        <section aria-label="Start here">
          <Card className="border-ice/40 bg-gradient-to-br from-ice/[0.08] via-surface to-surface">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ice">
              First time here?
            </div>
            <div className="mt-1 font-display text-2xl tracking-wide text-ink md:text-3xl">
              Start here
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              {ONBOARD_STEPS.map((s) => (
                <li key={s.num}>
                  <Link
                    href={s.href}
                    className="group flex items-center gap-3 rounded-lg border border-line bg-surface p-3 transition active:scale-[0.99] hover:border-ice/60 hover:bg-surface2"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-ice/40 bg-ice/10 font-display text-base text-ice">
                      {s.num}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-base tracking-wide text-ink">
                        {s.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {s.sub}
                      </span>
                    </span>
                    <span className="text-xs text-muted transition group-hover:text-ice">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {showAiQuick && (
        <section aria-label="AI quick chat">
          <Card className="border-flame/30 bg-gradient-to-br from-flame/[0.06] via-surface to-surface">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
                  2K Expert · AI
                </div>
                {aiLastAssistant ? (
                  <>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">
                      Last reply
                    </div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-ink">
                      {aiLastAssistant}
                    </p>
                    <Link
                      href="/ai"
                      className="mt-2 inline-block text-[11px] font-bold uppercase tracking-wider text-flame hover:text-ink"
                    >
                      Continue chat →
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/ai"
                    className="mt-1 inline-block text-sm text-flame hover:text-ink"
                  >
                    Ask the expert anything →
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={dismissAiQuick}
                aria-label="Dismiss AI quick chat"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line bg-surface2 text-xs text-muted hover:border-flame hover:text-flame"
              >
                ×
              </button>
            </div>
          </Card>
        </section>
      )}

      {hydrated && (
        <section aria-label="Your card">
          <PlayerCard />
        </section>
      )}

      <section aria-label="Snapshot" className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Stat label="Archetypes" value="28" hint="Position × playstyle" />
        <Stat label="Badges tracked" value="92" hint="All categories" tone="ice" />
        <Stat label="Active codes" value={activeCodes.length} hint={`${expiringTonight} expire <24h`} tone="flame" />
        <Stat label="Moves logged" value="47" hint="PS5 inputs" tone="gold" />
      </section>

      {/* Active codes hero panel */}
      {soonest && (
        <section aria-label="Active codes">
          <Card className="border-flame/40 bg-gradient-to-br from-flame/[0.10] via-surface to-surface">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pill tone="flame">Active codes</Pill>
                <span className="text-[11px] uppercase tracking-wider text-muted">
                  Soonest expiry · {soonest.code.mode}
                </span>
              </div>
              <Link
                href="/codes"
                className="text-[11px] font-bold uppercase tracking-wider text-flame hover:text-ink"
              >
                View all {activeCodes.length} codes →
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
                  <div className={`font-display text-3xl tracking-wide num md:text-5xl ${heroToneClass}`}>
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

            {saved && saved.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Recently used by
                </span>
                {saved.slice(0, 3).map((b) => (
                  <Link
                    key={b.id}
                    href={
                      b.archetypeId
                        ? `/builds?arche=${b.archetypeId}`
                        : "/builds"
                    }
                    className="rounded-full border border-line bg-surface2 px-2.5 py-0.5 text-[11px] font-semibold text-ink hover:border-flame/60 hover:text-flame"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </section>
      )}

      {saved && saved.length >= 1 && (
        <section aria-label="Your saved builds">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl tracking-wide text-ink md:text-3xl">
              Your Builds
            </h2>
            <Link
              href="/builds"
              className="text-xs font-bold uppercase tracking-wider text-flame"
            >
              Edit →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {saved.slice(0, 6).map((b) => (
              <li key={b.id}>
                <Link
                  href="/builds"
                  className="block rounded-lg border border-line bg-surface p-3 transition hover:border-flame/60"
                >
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="font-semibold uppercase tracking-wider text-ink">
                      {b.name}
                    </span>
                    <span className="num">{relativeTime(now - b.updatedAt)}</span>
                  </div>
                  <div className="mt-1 font-display text-xl tracking-wide text-ink">
                    {b.position} · {b.height} · {b.archetype}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Sections">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl tracking-wide text-ink md:text-3xl">
            Sections
          </h2>
          <span className="text-[11px] uppercase tracking-wider text-muted">
            {ROUTES.length} pages · {NAV_GROUPS.length} groups
          </span>
        </div>
        <div className="space-y-6">
          {NAV_GROUPS.map((g) => (
            <div key={g.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="font-display text-sm uppercase tracking-[0.2em] text-ink">
                  {g.label}
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  · {g.routes.length}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {g.routes.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="group block rounded-lg border border-line bg-surface p-3 transition hover:-translate-y-0.5 hover:border-flame/60 hover:bg-surface2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-xl tracking-wide text-ink">
                          {r.label}
                        </span>
                        <span className="text-xs text-muted transition group-hover:text-flame">
                          →
                        </span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-muted">{r.sub}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Card className="border-flame/30 bg-gradient-to-br from-flame/[0.08] to-transparent">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
              Tonight's expirations
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 md:max-w-md">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Expiring tonight
                </div>
                <div className="mt-0.5 font-display text-3xl tracking-wide num text-flame">
                  {expiringTonight}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Risers (24h)
                </div>
                <div className="mt-0.5 font-display text-3xl tracking-wide num text-ice">
                  {risersCount}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/codes"
              className="rounded-md bg-flame px-3 py-2 text-xs font-bold uppercase tracking-wider text-black"
            >
              Codes
            </Link>
            <Link
              href="/pulse"
              className="rounded-md border border-ice/40 bg-ice/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-ice"
            >
              Pulse
            </Link>
          </div>
        </div>
      </Card>

      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes blink2k{0%,100%{opacity:1}50%{opacity:.45}}.blink-1h{animation:blink2k 1s steps(2,end) infinite}",
        }}
      />
    </div>
  );
}

function relativeTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
