"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PLAYERS,
  TEAMS,
  ARCHETYPE_LABELS,
  searchPlayers,
  computeMatchup,
  getPlayer,
  type Player,
  type Position,
  type MatchupResult,
} from "@/lib/players";
import { Card, Pill, Stat, TierBadge, Bar } from "@/components/ui";

type Mode = "browse" | "matchup";

type SavedMatchup = { a: string; b: string; savedAt: number };

const MATCHUPS_KEY = "2klab.matchups";

function loadSavedMatchups(): SavedMatchup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MATCHUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is SavedMatchup =>
        m &&
        typeof m.a === "string" &&
        typeof m.b === "string" &&
        typeof m.savedAt === "number"
    );
  } catch {
    return [];
  }
}

function saveMatchupPair(aId: string, bId: string) {
  if (typeof window === "undefined") return;
  const cur = loadSavedMatchups();
  // Dedupe by ordered pair.
  const filtered = cur.filter((m) => !(m.a === aId && m.b === bId));
  const next: SavedMatchup[] = [
    { a: aId, b: bId, savedAt: Date.now() },
    ...filtered,
  ].slice(0, 8);
  try {
    window.localStorage.setItem(MATCHUPS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

type PosFilter = "All" | "G" | "F" | "C";
type SortKey = "rating" | "name" | "form";

const POS_GROUPS: Record<PosFilter, (p: Position) => boolean> = {
  All: () => true,
  G: (p) => p === "PG" || p === "SG" || p === "G",
  F: (p) => p === "SF" || p === "PF" || p === "F",
  C: (p) => p === "C",
};

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function readableTextOn(hex: string): string {
  // pick black or white based on luminance
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.55 ? "#0A0A0B" : "#F5F5F7";
}

function DeltaTag({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <span className="font-mono text-xs text-muted">— 0</span>
    );
  if (delta > 0)
    return (
      <span className="font-mono text-xs font-bold text-lime">
        ▲ +{delta}
      </span>
    );
  return (
    <span className="font-mono text-xs font-bold text-flame">
      ▼ {delta}
    </span>
  );
}

function topBadges(p: Player) {
  const order = { S: 0, A: 1, B: 2, C: 3, D: 4 } as const;
  return [...p.badges]
    .sort((a, b) => order[a.tier] - order[b.tier])
    .slice(0, 3);
}

function archeLabel(id: string) {
  return ARCHETYPE_LABELS[id] ?? id;
}

// ---------- Player Card ----------

function PlayerCard({
  player,
  expanded,
  onToggle,
  onCompare,
  inCompare,
}: {
  player: Player;
  expanded: boolean;
  onToggle: () => void;
  onCompare: () => void;
  inCompare: boolean;
}) {
  const team = TEAMS[player.team];
  const teamColor = team?.primary ?? "#26262F";
  const avatarText = readableTextOn(teamColor);
  const tops = topBadges(player);
  const sTier = player.badges.find((b) => b.tier === "S");

  return (
    <Card className="flex flex-col gap-3 transition-shadow hover:shadow-glow">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={expanded}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl font-display text-xl tracking-wider"
          style={{ background: teamColor, color: avatarText }}
        >
          {initials(player.displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-2xl leading-none tracking-wide text-ink">
              {player.displayName}
            </h3>
            {sTier && <TierBadge tier="S" />}
          </div>
          <div className="mt-1 text-xs text-muted">
            <span className="font-semibold text-ink">{team?.abbr}</span>
            <span className="px-1.5 text-line">·</span>
            {player.position}
            <span className="px-1.5 text-line">·</span>
            {player.height}
            <span className="px-1.5 text-line">·</span>
            {player.age}y
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <div className="font-mono text-3xl font-bold leading-none text-ink">
            {player.rating2k}
          </div>
          <div className="mt-1">
            <DeltaTag delta={player.ratingDelta} />
          </div>
        </div>
      </button>

      {/* mini stat line */}
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-surface2 px-2 py-2 font-mono text-[11px]">
        <div className="text-center">
          <div className="text-muted">PPG</div>
          <div className="font-bold text-ink">{player.last10.ppg.toFixed(1)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted">RPG</div>
          <div className="font-bold text-ink">{player.last10.rpg.toFixed(1)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted">APG</div>
          <div className="font-bold text-ink">{player.last10.apg.toFixed(1)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted">FG%</div>
          <div className="font-bold text-ink">
            {(player.last10.fgPct * 100).toFixed(1)}
          </div>
        </div>
      </div>

      {/* badges */}
      <div className="flex flex-wrap gap-1.5">
        {tops.map((bd) => (
          <Pill
            key={bd.name}
            tone={
              bd.tier === "S"
                ? "gold"
                : bd.tier === "A"
                ? "flame"
                : bd.tier === "B"
                ? "ice"
                : bd.tier === "C"
                ? "lime"
                : "muted"
            }
          >
            {bd.tier} · {bd.name}
          </Pill>
        ))}
      </div>

      {/* actions */}
      <div className="flex gap-2">
        <button
          onClick={onToggle}
          className="flex-1 rounded-lg border border-line bg-surface2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink hover:border-flame/40 hover:text-flame"
        >
          {expanded ? "Hide" : "Details"}
        </button>
        <button
          onClick={onCompare}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
            inCompare
              ? "border-flame/60 bg-flame/15 text-flame"
              : "border-line bg-surface2 text-ink hover:border-ice/40 hover:text-ice"
          }`}
        >
          {inCompare ? "In Compare" : "Compare"}
        </button>
      </div>

      {expanded && <PlayerDetail player={player} />}
    </Card>
  );
}

// ---------- Detail Panel ----------

function PlayerDetail({ player }: { player: Player }) {
  const a = player.attributes;
  const rows: { label: string; value: number; tone: "flame" | "ice" | "gold" | "lime" }[] = [
    { label: "3PT", value: a.threePt, tone: "ice" },
    { label: "Mid", value: a.midRange, tone: "ice" },
    { label: "Layup", value: a.layup, tone: "flame" },
    { label: "Dunk", value: a.dunk, tone: "flame" },
    { label: "Handle", value: a.ballHandle, tone: "gold" },
    { label: "Pass", value: a.pass, tone: "gold" },
    { label: "Perim D", value: a.perimDef, tone: "lime" },
    { label: "Int D", value: a.intDef, tone: "lime" },
    { label: "REB", value: a.rebound, tone: "lime" },
    { label: "Speed", value: a.speed, tone: "flame" },
    { label: "Strength", value: a.strength, tone: "flame" },
    { label: "Vert", value: a.vertical, tone: "flame" },
  ];

  return (
    <div className="mt-2 flex flex-col gap-4 border-t border-line pt-4">
      {/* Attributes grid */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Attributes
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <div className="w-16 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {r.label}
              </div>
              <div className="flex-1">
                <Bar value={r.value} tone={r.tone} />
              </div>
              <div className="w-7 text-right font-mono text-xs text-ink">
                {r.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges full list */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Badges
        </div>
        <div className="flex flex-wrap gap-1.5">
          {player.badges.map((bd) => (
            <span
              key={bd.name}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface2 px-2 py-1"
            >
              <TierBadge tier={bd.tier} />
              <span className="text-[11px] font-semibold text-ink">{bd.name}</span>
              <span className="text-[10px] text-muted">{bd.category}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Archetype linker */}
      <div className="rounded-lg border border-line bg-surface2 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Closest Archetype
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="font-display text-xl text-ink">
            {archeLabel(player.archetypeId)}
          </div>
          <Link
            href={`/builds?arche=${player.archetypeId}`}
            className="rounded-lg border border-flame/40 bg-flame/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-flame hover:bg-flame/20"
          >
            Open in Build Lab →
          </Link>
        </div>
      </div>

      {/* Game log */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          Last {player.recentGames.length} Games
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 pr-2 font-semibold">Date</th>
                <th className="py-1 pr-2 font-semibold">Opp</th>
                <th className="py-1 pr-2 text-right font-semibold">MIN</th>
                <th className="py-1 pr-2 text-right font-semibold">PTS</th>
                <th className="py-1 pr-2 text-right font-semibold">REB</th>
                <th className="py-1 pr-2 text-right font-semibold">AST</th>
                <th className="py-1 text-right font-semibold">+/-</th>
              </tr>
            </thead>
            <tbody>
              {player.recentGames.map((g, i) => (
                <tr key={i} className="border-t border-line text-ink">
                  <td className="py-1 pr-2 text-muted">{g.date.slice(5)}</td>
                  <td className="py-1 pr-2">{g.opp}</td>
                  <td className="py-1 pr-2 text-right">{g.min}</td>
                  <td className="py-1 pr-2 text-right font-bold">{g.pts}</td>
                  <td className="py-1 pr-2 text-right">{g.reb}</td>
                  <td className="py-1 pr-2 text-right">{g.ast}</td>
                  <td
                    className={`py-1 text-right ${
                      g.plusMinus > 0
                        ? "text-lime"
                        : g.plusMinus < 0
                        ? "text-flame"
                        : "text-muted"
                    }`}
                  >
                    {g.plusMinus > 0 ? "+" : ""}
                    {g.plusMinus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prediction */}
      <div className="rounded-lg border border-line bg-surface2 p-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Predicted Next Rating Change
          </div>
          <Pill
            tone={
              player.predicted.confidence === "high"
                ? "lime"
                : player.predicted.confidence === "med"
                ? "ice"
                : "muted"
            }
          >
            {player.predicted.confidence} confidence
          </Pill>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div
            className={`font-display text-3xl ${
              player.predicted.nextDelta > 0
                ? "text-lime"
                : player.predicted.nextDelta < 0
                ? "text-flame"
                : "text-ink"
            }`}
          >
            {player.predicted.nextDelta > 0 ? "+" : ""}
            {player.predicted.nextDelta}
          </div>
          <div className="text-xs text-muted">vs current {player.rating2k}</div>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink">
          {player.predicted.reason}
        </p>
      </div>
    </div>
  );
}

// ---------- Compare Drawer ----------

function CompareDrawer({
  players,
  onClose,
  onRemove,
}: {
  players: Player[];
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  if (players.length === 0) return null;

  const rows: { label: string; get: (p: Player) => number | string }[] = [
    { label: "2K OVR", get: (p) => p.rating2k },
    { label: "Δ Week", get: (p) => (p.ratingDelta > 0 ? `+${p.ratingDelta}` : p.ratingDelta) },
    { label: "PPG", get: (p) => p.last10.ppg.toFixed(1) },
    { label: "RPG", get: (p) => p.last10.rpg.toFixed(1) },
    { label: "APG", get: (p) => p.last10.apg.toFixed(1) },
    { label: "FG%", get: (p) => (p.last10.fgPct * 100).toFixed(1) },
    { label: "3P%", get: (p) => (p.last10.threePct * 100).toFixed(1) },
    { label: "+/-", get: (p) => (p.last10.plusMinus > 0 ? `+${p.last10.plusMinus.toFixed(1)}` : p.last10.plusMinus.toFixed(1)) },
    { label: "3PT", get: (p) => p.attributes.threePt },
    { label: "Mid", get: (p) => p.attributes.midRange },
    { label: "Drive", get: (p) => p.attributes.layup },
    { label: "Handle", get: (p) => p.attributes.ballHandle },
    { label: "Pass", get: (p) => p.attributes.pass },
    { label: "PerimD", get: (p) => p.attributes.perimDef },
    { label: "IntD", get: (p) => p.attributes.intDef },
    { label: "Speed", get: (p) => p.attributes.speed },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface shadow-card md:inset-y-0 md:right-0 md:left-auto md:w-[420px] md:border-l md:border-t-0">
      <div className="flex items-center justify-between border-b border-line p-3">
        <div className="font-display text-xl tracking-wide text-ink">
          Compare ({players.length}/2)
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-line bg-surface2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
        >
          Close
        </button>
      </div>

      <div className="max-h-[55vh] overflow-y-auto p-3 md:max-h-[calc(100vh-60px)]">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {players.map((p) => {
            const t = TEAMS[p.team];
            const tc = t?.primary ?? "#26262F";
            return (
              <div
                key={p.id}
                className="rounded-lg border border-line bg-surface2 p-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md font-display text-sm"
                    style={{ background: tc, color: readableTextOn(tc) }}
                  >
                    {initials(p.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-sm tracking-wide text-ink">
                      {p.displayName}
                    </div>
                    <div className="text-[10px] text-muted">
                      {t?.abbr} · {p.position}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(p.id)}
                  className="mt-2 w-full rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-flame hover:bg-flame/10"
                >
                  ✕ Remove
                </button>
              </div>
            );
          })}
        </div>

        {players.length === 2 ? (
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="text-muted">
                <th className="py-1 text-left font-semibold">Stat</th>
                <th className="py-1 text-right font-semibold">
                  {players[0].lastName}
                </th>
                <th className="py-1 text-right font-semibold">
                  {players[1].lastName}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const v0 = r.get(players[0]);
                const v1 = r.get(players[1]);
                const n0 = typeof v0 === "number" ? v0 : parseFloat(String(v0));
                const n1 = typeof v1 === "number" ? v1 : parseFloat(String(v1));
                const w0 = !isNaN(n0) && !isNaN(n1) && n0 > n1;
                const w1 = !isNaN(n0) && !isNaN(n1) && n1 > n0;
                return (
                  <tr key={r.label} className="border-t border-line text-ink">
                    <td className="py-1 text-left text-muted">{r.label}</td>
                    <td
                      className={`py-1 text-right ${
                        w0 ? "font-bold text-lime" : ""
                      }`}
                    >
                      {v0}
                    </td>
                    <td
                      className={`py-1 text-right ${
                        w1 ? "font-bold text-lime" : ""
                      }`}
                    >
                      {v1}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-surface2 p-4 text-center text-xs text-muted">
            Tap Compare on another player to see side-by-side stats.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Player Picker Modal (for Matchup slots) ----------

function PlayerPickerModal({
  open,
  slot,
  excludeId,
  onPick,
  onClose,
}: {
  open: boolean;
  slot: "A" | "B";
  excludeId?: string;
  onPick: (p: Player) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<PosFilter>("All");

  const list = useMemo(() => {
    let l = q ? searchPlayers(q) : PLAYERS;
    l = l.filter((p) => POS_GROUPS[pos](p.position));
    if (excludeId) l = l.filter((p) => p.id !== excludeId);
    return [...l].sort((a, b) => b.rating2k - a.rating2k).slice(0, 60);
  }, [q, pos, excludeId]);

  // Reset query when modal opens.
  useEffect(() => {
    if (open) {
      setQ("");
      setPos("All");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4">
      <div className="flex h-[88vh] w-full max-w-2xl flex-col rounded-t-2xl border border-line bg-surface shadow-card md:h-[78vh] md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line p-3">
          <div className="font-display text-xl tracking-wide text-ink">
            Pick Player {slot}
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-line bg-surface2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-2 border-b border-line p-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players (e.g. tatum, sga, wemby)"
            className="w-full rounded-lg border border-line bg-surface2 px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Pos
            </span>
            {(["All", "G", "F", "C"] as PosFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPos(p)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  pos === p
                    ? "border-flame bg-flame/10 text-flame"
                    : "border-line bg-surface2 text-muted hover:text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {list.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted">
              No matches. Loosen the filter.
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {list.map((p) => {
                const t = TEAMS[p.team];
                const tc = t?.primary ?? "#26262F";
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => onPick(p)}
                      className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface2 px-2 py-2 text-left hover:border-flame/40"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-display text-sm"
                        style={{ background: tc, color: readableTextOn(tc) }}
                      >
                        {initials(p.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-base tracking-wide text-ink">
                          {p.displayName}
                        </div>
                        <div className="text-[10px] text-muted">
                          {t?.abbr} · {p.position} · {p.height}
                        </div>
                      </div>
                      <div className="font-mono text-lg font-bold text-ink">
                        {p.rating2k}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Matchup View ----------

function MatchupSlot({
  slot,
  player,
  onOpen,
  onClear,
}: {
  slot: "A" | "B";
  player: Player | null;
  onOpen: () => void;
  onClear: () => void;
}) {
  if (!player) {
    return (
      <button
        onClick={onOpen}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface2 p-6 text-center transition-colors hover:border-flame/40"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-surface font-display text-2xl text-muted">
          {slot}
        </div>
        <div className="font-display text-lg text-ink">Pick Player {slot}</div>
        <div className="text-[11px] text-muted">Tap to search</div>
      </button>
    );
  }
  const t = TEAMS[player.team];
  const tc = t?.primary ?? "#26262F";
  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface2 p-3">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl font-display text-xl"
        style={{ background: tc, color: readableTextOn(tc) }}
      >
        {initials(player.displayName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Player {slot}
        </div>
        <div className="truncate font-display text-xl leading-tight tracking-wide text-ink">
          {player.displayName}
        </div>
        <div className="text-[11px] text-muted">
          {t?.abbr} · {player.position} · {player.rating2k} OVR
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          onClick={onOpen}
          className="rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink hover:border-ice/40"
        >
          Swap
        </button>
        <button
          onClick={onClear}
          className="rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-flame hover:bg-flame/10"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function AttrBarRow({
  label,
  aVal,
  bVal,
}: {
  label: string;
  aVal: number;
  bVal: number;
}) {
  const lead: "A" | "B" | "EVEN" =
    aVal === bVal ? "EVEN" : aVal > bVal ? "A" : "B";
  const aTone: "lime" | "flame" | "ice" =
    lead === "A" ? "lime" : lead === "B" ? "flame" : "ice";
  const bTone: "lime" | "flame" | "ice" =
    lead === "B" ? "lime" : lead === "A" ? "flame" : "ice";
  return (
    <div className="grid grid-cols-[2.25rem_1fr_3rem_1fr_2.25rem] items-center gap-2">
      <div
        className={`text-right font-mono text-xs ${
          lead === "A" ? "font-bold text-lime" : "text-ink"
        }`}
      >
        {aVal}
      </div>
      <div className="flex justify-end">
        <div className="w-full max-w-[140px] rotate-180">
          <Bar value={aVal} tone={aTone} />
        </div>
      </div>
      <div className="text-center text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="w-full max-w-[140px]">
        <Bar value={bVal} tone={bTone} />
      </div>
      <div
        className={`text-left font-mono text-xs ${
          lead === "B" ? "font-bold text-lime" : "text-ink"
        }`}
      >
        {bVal}
      </div>
    </div>
  );
}

function MatchupView({
  result,
  onSave,
}: {
  result: MatchupResult;
  onSave: () => void;
}) {
  const { a, b, ovrDelta, rows, edges, isoAdvantage, formDelta, badges } =
    result;
  const aTeam = TEAMS[a.team];
  const bTeam = TEAMS[b.team];
  const aColor = aTeam?.primary ?? "#26262F";
  const bColor = bTeam?.primary ?? "#26262F";

  const ovrTone =
    ovrDelta > 0 ? "text-lime" : ovrDelta < 0 ? "text-flame" : "text-muted";
  const isoLabel =
    isoAdvantage.side === "EVEN"
      ? `Even ISO · ${isoAdvantage.pctA}% / ${100 - isoAdvantage.pctA}%`
      : `${isoAdvantage.side === "A" ? a.lastName : b.lastName} edge ${
          isoAdvantage.side === "A"
            ? isoAdvantage.pctA
            : 100 - isoAdvantage.pctA
        }%`;

  const edgeSummary = edges
    .map((e) => {
      if (e.winner === "EVEN") return `Even ${e.dimension}`;
      const name = e.winner === "A" ? a.lastName : b.lastName;
      return `${name} wins ${e.dimension} +${Math.abs(e.delta)}`;
    })
    .join(" · ");

  return (
    <div className="flex flex-col gap-4">
      {/* VS row */}
      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-display text-base md:h-12 md:w-12 md:text-lg"
              style={{ background: aColor, color: readableTextOn(aColor) }}
            >
              {initials(a.displayName)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-xl tracking-wide text-ink md:text-3xl">
                {a.displayName}
              </div>
              <div className="text-[10px] text-muted md:text-xs">
                {aTeam?.abbr} · {a.position}
              </div>
            </div>
          </div>
          <div className="font-display text-2xl tracking-widest text-muted md:text-4xl">
            VS
          </div>
          <div className="flex items-center justify-end gap-2 md:gap-3">
            <div className="min-w-0 text-right">
              <div className="truncate font-display text-xl tracking-wide text-ink md:text-3xl">
                {b.displayName}
              </div>
              <div className="text-[10px] text-muted md:text-xs">
                {bTeam?.abbr} · {b.position}
              </div>
            </div>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-display text-base md:h-12 md:w-12 md:text-lg"
              style={{ background: bColor, color: readableTextOn(bColor) }}
            >
              {initials(b.displayName)}
            </div>
          </div>
        </div>

        {/* OVR comparison */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line pt-3">
          <div className="text-left font-mono text-3xl font-bold text-ink md:text-4xl">
            {a.rating2k}
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              OVR Δ
            </div>
            <div className={`font-display text-2xl ${ovrTone}`}>
              {ovrDelta > 0 ? `+${ovrDelta}` : ovrDelta}
            </div>
          </div>
          <div className="text-right font-mono text-3xl font-bold text-ink md:text-4xl">
            {b.rating2k}
          </div>
        </div>

        {/* Save / saved hint */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted">
            {a.lastName} {a.rating2k} OVR · {b.lastName} {b.rating2k} OVR ·{" "}
            {edges[0].winner === "EVEN"
              ? "Even Scoring"
              : `${
                  edges[0].winner === "A" ? a.lastName : b.lastName
                } +${Math.abs(edges[0].delta)} Scoring`}
          </div>
          <button
            onClick={onSave}
            className="rounded-md border border-line bg-surface2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink hover:border-ice/40 hover:text-ice"
          >
            Save Matchup
          </button>
        </div>
      </Card>

      {/* Edge summary */}
      <Card className="flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Dimension Edges
        </div>
        <div className="flex flex-wrap gap-1.5">
          {edges.map((e) => {
            const tone: "lime" | "flame" | "muted" =
              e.winner === "EVEN"
                ? "muted"
                : e.winner === "A"
                ? "lime"
                : "flame";
            const text =
              e.winner === "EVEN"
                ? `Even ${e.dimension}`
                : `${
                    e.winner === "A" ? a.lastName : b.lastName
                  } ${e.dimension} +${Math.abs(e.delta)}`;
            return (
              <Pill key={e.dimension} tone={tone}>
                {text}
              </Pill>
            );
          })}
        </div>
        <div className="text-[11px] leading-relaxed text-muted">
          {edgeSummary}.
        </div>
      </Card>

      {/* ISO prediction */}
      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            1v1 ISO · Neutral Court
          </div>
          <Pill tone="ice">model</Pill>
        </div>
        <div className="font-display text-2xl text-ink">{isoLabel}</div>
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          <div className="rounded-md border border-line bg-surface2 px-2 py-1">
            <span className="text-muted">{a.lastName}</span>{" "}
            <span className="font-bold text-ink">{isoAdvantage.pctA}%</span>
          </div>
          <div className="rounded-md border border-line bg-surface2 px-2 py-1 text-right">
            <span className="font-bold text-ink">
              {100 - isoAdvantage.pctA}%
            </span>{" "}
            <span className="text-muted">{b.lastName}</span>
          </div>
        </div>
        <div className="text-[11px] leading-relaxed text-muted">
          Weighted 50% scoring · 30% playmaking · 20% defense. Clamped 30–85%.
        </div>
      </Card>

      {/* Attribute bars */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Attribute Matchup
          </div>
          <div className="font-mono text-[10px] text-muted">
            {a.lastName} · {b.lastName}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <AttrBarRow
              key={r.key}
              label={r.label}
              aVal={r.a}
              bVal={r.b}
            />
          ))}
        </div>
      </Card>

      {/* Form + Last-10 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Recent Form Δ
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="rounded-md border border-line bg-surface2 p-2">
              <div className="text-[10px] text-muted">{a.lastName}</div>
              <DeltaTag delta={a.ratingDelta} />
            </div>
            <div className="rounded-md border border-line bg-surface2 p-2">
              <div className="text-[10px] text-muted">{b.lastName}</div>
              <DeltaTag delta={b.ratingDelta} />
            </div>
          </div>
          <div className="text-[11px] text-muted">
            Form gap{" "}
            <span
              className={`font-mono ${
                formDelta > 0
                  ? "text-lime"
                  : formDelta < 0
                  ? "text-flame"
                  : "text-muted"
              }`}
            >
              {formDelta > 0 ? `+${formDelta}` : formDelta}
            </span>{" "}
            in {a.lastName}&apos;s favor.
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Last-10 Averages
          </div>
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="text-muted">
                <th className="py-1 text-left font-semibold">Stat</th>
                <th className="py-1 text-right font-semibold">{a.lastName}</th>
                <th className="py-1 text-right font-semibold">{b.lastName}</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["PPG", a.last10.ppg.toFixed(1), b.last10.ppg.toFixed(1)],
                  ["RPG", a.last10.rpg.toFixed(1), b.last10.rpg.toFixed(1)],
                  ["APG", a.last10.apg.toFixed(1), b.last10.apg.toFixed(1)],
                  [
                    "FG%",
                    (a.last10.fgPct * 100).toFixed(1),
                    (b.last10.fgPct * 100).toFixed(1),
                  ],
                  [
                    "3P%",
                    (a.last10.threePct * 100).toFixed(1),
                    (b.last10.threePct * 100).toFixed(1),
                  ],
                  [
                    "+/-",
                    a.last10.plusMinus > 0
                      ? `+${a.last10.plusMinus.toFixed(1)}`
                      : a.last10.plusMinus.toFixed(1),
                    b.last10.plusMinus > 0
                      ? `+${b.last10.plusMinus.toFixed(1)}`
                      : b.last10.plusMinus.toFixed(1),
                  ],
                ] as [string, string, string][]
              ).map(([label, av, bv]) => {
                const an = parseFloat(av);
                const bn = parseFloat(bv);
                const aw = !isNaN(an) && !isNaN(bn) && an > bn;
                const bw = !isNaN(an) && !isNaN(bn) && bn > an;
                return (
                  <tr key={label} className="border-t border-line text-ink">
                    <td className="py-1 text-left text-muted">{label}</td>
                    <td
                      className={`py-1 text-right ${
                        aw ? "font-bold text-lime" : ""
                      }`}
                    >
                      {av}
                    </td>
                    <td
                      className={`py-1 text-right ${
                        bw ? "font-bold text-lime" : ""
                      }`}
                    >
                      {bv}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Badges overlap */}
      <Card className="flex flex-col gap-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
          S/A Badges
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink">
              Shared ({badges.shared.length})
            </div>
            {badges.shared.length === 0 ? (
              <div className="text-[11px] text-muted">No overlap.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {badges.shared.map((bd) => (
                  <Pill
                    key={`s-${bd.name}`}
                    tone={bd.tier === "S" ? "gold" : "flame"}
                  >
                    {bd.tier} · {bd.name}
                  </Pill>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink">
              {a.lastName} only ({badges.onlyA.length})
            </div>
            {badges.onlyA.length === 0 ? (
              <div className="text-[11px] text-muted">—</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {badges.onlyA.map((bd) => (
                  <Pill
                    key={`a-${bd.name}`}
                    tone={bd.tier === "S" ? "gold" : "flame"}
                  >
                    {bd.tier} · {bd.name}
                  </Pill>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink">
              {b.lastName} only ({badges.onlyB.length})
            </div>
            {badges.onlyB.length === 0 ? (
              <div className="text-[11px] text-muted">—</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {badges.onlyB.map((bd) => (
                  <Pill
                    key={`b-${bd.name}`}
                    tone={bd.tier === "S" ? "gold" : "flame"}
                  >
                    {bd.tier} · {bd.name}
                  </Pill>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------- Page ----------

export default function PlayersPage() {
  const [mode, setMode] = useState<Mode>("browse");
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<PosFilter>("All");
  const [teamFilter, setTeamFilter] = useState<Set<string>>(new Set());
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const [minRating, setMinRating] = useState(70);
  const [sort, setSort] = useState<SortKey>("rating");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Matchup state
  const [matchupA, setMatchupA] = useState<Player | null>(null);
  const [matchupB, setMatchupB] = useState<Player | null>(null);
  const [pickerSlot, setPickerSlot] = useState<"A" | "B" | null>(null);
  const [savedMatchups, setSavedMatchups] = useState<SavedMatchup[]>([]);

  useEffect(() => {
    setSavedMatchups(loadSavedMatchups());
  }, []);

  const matchupResult: MatchupResult | null = useMemo(() => {
    if (!matchupA || !matchupB) return null;
    return computeMatchup(matchupA, matchupB);
  }, [matchupA, matchupB]);

  const handleSaveMatchup = () => {
    if (!matchupA || !matchupB) return;
    saveMatchupPair(matchupA.id, matchupB.id);
    setSavedMatchups(loadSavedMatchups());
  };

  const handlePickRecent = (m: SavedMatchup) => {
    const pa = getPlayer(m.a);
    const pb = getPlayer(m.b);
    if (pa) setMatchupA(pa);
    if (pb) setMatchupB(pb);
  };

  const filtered = useMemo(() => {
    let list = search ? searchPlayers(search) : PLAYERS;
    list = list.filter((p) => POS_GROUPS[pos](p.position));
    if (teamFilter.size > 0) list = list.filter((p) => teamFilter.has(p.team));
    list = list.filter((p) => p.rating2k >= minRating);

    if (sort === "rating") list = [...list].sort((a, b) => b.rating2k - a.rating2k);
    else if (sort === "name")
      list = [...list].sort((a, b) => a.lastName.localeCompare(b.lastName));
    else if (sort === "form")
      list = [...list].sort((a, b) => b.ratingDelta - a.ratingDelta);

    return list;
  }, [search, pos, teamFilter, minRating, sort]);

  const stats = useMemo(() => {
    const total = PLAYERS.length;
    const avg =
      PLAYERS.reduce((s, p) => s + p.rating2k, 0) / Math.max(1, total);
    const topMover = [...PLAYERS].sort((a, b) => b.ratingDelta - a.ratingDelta)[0];
    return { total, avg, topMover };
  }, []);

  const compared = useMemo(
    () =>
      compareIds
        .map((id) => PLAYERS.find((p) => p.id === id))
        .filter(Boolean) as Player[],
    [compareIds]
  );

  const toggleCompare = (id: string) => {
    setCompareIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return [cur[1], id]; // FIFO
      return [...cur, id];
    });
    setDrawerOpen(true);
  };

  const toggleTeam = (t: string) => {
    setTeamFilter((cur) => {
      const next = new Set(cur);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-bg pb-32">
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        {/* Header */}
        <header className="mb-6">
          <h1 className="font-display text-5xl tracking-wide text-ink md:text-6xl">
            Players
          </h1>
          <p className="mt-1 text-sm text-muted">
            {PLAYERS.length} NBA stars · 2K26 ratings · real-life stats
          </p>
        </header>

        {/* Mode tabs */}
        <div className="mb-6 inline-flex rounded-lg border border-line bg-surface2 p-1">
          {(
            [
              { id: "browse", label: "Browse" },
              { id: "matchup", label: "Matchup" },
            ] as { id: Mode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                mode === tab.id
                  ? "bg-flame/15 text-flame"
                  : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "matchup" ? (
          <div className="flex flex-col gap-4">
            {/* Slots */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <MatchupSlot
                slot="A"
                player={matchupA}
                onOpen={() => setPickerSlot("A")}
                onClear={() => setMatchupA(null)}
              />
              <MatchupSlot
                slot="B"
                player={matchupB}
                onOpen={() => setPickerSlot("B")}
                onClear={() => setMatchupB(null)}
              />
            </div>

            {/* Recent saved matchups */}
            {savedMatchups.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Recent
                </span>
                {savedMatchups.map((m) => {
                  const pa = getPlayer(m.a);
                  const pb = getPlayer(m.b);
                  if (!pa || !pb) return null;
                  return (
                    <button
                      key={`${m.a}-${m.b}-${m.savedAt}`}
                      onClick={() => handlePickRecent(m)}
                      className="rounded-full border border-line bg-surface2 px-3 py-1 text-[11px] font-semibold tracking-wide text-ink hover:border-ice/40 hover:text-ice"
                    >
                      {pa.lastName} vs {pb.lastName}
                    </button>
                  );
                })}
              </div>
            )}

            {matchupResult ? (
              <MatchupView
                result={matchupResult}
                onSave={handleSaveMatchup}
              />
            ) : (
              <Card className="text-center text-sm text-muted">
                Pick two players to run the matchup model.
              </Card>
            )}

            <p className="mt-6 text-[11px] leading-relaxed text-muted">
              Matchup model: 50% scoring · 30% playmaking · 20% defense, clamped 30–85%.
              Saved locally in your browser only.
            </p>
          </div>
        ) : (
          <>
        {/* Stat row */}
        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          <Stat label="Players Tracked" value={stats.total} />
          <Stat
            label="Avg 2K Rating"
            value={stats.avg.toFixed(1)}
            tone="gold"
          />
          <Stat
            label="Top Mover"
            value={`${stats.topMover.lastName} +${stats.topMover.ratingDelta}`}
            hint="biggest weekly delta"
            tone="lime"
          />
          <Stat label="Tonight" value="8 GP" hint="games on slate" tone="ice" />
        </div>

        {/* Filter bar */}
        <Card className="mb-6 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players (e.g. wemby, sga, maxey)"
              className="w-full rounded-lg border border-line bg-surface2 px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 text-xs text-muted hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* Position chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Pos
            </span>
            {(["All", "G", "F", "C"] as PosFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPos(p)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  pos === p
                    ? "border-flame bg-flame/10 text-flame"
                    : "border-line bg-surface2 text-muted hover:text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Teams + Rating + Sort */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Team multi-select */}
            <div className="relative">
              <button
                onClick={() => setTeamMenuOpen((v) => !v)}
                className="rounded-lg border border-line bg-surface2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink hover:border-ice/40"
              >
                Teams{" "}
                {teamFilter.size > 0 && (
                  <span className="ml-1 rounded bg-flame/20 px-1.5 py-0.5 text-flame">
                    {teamFilter.size}
                  </span>
                )}{" "}
                ▾
              </button>
              {teamMenuOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-line bg-surface p-2 shadow-card">
                  <div className="mb-2 flex justify-between">
                    <button
                      onClick={() => setTeamFilter(new Set())}
                      className="text-[10px] uppercase tracking-wider text-muted hover:text-ink"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setTeamMenuOpen(false)}
                      className="text-[10px] uppercase tracking-wider text-muted hover:text-ink"
                    >
                      Done
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.values(TEAMS).map((t) => {
                      const on = teamFilter.has(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTeam(t.id)}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-left text-xs ${
                            on
                              ? "bg-flame/15 text-flame"
                              : "text-ink hover:bg-surface2"
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-sm"
                            style={{ background: t.primary }}
                          />
                          <span className="font-mono">{t.abbr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Min rating slider */}
            <div className="flex flex-1 items-center gap-2 min-w-[180px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Min OVR
              </span>
              <input
                type="range"
                min={70}
                max={99}
                value={minRating}
                onChange={(e) => setMinRating(parseInt(e.target.value))}
                className="flex-1 accent-flame"
              />
              <span className="w-8 text-right font-mono text-sm font-bold text-ink">
                {minRating}
              </span>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Sort
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-line bg-surface2 px-2 py-1.5 text-xs text-ink focus:border-flame focus:outline-none"
              >
                <option value="rating">Rating</option>
                <option value="name">Name</option>
                <option value="form">Form Δ</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-muted">
            {filtered.length} of {PLAYERS.length} players
            {compareIds.length > 0 && (
              <span className="ml-2">
                ·{" "}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="text-ice hover:underline"
                >
                  Compare ({compareIds.length})
                </button>
              </span>
            )}
          </div>
        </Card>

        {/* Player grid */}
        {filtered.length === 0 ? (
          <Card className="text-center text-sm text-muted">
            No players match these filters. Loosen something.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {filtered.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                expanded={expanded === p.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === p.id ? null : p.id))
                }
                onCompare={() => toggleCompare(p.id)}
                inCompare={compareIds.includes(p.id)}
              />
            ))}
          </div>
        )}

        {/* Attribution */}
        <p className="mt-10 text-[11px] leading-relaxed text-muted">
          2K26 ratings sourced from community ratings sites + the Pulse
          prediction model. These are approximations and refresh weekly —
          verify against the game before lineup decisions.
        </p>

        {/* Disclaimer */}
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Stats are 2026 season approximations. Data shape mirrors what
          Fivetran connectors deliver to Snowflake (balldontlie, nba_stats).
          Ratings update weekly; deltas reflect the last patch cycle.
        </p>
          </>
        )}
      </div>

      {/* Compare drawer (browse mode only) */}
      {mode === "browse" && drawerOpen && compared.length > 0 && (
        <CompareDrawer
          players={compared}
          onClose={() => setDrawerOpen(false)}
          onRemove={(id) =>
            setCompareIds((cur) => cur.filter((x) => x !== id))
          }
        />
      )}

      {/* Player picker for matchup */}
      <PlayerPickerModal
        open={pickerSlot !== null}
        slot={pickerSlot ?? "A"}
        excludeId={
          pickerSlot === "A" ? matchupB?.id : matchupA?.id
        }
        onPick={(p) => {
          if (pickerSlot === "A") setMatchupA(p);
          else if (pickerSlot === "B") setMatchupB(p);
          setPickerSlot(null);
        }}
        onClose={() => setPickerSlot(null)}
      />
    </main>
  );
}
