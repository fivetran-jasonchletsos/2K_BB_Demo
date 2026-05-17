"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Pill, Section, Stat } from "@/components/ui";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  TIPS,
  type Tip,
  type TipCategory,
  averageVcEquivalent,
  easiestBigWin,
  pickDailyTips,
  todayKey,
} from "@/lib/tips";

type CategoryFilter = "all" | TipCategory;
type SortKey = "value" | "vcph" | "newest" | "difficulty";

const FAV_KEY = "2klab.favoriteTips";
const LEARNED_KEY = "2klab.learnedTips";
const COPY_COUNT_KEY = "2klab.tips.copyCounts";

const CATEGORY_TONE: Record<TipCategory, "flame" | "ice" | "gold" | "lime" | "default" | "muted"> = {
  "vc-farming": "gold",
  mechanics: "ice",
  mycareer: "flame",
  rep: "flame",
  animations: "ice",
  glitches: "muted",
  myteam: "gold",
  park: "lime",
  defense: "ice",
  offense: "flame",
};

const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = {
  1: "Easy",
  2: "Medium",
  3: "Advanced",
};

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, s: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(s)));
  } catch {
    /* ignore */
  }
}

function readCounts(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj as Record<string, number>;
    return {};
  } catch {
    return {};
  }
}

function writeCounts(key: string, c: Record<string, number>) {
  try {
    localStorage.setItem(key, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function parseVcNumber(value: string): number {
  const m = value.match(/([\d,]+)/);
  if (!m) return 0;
  return parseInt(m[1].replace(/,/g, ""), 10) || 0;
}

function hookFor(tip: Tip): string {
  if (tip.hook && tip.hook.length > 0) return tip.hook;
  const firstLine = (tip.body.split("\n").find(Boolean) ?? "").trim();
  if (firstLine.length <= 90) return firstLine;
  return firstLine.slice(0, 90).trimEnd() + "…";
}

function formatVcPerHour(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    // Trim trailing .0 — 22000 -> "22K", 9200 -> "9.2K"
    const s = k >= 10 ? Math.round(k).toString() : k.toFixed(1).replace(/\.0$/, "");
    return `${s}K/hr`;
  }
  return `${n}/hr`;
}

function tipToDiscord(tip: Tip): string {
  const headline = hookFor(tip);
  return `**${tip.title}**\n${headline}\n— from 2K LAB · /tips`;
}

function bulkTipsToDiscord(tips: Tip[]): string {
  const header = `**2K LAB · favorite tips (${tips.length})**`;
  const body = tips.map((t) => `• **${t.title}** — ${hookFor(t)}`).join("\n");
  return `${header}\n${body}\n— from 2K LAB · /tips`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  // Legacy fallback
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${DIFFICULTY_LABEL[level]} difficulty`}
      title={DIFFICULTY_LABEL[level]}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i <= level ? "bg-flame" : "bg-line"
          }`}
        />
      ))}
    </span>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${filled ? "fill-gold stroke-gold" : "fill-none stroke-muted"}`}
      strokeWidth={1.6}
      strokeLinejoin="round"
    >
      <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.6 6.6 20.4l1-6.1L3.2 10l6.1-.9z" />
    </svg>
  );
}

function CheckIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${filled ? "stroke-lime" : "stroke-muted"}`}
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="5 12 10 17 19 7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-muted"
      fill="none"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 stroke-muted transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TipCard({
  tip,
  favorited,
  learned,
  expanded,
  copyCount,
  justCopied,
  onToggleFav,
  onToggleLearned,
  onToggleExpand,
  onCopy,
}: {
  tip: Tip;
  favorited: boolean;
  learned: boolean;
  expanded: boolean;
  copyCount: number;
  justCopied: boolean;
  onToggleFav: () => void;
  onToggleLearned: () => void;
  onToggleExpand: () => void;
  onCopy: () => void;
}) {
  const tone = CATEGORY_TONE[tip.category];
  const paragraphs = tip.body.split("\n").filter(Boolean);
  const hook = hookFor(tip);
  return (
    <Card className={`flex flex-col gap-3 ${learned ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 text-left"
          aria-expanded={expanded}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={tone}>{CATEGORY_LABEL[tip.category]}</Pill>
            <DifficultyDots level={tip.difficulty} />
            {tip.vcPerHour != null && (
              <span className="num inline-flex items-baseline gap-0.5 rounded-md bg-gold/15 px-1.5 py-0.5 font-display text-[13px] font-bold leading-none text-gold">
                {formatVcPerHour(tip.vcPerHour)}
              </span>
            )}
          </div>
          <h3 className="mt-2 font-display text-xl leading-tight tracking-wide text-ink md:text-2xl">
            {tip.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-snug text-ink/80">{hook}</p>
        </button>
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleFav}
            aria-label={favorited ? "Unfavorite" : "Favorite"}
            aria-pressed={favorited}
            className="rounded-md border border-line bg-surface2 p-1.5 transition hover:border-gold/60"
          >
            <StarIcon filled={favorited} />
          </button>
          <button
            type="button"
            onClick={onToggleLearned}
            aria-label={learned ? "Unmark learned" : "Mark learned"}
            aria-pressed={learned}
            className="rounded-md border border-line bg-surface2 p-1.5 transition hover:border-lime/60"
          >
            <CheckIcon filled={learned} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={tone}>{tip.value}</Pill>
        <Pill tone="muted">{tip.timeToExecute}</Pill>
        {tip.patchVerified && <Pill tone="lime">Patch {tip.patchVerified}</Pill>}
        <div className="ml-auto flex items-center gap-1.5">
          {justCopied ? (
            <span className="inline-flex items-center rounded-full border border-lime/40 bg-lime/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime">
              Copied
            </span>
          ) : (
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy tip for Discord"
              className="inline-flex items-center gap-1 rounded-md border border-line bg-surface2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted transition hover:border-flame/50 hover:text-ink"
            >
              <CopyIcon />
              <span>Copy</span>
            </button>
          )}
          {copyCount > 0 && (
            <span
              className="num inline-flex items-center rounded-full bg-flame/15 px-1.5 py-0.5 text-[10px] font-bold text-flame"
              aria-label={`Copied ${copyCount} times`}
              title={`Copied ${copyCount} times`}
            >
              {copyCount}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted transition hover:border-flame/50 hover:text-ink"
          >
            <span>{expanded ? "Less" : "More"}</span>
            <ChevronIcon open={expanded} />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="space-y-1.5 border-t border-line pt-3 text-sm leading-snug text-ink/90">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {tip.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tip.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line bg-surface2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {tip.source && (
            <div className="text-[11px] text-muted">
              Source · <span className="text-ink/70">{tip.source}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function TipsPage() {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortKey>("value");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [todaysExpanded, setTodaysExpanded] = useState<Set<string>>(new Set());
  const [copyCounts, setCopyCounts] = useState<Record<string, number>>({});
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [bulkCopied, setBulkCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dateKey, setDateKey] = useState<string>(todayKey());

  useEffect(() => {
    setFavorites(readSet(FAV_KEY));
    setLearned(readSet(LEARNED_KEY));
    setCopyCounts(readCounts(COPY_COUNT_KEY));
    setHydrated(true);
    const id = setInterval(() => {
      const k = todayKey();
      setDateKey((prev) => (prev === k ? prev : k));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const todaysTips = useMemo(() => pickDailyTips(TIPS, 3, dateKey), [dateKey]);

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeSet(FAV_KEY, next);
      return next;
    });
  };

  const toggleLearned = (id: string) => {
    setLearned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeSet(LEARNED_KEY, next);
      return next;
    });
  };

  const toggleExpanded = (id: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const flashCopied = (id: string) => {
    setCopiedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setCopiedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  };

  const handleCopyTip = async (tip: Tip) => {
    const ok = await copyText(tipToDiscord(tip));
    if (!ok) return;
    flashCopied(tip.id);
    setCopyCounts((prev) => {
      const next = { ...prev, [tip.id]: (prev[tip.id] ?? 0) + 1 };
      writeCounts(COPY_COUNT_KEY, next);
      return next;
    });
  };

  const handleBulkCopy = async () => {
    const favTips = TIPS.filter((t) => favorites.has(t.id));
    if (favTips.length === 0) return;
    const ok = await copyText(bulkTipsToDiscord(favTips));
    if (!ok) return;
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2000);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = TIPS.slice();
    if (category !== "all") list = list.filter((t) => t.category === category);
    if (q) {
      list = list.filter((t) => {
        const hay =
          t.title.toLowerCase() +
          " " +
          (t.hook ?? "").toLowerCase() +
          " " +
          t.body.toLowerCase() +
          " " +
          t.tags.join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if (sort === "value") {
      list.sort((a, b) => parseVcNumber(b.value) - parseVcNumber(a.value));
    } else if (sort === "vcph") {
      list.sort((a, b) => {
        const av = a.vcPerHour ?? -1;
        const bv = b.vcPerHour ?? -1;
        return bv - av;
      });
    } else if (sort === "difficulty") {
      list.sort((a, b) => a.difficulty - b.difficulty);
    } else if (sort === "newest") {
      list.reverse();
    }
    return list;
  }, [category, sort, query]);

  const stats = useMemo(() => {
    const easiest = easiestBigWin(TIPS);
    return {
      total: TIPS.length,
      avg: averageVcEquivalent(TIPS),
      easiest,
    };
  }, []);

  const favCount = favorites.size;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
            NBA 2K26 · Knowledge Base
          </div>
          <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-6xl">
            Secrets
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Advanced mechanics · VC farming · animation unlocks · MyTeam edges
          </p>
        </div>
        {hydrated && (
          <button
            type="button"
            onClick={handleBulkCopy}
            disabled={favCount === 0}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
              favCount === 0
                ? "cursor-not-allowed border-line bg-surface text-muted/50"
                : bulkCopied
                  ? "border-lime/50 bg-lime/15 text-lime"
                  : "border-line bg-surface text-muted hover:border-flame/50 hover:text-ink"
            }`}
            aria-label="Copy all favorited tips as a Discord-ready list"
          >
            <CopyIcon />
            {bulkCopied ? (
              <span>Copied {favCount}</span>
            ) : (
              <span>
                Copy favorites <span className="num text-gold">{favCount}</span>
              </span>
            )}
          </button>
        )}
      </header>

      {/* TODAY'S THREE */}
      <Section
        title="Today's three"
        subtitle={`Rotates at midnight · ${dateKey}`}
      >
        {hydrated &&
        todaysTips.length > 0 &&
        todaysTips.every((t) => favorites.has(t.id) || learned.has(t.id)) ? (
          <div
            className="inline-flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-lime"
            aria-label="All of today's three tips are caught up"
          >
            <CheckIcon filled />
            <span>All caught up — back tomorrow</span>
          </div>
        ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {todaysTips.map((t) => {
            const isOpen = todaysExpanded.has(t.id);
            const tone = CATEGORY_TONE[t.category];
            const hook = hookFor(t);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  toggleExpanded(t.id, todaysExpanded, setTodaysExpanded)
                }
                className="group flex h-full flex-col gap-2 rounded-xl border border-flame/30 bg-gradient-to-br from-flame/[0.08] to-transparent p-4 text-left shadow-card transition hover:border-flame/60"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-1.5">
                  <Pill tone={tone}>{CATEGORY_LABEL[t.category]}</Pill>
                  <DifficultyDots level={t.difficulty} />
                  {t.vcPerHour != null && (
                    <span className="num ml-auto inline-flex items-baseline rounded-md bg-gold/15 px-1.5 py-0.5 font-display text-[13px] font-bold leading-none text-gold">
                      {formatVcPerHour(t.vcPerHour)}
                    </span>
                  )}
                </div>
                <div className="font-display text-lg leading-tight tracking-wide text-ink md:text-xl">
                  {t.title}
                </div>
                {isOpen ? (
                  <div className="text-sm text-ink/80">
                    {t.body.split("\n").filter(Boolean).map((p, i) => (
                      <p key={i} className="mb-1.5 last:mb-0">
                        {p}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-ink/80">{hook}</div>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                  <Pill tone="muted">{t.timeToExecute}</Pill>
                  <Pill tone={tone}>{t.value}</Pill>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted group-hover:text-flame">
                    {isOpen ? "Tap to collapse" : "Tap to expand"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        )}
      </Section>

      {/* STATS */}
      <section aria-label="Knowledge base stats" className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        <Stat label="Total tips" value={stats.total} hint="Across 10 categories" />
        <Stat label="Avg VC equivalent" value={stats.avg} hint="Per tip with VC value" tone="gold" />
        <Stat
          label="Easiest big win"
          value={
            <span className="text-base leading-tight md:text-lg">
              {stats.easiest?.title ?? "—"}
            </span>
          }
          hint={stats.easiest ? stats.easiest.value : undefined}
          tone="lime"
        />
      </section>

      {/* FILTER ROW */}
      <section aria-label="Filters" className="space-y-3">
        <div className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1">
          {(["all", ...CATEGORY_ORDER] as CategoryFilter[]).map((c) => {
            const active = category === c;
            const label = c === "all" ? "All" : CATEGORY_LABEL[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  active
                    ? "border-flame bg-flame/15 text-flame"
                    : "border-line bg-surface text-muted hover:border-flame/40 hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            type="search"
            placeholder="Search title, hook, body, or tags"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              ["value", "Highest value"],
              ["vcph", "VC/hr"],
              ["newest", "Newest"],
              ["difficulty", "Difficulty"],
            ] as [SortKey, string][]).map(([k, label]) => {
              const active = sort === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSort(k)}
                  aria-pressed={active}
                  className={`rounded-md border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
                    active
                      ? "border-ice bg-ice/15 text-ice"
                      : "border-line bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <span>
            Showing <span className="num text-ink">{filtered.length}</span> of{" "}
            <span className="num text-ink">{TIPS.length}</span>
          </span>
          {hydrated && (
            <span>
              <span className="num text-gold">{favorites.size}</span> favorited ·{" "}
              <span className="num text-lime">{learned.size}</span> learned
            </span>
          )}
        </div>
      </section>

      {/* TIP LIST */}
      <section aria-label="Tip list">
        {filtered.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            No tips match that filter. Clear the search or pick a different category.
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filtered.map((tip) => (
              <li key={tip.id}>
                <TipCard
                  tip={tip}
                  favorited={favorites.has(tip.id)}
                  learned={learned.has(tip.id)}
                  expanded={expanded.has(tip.id)}
                  copyCount={copyCounts[tip.id] ?? 0}
                  justCopied={copiedIds.has(tip.id)}
                  onToggleFav={() => toggleFav(tip.id)}
                  onToggleLearned={() => toggleLearned(tip.id)}
                  onToggleExpand={() =>
                    toggleExpanded(tip.id, expanded, setExpanded)
                  }
                  onCopy={() => handleCopyTip(tip)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* DISCLAIMER */}
      <Card className="border-muted/30 bg-surface2/40">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          Heads up
        </div>
        <p className="mt-1 text-xs text-muted">
          Some mechanics get patched. Verify against your current 2K26 version
          before relying on any timing window or unlock req. Patch tags reflect
          last confirmed build.
        </p>
      </Card>
    </div>
  );
}
