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
type SortKey = "value" | "newest" | "difficulty";

const FAV_KEY = "2klab.favoriteTips";
const LEARNED_KEY = "2klab.learnedTips";

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

function parseVcNumber(value: string): number {
  const m = value.match(/([\d,]+)/);
  if (!m) return 0;
  return parseInt(m[1].replace(/,/g, ""), 10) || 0;
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

function TipCard({
  tip,
  favorited,
  learned,
  expanded,
  onToggleFav,
  onToggleLearned,
  onToggleExpand,
  compact = false,
}: {
  tip: Tip;
  favorited: boolean;
  learned: boolean;
  expanded: boolean;
  onToggleFav: () => void;
  onToggleLearned: () => void;
  onToggleExpand: () => void;
  compact?: boolean;
}) {
  const tone = CATEGORY_TONE[tip.category];
  const paragraphs = tip.body.split("\n").filter(Boolean);
  return (
    <Card
      className={`flex flex-col gap-3 ${learned ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 text-left"
          aria-expanded={expanded}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={tone}>{CATEGORY_LABEL[tip.category]}</Pill>
            <DifficultyDots level={tip.difficulty} />
          </div>
          <h3 className="mt-2 font-display text-xl leading-tight tracking-wide text-ink md:text-2xl">
            {tip.title}
          </h3>
        </button>
        <div className="flex shrink-0 flex-col items-center gap-2">
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

      {(expanded || !compact) && (
        <div className="space-y-1.5 text-sm leading-snug text-ink/90">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone="muted">{tip.timeToExecute}</Pill>
        <Pill tone={tone}>{tip.value}</Pill>
        {tip.patchVerified && (
          <Pill tone="lime">Patch {tip.patchVerified}</Pill>
        )}
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
  const [hydrated, setHydrated] = useState(false);
  const [dateKey, setDateKey] = useState<string>(todayKey());

  useEffect(() => {
    setFavorites(readSet(FAV_KEY));
    setLearned(readSet(LEARNED_KEY));
    setHydrated(true);
    // Recheck the date every 60s so the daily three rotate at midnight.
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = TIPS.slice();
    if (category !== "all") list = list.filter((t) => t.category === category);
    if (q) {
      list = list.filter((t) => {
        const hay =
          t.title.toLowerCase() +
          " " +
          t.body.toLowerCase() +
          " " +
          t.tags.join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if (sort === "value") {
      list.sort((a, b) => parseVcNumber(b.value) - parseVcNumber(a.value));
    } else if (sort === "difficulty") {
      list.sort((a, b) => a.difficulty - b.difficulty);
    } else if (sort === "newest") {
      // No real timestamps — keep array order (newest authored last). Reverse.
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

  return (
    <div className="space-y-8">
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          NBA 2K26 · Knowledge Base
        </div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-6xl">
          Secrets
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Hidden mechanics · VC farming · animation unlocks · MyTeam edges
        </p>
      </header>

      {/* TODAY'S THREE */}
      <Section
        title="Today's three"
        subtitle={`Rotates at midnight · ${dateKey}`}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {todaysTips.map((t) => {
            const isOpen = todaysExpanded.has(t.id);
            const tone = CATEGORY_TONE[t.category];
            const firstLine = t.body.split("\n")[0] ?? "";
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
                </div>
                <div className="font-display text-lg leading-tight tracking-wide text-ink md:text-xl">
                  {t.title}
                </div>
                <div
                  className={`text-sm text-ink/80 ${isOpen ? "" : "line-clamp-2"}`}
                >
                  {isOpen ? (
                    t.body.split("\n").filter(Boolean).map((p, i) => (
                      <p key={i} className="mb-1.5 last:mb-0">
                        {p}
                      </p>
                    ))
                  ) : (
                    firstLine
                  )}
                </div>
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
            placeholder="Search title, body, or tags"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            {([
              ["value", "Highest value"],
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
                  onToggleFav={() => toggleFav(tip.id)}
                  onToggleLearned={() => toggleLearned(tip.id)}
                  onToggleExpand={() =>
                    toggleExpanded(tip.id, expanded, setExpanded)
                  }
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
