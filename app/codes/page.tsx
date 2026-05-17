"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Pill, Stat, TierBadge } from "@/components/ui";
import {
  ARCHIVED_CODES,
  getActiveCodes,
  isExpired,
  msUntilExpiry,
  type LockerCode,
  type LockerCodeMode,
} from "@/lib/codes";

const STORAGE_KEY = "2klab.redeemedCodes";
const MODE_OPTIONS: (LockerCodeMode | "All")[] = [
  "All",
  "MyTeam",
  "MyCareer",
  "2KMobile",
];
type SortKey = "expiring" | "newest" | "reward";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "expiring", label: "Expiring" },
  { key: "newest", label: "Newest" },
  { key: "reward", label: "Best Reward" },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function expiryTone(ms: number | null): "lime" | "ice" | "flame" | "gold" | "muted" {
  if (ms === null) return "muted";
  if (ms <= 0) return "muted";
  const HOUR = 3600_000;
  if (ms < 1 * HOUR) return "gold";
  if (ms < 24 * HOUR) return "flame";
  if (ms < 7 * 24 * HOUR) return "ice";
  return "lime";
}

const TIER_RANK: Record<LockerCode["tier"], number> = { S: 4, A: 3, B: 2, C: 1 };

function dropDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function modeTone(mode: LockerCodeMode): "flame" | "ice" | "gold" | "default" {
  switch (mode) {
    case "MyTeam":
      return "flame";
    case "MyCareer":
      return "ice";
    case "2KMobile":
      return "gold";
    default:
      return "default";
  }
}

export default function CodesPage() {
  const [now, setNow] = useState<number>(() => Date.now());
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  const [mode, setMode] = useState<LockerCodeMode | "All">("All");
  const [sort, setSort] = useState<SortKey>("expiring");
  const [query, setQuery] = useState("");
  const [hideRedeemed, setHideRedeemed] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAllCount, setCopiedAllCount] = useState<number | null>(null);

  // Live tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Hydrate redeemed set from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        setRedeemed(new Set(arr));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function toggleRedeemed(id: string) {
    setRedeemed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function copyCode(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard blocked — fall through to UX anyway */
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  }

  async function copyAllVisible(codes: string[]) {
    if (codes.length === 0) return;
    const joined = codes.join(", ");
    try {
      await navigator.clipboard.writeText(joined);
    } catch {
      /* clipboard blocked — keep UX */
    }
    setCopiedAllCount(codes.length);
    setTimeout(() => {
      setCopiedAllCount((curr) => (curr === codes.length ? null : curr));
    }, 2000);
  }

  // Active codes — recompute when `now` changes meaningfully (every tick is fine, cheap)
  const activeAll = useMemo(() => getActiveCodes(now), [now]);

  const activeLive = useMemo(
    () => activeAll.filter((c) => !isExpired(c, now)),
    [activeAll, now],
  );

  const expiring24 = useMemo(
    () =>
      activeLive.filter((c) => {
        const ms = msUntilExpiry(c, now);
        return ms !== null && ms > 0 && ms <= 24 * 3600_000;
      }),
    [activeLive, now],
  );

  const expiring1 = useMemo(
    () =>
      activeLive.filter((c) => {
        const ms = msUntilExpiry(c, now);
        return ms !== null && ms > 0 && ms <= 3600_000;
      }),
    [activeLive, now],
  );

  const redeemedActiveCount = useMemo(
    () => activeLive.filter((c) => redeemed.has(c.id)).length,
    [activeLive, redeemed],
  );

  const hero = useMemo<LockerCode | null>(() => {
    const withExpiry = activeLive
      .filter((c) => c.expiresAt)
      .sort(
        (a, b) =>
          new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime(),
      );
    return withExpiry[0] ?? null;
  }, [activeLive]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = activeLive.filter((c) => {
      if (mode !== "All" && c.mode !== mode && c.mode !== "All") return false;
      if (hideRedeemed && redeemed.has(c.id)) return false;
      if (q) {
        const blob = `${c.code} ${c.rewards.map((r) => r.label).join(" ")} ${c.source}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "expiring") {
        const ax = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const bx = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        return ax - bx;
      }
      if (sort === "newest") {
        return (
          new Date(b.droppedAt).getTime() - new Date(a.droppedAt).getTime()
        );
      }
      // reward — tier-based
      return TIER_RANK[b.tier] - TIER_RANK[a.tier];
    });

    return list;
  }, [activeLive, mode, query, hideRedeemed, redeemed, sort]);

  return (
    <div className="space-y-8">
      {/* Title block */}
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          Locker Codes
        </div>
        <div className="mt-1 flex items-start gap-2">
          <h1 className="font-display text-5xl leading-none tracking-wide text-ink md:text-7xl">
            Locker Codes
          </h1>
          <details className="group relative mt-2">
            <summary
              aria-label="About these codes"
              className="flex h-6 w-6 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-surface text-[11px] font-bold text-muted transition hover:border-flame/60 hover:text-flame [&::-webkit-details-marker]:hidden"
            >
              ?
            </summary>
            <div className="absolute left-0 z-10 mt-2 w-72 max-w-[80vw] rounded-lg border border-line bg-surface2 p-3 text-[11px] leading-relaxed text-muted shadow-lg">
              Codes are community-aggregated from public sources. Verify in-game
              before entering. Most codes are single-use per account and expire
              without notice.
            </div>
          </details>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Community-aggregated codes · last sync 00:47 ago · source: 2K Twitter, livestreams,
          MyTeam community.
        </p>
      </header>

      {/* Hero */}
      {hero && <HeroPanel code={hero} now={now} onCopy={copyCode} copiedId={copiedId} />}

      {/* Stats row */}
      <section
        aria-label="Code stats"
        className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3"
      >
        <Stat label="Active codes" value={activeLive.length} />
        <Stat
          label="Expiring < 24h"
          value={expiring24.length}
          tone="flame"
          hint={expiring24.length === 0 ? "Nothing imminent" : undefined}
        />
        <Stat
          label="Expiring < 1h"
          value={expiring1.length}
          tone="gold"
          hint={expiring1.length === 0 ? "Calm window" : "Move fast"}
        />
        <Stat
          label="Redeemed by you"
          value={hydrated ? redeemedActiveCount : "—"}
          tone="lime"
          hint={hydrated ? `${redeemed.size} all-time` : "loading"}
        />
      </section>

      {/* Filters */}
      <section aria-label="Filters" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {MODE_OPTIONS.map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                  active
                    ? "border-flame bg-flame text-black"
                    : "border-line bg-surface/40 text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            {SORT_OPTIONS.map((o) => {
              const active = sort === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setSort(o.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                    active ? "bg-ice/15 text-ice" : "text-muted hover:text-ink"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 min-w-[180px]">
            <span aria-hidden className="text-muted">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code or reward"
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                type="button"
                className="text-xs text-muted hover:text-ink"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
            <input
              type="checkbox"
              checked={hideRedeemed}
              onChange={(e) => setHideRedeemed(e.target.checked)}
              className="h-3.5 w-3.5 accent-lime"
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Hide redeemed
            </span>
          </label>

          <button
            type="button"
            onClick={() => copyAllVisible(filtered.map((c) => c.code))}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-full border border-flame/40 bg-flame/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-flame transition hover:border-flame hover:bg-flame/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Copy visible
            <span className="num text-[10px] text-muted">({filtered.length})</span>
          </button>
          {copiedAllCount !== null && (
            <Pill tone="lime">Copied {copiedAllCount} codes</Pill>
          )}
        </div>
      </section>

      {/* Code list */}
      <section aria-label="Active codes" className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              No codes match the current filter. Try switching mode or clearing
              search.
            </p>
          </Card>
        ) : (
          filtered.map((c) => (
            <CodeRow
              key={c.id}
              code={c}
              now={now}
              redeemed={redeemed.has(c.id)}
              onCopy={copyCode}
              onToggleRedeemed={toggleRedeemed}
              copied={copiedId === c.id}
            />
          ))
        )}
      </section>

      {/* Archive — closed by default */}
      <section aria-label="Archive">
        <details className="group">
          <summary className="flex w-full cursor-pointer list-none items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left transition hover:border-flame/40 [&::-webkit-details-marker]:hidden">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Archive
              </div>
              <div className="mt-0.5 font-display text-2xl tracking-wide text-ink">
                {ARCHIVED_CODES.length} expired codes
              </div>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-flame">
              <span className="group-open:hidden">Show →</span>
              <span className="hidden group-open:inline">Hide →</span>
            </span>
          </summary>

          <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {[...ARCHIVED_CODES]
              .sort(
                (a, b) =>
                  new Date(b.droppedAt).getTime() -
                  new Date(a.droppedAt).getTime(),
              )
              .map((c) => (
                <li key={c.id}>
                  <div className="rounded-lg border border-line bg-surface p-3 opacity-80">
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-[13px] text-muted line-through">
                        {c.code}
                      </code>
                      <Pill tone="muted">Expired</Pill>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      {c.rewards.map((r, i) => (
                        <span
                          key={i}
                          className="rounded border border-line bg-surface2 px-1.5 py-0.5"
                        >
                          {r.qty ? `${r.qty.toLocaleString()} ${r.label}` : r.label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                      <span>{c.source}</span>
                      <span className="num">Dropped {dropDate(c.droppedAt)}</span>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </details>
      </section>

      {/* Tiny CSS for blinking gold under 1h */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes blink2k{0%,100%{opacity:1}50%{opacity:.45}}.blink-1h{animation:blink2k 1s steps(2,end) infinite}",
        }}
      />
    </div>
  );
}

/* ---------- Hero ---------- */

function HeroPanel({
  code,
  now,
  onCopy,
  copiedId,
}: {
  code: LockerCode;
  now: number;
  onCopy: (code: string, id: string) => void;
  copiedId: string | null;
}) {
  const ms = msUntilExpiry(code, now);
  const tone = expiryTone(ms);
  const remaining = ms !== null ? formatCountdown(ms) : "—";
  const copied = copiedId === code.id;

  return (
    <Card className="border-flame/40 bg-gradient-to-br from-flame/[0.12] via-surface to-surface">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill tone="flame">Soonest expiry</Pill>
          <Pill tone={modeTone(code.mode)}>{code.mode}</Pill>
          <TierBadge tier={code.tier} />
        </div>
        <div className="text-[11px] uppercase tracking-wider text-muted">
          {code.source}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Code
          </div>
          <div className="mt-1 cursor-text select-all break-all font-mono text-2xl font-bold leading-tight text-ink md:text-4xl">
            {code.code}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {code.rewards.map((r, i) => (
              <span
                key={i}
                className="rounded-md border border-flame/30 bg-flame/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-flame"
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
              className={`font-display text-4xl tracking-wide num md:text-6xl ${
                tone === "gold"
                  ? "text-gold blink-1h"
                  : tone === "flame"
                    ? "text-flame"
                    : tone === "ice"
                      ? "text-ice"
                      : "text-lime"
              }`}
            >
              {remaining}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCopy(code.code, code.id)}
            className="rounded-md bg-flame px-4 py-3 text-sm font-bold uppercase tracking-wider text-black transition active:translate-y-px"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      </div>

      {code.notes && (
        <div className="mt-3 border-t border-line pt-3 text-xs text-muted">
          {code.notes}
        </div>
      )}
    </Card>
  );
}

/* ---------- Row ---------- */

function CodeRow({
  code,
  now,
  redeemed,
  copied,
  onCopy,
  onToggleRedeemed,
}: {
  code: LockerCode;
  now: number;
  redeemed: boolean;
  copied: boolean;
  onCopy: (code: string, id: string) => void;
  onToggleRedeemed: (id: string) => void;
}) {
  const ms = msUntilExpiry(code, now);
  const tone = expiryTone(ms);
  const remaining = ms !== null ? formatCountdown(ms) : "no expiry posted";
  const isUnder1h = ms !== null && ms > 0 && ms < 3600_000;

  const toneText: Record<typeof tone, string> = {
    lime: "text-lime",
    ice: "text-ice",
    flame: "text-flame",
    gold: "text-gold",
    muted: "text-muted",
  };

  return (
    <Card
      className={`transition ${
        redeemed ? "opacity-50" : "hover:border-flame/40"
      }`}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          {/* Top meta row */}
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={modeTone(code.mode)}>{code.mode}</Pill>
            <TierBadge tier={code.tier} />
            {redeemed && <Pill tone="lime">✓ Redeemed</Pill>}
          </div>

          {/* Code (tap to copy) */}
          <button
            type="button"
            onClick={() => onCopy(code.code, code.id)}
            className="group mt-2 flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface2 px-3 py-2 text-left transition hover:border-flame/40"
            aria-label={`Copy code ${code.code}`}
          >
            <code className="break-all font-mono text-base font-bold text-ink md:text-lg">
              {code.code}
            </code>
            <span
              className={`shrink-0 text-[11px] font-bold uppercase tracking-wider transition ${
                copied ? "text-lime" : "text-muted group-hover:text-flame"
              }`}
            >
              {copied ? "Copied" : "Tap to copy"}
            </span>
          </button>

          {/* Rewards */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {code.rewards.map((r, i) => (
              <span
                key={i}
                className="rounded border border-line bg-surface2 px-2 py-1 text-[11px] font-semibold text-ink"
              >
                {r.qty ? `${r.qty.toLocaleString()} ${r.label}` : r.label}
              </span>
            ))}
          </div>

          {/* Source / drop date */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span>{code.source}</span>
            <span aria-hidden>·</span>
            <span className="num">Dropped {dropDate(code.droppedAt)}</span>
            {code.notes && (
              <>
                <span aria-hidden>·</span>
                <span>{code.notes}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: countdown + redeem */}
        <div className="flex flex-row items-center justify-between gap-3 md:flex-col md:items-end md:gap-2">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Expires
            </div>
            <div
              className={`font-display text-2xl tracking-wide num md:text-3xl ${toneText[tone]} ${isUnder1h ? "blink-1h" : ""}`}
            >
              {remaining}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggleRedeemed(code.id)}
            className={`rounded-md border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
              redeemed
                ? "border-lime/40 bg-lime/10 text-lime"
                : "border-line bg-surface2 text-ink hover:border-lime/40 hover:text-lime"
            }`}
          >
            {redeemed ? "Mark unredeemed" : "Mark redeemed"}
          </button>
        </div>
      </div>
    </Card>
  );
}
