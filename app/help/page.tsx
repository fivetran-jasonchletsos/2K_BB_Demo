"use client";

import Link from "next/link";
import { useState } from "react";
import { HELP, NAV_GROUPS, type HelpEntry } from "@/lib/help";
import { Card, Section } from "@/components/ui";

const ROUTE_META: Record<string, { label: string; sub: string }> = {
  "/": { label: "Home", sub: "Your dashboard" },
  "/coach": { label: "Coach", sub: "Today's plan" },
  "/path": { label: "Path", sub: "Mastery tiers" },
  "/diagnose": { label: "Diagnose", sub: "Find your gap" },
  "/ai": { label: "AI", sub: "Ask the expert" },
  "/my-stats": { label: "My Stats", sub: "Log your games" },
  "/my-roster": { label: "My Roster", sub: "Pin your build" },
  "/builds": { label: "Builds", sub: "MyPlayer optimizer" },
  "/badges": { label: "Badges", sub: "Tier list + filters" },
  "/codes": { label: "Codes", sub: "Active locker codes" },
  "/moves": { label: "Moves", sub: "Dribbles & combos" },
  "/players": { label: "Players", sub: "NBA database" },
  "/scenarios": { label: "Scenarios", sub: "Decision trainer" },
  "/shot-trainer": { label: "Shot Trainer", sub: "Release timing" },
  "/tips": { label: "Tips", sub: "Hidden mechanics" },
  "/pulse": { label: "Pulse", sub: "Live NBA → 2K" },
  "/stack": { label: "Stack", sub: "Data pipeline" },
  "/connect": { label: "Connect", sub: "API keys" },
  "/help": { label: "Help", sub: "Site guide" },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Do I need an API key?",
    a: "Optional. Only /ai and /coach's plan generator need an Anthropic key. Set it on /connect, or deploy the Worker proxy in /proxy.",
  },
  {
    q: "Is my data saved?",
    a: "Yes, in your browser only (localStorage). It survives reloads. Export from /my-stats for backup.",
  },
  {
    q: "Can it read my 2K account?",
    a: "No. 2K has no public API. Pin your roster on /my-roster manually.",
  },
  {
    q: "How fresh are the badges and codes?",
    a: "Community-aggregated; the Pulse page shows the last sync. Codes update by the hour.",
  },
  {
    q: "How do I share a build with a friend?",
    a: "Build Lab > Copy Code > paste in Discord. Friend opens the URL with the code.",
  },
  {
    q: "What if a page breaks?",
    a: "Refresh first. If it still breaks, open a GitHub issue with the page URL.",
  },
];

const QUICK_START: { href: string; label: string; sub: string; action: string }[] = [
  {
    href: "/coach",
    label: "Set your handle",
    sub: "Coach",
    action: "Log 1-2 games, then generate today's plan.",
  },
  {
    href: "/diagnose",
    label: "Take the diagnostic",
    sub: "Diagnose",
    action: "5 questions + 2 drills. Outputs a 14-day plan.",
  },
  {
    href: "/shot-trainer",
    label: "Try the shot trainer",
    sub: "Shot Trainer",
    action: "Match a jumper. Run 10 reps to calibrate.",
  },
];

function HelpDialog({
  route,
  entry,
  onClose,
}: {
  route: string;
  entry: HelpEntry;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80]">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-bg/80 backdrop-blur"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Help: ${entry.title}`}
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-card md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-2xl md:border-l md:p-6"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
        }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line md:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Help · {route}
            </div>
            <h2 className="font-display text-3xl leading-tight tracking-wide text-ink">
              {entry.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close help"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line bg-surface2 font-mono text-base text-ink active:scale-95"
          >
            ×
          </button>
        </div>
        <section className="mt-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
            What this is
          </h3>
          <p className="mt-1 text-sm text-ink">{entry.what}</p>
        </section>
        <section className="mt-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
            How to use it
          </h3>
          <ol className="mt-2 space-y-2">
            {entry.how.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-surface2 font-mono text-[11px] text-muted">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="mt-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Try this first
          </h3>
          <p className="mt-1 rounded-lg border border-flame/40 bg-flame/10 p-3 text-sm text-ink">
            {entry.tryFirst}
          </p>
        </section>
        <section className="mt-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Related
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.related.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-surface2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink active:scale-95"
              >
                {r.label}
              </Link>
            ))}
          </div>
        </section>
        <div className="mt-6 border-t border-line pt-4">
          <Link
            href={route}
            className="inline-flex min-h-[44px] items-center text-sm font-bold uppercase tracking-wider text-ice"
          >
            Open {entry.title} →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [openRoute, setOpenRoute] = useState<string | null>(null);
  const openEntry = openRoute ? HELP[openRoute] : null;

  return (
    <div>
      <header className="mb-8">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Site guide
        </div>
        <h1 className="font-display text-5xl leading-tight tracking-wide text-ink md:text-6xl">
          Help
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every page in 20 seconds. Tap a card to open its help sheet, or jump
          straight to a page.
        </p>
      </header>

      <Section title="Where to start" subtitle="Three first steps">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {QUICK_START.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="block rounded-xl border border-line bg-surface p-4 shadow-card transition active:scale-[0.99] hover:bg-surface2"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {q.sub}
              </div>
              <div className="mt-1 font-display text-2xl tracking-wide text-ink">
                {q.label}
              </div>
              <p className="mt-2 text-sm text-ink/90">{q.action}</p>
              <div className="mt-3 text-xs font-bold uppercase tracking-wider text-ice">
                Open {q.sub} →
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Site map" subtitle="Grouped by what you'll use it for">
        <div className="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-display text-xl tracking-wider text-ink">
                  {group.label}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {group.key}
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.routes.map((href) => {
                  const meta = ROUTE_META[href];
                  const entry = HELP[href];
                  if (!meta || !entry) return null;
                  return (
                    <li
                      key={href}
                      className="flex items-stretch rounded-lg border border-line bg-surface shadow-card"
                    >
                      <Link
                        href={href}
                        className="flex-1 rounded-l-lg p-3 transition hover:bg-surface2"
                      >
                        <div className="font-display text-lg tracking-wide text-ink">
                          {meta.label}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted">
                          {meta.sub}
                        </div>
                        <div className="mt-1 truncate font-mono text-[10px] text-muted">
                          {href}
                        </div>
                      </Link>
                      <button
                        type="button"
                        aria-label={`Open help for ${meta.label}`}
                        onClick={() => setOpenRoute(href)}
                        className="grid w-12 shrink-0 place-items-center border-l border-line font-mono text-base text-ink transition hover:bg-surface2"
                      >
                        ?
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="FAQ" subtitle="Short answers">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FAQ.map((f) => (
            <Card key={f.q}>
              <div className="font-display text-lg tracking-wide text-ink">
                {f.q}
              </div>
              <p className="mt-2 text-sm text-ink/90">{f.a}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Get help" subtitle="Still stuck?">
        <Card>
          <p className="text-sm text-ink">
            Found a bug or want a feature?{" "}
            <a
              href="https://github.com/jchletsos/nba-2k-lab/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ice underline-offset-4 hover:underline"
            >
              Open an issue on GitHub
            </a>
            .
          </p>
          <p className="mt-3 text-xs text-muted">Made with Claude Code.</p>
        </Card>
      </Section>

      {openRoute && openEntry && (
        <HelpDialog
          route={openRoute}
          entry={openEntry}
          onClose={() => setOpenRoute(null)}
        />
      )}
    </div>
  );
}
