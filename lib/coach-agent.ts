// CoachAgent — a real "AI agent" feature that goes beyond chat.
//
// What it does:
//   1. Reads structured input from this browser's localStorage (the player's
//      builds, scenarios, shot stats, watchlist, codes, etc).
//   2. Builds a structured prompt (system + JSON snapshot).
//   3. Calls Claude via the Anthropic SDK (dynamic import, browser-side).
//   4. Parses the model's response as strict JSON, validates it, and returns
//      a typed `WeeklyPlanResponse` that drives native UI.
//
// All storage and SDK access is gated for SSR safety. The SDK import is
// dynamic so static type-check works even when the package is mid-install.
//
// Storage cache key: 2klab.coach.weeklyPlan

import type { CoachSnapshot } from "./coach";

// ---------- Public types --------------------------------------------------

export type WeeklyPlanRequest = {
  snapshot: CoachSnapshot;
  goal: string;
  name: string;
  tier: string;
  weakness?: string;
  // Extra structured context surfaced from coach.analyze() / localStorage.
  // Optional — the model uses whatever is present.
  stuck?: string[];
  growing?: string[];
  buildCount?: number;
  watchlistCount?: number;
  redeemedCount?: number;
  learnedTipsCount?: number;
};

export type WeeklyPlanAction = {
  label: string;
  page: string;
  estMinutes: number;
  reason: string;
};

export type WeeklyPlanDay = {
  day: number; // 1..7
  dayLabel: string; // "Mon" .. "Sun"
  actions: WeeklyPlanAction[]; // exactly 3
};

export type WeeklyPlanResponse = {
  rationale: string;
  days: WeeklyPlanDay[]; // exactly 7
};

export type CachedWeeklyPlan = {
  plan: WeeklyPlanResponse;
  generatedAt: number;
};

// ---------- Errors --------------------------------------------------------

export class AgentError extends Error {
  raw: string;
  cause?: unknown;
  constructor(message: string, raw: string, cause?: unknown) {
    super(message);
    this.name = "AgentError";
    this.raw = raw;
    this.cause = cause;
  }
}

// ---------- Constants -----------------------------------------------------

export const COACH_AGENT_MODEL = "claude-sonnet-4-6";
export const COACH_AGENT_CACHE_KEY = "2klab.coach.weeklyPlan";

export const ALLOWED_PAGES = [
  "/builds",
  "/badges",
  "/codes",
  "/moves",
  "/players",
  "/scenarios",
  "/shot-trainer",
  "/tips",
  "/pulse",
  "/my-stats",
  "/diagnose",
  "/ai",
] as const;

const ALLOWED_PAGES_SET = new Set<string>(ALLOWED_PAGES);

// ---------- System prompt -------------------------------------------------

export const COACH_AGENT_SYSTEM_PROMPT = `You are CoachAgent, an AI agent inside the 2K LAB app that generates a 7-day NBA 2K26 development plan for a specific player.

You receive a JSON snapshot of the player's current activity, goal, mastery tier, and weakness (if known). You return ONLY a JSON object — no markdown, no commentary — matching this exact schema:

{
  "rationale": "<= 60 words on why this plan>",
  "days": [
    { "day": 1, "dayLabel": "Mon", "actions": [
      { "label": "...", "page": "/scenarios", "estMinutes": 4, "reason": "..." },
      ...
    ]},
    ... 7 days total ...
  ]
}

Rules:
- Day 1 starts today. Use weekday abbreviations Mon/Tue/Wed/Thu/Fri/Sat/Sun starting from today's actual weekday.
- 3 actions per day.
- \`page\` MUST be one of: /builds, /badges, /codes, /moves, /players, /scenarios, /shot-trainer, /tips, /pulse, /my-stats, /diagnose.
- estMinutes between 2 and 30.
- reason is one short sentence explaining why this action helps.
- Weight actions toward the player's weakness/gap from the snapshot. Vary across categories.
- If \`stuck\` includes "shot accuracy" — push more /shot-trainer.
- If \`stuck\` includes "defense scenarios" — push more /scenarios with defensive categories.
- If buildCount < 2 — include 1-2 /builds actions.
- If watchlist empty — include 1-2 /players actions.
- If codes not redeemed this week — include 1 /codes action.

NO prose outside the JSON. NO trailing text. Start with { end with }.`;

// ---------- Snapshot serialization ----------------------------------------

/**
 * Pack the request into the JSON the model receives as the user message.
 * Kept compact and stable — easy to read in the "Show prompt" toggle.
 */
export function packRequest(req: WeeklyPlanRequest): string {
  const today = new Date();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  const todayLabel = weekdays[today.getDay()];

  const payload = {
    today: {
      iso: today.toISOString().slice(0, 10),
      weekdayLabel: todayLabel,
    },
    player: {
      name: req.name || "(unset)",
      tier: req.tier || "(unset)",
      goal: req.goal || "(unset)",
      weakness: req.weakness ?? null,
    },
    snapshot: req.snapshot,
    signal: {
      stuck: req.stuck ?? [],
      growing: req.growing ?? [],
    },
    counts: {
      buildCount: req.buildCount ?? 0,
      watchlistCount: req.watchlistCount ?? 0,
      redeemedCount: req.redeemedCount ?? 0,
      learnedTipsCount: req.learnedTipsCount ?? 0,
    },
  };

  return JSON.stringify(payload, null, 2);
}

// ---------- Parsing & validation ------------------------------------------

function stripFences(raw: string): string {
  let s = raw.trim();
  // Strip ``` blocks if the model added them despite instructions.
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }
  // If there's any prose before {, slice to first {.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Hand-validate the parsed JSON against the schema. Throws AgentError with
 * the raw text on any deviation so the UI can show useful debug info.
 */
export function validatePlan(parsed: unknown, raw: string): WeeklyPlanResponse {
  if (!isObj(parsed)) {
    throw new AgentError("Top-level is not an object", raw);
  }
  const rationale = parsed.rationale;
  if (typeof rationale !== "string" || rationale.trim().length === 0) {
    throw new AgentError("rationale missing or not a non-empty string", raw);
  }
  const days = parsed.days;
  if (!Array.isArray(days) || days.length !== 7) {
    throw new AgentError(
      `days must be an array of 7 (got ${Array.isArray(days) ? days.length : typeof days})`,
      raw,
    );
  }

  const validDays: WeeklyPlanDay[] = [];
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (!isObj(d)) {
      throw new AgentError(`days[${i}] is not an object`, raw);
    }
    const dayNum = d.day;
    const dayLabel = d.dayLabel;
    const actions = d.actions;
    if (typeof dayNum !== "number" || dayNum < 1 || dayNum > 7) {
      throw new AgentError(`days[${i}].day must be 1-7`, raw);
    }
    if (typeof dayLabel !== "string" || dayLabel.length === 0) {
      throw new AgentError(`days[${i}].dayLabel missing`, raw);
    }
    if (!Array.isArray(actions) || actions.length !== 3) {
      throw new AgentError(
        `days[${i}].actions must be exactly 3 (got ${Array.isArray(actions) ? actions.length : typeof actions})`,
        raw,
      );
    }
    const validActions: WeeklyPlanAction[] = [];
    for (let j = 0; j < actions.length; j++) {
      const a = actions[j];
      if (!isObj(a)) {
        throw new AgentError(`days[${i}].actions[${j}] is not an object`, raw);
      }
      const label = a.label;
      const page = a.page;
      const estMinutes = a.estMinutes;
      const reason = a.reason;
      if (typeof label !== "string" || label.trim().length === 0) {
        throw new AgentError(`days[${i}].actions[${j}].label missing`, raw);
      }
      if (typeof page !== "string" || !ALLOWED_PAGES_SET.has(page)) {
        throw new AgentError(
          `days[${i}].actions[${j}].page invalid (got "${String(page)}")`,
          raw,
        );
      }
      if (
        typeof estMinutes !== "number" ||
        !Number.isFinite(estMinutes) ||
        estMinutes < 2 ||
        estMinutes > 30
      ) {
        throw new AgentError(
          `days[${i}].actions[${j}].estMinutes must be 2-30`,
          raw,
        );
      }
      if (typeof reason !== "string" || reason.trim().length === 0) {
        throw new AgentError(`days[${i}].actions[${j}].reason missing`, raw);
      }
      validActions.push({
        label: label.trim(),
        page,
        estMinutes: Math.round(estMinutes),
        reason: reason.trim(),
      });
    }
    validDays.push({
      day: Math.round(dayNum),
      dayLabel: dayLabel.trim(),
      actions: validActions,
    });
  }

  return {
    rationale: rationale.trim(),
    days: validDays,
  };
}

// ---------- The agent call ------------------------------------------------

export type AgentEvent =
  | { type: "reading" }
  | { type: "calling"; model: string }
  | { type: "parsing" }
  | { type: "done" };

export type GenerateOpts = {
  apiKey: string;
  onEvent?: (e: AgentEvent) => void;
};

/**
 * The actual agent. Reads structured input → builds prompt → calls Claude →
 * parses + validates the JSON response → returns structured output.
 */
export async function generateWeeklyPlan(
  req: WeeklyPlanRequest,
  opts: GenerateOpts,
): Promise<WeeklyPlanResponse> {
  if (!opts.apiKey) {
    throw new AgentError("No API key set", "");
  }
  opts.onEvent?.({ type: "reading" });

  const userPayload = packRequest(req);

  opts.onEvent?.({ type: "calling", model: COACH_AGENT_MODEL });

  // Dynamic import keeps the SDK out of the initial bundle and makes static
  // type-check work even before `npm install` finishes.
  const mod = await import("@anthropic-ai/sdk");
  // The SDK ships as a default export; older shapes export `.Anthropic`.
  const AnthropicCtor =
    (mod as { default?: unknown }).default ??
    (mod as { Anthropic?: unknown }).Anthropic ??
    mod;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Anthropic = AnthropicCtor as new (cfg: any) => any;
  const client = new Anthropic({
    apiKey: opts.apiKey,
    dangerouslyAllowBrowser: true,
  });

  let rawText = "";
  try {
    const resp = await client.messages.create({
      model: COACH_AGENT_MODEL,
      max_tokens: 2000,
      system: COACH_AGENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPayload }],
    });

    type ContentBlock = { type: string; text?: string };
    const blocks = (resp?.content ?? []) as ContentBlock[];
    rawText = blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  } catch (err) {
    throw new AgentError(
      (err as { message?: string })?.message ?? "API call failed",
      rawText,
      err,
    );
  }

  opts.onEvent?.({ type: "parsing" });

  const stripped = stripFences(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    throw new AgentError(
      `Response is not valid JSON: ${(err as Error).message}`,
      rawText,
      err,
    );
  }

  const validated = validatePlan(parsed, rawText);

  opts.onEvent?.({ type: "done" });

  return validated;
}

// ---------- Cache helpers -------------------------------------------------

function safeWindow(): boolean {
  return typeof window !== "undefined";
}

export function loadCachedPlan(): CachedWeeklyPlan | null {
  if (!safeWindow()) return null;
  try {
    const raw = window.localStorage.getItem(COACH_AGENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isObj(parsed)) return null;
    const plan = parsed.plan;
    const generatedAt = parsed.generatedAt;
    if (typeof generatedAt !== "number" || !Number.isFinite(generatedAt)) {
      return null;
    }
    try {
      const validated = validatePlan(plan, JSON.stringify(plan));
      return { plan: validated, generatedAt };
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export function saveCachedPlan(
  plan: WeeklyPlanResponse,
  generatedAt: number = Date.now(),
): void {
  if (!safeWindow()) return;
  try {
    const payload: CachedWeeklyPlan = { plan, generatedAt };
    window.localStorage.setItem(COACH_AGENT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function clearCachedPlan(): void {
  if (!safeWindow()) return;
  try {
    window.localStorage.removeItem(COACH_AGENT_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * True if the cached plan is older than `hours` (default 7 days).
 */
export function isStale(
  cached: CachedWeeklyPlan | null,
  hours: number = 24 * 7,
  now: number = Date.now(),
): boolean {
  if (!cached) return true;
  const ageMs = now - cached.generatedAt;
  return ageMs > hours * 3600 * 1000;
}
