"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/components/Nav";
import { Card, Pill, Stat } from "@/components/ui";

type SavedBuild = {
  id: string;
  name: string;
  position: string;
  height: string;
  archetype: string;
  updatedAt: number;
};

export default function Home() {
  const [saved, setSaved] = useState<SavedBuild[] | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    try {
      const raw = localStorage.getItem("2klab.builds");
      setSaved(raw ? (JSON.parse(raw) as SavedBuild[]) : []);
    } catch {
      setSaved([]);
    }
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

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
            Builds, badges, codes, moves, scenarios, secrets, and live NBA stats
            with predicted 2K rating changes. Data refreshed via Fivetran into
            Snowflake; transformations modeled in dbt.
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
        <Stat label="Active codes" value="14" hint="3 expire <24h" tone="flame" />
        <Stat label="Moves logged" value="47" hint="PS5 inputs" tone="gold" />
      </section>

      {saved && saved.length > 0 && (
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
              Use it tonight
            </div>
            <p className="mt-1 text-sm text-ink">
              Three codes expire in under 24h. The S-tier finishing build only
              needs 110k VC to cap. Real NBA games today: 6 — predicted 2K
              rating bumps surface on Pulse before 2K announces them.
            </p>
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
