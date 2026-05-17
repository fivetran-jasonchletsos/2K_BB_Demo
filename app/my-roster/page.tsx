"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bar, Card, Pill } from "@/components/ui";
import {
  Build,
  comparablePlayer,
  computeAttributes,
  formatHeight,
  getArchetype,
  loadSavedBuilds,
  recommendedBadges,
} from "@/lib/builds";
import { getName as getCoachName } from "@/lib/coach";
import { PLAYERS, Player, getPlayer, getPlayerIdByName } from "@/lib/players";
import {
  ACQUIRED_OPTIONS,
  AcquiredFrom,
  ATTR_FOCUSES,
  CustomCard,
  MyRoster,
  MYTEAM_TIERS,
  MyTeamTier,
  PARK_KEYS,
  ParkKey,
  ParsedSlotEntry,
  ResolvedSlot,
  RosterSlot,
  SLOT_LABEL,
  STARTING5_KEYS,
  SquadId,
  Starting5Key,
  TIER_COLORS,
  TIER_OVR_HINT,
  addCustomCard,
  inferTier,
  lineupSummary,
  loadRoster,
  newCustomCardId,
  parseTextLineup,
  pickerSearch,
  resolveSlot,
  rosterToShareText,
  setMyPlayerBuildId,
  setSlot,
} from "@/lib/my-roster";

type Tab = "myplayer" | "myteam" | "park";

const TAB_LABEL: Record<Tab, string> = {
  myplayer: "MyPlayer",
  myteam: "MyTeam Starting 5",
  park: "Park Squad",
};

// Sample starting 5 shown when the user has no pinned cards yet so the
// page looks alive on first paint. Tapping any slot still opens the picker.
const SAMPLE_STARTING5: Record<Starting5Key, RosterSlot> = {
  pg: { source: "nba", playerId: "maxey" },
  sg: { source: "nba", playerId: "ant" },
  sf: { source: "nba", playerId: "tatum" },
  pf: { source: "nba", playerId: "embiid" },
  c: { source: "nba", playerId: "jokic" },
};

// ---------------- helpers ----------------

function tierStyle(tier?: MyTeamTier): { border: string; chip: string } {
  if (!tier) {
    return { border: "border-line", chip: "#888" };
  }
  const c = TIER_COLORS[tier];
  return { border: "", chip: c };
}

function ovrTone(ovr: number): string {
  if (ovr >= 96) return "text-flame";
  if (ovr >= 90) return "text-gold";
  if (ovr >= 85) return "text-ice";
  if (ovr >= 80) return "text-lime";
  return "text-ink";
}

// ---------------- savedPill ----------------

function useSavedPill(): { show: boolean; ping: () => void } {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ping = useCallback(() => {
    setShow(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 1000);
  }, []);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  return { show, ping };
}

// ---------------- MyPlayer build card ----------------

function BuildPickerCard({
  build,
  active,
  onPick,
}: {
  build: Build;
  active: boolean;
  onPick: () => void;
}) {
  const arche = getArchetype(build.archetypeId);
  return (
    <button
      type="button"
      onClick={onPick}
      className={`min-w-[180px] shrink-0 rounded-lg border p-3 text-left transition active:scale-[0.98] ${
        active
          ? "border-flame bg-flame/10 shadow-glow"
          : "border-line bg-surface hover:bg-surface2"
      }`}
    >
      <div className="font-display text-lg leading-tight text-ink">
        {build.name}
      </div>
      <div className="mt-1 text-[11px] text-muted">
        {build.position} · {formatHeight(build.heightIn)} · {arche.name}
      </div>
    </button>
  );
}

function MyPlayerCard({
  build,
  handleName,
}: {
  build: Build;
  handleName: string;
}) {
  const arche = getArchetype(build.archetypeId);
  const attrs = useMemo(() => computeAttributes(build), [build]);
  const badges = useMemo(() => recommendedBadges(arche, build), [arche, build]);
  const top8 = badges.slice(0, 8);
  const compName = comparablePlayer(build);
  const compId = getPlayerIdByName(compName);

  // group OVR averages for the bar block
  const groups = [
    {
      key: "Finishing",
      val: avg(attrs.finishing.map((s) => s.value)),
    },
    { key: "Shooting", val: avg(attrs.shooting.map((s) => s.value)) },
    { key: "Playmaking", val: avg(attrs.playmaking.map((s) => s.value)) },
    { key: "Defense", val: avg(attrs.defense.map((s) => s.value)) },
    {
      key: "Athleticism",
      val: avg(attrs.athleticism.map((s) => s.value)),
    },
  ];

  return (
    <Card className="border-l-4 border-l-flame">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Active MyPlayer
          </div>
          <div className="font-display text-2xl leading-tight text-ink">
            {handleName || build.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Pill tone="flame">{build.position}</Pill>
            <Pill tone="muted">{formatHeight(build.heightIn)}</Pill>
            <Pill tone="muted">{build.weightLb} lb</Pill>
            <Pill tone="ice">{arche.name}</Pill>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted">
            Build
          </div>
          <div className="font-mono text-xs text-ink">{build.id.slice(-6)}</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="uppercase tracking-wider">{g.key}</span>
              <span className="font-mono text-ink">{g.val}</span>
            </div>
            <Bar value={g.val} tone="flame" />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-wider text-muted">
          Top 8 badges
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {top8.map((b) => (
            <Pill
              key={b.name}
              tone={
                b.tier === "S"
                  ? "gold"
                  : b.tier === "A"
                  ? "flame"
                  : b.tier === "B"
                  ? "ice"
                  : "muted"
              }
            >
              {b.name} {b.tier}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3 text-sm text-muted">
        Comparable:{" "}
        <span className="text-ink">{compName}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link
          href="/builds"
          className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-ink hover:bg-surface"
        >
          Edit in Build Lab
        </Link>
        {compId && (
          <Link
            href={`/players?id=${encodeURIComponent(compId)}`}
            className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-ink hover:bg-surface"
          >
            Compare with {compName.split(" ").slice(-1)[0]}
          </Link>
        )}
        <Link
          href="/coach"
          className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-ink hover:bg-surface"
        >
          Open in Coach
        </Link>
      </div>
    </Card>
  );
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return Math.round(xs.reduce((s, x) => s + x, 0) / xs.length);
}

// ---------------- slot card ----------------

function SlotCard({
  slotKey,
  slot,
  onTap,
  onClear,
}: {
  slotKey: string;
  slot: RosterSlot | undefined;
  onTap: () => void;
  onClear: () => void;
}) {
  const label = SLOT_LABEL[slotKey as Starting5Key | ParkKey] ?? slotKey.toUpperCase();
  if (!slot) {
    return (
      <button
        type="button"
        onClick={onTap}
        className="flex h-full min-h-[120px] w-full flex-col items-stretch justify-between rounded-lg border-2 border-dashed border-line bg-surface p-3 text-left hover:bg-surface2 active:scale-[0.99]"
      >
        <div className="text-[10px] uppercase tracking-wider text-muted">
          {label}
        </div>
        <div className="font-display text-sm text-muted">+ Pin a player</div>
      </button>
    );
  }
  const r = resolveSlot(slot);
  const tColor = r?.tier ? TIER_COLORS[r.tier] : "#888";
  return (
    <div
      className="relative flex h-full min-h-[120px] flex-col rounded-lg border-2 bg-surface p-3"
      style={{ borderColor: tColor }}
    >
      <button
        type="button"
        onClick={onTap}
        className="flex w-full flex-1 flex-col items-stretch text-left"
      >
        <div className="flex items-start justify-between">
          <div className="text-[10px] uppercase tracking-wider text-muted">
            {label}
          </div>
          <div className={`font-mono text-2xl leading-none ${ovrTone(r?.ovr ?? 0)}`}>
            {r?.ovr ?? "—"}
          </div>
        </div>
        <div className="mt-1 font-display text-base leading-tight text-ink">
          {r?.name ?? "—"}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted">
          <span className="rounded bg-surface2 px-1.5 py-0.5 text-ink">
            {r?.position ?? "—"}
          </span>
          <span>·</span>
          <span>{r?.source === "nba" ? r.team : r?.tier ?? "Custom"}</span>
        </div>
        {r && r.badges.length > 0 && (
          <div className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-muted">
            {r.badges.join(" · ")}
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={onClear}
        className="absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-surface2 hover:text-flame"
        aria-label={`Clear ${label}`}
      >
        ×
      </button>
    </div>
  );
}

// ---------------- summary panel ----------------

function SummaryPanel({
  slots,
  totalSlots,
  onShare,
  shareEnabled,
  shareLabel,
}: {
  slots: Partial<Record<string, RosterSlot>>;
  totalSlots: number;
  onShare: () => void;
  shareEnabled: boolean;
  shareLabel: string;
}) {
  const s = lineupSummary(slots, totalSlots);
  return (
    <Card className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-display text-lg text-ink">Lineup summary</div>
        <button
          type="button"
          onClick={onShare}
          disabled={!shareEnabled}
          className="rounded-md border border-line bg-surface2 px-3 py-1 text-xs text-ink hover:bg-surface disabled:opacity-50"
        >
          {shareLabel}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center md:grid-cols-4">
        <div className="rounded border border-line bg-surface2 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted">
            Avg OVR
          </div>
          <div className={`font-mono text-xl ${ovrTone(s.avgOvr)}`}>
            {s.avgOvr || "—"}
          </div>
        </div>
        <div className="rounded border border-line bg-surface2 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted">
            Filled
          </div>
          <div className="font-mono text-xl text-ink">
            {s.filledCount}/{s.totalSlots}
          </div>
        </div>
        <div className="rounded border border-line bg-surface2 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted">
            Same team
          </div>
          <div className="font-mono text-xl text-ink">
            {s.sameTeam ?? "—"}
          </div>
        </div>
        <div className="col-span-3 rounded border border-line bg-surface2 p-2 md:col-span-1">
          <div className="text-[10px] uppercase tracking-wider text-muted">
            Chemistry
          </div>
          <div className="text-xs leading-snug text-ink">
            {s.chemistryHint}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
        <div>
          <span className="text-muted">Strong: </span>
          <span className="text-lime">
            {s.strongPositions.length > 0
              ? s.strongPositions.join(", ")
              : "—"}
          </span>
        </div>
        <div>
          <span className="text-muted">Weak: </span>
          <span className="text-flame">
            {s.weakPositions.length > 0 ? s.weakPositions.join(", ") : "—"}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ---------------- picker modal ----------------

type PickerProps = {
  open: boolean;
  slotLabel: string;
  defaultPosition: string;
  onClose: () => void;
  onPickNba: (playerId: string) => void;
  onPickCustom: (card: CustomCard) => void;
  parkMode?: boolean;
};

function PickerModal({
  open,
  slotLabel,
  defaultPosition,
  onClose,
  onPickNba,
  onPickCustom,
  parkMode,
}: PickerProps) {
  const [tab, setTab] = useState<"nba" | "custom">("nba");
  const [q, setQ] = useState("");
  const [customName, setCustomName] = useState("");
  const [customTier, setCustomTier] = useState<MyTeamTier>("Gold");
  const [customPos, setCustomPos] = useState(defaultPosition);
  const [customOvr, setCustomOvr] = useState(82);
  const [customFocus, setCustomFocus] = useState<string[]>([]);
  const [customAcq, setCustomAcq] = useState<AcquiredFrom | "">("");
  const [customNotes, setCustomNotes] = useState("");
  const [tierTouched, setTierTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("nba");
      setQ("");
      setCustomName("");
      setCustomTier("Gold");
      setCustomPos(defaultPosition);
      setCustomOvr(82);
      setCustomFocus([]);
      setCustomAcq("");
      setCustomNotes("");
      setTierTouched(false);
    }
  }, [open, defaultPosition]);

  // auto-sync tier with OVR until user touches tier
  useEffect(() => {
    if (!tierTouched) setCustomTier(inferTier(customOvr));
  }, [customOvr, tierTouched]);

  const results = useMemo<Player[]>(() => {
    if (!open) return [];
    return pickerSearch(q);
  }, [open, q]);

  if (!open) return null;

  const toggleFocus = (f: string) => {
    setCustomFocus((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f].slice(0, 3),
    );
  };

  const submitCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const card: CustomCard = {
      id: newCustomCardId(),
      name: name.slice(0, 60),
      tier: customTier,
      position: customPos,
      ovr: customOvr,
      attrFocus: customFocus,
      acquiredFrom: customAcq || undefined,
      notes: customNotes.trim() || undefined,
      savedAt: Date.now(),
    };
    onPickCustom(card);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch bg-black/60 md:items-center md:justify-center md:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full flex-col bg-surface text-ink md:max-h-[90vh] md:w-[640px] md:rounded-xl md:border md:border-line md:shadow-card">
        <div className="flex items-center justify-between border-b border-line p-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted">
              Pin player · {slotLabel}
            </div>
            <div className="font-display text-lg">Player picker</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-surface2 px-2 py-1 text-sm hover:bg-surface"
          >
            Close
          </button>
        </div>

        <div className="flex border-b border-line">
          <button
            type="button"
            onClick={() => setTab("nba")}
            className={`flex-1 px-3 py-2 text-sm ${
              tab === "nba"
                ? "border-b-2 border-flame text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            NBA player ({PLAYERS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`flex-1 px-3 py-2 text-sm ${
              tab === "custom"
                ? "border-b-2 border-flame text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            + Custom card
          </button>
        </div>

        {tab === "nba" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-line p-3">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, team, position…"
                className="w-full rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ice focus:outline-none"
                autoFocus
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {results.length === 0 ? (
                <div className="p-4 text-sm text-muted">
                  No matches. Try the Custom card tab.
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onPickNba(p.id)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface2"
                      >
                        <div>
                          <div className="font-display text-base">
                            {p.displayName}
                          </div>
                          <div className="text-[11px] text-muted">
                            {p.position} · {p.team} · {p.height}
                          </div>
                        </div>
                        <div
                          className={`font-mono text-xl ${ovrTone(p.rating2k)}`}
                        >
                          {p.rating2k}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted">
                  Card name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Diamond Magic Johnson"
                  className="mt-1 w-full rounded-md border border-line bg-surface2 px-3 py-2 text-ink placeholder:text-muted focus:border-ice focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted">
                  Tier
                </label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {MYTEAM_TIERS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setCustomTier(t);
                        setTierTouched(true);
                      }}
                      className={`rounded border px-2 py-1.5 text-[11px] transition ${
                        customTier === t
                          ? "border-flame bg-flame/10 text-ink"
                          : "border-line bg-surface text-muted hover:text-ink"
                      }`}
                      style={
                        customTier === t
                          ? {
                              borderColor: TIER_COLORS[t],
                              boxShadow: `0 0 0 1px ${TIER_COLORS[t]}`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="mr-1 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: TIER_COLORS[t] }}
                      />
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted">
                  Position
                </label>
                <input
                  type="text"
                  value={customPos}
                  onChange={(e) => setCustomPos(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-surface2 px-3 py-2 text-ink focus:border-ice focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted">
                  <span>OVR</span>
                  <span className="font-mono text-base text-ink">
                    {customOvr}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={99}
                  value={customOvr}
                  onChange={(e) => setCustomOvr(parseInt(e.target.value, 10))}
                  className="mt-1 w-full accent-flame"
                />
                <div className="text-[10px] text-muted">
                  Hint range for {customTier}: {TIER_OVR_HINT[customTier][0]}–
                  {TIER_OVR_HINT[customTier][1]}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted">
                  Attribute focus (up to 3)
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ATTR_FOCUSES.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFocus(f)}
                      className={`rounded-full border px-3 py-1 text-[11px] transition ${
                        customFocus.includes(f)
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-line bg-surface2 text-muted hover:text-ink"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted">
                  Acquired from
                </label>
                <select
                  value={customAcq}
                  onChange={(e) =>
                    setCustomAcq((e.target.value as AcquiredFrom) || "")
                  }
                  className="mt-1 w-full rounded-md border border-line bg-surface2 px-3 py-2 text-ink focus:border-ice focus:outline-none"
                >
                  <option value="">—</option>
                  {ACQUIRED_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted">
                  Notes
                </label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-line bg-surface2 px-3 py-2 text-ink placeholder:text-muted focus:border-ice focus:outline-none"
                  placeholder={parkMode ? "e.g. Sharp / Lock combo" : "optional"}
                />
              </div>

              <button
                type="button"
                onClick={submitCustom}
                disabled={!customName.trim()}
                className="w-full rounded-md border border-flame bg-flame px-3 py-2 text-sm font-semibold text-black hover:bg-flame/90 disabled:opacity-50"
              >
                Save card to slot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- page ----------------

export default function MyRosterPage() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("myplayer");
  const [roster, setRoster] = useState<MyRoster>({
    starting5: {},
    parkSquad: {},
    customCards: [],
  });
  const [builds, setBuilds] = useState<Build[]>([]);
  const [coachName, setCoachName] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [picker, setPicker] = useState<{
    squad: SquadId;
    slotKey: string;
    label: string;
    defaultPos: string;
    parkMode: boolean;
  } | null>(null);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<ParsedSlotEntry[] | null>(
    null,
  );
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const saved = useSavedPill();

  useEffect(() => {
    setRoster(loadRoster());
    setBuilds(loadSavedBuilds());
    setCoachName(getCoachName());
    setHydrated(true);
  }, []);

  const refresh = useCallback(() => {
    setRoster(loadRoster());
  }, []);

  // ---- MyPlayer ----
  const activeBuild = useMemo(() => {
    if (!roster.myPlayerBuildId) return undefined;
    return builds.find((b) => b.id === roster.myPlayerBuildId);
  }, [roster.myPlayerBuildId, builds]);

  const pickBuild = (id: string) => {
    setMyPlayerBuildId(id);
    refresh();
    saved.ping();
  };

  const displayHandle = coachName || handleInput;

  // ---- Slot ops ----
  const openPicker = (squad: SquadId, slotKey: string) => {
    const isPark = squad === "parkSquad";
    const label = SLOT_LABEL[slotKey as Starting5Key | ParkKey] ?? slotKey;
    const defaultPos = isPark
      ? slotKey === "pg"
        ? "PG"
        : slotKey === "wing"
        ? "SG/SF"
        : "PF/C"
      : (SLOT_LABEL[slotKey as Starting5Key] ?? "PG");
    setPicker({ squad, slotKey, label, defaultPos, parkMode: isPark });
  };

  const closePicker = () => setPicker(null);

  const slotPickNba = (playerId: string) => {
    if (!picker) return;
    setSlot(picker.squad, picker.slotKey, { source: "nba", playerId });
    refresh();
    saved.ping();
    closePicker();
  };

  const slotPickCustom = (card: CustomCard) => {
    if (!picker) return;
    addCustomCard(card);
    setSlot(picker.squad, picker.slotKey, { source: "custom", customCard: card });
    refresh();
    saved.ping();
    closePicker();
  };

  const clearSlot = (squad: SquadId, slotKey: string) => {
    setSlot(squad, slotKey, null);
    refresh();
    saved.ping();
  };

  // ---- Share ----
  const doShare = async () => {
    const text = rosterToShareText(roster);
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareMsg("Copied to clipboard");
      } else {
        setShareMsg("Copy from below");
      }
    } catch {
      setShareMsg("Copy failed");
    }
    setTimeout(() => setShareMsg(null), 1500);
  };

  // ---- Import ----
  const previewImport = () => {
    const parsed = parseTextLineup(importText);
    setImportPreview(parsed);
  };

  const applyImport = () => {
    if (!importPreview) return;
    let r = roster;
    for (const entry of importPreview) {
      if (entry.slot.source === "custom") {
        addCustomCard(entry.slot.customCard);
      }
      r = setSlot("starting5", entry.slotKey, entry.slot);
    }
    setRoster(r);
    setImportPreview(null);
    setImportText("");
    saved.ping();
    setTab("myteam");
  };

  // ---- Render ----
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl leading-tight tracking-wide text-ink md:text-5xl">
              My Roster
            </h1>
            <p className="mt-1 text-sm text-muted">
              Pin your MyPlayer and your MyTeam starters. Saved locally.
            </p>
            <p className="mt-1 text-[11px] text-muted">
              2K doesn&apos;t expose a public account API. Until OCR screenshot
              import lands, this is manual.
            </p>
          </div>
          <div
            className={`shrink-0 rounded-full border border-lime/40 bg-lime/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lime transition-opacity ${
              saved.show ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={!saved.show}
          >
            Saved
          </div>
        </div>
      </header>

      {/* tab strip */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface p-1">
        {(["myplayer", "myteam", "park"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-wider transition ${
              tab === t
                ? "bg-flame text-black shadow-glow"
                : "text-muted hover:text-ink"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {!hydrated ? (
        <Card>
          <div className="text-sm text-muted">Loading…</div>
        </Card>
      ) : tab === "myplayer" ? (
        <section className="space-y-4">
          {!coachName && (
            <Card>
              <label className="block text-[11px] uppercase tracking-wider text-muted">
                Handle (display name on the card)
              </label>
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value.slice(0, 24))}
                placeholder="e.g. SHIFTY_14"
                className="mt-1 w-full rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ice focus:outline-none"
              />
              <div className="mt-1 text-[10px] text-muted">
                Tip: save a permanent handle in{" "}
                <Link href="/coach" className="underline">
                  Coach
                </Link>
                .
              </div>
            </Card>
          )}

          {builds.length === 0 ? (
            <Card className="border-l-4 border-l-ice">
              <div className="font-display text-lg text-ink">
                Save a build first
              </div>
              <p className="mt-1 text-sm text-muted">
                Head to Build Lab, configure a MyPlayer, then come back here and
                pin it as your active build.
              </p>
              <Link
                href="/builds"
                className="mt-3 inline-block rounded-md border border-flame bg-flame px-3 py-1.5 text-sm font-semibold text-black hover:bg-flame/90"
              >
                Open Build Lab
              </Link>
            </Card>
          ) : (
            <>
              <Card>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                  Saved builds ({builds.length})
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {builds.map((b) => (
                    <BuildPickerCard
                      key={b.id}
                      build={b}
                      active={b.id === roster.myPlayerBuildId}
                      onPick={() => pickBuild(b.id)}
                    />
                  ))}
                </div>
                {roster.myPlayerBuildId && (
                  <button
                    type="button"
                    onClick={() => {
                      setMyPlayerBuildId(undefined);
                      refresh();
                      saved.ping();
                    }}
                    className="mt-2 text-[11px] text-muted underline hover:text-flame"
                  >
                    Unpin active build
                  </button>
                )}
              </Card>

              {activeBuild ? (
                <MyPlayerCard build={activeBuild} handleName={displayHandle} />
              ) : (
                <Card>
                  <div className="text-sm text-muted">
                    Tap a build above to set it as your active MyPlayer.
                  </div>
                </Card>
              )}
            </>
          )}
        </section>
      ) : tab === "myteam" ? (
        (() => {
          const isSampleLineup =
            Object.keys(roster.starting5).length === 0;
          const displayStarting5: Partial<Record<Starting5Key, RosterSlot>> =
            isSampleLineup ? SAMPLE_STARTING5 : roster.starting5;
          return (
            <section>
              {isSampleLineup && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-ice/40 bg-ice/[0.07] px-3 py-2 text-sm">
                  <span className="text-ink">
                    Showing top NBA starters. Tap any slot to swap in your
                    card.
                  </span>
                  <Pill tone="ice" className="!text-[10px]">
                    Sample
                  </Pill>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {STARTING5_KEYS.map((k) => (
                  <SlotCard
                    key={k}
                    slotKey={k}
                    slot={displayStarting5[k]}
                    onTap={() => openPicker("starting5", k)}
                    onClear={() =>
                      isSampleLineup ? openPicker("starting5", k) : clearSlot("starting5", k)
                    }
                  />
                ))}
              </div>
              <SummaryPanel
                slots={displayStarting5}
                totalSlots={5}
                onShare={doShare}
                shareEnabled={!isSampleLineup}
                shareLabel={
                  isSampleLineup
                    ? "Pin your own to share"
                    : (shareMsg ?? "Share lineup")
                }
              />
            </section>
          );
        })()
      ) : (
        <section>
          <div className="mb-2 text-[11px] text-muted">
            Park archetypes lean: <span className="text-ink">Sharpshooter</span>{" "}
            · <span className="text-ink">Lockdown</span> ·{" "}
            <span className="text-ink">Glass Cleaner</span> ·{" "}
            <span className="text-ink">Slasher</span> ·{" "}
            <span className="text-ink">Playmaker</span> ·{" "}
            <span className="text-ink">Sharp</span>.
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {PARK_KEYS.map((k) => (
              <SlotCard
                key={k}
                slotKey={k}
                slot={roster.parkSquad[k]}
                onTap={() => openPicker("parkSquad", k)}
                onClear={() => clearSlot("parkSquad", k)}
              />
            ))}
          </div>
          <SummaryPanel
            slots={roster.parkSquad}
            totalSlots={3}
            onShare={doShare}
            shareEnabled={Object.keys(roster.parkSquad).length > 0}
            shareLabel={shareMsg ?? "Share squad"}
          />
        </section>
      )}

      {/* import section */}
      <section className="mt-8">
        <Card>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <div className="font-display text-lg text-ink">
                Roster import
              </div>
              <div className="text-[11px] text-muted">
                Coming soon: photograph your MyTeam binder, OCR pulls the cards.
              </div>
            </div>
            <span className="font-mono text-xs text-muted">
              {importOpen ? "−" : "+"}
            </span>
          </button>

          {importOpen && (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] uppercase tracking-wider text-muted">
                Paste lineup as text
              </label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={6}
                placeholder={
                  "PG: Tyrese Maxey (PHI)\nSG: Diamond Allen Iverson\nSF: LeBron James\nPF: Galaxy Opal Tim Duncan\nC: Joel Embiid (PHI)"
                }
                className="w-full rounded-md border border-line bg-surface2 px-3 py-2 font-mono text-xs text-ink placeholder:text-muted focus:border-ice focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={previewImport}
                  disabled={!importText.trim()}
                  className="rounded-md border border-line bg-surface2 px-3 py-1.5 text-xs text-ink hover:bg-surface disabled:opacity-50"
                >
                  Preview
                </button>
                {importPreview && importPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={applyImport}
                    className="rounded-md border border-flame bg-flame px-3 py-1.5 text-xs font-semibold text-black hover:bg-flame/90"
                  >
                    Apply to Starting 5
                  </button>
                )}
              </div>
              {importPreview && (
                <div className="rounded-md border border-line bg-surface2 p-2 text-xs">
                  {importPreview.length === 0 ? (
                    <div className="text-muted">
                      No lines parsed. Use the format{" "}
                      <span className="font-mono">PG: Name (TEAM)</span>.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {importPreview.map((e, i) => {
                        const r = resolveSlot(e.slot);
                        return (
                          <li
                            key={`${e.slotKey}-${i}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="font-mono">
                              {SLOT_LABEL[e.slotKey]}: {r?.name ?? "—"}
                            </span>
                            <Pill tone={e.matched ? "lime" : "muted"}>
                              {e.matched ? "NBA match" : "Custom"}
                            </Pill>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      <footer className="mt-6 text-[11px] leading-snug text-muted">
        2K doesn&apos;t currently provide a public API for personal MyCareer or
        MyTeam data. We&apos;re tracking this — if it ever opens up, we&apos;ll
        wire it in via Fivetran SDK + MDLS.
      </footer>

      {picker && (
        <PickerModal
          open={!!picker}
          slotLabel={picker.label}
          defaultPosition={picker.defaultPos}
          onClose={closePicker}
          onPickNba={slotPickNba}
          onPickCustom={slotPickCustom}
          parkMode={picker.parkMode}
        />
      )}
    </main>
  );
}
