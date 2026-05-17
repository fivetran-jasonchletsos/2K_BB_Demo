// My Roster — local-only "your players" store.
// 2K does not expose a public MyCareer/MyTeam API. Until OCR screenshot import
// ships, the user manually pins a MyPlayer build + MyTeam starting 5 + Park squad.
// Everything persists in localStorage under "2klab.myRoster".

import { PLAYERS, Player, getPlayer, getPlayerIdByName } from "./players";

// ---------- MyTeam tiers ----------

export const MYTEAM_TIERS = [
  "Bronze",
  "Silver",
  "Gold",
  "Emerald",
  "Sapphire",
  "Ruby",
  "Amethyst",
  "Diamond",
  "Pink Diamond",
  "Galaxy Opal",
  "Dark Matter",
] as const;

export type MyTeamTier = (typeof MYTEAM_TIERS)[number];

// Approximated 2K MyTeam tier colors (hex).
export const TIER_COLORS: Record<MyTeamTier, string> = {
  Bronze: "#B08D57",
  Silver: "#C0C0C0",
  Gold: "#FFD700",
  Emerald: "#50C878",
  Sapphire: "#0F52BA",
  Ruby: "#E0115F",
  Amethyst: "#9966CC",
  Diamond: "#B9F2FF",
  "Pink Diamond": "#FFB6C1",
  "Galaxy Opal": "#9D71BC",
  "Dark Matter": "#FF3D00",
};

// Suggested OVR ranges for each tier (used by tier auto-suggest only).
export const TIER_OVR_HINT: Record<MyTeamTier, [number, number]> = {
  Bronze: [70, 74],
  Silver: [75, 79],
  Gold: [80, 84],
  Emerald: [85, 87],
  Sapphire: [88, 89],
  Ruby: [90, 91],
  Amethyst: [92, 93],
  Diamond: [94, 95],
  "Pink Diamond": [96, 97],
  "Galaxy Opal": [97, 98],
  "Dark Matter": [98, 99],
};

export function inferTier(ovr: number): MyTeamTier {
  for (const t of MYTEAM_TIERS) {
    const [lo, hi] = TIER_OVR_HINT[t];
    if (ovr >= lo && ovr <= hi) return t;
  }
  if (ovr >= 98) return "Dark Matter";
  if (ovr < 70) return "Bronze";
  return "Gold";
}

// ---------- attribute focus ----------

export const ATTR_FOCUSES = [
  "Shooting",
  "Defense",
  "Playmaking",
  "Athleticism",
] as const;
export type AttrFocus = (typeof ATTR_FOCUSES)[number];

// ---------- card / slot shapes ----------

export type AcquiredFrom = "Token shop" | "Pack" | "Auction House" | "Reward";

export const ACQUIRED_OPTIONS: AcquiredFrom[] = [
  "Token shop",
  "Pack",
  "Auction House",
  "Reward",
];

export type CustomCard = {
  id: string;
  name: string;
  tier: MyTeamTier;
  position: string;
  ovr: number;
  attrFocus: string[];
  acquiredFrom?: AcquiredFrom;
  notes?: string;
  savedAt: number;
};

export type RosterSlot =
  | { source: "nba"; playerId: string }
  | { source: "custom"; customCard: CustomCard };

export type Starting5Key = "pg" | "sg" | "sf" | "pf" | "c";
export type ParkKey = "pg" | "wing" | "big";

export const STARTING5_KEYS: Starting5Key[] = ["pg", "sg", "sf", "pf", "c"];
export const PARK_KEYS: ParkKey[] = ["pg", "wing", "big"];

export const SLOT_LABEL: Record<Starting5Key | ParkKey, string> = {
  pg: "PG",
  sg: "SG",
  sf: "SF",
  pf: "PF",
  c: "C",
  wing: "Wing",
  big: "Big",
};

export type SquadId = "starting5" | "parkSquad";

export type MyRoster = {
  myPlayerBuildId?: string;
  starting5: Partial<Record<Starting5Key, RosterSlot>>;
  parkSquad: Partial<Record<ParkKey, RosterSlot>>;
  customCards: CustomCard[];
};

// ---------- storage ----------

export const ROSTER_KEY = "2klab.myRoster";

function emptyRoster(): MyRoster {
  return {
    starting5: {},
    parkSquad: {},
    customCards: [],
  };
}

function isMyTeamTier(t: any): t is MyTeamTier {
  return typeof t === "string" && (MYTEAM_TIERS as readonly string[]).includes(t);
}

function sanitizeCard(raw: any): CustomCard | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  if (!isMyTeamTier(raw.tier)) return null;
  const ovr = typeof raw.ovr === "number" ? Math.max(0, Math.min(99, raw.ovr)) : 0;
  const attrFocus = Array.isArray(raw.attrFocus)
    ? raw.attrFocus.filter((x: any) => typeof x === "string")
    : [];
  const acquiredFrom: AcquiredFrom | undefined =
    typeof raw.acquiredFrom === "string" &&
    ACQUIRED_OPTIONS.includes(raw.acquiredFrom as AcquiredFrom)
      ? (raw.acquiredFrom as AcquiredFrom)
      : undefined;
  return {
    id: raw.id,
    name: raw.name.slice(0, 60),
    tier: raw.tier,
    position: typeof raw.position === "string" ? raw.position : "—",
    ovr,
    attrFocus,
    acquiredFrom,
    notes: typeof raw.notes === "string" ? raw.notes.slice(0, 200) : undefined,
    savedAt: typeof raw.savedAt === "number" ? raw.savedAt : Date.now(),
  };
}

function sanitizeSlot(raw: any): RosterSlot | null {
  if (!raw || typeof raw !== "object") return null;
  if (raw.source === "nba" && typeof raw.playerId === "string") {
    return { source: "nba", playerId: raw.playerId };
  }
  if (raw.source === "custom") {
    const c = sanitizeCard(raw.customCard);
    if (!c) return null;
    return { source: "custom", customCard: c };
  }
  return null;
}

export function loadRoster(): MyRoster {
  if (typeof window === "undefined") return emptyRoster();
  try {
    const raw = window.localStorage.getItem(ROSTER_KEY);
    if (!raw) return emptyRoster();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyRoster();
    const starting5: Partial<Record<Starting5Key, RosterSlot>> = {};
    const parkSquad: Partial<Record<ParkKey, RosterSlot>> = {};
    for (const k of STARTING5_KEYS) {
      const slot = sanitizeSlot(parsed.starting5?.[k]);
      if (slot) starting5[k] = slot;
    }
    for (const k of PARK_KEYS) {
      const slot = sanitizeSlot(parsed.parkSquad?.[k]);
      if (slot) parkSquad[k] = slot;
    }
    const customCards: CustomCard[] = Array.isArray(parsed.customCards)
      ? parsed.customCards
          .map(sanitizeCard)
          .filter((c: CustomCard | null): c is CustomCard => c !== null)
      : [];
    return {
      myPlayerBuildId:
        typeof parsed.myPlayerBuildId === "string"
          ? parsed.myPlayerBuildId
          : undefined,
      starting5,
      parkSquad,
      customCards,
    };
  } catch {
    return emptyRoster();
  }
}

export function saveRoster(r: MyRoster): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROSTER_KEY, JSON.stringify(r));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearRoster(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ROSTER_KEY);
  } catch {
    /* noop */
  }
}

// ---------- custom card CRUD ----------

export function newCustomCardId(): string {
  return `cc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function addCustomCard(card: CustomCard): MyRoster {
  const r = loadRoster();
  // De-dupe by id; overwrite if already present.
  const others = r.customCards.filter((c) => c.id !== card.id);
  const next: MyRoster = { ...r, customCards: [...others, card] };
  saveRoster(next);
  return next;
}

export function removeCustomCard(id: string): MyRoster {
  const r = loadRoster();
  const next: MyRoster = {
    ...r,
    customCards: r.customCards.filter((c) => c.id !== id),
    starting5: pruneCustom(r.starting5, id),
    parkSquad: pruneCustom(r.parkSquad, id),
  };
  saveRoster(next);
  return next;
}

function pruneCustom<K extends string>(
  slots: Partial<Record<K, RosterSlot>>,
  id: string,
): Partial<Record<K, RosterSlot>> {
  const next: Partial<Record<K, RosterSlot>> = {};
  (Object.keys(slots) as K[]).forEach((k) => {
    const s = slots[k];
    if (!s) return;
    if (s.source === "custom" && s.customCard.id === id) return;
    next[k] = s;
  });
  return next;
}

export function updateCustomCard(
  id: string,
  patch: Partial<Omit<CustomCard, "id">>,
): MyRoster {
  const r = loadRoster();
  const customCards = r.customCards.map((c) =>
    c.id === id ? { ...c, ...patch, id } : c,
  );
  // Mirror updates onto any slot referencing this card.
  const mirror = (
    slots: Partial<Record<string, RosterSlot>>,
  ): Partial<Record<string, RosterSlot>> => {
    const out: Partial<Record<string, RosterSlot>> = {};
    Object.entries(slots).forEach(([k, s]) => {
      if (!s) return;
      if (s.source === "custom" && s.customCard.id === id) {
        const updated = customCards.find((c) => c.id === id);
        out[k] = updated
          ? { source: "custom", customCard: updated }
          : s;
      } else {
        out[k] = s;
      }
    });
    return out;
  };
  const next: MyRoster = {
    ...r,
    customCards,
    starting5: mirror(r.starting5) as Partial<Record<Starting5Key, RosterSlot>>,
    parkSquad: mirror(r.parkSquad) as Partial<Record<ParkKey, RosterSlot>>,
  };
  saveRoster(next);
  return next;
}

// ---------- slot setter ----------

export function setSlot(
  squad: SquadId,
  slotKey: string,
  slot: RosterSlot | null,
): MyRoster {
  const r = loadRoster();
  if (squad === "starting5") {
    const next = { ...r.starting5 };
    if (slot) {
      next[slotKey as Starting5Key] = slot;
    } else {
      delete next[slotKey as Starting5Key];
    }
    const updated: MyRoster = { ...r, starting5: next };
    // If we just dropped in a custom card, ensure it's registered in customCards too.
    if (slot && slot.source === "custom") {
      if (!updated.customCards.some((c) => c.id === slot.customCard.id)) {
        updated.customCards = [...updated.customCards, slot.customCard];
      }
    }
    saveRoster(updated);
    return updated;
  }
  const next = { ...r.parkSquad };
  if (slot) {
    next[slotKey as ParkKey] = slot;
  } else {
    delete next[slotKey as ParkKey];
  }
  const updated: MyRoster = { ...r, parkSquad: next };
  if (slot && slot.source === "custom") {
    if (!updated.customCards.some((c) => c.id === slot.customCard.id)) {
      updated.customCards = [...updated.customCards, slot.customCard];
    }
  }
  saveRoster(updated);
  return updated;
}

export function setMyPlayerBuildId(buildId: string | undefined): MyRoster {
  const r = loadRoster();
  const next: MyRoster = { ...r, myPlayerBuildId: buildId };
  saveRoster(next);
  return next;
}

// ---------- slot resolution helpers ----------

export type ResolvedSlot = {
  source: "nba" | "custom";
  name: string;
  team: string; // abbr or "FA"
  ovr: number;
  position: string;
  tier?: MyTeamTier;
  badges: string[]; // top labels
  raw: RosterSlot;
};

export function resolveSlot(slot: RosterSlot): ResolvedSlot | null {
  if (slot.source === "nba") {
    const p = getPlayer(slot.playerId);
    if (!p) return null;
    return {
      source: "nba",
      name: p.displayName,
      team: p.team,
      ovr: p.rating2k,
      position: p.position,
      tier: inferTier(p.rating2k),
      badges: p.badges
        .filter((b) => b.tier === "S" || b.tier === "A")
        .slice(0, 3)
        .map((b) => `${b.name} ${b.tier}`),
      raw: slot,
    };
  }
  const c = slot.customCard;
  return {
    source: "custom",
    name: c.name,
    team: "FA",
    ovr: c.ovr,
    position: c.position,
    tier: c.tier,
    badges: c.attrFocus.slice(0, 3),
    raw: slot,
  };
}

// ---------- lineup summary ----------

export type LineupSummary = {
  avgOvr: number;
  filledCount: number;
  totalSlots: number;
  sameTeam: string | null; // team abbr if all same; null otherwise
  chemistryHint: string;
  weakPositions: string[];
  strongPositions: string[];
};

type SlotEntry = { key: string; slot: RosterSlot };

export function lineupSummary(
  slotsMap: Partial<Record<string, RosterSlot>>,
  totalSlots: number,
): LineupSummary {
  const entries: SlotEntry[] = Object.entries(slotsMap)
    .filter(([, v]) => v !== undefined)
    .map(([key, slot]) => ({ key, slot: slot as RosterSlot }));

  const resolved = entries
    .map((e) => ({ key: e.key, r: resolveSlot(e.slot) }))
    .filter((x): x is { key: string; r: ResolvedSlot } => x.r !== null);

  const filledCount = resolved.length;
  const avgOvr =
    filledCount === 0
      ? 0
      : Math.round(
          resolved.reduce((s, x) => s + x.r.ovr, 0) / filledCount,
        );

  // sameTeam — only counts NBA-sourced slots (custom cards are FA).
  const nbaTeams = resolved
    .filter((x) => x.r.source === "nba")
    .map((x) => x.r.team);
  const sameTeam =
    nbaTeams.length === filledCount && filledCount > 1 && new Set(nbaTeams).size === 1
      ? nbaTeams[0]
      : null;

  // Strong / weak buckets — driven by attrFocus + badges.
  const tagCount: Record<string, number> = {};
  resolved.forEach((x) => {
    x.r.badges.forEach((b) => {
      const lower = b.toLowerCase();
      if (lower.includes("shoot") || lower.includes("three") || lower.includes("range"))
        tagCount.Shooting = (tagCount.Shooting ?? 0) + 1;
      if (lower.includes("def") || lower.includes("lock") || lower.includes("stop"))
        tagCount.Defense = (tagCount.Defense ?? 0) + 1;
      if (lower.includes("play") || lower.includes("pass") || lower.includes("handle"))
        tagCount.Playmaking = (tagCount.Playmaking ?? 0) + 1;
      if (
        lower.includes("dunk") ||
        lower.includes("post") ||
        lower.includes("paint") ||
        lower.includes("ath") ||
        lower.includes("rim")
      )
        tagCount.Athleticism = (tagCount.Athleticism ?? 0) + 1;
    });
  });

  const focusTags: (keyof typeof tagCount)[] = [
    "Shooting",
    "Defense",
    "Playmaking",
    "Athleticism",
  ];
  const strongPositions = focusTags.filter(
    (t) => (tagCount[t] ?? 0) >= Math.max(2, Math.ceil(filledCount / 2)),
  );
  const weakPositions = focusTags.filter((t) => (tagCount[t] ?? 0) === 0);

  // chemistry hint
  let chemistryHint = "—";
  if (filledCount === 0) {
    chemistryHint = "Empty lineup";
  } else if (filledCount < totalSlots) {
    chemistryHint = `${totalSlots - filledCount} slot${
      totalSlots - filledCount === 1 ? "" : "s"
    } open`;
  } else if (sameTeam) {
    chemistryHint = `All ${sameTeam} — +team chemistry boost`;
  } else if (strongPositions.length > 0) {
    chemistryHint = `Lean: ${strongPositions.join(" + ")}`;
  } else {
    chemistryHint = "Balanced lineup";
  }

  return {
    avgOvr,
    filledCount,
    totalSlots,
    sameTeam,
    chemistryHint,
    weakPositions,
    strongPositions,
  };
}

// ---------- share text ----------

export function slotShareLine(slotKey: string, slot: RosterSlot): string {
  const r = resolveSlot(slot);
  if (!r) return `${SLOT_LABEL[slotKey as Starting5Key | ParkKey] ?? slotKey.toUpperCase()}: —`;
  const label = SLOT_LABEL[slotKey as Starting5Key | ParkKey] ?? slotKey.toUpperCase();
  const teamPart = r.source === "nba" ? r.team : r.tier ?? "Custom";
  const badgePart = r.badges.length ? ` · ${r.badges.join(", ")}` : "";
  return `${label}: ${r.name} · ${teamPart} · ${r.ovr} OVR${badgePart}`;
}

export function rosterToShareText(roster: MyRoster): string {
  const lines: string[] = [];
  lines.push("**My 2K Lab Roster**");
  if (roster.myPlayerBuildId) {
    lines.push(`MyPlayer build: ${roster.myPlayerBuildId}`);
  }
  if (Object.keys(roster.starting5).length > 0) {
    lines.push("");
    lines.push("__MyTeam Starting 5__");
    STARTING5_KEYS.forEach((k) => {
      const s = roster.starting5[k];
      if (s) lines.push(slotShareLine(k, s));
    });
  }
  if (Object.keys(roster.parkSquad).length > 0) {
    lines.push("");
    lines.push("__Park Squad__");
    PARK_KEYS.forEach((k) => {
      const s = roster.parkSquad[k];
      if (s) lines.push(slotShareLine(k, s));
    });
  }
  return lines.join("\n");
}

// ---------- text lineup parser ----------

// Parses lines like:
//   PG: Tyrese Maxey (PHI)
//   SG: Diamond Allen Iverson
//   SF: LeBron James
//
// Returns one entry per recognised position. NBA names matched against
// PLAYERS via getPlayerIdByName; everything else becomes a custom card with
// a tier inferred from any leading tier word ("Diamond", "Ruby"…).

export type ParsedSlotEntry = {
  slotKey: Starting5Key;
  slot: RosterSlot;
  rawLine: string;
  matched: boolean;
};

const POS_ALIASES: Record<string, Starting5Key> = {
  pg: "pg",
  pointguard: "pg",
  point: "pg",
  sg: "sg",
  shootingguard: "sg",
  shooting: "sg",
  sf: "sf",
  smallforward: "sf",
  small: "sf",
  pf: "pf",
  powerforward: "pf",
  power: "pf",
  c: "c",
  center: "c",
};

function detectTierPrefix(name: string): { tier?: MyTeamTier; rest: string } {
  const trimmed = name.trim();
  // Try longest tier names first (multi-word like "Pink Diamond", "Galaxy Opal", "Dark Matter").
  const sorted = [...MYTEAM_TIERS].sort((a, b) => b.length - a.length);
  for (const t of sorted) {
    if (trimmed.toLowerCase().startsWith(t.toLowerCase() + " ")) {
      return { tier: t, rest: trimmed.slice(t.length).trim() };
    }
  }
  return { rest: trimmed };
}

export function parseTextLineup(text: string): ParsedSlotEntry[] {
  const out: ParsedSlotEntry[] = [];
  const seen = new Set<Starting5Key>();
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z ]+)\s*[:\-]\s*(.+)$/);
    if (!m) continue;
    const posRaw = m[1].replace(/\s+/g, "").toLowerCase();
    const slotKey = POS_ALIASES[posRaw];
    if (!slotKey || seen.has(slotKey)) continue;
    let body = m[2].trim();
    // Pull team in parens if present: "Tyrese Maxey (PHI)"
    let teamHint: string | undefined;
    const teamMatch = body.match(/\(([A-Z]{2,3})\)\s*$/);
    if (teamMatch) {
      teamHint = teamMatch[1];
      body = body.slice(0, teamMatch.index).trim();
    }
    const { tier, rest } = detectTierPrefix(body);
    // Try NBA match first.
    const playerId = getPlayerIdByName(rest);
    if (playerId && !tier) {
      out.push({
        slotKey,
        slot: { source: "nba", playerId },
        rawLine: line,
        matched: true,
      });
      seen.add(slotKey);
      continue;
    }
    // Otherwise custom card.
    const chosenTier: MyTeamTier = tier ?? "Gold";
    const [lo, hi] = TIER_OVR_HINT[chosenTier];
    const card: CustomCard = {
      id: newCustomCardId(),
      name: rest || body,
      tier: chosenTier,
      position: SLOT_LABEL[slotKey],
      ovr: Math.round((lo + hi) / 2),
      attrFocus: [],
      notes: teamHint ? `Team hint: ${teamHint}` : undefined,
      savedAt: Date.now(),
    };
    out.push({
      slotKey,
      slot: { source: "custom", customCard: card },
      rawLine: line,
      matched: false,
    });
    seen.add(slotKey);
  }
  return out;
}

// ---------- player picker search ----------

export function pickerSearch(q: string): Player[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return PLAYERS.slice(0, 30);
  return PLAYERS.filter((p) => {
    const hay = `${p.displayName} ${p.team} ${p.position}`.toLowerCase();
    return hay.includes(needle);
  }).slice(0, 50);
}
