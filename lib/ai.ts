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
  proxyUrl: "2klab.ai.proxyUrl",
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

// ---------- Worker proxy URL ----------
//
// If set, the site routes Claude calls through the Cloudflare Worker in
// `/proxy` instead of calling Anthropic directly from the browser. This
// avoids the browser-CORS gate and keeps the real API key server-side.
// The Worker URL is the bare origin, e.g.
//   https://twok-lab-proxy.<sub>.workers.dev
// (the site appends `/v1/messages` itself).

function normalizeProxyUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Strip trailing slashes so we can always join with "/v1/messages".
  return trimmed.replace(/\/+$/, "");
}

export function loadProxyUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_KEYS.proxyUrl);
    if (!raw) return null;
    const normalized = normalizeProxyUrl(raw);
    return normalized || null;
  } catch {
    return null;
  }
}

export function saveProxyUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeProxyUrl(url);
    if (!normalized) {
      window.localStorage.removeItem(AI_KEYS.proxyUrl);
      return;
    }
    window.localStorage.setItem(AI_KEYS.proxyUrl, normalized);
  } catch {
    /* ignore */
  }
}

export function clearProxyUrl(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AI_KEYS.proxyUrl);
  } catch {
    /* ignore */
  }
}

// ---------- aiCall — proxy-or-direct abstraction ----------
//
// Both `AiChat.tsx` and `lib/coach-agent.ts` need the same precedence
// rule: if a Worker proxy URL is configured, use it (no API key sent from
// the browser); otherwise call the Anthropic SDK directly with the
// in-browser key. This helper picks the right path and returns either the
// joined text or a streaming iterator of deltas.

export type AiCallMessage = { role: ChatRole; content: string };

export type AiCallOpts = {
  /** Anthropic model id, e.g. "claude-sonnet-4-6". */
  model: string;
  /** Anthropic max_tokens. */
  maxTokens: number;
  /** System prompt (already assembled with personalization). */
  system: string;
  /** Conversation. Anthropic format: alternating user/assistant. */
  messages: AiCallMessage[];
  /**
   * If true, the function streams text deltas via `onDelta` and resolves
   * to the joined text at the end. If false (default), it does a plain
   * one-shot call and resolves to the full text.
   */
  stream?: boolean;
  /** Called for each text delta when `stream` is true. */
  onDelta?: (delta: string) => void;
  /**
   * Direct-SDK mode only: the browser API key. Ignored when a proxy URL
   * is configured (the Worker injects its own key).
   */
  apiKey?: string;
};

export type AiCallResult = {
  text: string;
  /** Which path serviced the call — useful for debug surfaces. */
  via: "proxy" | "direct";
};

/**
 * Parse a single SSE chunk into one or more text deltas. Anthropic emits
 * lines like:
 *   event: content_block_delta
 *   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}
 * We only care about `data:` lines whose JSON contains a text delta. Other
 * event types (message_start, ping, message_stop, etc.) are ignored.
 */
function parseSseChunk(chunk: string): string[] {
  const out: string[] = [];
  for (const line of chunk.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const evt = JSON.parse(payload) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      if (
        evt.type === "content_block_delta" &&
        evt.delta?.type === "text_delta" &&
        typeof evt.delta.text === "string"
      ) {
        out.push(evt.delta.text);
      }
    } catch {
      // Ignore malformed lines — Anthropic occasionally emits comments.
    }
  }
  return out;
}

async function aiCallViaProxy(
  proxyUrl: string,
  opts: AiCallOpts,
): Promise<AiCallResult> {
  const body = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    stream: !!opts.stream,
  };

  const res = await fetch(`${proxyUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      if (j?.error?.message) detail = `${res.status} ${j.error.message}`;
    } catch {
      try {
        const t = await res.text();
        if (t) detail = `${res.status} ${t.slice(0, 200)}`;
      } catch {
        /* ignore */
      }
    }
    const err = new Error(`Proxy request failed: ${detail}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  // Non-streaming path: one JSON response.
  if (!opts.stream || !res.body) {
    const j = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (j.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    return { text, via: "proxy" };
  }

  // Streaming path: parse SSE incrementally.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE events are delimited by a blank line ("\n\n"). Process all
    // complete events, keep the trailing partial in the buffer.
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const evt = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const delta of parseSseChunk(evt)) {
        finalText += delta;
        opts.onDelta?.(delta);
      }
    }
  }
  // Flush any trailing partial chunk just in case.
  if (buffer) {
    for (const delta of parseSseChunk(buffer)) {
      finalText += delta;
      opts.onDelta?.(delta);
    }
  }
  return { text: finalText, via: "proxy" };
}

async function aiCallViaSdk(opts: AiCallOpts): Promise<AiCallResult> {
  if (!opts.apiKey) {
    throw new Error("No API key set");
  }
  const mod = await import("@anthropic-ai/sdk");
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

  const apiMessages = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (opts.stream) {
    let finalText = "";
    const stream = client.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: apiMessages,
    });
    stream.on("text", (delta: string) => {
      finalText += delta;
      opts.onDelta?.(delta);
    });
    await stream.finalMessage();
    return { text: finalText, via: "direct" };
  }

  const resp = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: apiMessages,
  });
  type ContentBlock = { type: string; text?: string };
  const blocks = (resp?.content ?? []) as ContentBlock[];
  const text = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  return { text, via: "direct" };
}

/**
 * Unified Claude call. Routes through the Worker proxy if one is
 * configured in localStorage; otherwise calls the Anthropic SDK directly
 * with the browser API key.
 *
 * Order of precedence: Worker proxy > direct SDK with browser key.
 */
export async function aiCall(opts: AiCallOpts): Promise<AiCallResult> {
  const proxyUrl = loadProxyUrl();
  if (proxyUrl) {
    return aiCallViaProxy(proxyUrl, opts);
  }
  return aiCallViaSdk(opts);
}
