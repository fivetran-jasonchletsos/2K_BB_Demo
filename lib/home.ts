// Date-seeded picks for the home page.
// All picks are deterministic per yyyy-mm-dd so the page reads like a
// "today's edition" cover — same content for every user on the same date.

import { ARCHETYPES, type Archetype, type AttrGroupKey, type BadgeRec } from "./builds";
import { BADGES, type Badge } from "./badges";
import { TIPS, type Tip } from "./tips";

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// FNV-1a, same family used elsewhere in the codebase.
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// ISO week-of-year, used to rotate the meta build of the day weekly.
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Meta build of the day:
// - Rotates across the 22+ archetypes weekly (one per week).
// - Within a week, the same archetype is shown every day.
export function metaBuildOfDay(d: Date = new Date()): Archetype {
  const week = isoWeek(d);
  return ARCHETYPES[week % ARCHETYPES.length];
}

// Top tip of the day: deterministic single pick from TIPS using the date hash.
export function tipOfDay(d: Date = new Date()): Tip {
  const seed = hashString(todayKey(d));
  return TIPS[seed % TIPS.length];
}

// 8 S-tier badges for the strip.
export function sTierBadges(): Badge[] {
  return BADGES.filter((b) => b.tier === "S").slice(0, 8);
}

// Returns the most recent positive patch delta for a badge, if any.
// Useful for the "current patch delta if positive" green annotation.
export function latestPositiveDelta(b: Badge): number | null {
  if (!b.patchHistory || b.patchHistory.length === 0) return null;
  const latest = b.patchHistory[0];
  if (latest && latest.delta > 0) return latest.delta;
  return null;
}

// Pick the four highest-value sub-attributes from an archetype's weights
// for display as bars on the home meta card. Returns label + value pairs
// scaled to a 0–99 display range so they read like attribute bars.
export type ArcheTopAttr = { key: AttrGroupKey; label: string; value: number };

const ATTR_LABELS: Record<AttrGroupKey, string> = {
  finishing: "Finishing",
  shooting: "Shooting",
  playmaking: "Playmaking",
  defense: "Defense",
  athleticism: "Athleticism",
  physicals: "Physicals",
};

export function archetypeTopAttrs(a: Archetype, count = 4): ArcheTopAttr[] {
  const entries = (Object.keys(a.weights) as AttrGroupKey[]).map((k) => {
    const weight = a.weights[k];
    // Map weights (~0.7–1.3) to a 99-cap display value.
    const value = Math.max(25, Math.min(99, Math.round(60 * weight + 18)));
    return { key: k, label: ATTR_LABELS[k], value };
  });
  entries.sort((a, b) => b.value - a.value);
  return entries.slice(0, count);
}

// Top three recommended badges for an archetype, sorted by tier strength.
export function archetypeTopBadges(a: Archetype, count = 3): BadgeRec[] {
  const tierRank: Record<BadgeRec["tier"], number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
  return [...a.badges].sort((x, y) => tierRank[x.tier] - tierRank[y.tier]).slice(0, count);
}
