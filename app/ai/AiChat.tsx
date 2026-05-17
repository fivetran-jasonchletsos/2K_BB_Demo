"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AI_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  aiCall,
  buildFullSystemPrompt,
  clearHistory,
  loadCustomSystemPrompt,
  loadHistory,
  loadPersonalization,
  loadProxyUrl,
  saveCustomSystemPrompt,
  saveHistory,
  type ChatMessage,
} from "@/lib/ai";

const SUGGESTED_PROMPTS = [
  "What's the best build for PG under 6'2?",
  "Best signature jumper for a 90 mid-range?",
  "How do I stop a slasher in 1v1?",
  "Why is Quickdraw S-tier?",
  "What patch nerfs happened in 1.7?",
  "Daily routine to hit Diamond rep in 2 weeks?",
  "How do I do a step-back 3 with Curry's jumper?",
  "Best counter to a pick-and-roll lob?",
  "How do I cancel a dunk animation mid-air?",
  "Defensive stick combo against post-up centers",
];

type Props = {
  apiKey: string;
  hydrated: boolean;
  onMissingKey: () => void;
};

export function AiChat({ apiKey, hydrated, onMissingKey }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<ReactNode | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate history + custom prompt
  useEffect(() => {
    if (!hydrated) return;
    setMessages(loadHistory());
    setPromptDraft(loadCustomSystemPrompt() || DEFAULT_SYSTEM_PROMPT);
  }, [hydrated]);

  // Persist messages on change
  useEffect(() => {
    if (!hydrated) return;
    saveHistory(messages);
  }, [messages, hydrated]);

  // Auto-scroll
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, streamingText, pending]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || pending) return;
      // We require EITHER a configured proxy URL OR an in-browser API
      // key. If neither is set, kick the user to /connect.
      const proxyUrl = loadProxyUrl();
      if (!proxyUrl && !apiKey) {
        onMissingKey();
        return;
      }
      setError(null);

      const userMsg: ChatMessage = { role: "user", content: text, ts: Date.now() };
      const nextHistory: ChatMessage[] = [...messages, userMsg];
      setMessages(nextHistory);
      setInput("");
      setPending(true);
      setStreamingText("");

      const customPrompt = loadCustomSystemPrompt();
      const basePrompt = customPrompt.trim() || DEFAULT_SYSTEM_PROMPT;
      const fullSystem = buildFullSystemPrompt(
        basePrompt,
        loadPersonalization(),
      );

      // Anthropic format requires alternating user/assistant turns.
      const apiMessages = nextHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let finalText = "";

      try {
        // Try streaming first; fall back to non-streaming on failure.
        // `aiCall` picks Worker-proxy vs. direct-SDK based on whether a
        // proxy URL is configured in localStorage.
        try {
          const { text: streamed } = await aiCall({
            model: AI_MODEL,
            maxTokens: 1024,
            system: fullSystem,
            messages: apiMessages,
            stream: true,
            apiKey,
            onDelta: (delta) => {
              finalText += delta;
              setStreamingText(finalText);
            },
          });
          // `aiCall` already accumulates internally; prefer its return
          // value in case onDelta missed any trailing flush.
          if (streamed) finalText = streamed;
        } catch (streamErr) {
          const { text: oneshot } = await aiCall({
            model: AI_MODEL,
            maxTokens: 1024,
            system: fullSystem,
            messages: apiMessages,
            stream: false,
            apiKey,
          });
          finalText = oneshot;
          if (!finalText) throw streamErr;
        }

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: finalText,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        if (e?.status === 401 || /401|invalid/i.test(e?.message || "")) {
          setError(
            <>
              API key doesn&apos;t work. Check it on{" "}
              <Link
                href="/connect"
                className="underline underline-offset-2 hover:text-ink"
              >
                /connect
              </Link>
              .
            </>,
          );
        } else if (e?.status === 429) {
          setError("Rate limited. Wait a moment and try again.");
        } else if (e?.status === 529 || e?.status === 503) {
          setError("Anthropic is overloaded. Retry in a few seconds.");
        } else {
          setError(e?.message || "Request failed. Check your connection.");
        }
      } finally {
        setPending(false);
        setStreamingText("");
      }
    },
    [apiKey, messages, onMissingKey, pending],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const onClearChat = () => {
    if (pending) return;
    clearHistory();
    setMessages([]);
    setError(null);
  };

  const onSavePrompt = () => {
    saveCustomSystemPrompt(promptDraft.trim());
    setEditingPrompt(false);
  };

  const onResetPrompt = () => {
    setPromptDraft(DEFAULT_SYSTEM_PROMPT);
    saveCustomSystemPrompt("");
  };

  const showWelcome = hydrated && messages.length === 0 && !pending;
  const firstAssistantIdx = useMemo(
    () => messages.findIndex((m) => m.role === "assistant"),
    [messages],
  );

  return (
    <div className="flex flex-col">
      {/* Message list */}
      <div
        ref={listRef}
        className="min-h-[44vh] max-h-[58vh] overflow-y-auto rounded-xl border border-line bg-surface p-3 md:p-4"
      >
        {showWelcome && (
          <div className="py-6 text-center text-sm text-muted">
            Ask the 2K Expert anything. Builds, badges, jumpers, patch notes.
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const showExpertLabel =
              !isUser && i === firstAssistantIdx;
            return (
              <li
                key={`${m.ts}-${i}`}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    isUser
                      ? "bg-surface2 text-ink"
                      : "bg-bg/60 border border-line text-ink"
                  }`}
                >
                  {showExpertLabel && (
                    <div className="mb-1 font-display text-xs uppercase tracking-wider text-flame">
                      Expert
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              </li>
            );
          })}

          {pending && (
            <li className="flex justify-start">
              <div className="max-w-[88%] rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm leading-relaxed text-ink">
                {streamingText ? (
                  <span className="whitespace-pre-wrap break-words">
                    {streamingText}
                    <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-flame align-middle" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Dot delay="0ms" />
                    <Dot delay="120ms" />
                    <Dot delay="240ms" />
                  </span>
                )}
              </div>
            </li>
          )}
        </ul>
      </div>

      {error && (
        <div className="mt-2 rounded-md border border-flame/60 bg-flame/10 px-3 py-2 text-sm text-flame">
          {error}
        </div>
      )}

      {/* Suggested prompts */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setInput(p);
              textareaRef.current?.focus();
            }}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-flame hover:text-ink"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 mt-3 -mx-1 rounded-xl border border-line bg-bg/95 p-2 backdrop-blur md:static md:bg-transparent md:p-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              apiKey ? "Ask the 2K Expert…" : "Set an API key to start"
            }
            className="min-h-14 max-h-32 flex-1 resize-y rounded-md border border-line bg-surface px-3 py-3 text-sm text-ink placeholder:text-muted focus:border-flame focus:outline-none"
            disabled={pending}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={pending || !input.trim()}
            className="h-14 rounded-md bg-flame px-5 font-display text-base tracking-wider text-black transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-muted">
          <button
            type="button"
            onClick={onClearChat}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            Clear chat
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptDraft(
                loadCustomSystemPrompt() || DEFAULT_SYSTEM_PROMPT,
              );
              setEditingPrompt((v) => !v);
            }}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {editingPrompt ? "Hide" : "Edit"} system prompt
          </button>
        </div>
      </div>

      {/* System prompt editor */}
      {editingPrompt && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-display text-sm tracking-wider text-ink">
              System prompt
            </div>
            <button
              type="button"
              onClick={onResetPrompt}
              className="text-[11px] text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Reset to default
            </button>
          </div>
          <textarea
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-xs leading-relaxed text-ink focus:border-flame focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingPrompt(false)}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSavePrompt}
              className="rounded-md bg-flame px-3 py-1.5 text-xs font-bold text-black"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
      style={{ animationDelay: delay }}
    />
  );
}
