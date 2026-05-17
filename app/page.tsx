"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/components/Nav";
import { Card, Pill, Stat } from "@/components/ui";
import { getActiveCodes, getExpiringWithin, msUntilExpiry } from "@/lib/codes";
import { getRisers } from "@/lib/pulse";

type SavedBuild = {
  id: string;
  name: string;
  position: string;
  height: string;
  archetype: string;
  updatedAt: number;
};

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("2klab.builds");
      setSaved(raw ? (JSON.parse(raw) as SavedBuild[]) : []);
    } catch {
      setSaved([]);
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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
          <p className="mt-2 max-w-xl text-sm text-muted">
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
            {ROUTES.length} pages
          </span>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROUTES.map((r, i) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="group block rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-flame/60 hover:bg-surface2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                    0{i + 1}
                  </span>
                  <span className="text-xs text-muted transition group-hover:text-flame">
                    Open →
                  </span>
                </div>
                <div className="mt-2 font-display text-3xl tracking-wide text-ink">
                  {r.label}
                </div>
                <div className="mt-1 text-sm text-muted">{r.sub}</div>
              </Link>
            </li>
          ))}
        </ul>
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
