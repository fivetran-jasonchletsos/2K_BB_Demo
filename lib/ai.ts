// AI — client-side helpers for the /ai page.
//
// All storage is localStorage. Nothing on this page touches a server.
// The API key never leaves the browser except in direct calls to the
// Anthropic API from `AiChat.tsx`.
//
// All readers are SSR-safe.

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  ts: number;
};

// ---------- Storage keys ----------

export const AI_KEYS = {
  apiKey: "2klab.ai.apiKey",
  history: "2klab.ai.history",
  systemPrompt: "2klab.ai.systemPrompt",
} as const;

// External keys (read-only) used to personalize the system prompt.
const EXT = {
  name: "2klab.coach.name",
  goal: "2klab.coach.goal",
  tier: "2klab.path.tier",
  builds: "2klab.builds",
} as const;

// ---------- The Claude model ----------

export const AI_MODEL = "claude-sonnet-4-6";

// ---------- The 2K Expert system prompt ----------

export const DEFAULT_SYSTEM_PROMPT = `You are 2K Expert, an AI agent embedded in the 2K LAB site. You help a 14-year-old PS5 player become elite at NBA 2K26.

Voice: data-first, gritty, no condescension, no "Pro tip" prefixes, no parental tone. Treat the player as smart. Be concrete: use specific numbers, button combos, badge tiers, and frame timings whenever possible. Cite which patch (currently 2K26 patch 1.7) when relevant.

Knowledge cutoff: you know NBA 2K through patch 1.7. If asked about post-1.7 patches, say so. For real NBA stats, you have rough familiarity with the 2025-26 season.

Format responses for a phone screen: short paragraphs, bullet points where natural, code/mono font for button combos. Keep responses under 200 words unless the question demands depth.

If the player asks about a feature on the site (Build Lab, Badges, Codes, Moves, Scenarios, Pulse, etc.), reference it by route (e.g. "Open /badges and filter by Defense tier S").`;

// ---------- API key ----------

export function loadApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(AI_KEYS.apiKey) ?? "";
  } catch {
    return "";
  }
}

export function saveApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AI_KEYS.apiKey, key.trim());
  } catch {
    /* ignore */
  }
}

export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AI_KEYS.apiKey);
  } catch {
    /* ignore */
  }
}

// ---------- Chat history ----------

export function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AI_KEYS.history);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m as ChatMessage).role !== undefined &&
        typeof (m as ChatMessage).content === "string",
    );
  } catch {
    return [];
  }
}

export function saveHistory(msgs: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep last 60 messages to bound storage.
    const trimmed = msgs.slice(-60);
    window.localStorage.setItem(AI_KEYS.history, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AI_KEYS.history);
  } catch {
    /* ignore */
  }
}

// ---------- Custom system prompt override ----------

export function loadCustomSystemPrompt(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(AI_KEYS.systemPrompt) ?? "";
  } catch {
    return "";
  }
}

export function saveCustomSystemPrompt(s: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AI_KEYS.systemPrompt, s);
  } catch {
    /* ignore */
  }
}

export function clearCustomSystemPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AI_KEYS.systemPrompt);
  } catch {
    /* ignore */
  }
}

// ---------- Personalization context (read other site state) ----------

export type Personalization = {
  name: string;
  goal: string;
  tier: string;
  buildCount: number;
};

export function loadPersonalization(): Personalization {
  if (typeof window === "undefined") {
    return { name: "", goal: "", tier: "", buildCount: 0 };
  }
  const safe = (k: string): string => {
    try {
      return window.localStorage.getItem(k) ?? "";
    } catch {
      return "";
    }
  };
  let buildCount = 0;
  try {
    const raw = window.localStorage.getItem(EXT.builds);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) buildCount = arr.length;
    }
  } catch {
    /* ignore */
  }
  return {
    name: safe(EXT.name),
    goal: safe(EXT.goal),
    tier: safe(EXT.tier),
    buildCount,
  };
}

export function buildContextBlock(p: Personalization): string {
  const handle = p.name || "the player";
  const lines = [
    `Current player handle: ${handle}`,
    `Saved builds: ${p.buildCount}`,
    `Mastery tier: ${p.tier || "unset"}`,
    `Current goal: ${p.goal || "unset"}`,
  ];
  return lines.join("\n");
}

export function buildFullSystemPrompt(
  base: string,
  p: Personalization,
): string {
  return `${base}\n\n---\nPlayer context (from this device, local only):\n${buildContextBlock(p)}`;
}
