export type LockerCodeMode = "MyTeam" | "MyCareer" | "2KMobile" | "All";

export type LockerCodeReward = {
  label: string;
  qty?: number;
};

export type LockerCode = {
  id: string;
  code: string;
  rewards: LockerCodeReward[];
  mode: LockerCodeMode;
  source: string;
  droppedAt: string;
  expiresAt: string | null;
  tier: "S" | "A" | "B" | "C";
  notes?: string;
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/**
 * Active codes — expiration is calculated relative to the moment this
 * module is evaluated on the client, so countdowns stay meaningful no
 * matter when the page is loaded.
 *
 * Spread:
 *   - 3 within 24h (1 under 1h, 1 ~4h, 1 ~18h)
 *   - 5 within 7d
 *   - 6 further out (8–21d)
 */
export function getActiveCodes(now: number = Date.now()): LockerCode[] {
  const offset = (hours: number) =>
    new Date(now + hours * HOUR).toISOString();
  const dropped = (daysAgo: number) =>
    new Date(now - daysAgo * DAY).toISOString();

  return [
    {
      id: "fl-2k26-lab-launch",
      code: "WELCOME-TO-2K26-LAB",
      rewards: [
        { label: "VC", qty: 5000 },
        { label: "Free Agent Pack" },
      ],
      mode: "MyTeam",
      source: "2K_Twitter · @NBA2K",
      droppedAt: dropped(0.3),
      expiresAt: offset(0.6),
      tier: "S",
      notes: "Stacked with launch promo — single-use per account.",
    },
    {
      id: "fl-diamond-shoe-boost",
      code: "DIAMOND-SHOE-BOOST-MAY",
      rewards: [
        { label: "Diamond Shoe Boost" },
        { label: "Tattoo Bundle" },
      ],
      mode: "MyCareer",
      source: "Livestream · 2KTV Ep.18",
      droppedAt: dropped(0.6),
      expiresAt: offset(4.2),
      tier: "A",
    },
    {
      id: "fl-token-tuesday",
      code: "TOKEN-TUESDAY-DROP",
      rewards: [
        { label: "Token Pack", qty: 3 },
        { label: "MT", qty: 10000 },
      ],
      mode: "MyTeam",
      source: "MyTeam community · Discord",
      droppedAt: dropped(1.1),
      expiresAt: offset(18),
      tier: "A",
    },
    {
      id: "fl-badge-boost-may",
      code: "BADGE-BOOST-PLAYOFF-RUN",
      rewards: [
        { label: "Badge Boost", qty: 5 },
        { label: "VC", qty: 2500 },
      ],
      mode: "MyCareer",
      source: "2K_Twitter · @NBA2K",
      droppedAt: dropped(1.7),
      expiresAt: offset(36),
      tier: "B",
    },
    {
      id: "fl-locker-pack-x3",
      code: "LOCKER-PACK-TRIPLE-DROP",
      rewards: [
        { label: "Locker Code Pack", qty: 3 },
      ],
      mode: "MyTeam",
      source: "Livestream · MyTeam Wars",
      droppedAt: dropped(2.4),
      expiresAt: offset(2 * 24),
      tier: "B",
    },
    {
      id: "fl-lonzo-diamond",
      code: "DIAMOND-LONZO-PG-DROP",
      rewards: [
        { label: "Player Card: Diamond Lonzo Ball" },
        { label: "Token Pack", qty: 1 },
      ],
      mode: "MyTeam",
      source: "2K_Twitter · @NBA2KMyTeam",
      droppedAt: dropped(3),
      expiresAt: offset(3 * 24 + 8),
      tier: "S",
    },
    {
      id: "fl-mobile-vc-bonus",
      code: "MOBILE-VC-BONUS-25K",
      rewards: [{ label: "VC", qty: 25000 }],
      mode: "2KMobile",
      source: "2K Mobile newsletter",
      droppedAt: dropped(4),
      expiresAt: offset(4 * 24 + 6),
      tier: "S",
      notes: "Redeem inside 2K Mobile only.",
    },
    {
      id: "fl-animations-pack",
      code: "MYPLAYER-ANIM-PACK-V2",
      rewards: [
        { label: "MyPlayer Animations" },
        { label: "VC", qty: 1000 },
      ],
      mode: "MyCareer",
      source: "Livestream · Dev Diary",
      droppedAt: dropped(5),
      expiresAt: offset(6 * 24),
      tier: "B",
    },
    {
      id: "fl-fa-pack-weekly",
      code: "FA-PACK-WEEKLY-MAY-W3",
      rewards: [{ label: "Free Agent Pack", qty: 2 }],
      mode: "MyTeam",
      source: "MyTeam community · r/MyTeam",
      droppedAt: dropped(2),
      expiresAt: offset(8 * 24),
      tier: "C",
    },
    {
      id: "fl-summer-league-tease",
      code: "SUMMER-LEAGUE-PREVIEW",
      rewards: [
        { label: "VC", qty: 10000 },
        { label: "Badge Boost", qty: 2 },
      ],
      mode: "MyCareer",
      source: "2K_Twitter · @NBA2K",
      droppedAt: dropped(6),
      expiresAt: offset(10 * 24),
      tier: "A",
    },
    {
      id: "fl-finals-hype",
      code: "FINALS-HYPE-DROP-2026",
      rewards: [
        { label: "Player Card: Amethyst Tatum" },
        { label: "MT", qty: 5000 },
      ],
      mode: "MyTeam",
      source: "Livestream · 2KTV Ep.17",
      droppedAt: dropped(7),
      expiresAt: offset(12 * 24),
      tier: "S",
    },
    {
      id: "fl-rookie-grind",
      code: "ROOKIE-GRIND-XP-BOOST",
      rewards: [
        { label: "XP Boost", qty: 4 },
        { label: "VC", qty: 1000 },
      ],
      mode: "MyCareer",
      source: "MyCareer community · Discord",
      droppedAt: dropped(8),
      expiresAt: offset(14 * 24),
      tier: "C",
    },
    {
      id: "fl-mobile-tournament",
      code: "MOBILE-TOURNAMENT-ENTRY",
      rewards: [
        { label: "Tournament Entry" },
        { label: "Free Agent Pack", qty: 1 },
      ],
      mode: "2KMobile",
      source: "2K Mobile newsletter",
      droppedAt: dropped(9),
      expiresAt: offset(17 * 24),
      tier: "B",
    },
    {
      id: "fl-anniversary-2k26",
      code: "2K26-ANNIVERSARY-VAULT",
      rewards: [
        { label: "Vault Code" },
        { label: "VC", qty: 25000 },
        { label: "Token Pack", qty: 5 },
      ],
      mode: "All",
      source: "2K_Twitter · @NBA2K",
      droppedAt: dropped(10),
      expiresAt: offset(21 * 24),
      tier: "S",
      notes: "Cross-mode redeem — single account use.",
    },
  ];
}

/**
 * Archive — 22 recent expired codes with fixed dates that read as history.
 */
export const ARCHIVED_CODES: LockerCode[] = [
  {
    id: "ar-launch-day",
    code: "NBA-2K26-LAUNCH-DAY",
    rewards: [
      { label: "VC", qty: 10000 },
      { label: "Free Agent Pack" },
    ],
    mode: "All",
    source: "2K_Twitter · @NBA2K",
    droppedAt: "2025-09-05T16:00:00Z",
    expiresAt: "2025-09-08T16:00:00Z",
    tier: "S",
  },
  {
    id: "ar-myteam-preseason",
    code: "MYTEAM-PRESEASON-PACK",
    rewards: [{ label: "Free Agent Pack", qty: 3 }],
    mode: "MyTeam",
    source: "Livestream · 2KTV Ep.1",
    droppedAt: "2025-09-12T20:00:00Z",
    expiresAt: "2025-09-15T20:00:00Z",
    tier: "A",
  },
  {
    id: "ar-halloween-vault",
    code: "HALLOWEEN-VAULT-OCT",
    rewards: [
      { label: "Player Card: Pink Diamond Vince Carter" },
      { label: "Token Pack", qty: 2 },
    ],
    mode: "MyTeam",
    source: "2K_Twitter · @NBA2KMyTeam",
    droppedAt: "2025-10-28T17:00:00Z",
    expiresAt: "2025-10-31T23:59:00Z",
    tier: "S",
  },
  {
    id: "ar-veterans-day",
    code: "VETERANS-DAY-2025",
    rewards: [{ label: "VC", qty: 5000 }],
    mode: "MyCareer",
    source: "2K_Twitter · @NBA2K",
    droppedAt: "2025-11-10T15:00:00Z",
    expiresAt: "2025-11-12T15:00:00Z",
    tier: "B",
  },
  {
    id: "ar-thanksgiving",
    code: "TURKEY-DAY-DROP-2025",
    rewards: [
      { label: "MT", qty: 5000 },
      { label: "Locker Code Pack" },
    ],
    mode: "MyTeam",
    source: "MyTeam community · Discord",
    droppedAt: "2025-11-26T13:00:00Z",
    expiresAt: "2025-11-28T23:00:00Z",
    tier: "B",
  },
  {
    id: "ar-black-friday",
    code: "BLACK-FRIDAY-VC-BOMB",
    rewards: [{ label: "VC", qty: 25000 }],
    mode: "All",
    source: "2K_Twitter · @NBA2K",
    droppedAt: "2025-11-28T05:00:00Z",
    expiresAt: "2025-11-30T23:59:00Z",
    tier: "S",
  },
  {
    id: "ar-cyber-monday",
    code: "CYBER-MONDAY-TOKENS",
    rewards: [{ label: "Token Pack", qty: 4 }],
    mode: "MyTeam",
    source: "2K_Twitter · @NBA2KMyTeam",
    droppedAt: "2025-12-01T14:00:00Z",
    expiresAt: "2025-12-03T14:00:00Z",
    tier: "A",
  },
  {
    id: "ar-12-days-d1",
    code: "12-DAYS-OF-2K-DAY-1",
    rewards: [{ label: "Free Agent Pack" }, { label: "MT", qty: 2500 }],
    mode: "MyTeam",
    source: "Livestream · 12 Days of 2K",
    droppedAt: "2025-12-12T18:00:00Z",
    expiresAt: "2025-12-13T18:00:00Z",
    tier: "C",
  },
  {
    id: "ar-12-days-d6",
    code: "12-DAYS-OF-2K-DAY-6",
    rewards: [{ label: "Diamond Shoe Boost" }],
    mode: "MyCareer",
    source: "Livestream · 12 Days of 2K",
    droppedAt: "2025-12-17T18:00:00Z",
    expiresAt: "2025-12-18T18:00:00Z",
    tier: "B",
  },
  {
    id: "ar-christmas-eve",
    code: "CHRISTMAS-EVE-VAULT",
    rewards: [
      { label: "Player Card: Galaxy Opal Larry Bird" },
      { label: "VC", qty: 10000 },
    ],
    mode: "MyTeam",
    source: "2K_Twitter · @NBA2K",
    droppedAt: "2025-12-24T12:00:00Z",
    expiresAt: "2025-12-26T12:00:00Z",
    tier: "S",
  },
  {
    id: "ar-new-year",
    code: "NEW-YEAR-2026-DROP",
    rewards: [
      { label: "VC", qty: 10000 },
      { label: "Badge Boost", qty: 3 },
    ],
    mode: "All",
    source: "2K_Twitter · @NBA2K",
    droppedAt: "2025-12-31T22:00:00Z",
    expiresAt: "2026-01-02T22:00:00Z",
    tier: "A",
  },
  {
    id: "ar-mlk-day",
    code: "MLK-DAY-TRIBUTE-2026",
    rewards: [{ label: "Free Agent Pack" }],
    mode: "MyTeam",
    source: "Livestream · MLK Tribute",
    droppedAt: "2026-01-18T16:00:00Z",
    expiresAt: "2026-01-20T23:59:00Z",
    tier: "C",
  },
  {
    id: "ar-allstar-east",
    code: "ALLSTAR-EAST-2026",
    rewards: [
      { label: "Player Card: Amethyst Embiid" },
      { label: "Token Pack" },
    ],
    mode: "MyTeam",
    source: "2K_Twitter · @NBA2KMyTeam",
    droppedAt: "2026-02-14T20:00:00Z",
    expiresAt: "2026-02-17T20:00:00Z",
    tier: "A",
  },
  {
    id: "ar-allstar-west",
    code: "ALLSTAR-WEST-2026",
    rewards: [
      { label: "Player Card: Amethyst Doncic" },
      { label: "Token Pack" },
    ],
    mode: "MyTeam",
    source: "2K_Twitter · @NBA2KMyTeam",
    droppedAt: "2026-02-14T20:00:00Z",
    expiresAt: "2026-02-17T20:00:00Z",
    tier: "A",
  },
  {
    id: "ar-presidents-day",
    code: "PRESIDENTS-DAY-VC",
    rewards: [{ label: "VC", qty: 5000 }],
    mode: "MyCareer",
    source: "2K_Twitter · @NBA2K",
    droppedAt: "2026-02-16T15:00:00Z",
    expiresAt: "2026-02-18T15:00:00Z",
    tier: "C",
  },
  {
    id: "ar-trade-deadline",
    code: "TRADE-DEADLINE-2026",
    rewards: [
      { label: "Locker Code Pack", qty: 2 },
      { label: "MT", qty: 7500 },
    ],
    mode: "MyTeam",
    source: "MyTeam community · r/MyTeam",
    droppedAt: "2026-02-26T19:00:00Z",
    expiresAt: "2026-02-28T19:00:00Z",
    tier: "B",
  },
  {
    id: "ar-march-madness-1",
    code: "MARCH-MADNESS-RD1",
    rewards: [{ label: "Free Agent Pack", qty: 2 }],
    mode: "MyTeam",
    source: "Livestream · 2KTV Ep.12",
    droppedAt: "2026-03-15T17:00:00Z",
    expiresAt: "2026-03-18T17:00:00Z",
    tier: "C",
  },
  {
    id: "ar-march-madness-2",
    code: "MARCH-MADNESS-FINAL4",
    rewards: [{ label: "Token Pack", qty: 3 }],
    mode: "MyTeam",
    source: "Livestream · 2KTV Ep.13",
    droppedAt: "2026-04-04T20:00:00Z",
    expiresAt: "2026-04-07T20:00:00Z",
    tier: "B",
  },
  {
    id: "ar-easter-egg",
    code: "EASTER-EGG-HUNT-2026",
    rewards: [
      { label: "MyPlayer Animations" },
      { label: "VC", qty: 2500 },
    ],
    mode: "MyCareer",
    source: "2K_Twitter · @NBA2K",
    droppedAt: "2026-04-05T13:00:00Z",
    expiresAt: "2026-04-07T13:00:00Z",
    tier: "B",
  },
  {
    id: "ar-playoffs-r1",
    code: "PLAYOFFS-ROUND-1-2026",
    rewards: [
      { label: "Free Agent Pack" },
      { label: "Badge Boost", qty: 2 },
    ],
    mode: "MyTeam",
    source: "2K_Twitter · @NBA2KMyTeam",
    droppedAt: "2026-04-19T18:00:00Z",
    expiresAt: "2026-04-22T18:00:00Z",
    tier: "C",
  },
  {
    id: "ar-mothers-day",
    code: "MOTHERS-DAY-DROP-2026",
    rewards: [{ label: "VC", qty: 2500 }],
    mode: "MyCareer",
    source: "2K_Twitter · @NBA2K",
    droppedAt: "2026-05-09T12:00:00Z",
    expiresAt: "2026-05-11T12:00:00Z",
    tier: "C",
  },
  {
    id: "ar-mid-may-flash",
    code: "MID-MAY-FLASH-DROP",
    rewards: [
      { label: "Tattoo Bundle" },
      { label: "VC", qty: 1000 },
    ],
    mode: "MyCareer",
    source: "Livestream · 2KTV Ep.16",
    droppedAt: "2026-05-10T19:00:00Z",
    expiresAt: "2026-05-13T19:00:00Z",
    tier: "C",
  },
];

export function isExpired(code: LockerCode, now: number = Date.now()): boolean {
  if (!code.expiresAt) return false;
  return new Date(code.expiresAt).getTime() <= now;
}

export function getExpiringWithin(
  hours: number,
  now: number = Date.now(),
  codes?: LockerCode[],
): LockerCode[] {
  const list = codes ?? getActiveCodes(now);
  const window = hours * HOUR;
  return list.filter((c) => {
    if (!c.expiresAt) return false;
    const ms = new Date(c.expiresAt).getTime() - now;
    return ms > 0 && ms <= window;
  });
}

export function msUntilExpiry(
  code: LockerCode,
  now: number = Date.now(),
): number | null {
  if (!code.expiresAt) return null;
  return new Date(code.expiresAt).getTime() - now;
}
