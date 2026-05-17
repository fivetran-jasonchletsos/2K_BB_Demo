"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiChat } from "./AiChat";
import {
  AI_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  buildContextBlock,
  clearApiKey,
  loadApiKey,
  loadPersonalization,
  saveApiKey,
  type Personalization,
} from "@/lib/ai";

type Tab = "ask" | "meet" | "build" | "see";

const TABS: { id: Tab; label: string }[] = [
  { id: "ask", label: "Ask" },
  { id: "meet", label: "Meet the Agent" },
  { id: "build", label: "Build Yours" },
  { id: "see", label: "See it work" },
];

export default function AiPage() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("ask");
  const [apiKey, setApiKey] = useState("");
  const [keyEditor, setKeyEditor] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [personalization, setPersonalization] = useState<Personalization>({
    name: "",
    goal: "",
    tier: "",
    buildCount: 0,
  });

  useEffect(() => {
    setApiKey(loadApiKey());
    setPersonalization(loadPersonalization());
    setHydrated(true);
  }, []);

  const onSaveKey = useCallback(() => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    saveApiKey(trimmed);
    setApiKey(trimmed);
    setKeyDraft("");
    setKeyEditor(false);
  }, [keyDraft]);

  const onClearKey = useCallback(() => {
    clearApiKey();
    setApiKey("");
  }, []);

  const onMissingKey = useCallback(() => {
    setKeyEditor(true);
  }, []);

  const connected = hydrated && !!apiKey;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-5xl tracking-wider text-ink md:text-6xl">
              AI
            </h1>
            <p className="mt-1 text-sm text-muted">
              Ask the 2K Expert · See how it works · Build your own
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (connected) {
                setKeyEditor((v) => !v);
              } else {
                setKeyEditor(true);
              }
            }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              connected
                ? "border-lime/60 bg-lime/10 text-lime"
                : "border-flame/60 bg-flame/10 text-flame"
            }`}
          >
            {hydrated ? (connected ? "Connected" : "No key set") : "…"}
          </button>
        </div>
      </header>

      {/* API key editor */}
      {keyEditor && (
        <div className="mb-5 rounded-xl border border-line bg-surface p-4">
          <div className="font-display text-lg tracking-wider text-ink">
            Anthropic API key
          </div>
          <p className="mt-1 text-xs text-muted">
            Stored only in this browser&apos;s localStorage. Never sent anywhere
            except api.anthropic.com.{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="text-ice underline-offset-2 hover:underline"
            >
              Get one at console.anthropic.com
            </a>
            .
          </p>
          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-ant-…"
              className="flex-1 rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-ink focus:border-flame focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveKey}
                disabled={!keyDraft.trim()}
                className="rounded-md bg-flame px-4 py-2 text-sm font-bold text-black disabled:bg-line disabled:text-muted"
              >
                Save
              </button>
              {connected && (
                <button
                  type="button"
                  onClick={onClearKey}
                  className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-muted hover:text-ink"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setKeyEditor(false);
                  setKeyDraft("");
                }}
                className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab strip */}
      <div
        role="tablist"
        className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                active
                  ? "bg-flame text-black"
                  : "text-muted hover:bg-bg hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "ask" && (
        <AiChat
          apiKey={apiKey}
          hydrated={hydrated}
          onMissingKey={onMissingKey}
        />
      )}

      {tab === "meet" && (
        <MeetTheAgent personalization={personalization} hydrated={hydrated} />
      )}

      {tab === "build" && <BuildYours />}

      {tab === "see" && <SeeItWork />}
    </main>
  );
}

// ===========================================================================
// SEE IT WORK
// ===========================================================================

function SeeItWork() {
  return (
    <div className="flex flex-col gap-6">
      <SectionBlock n="1" title="Chat is the easy demo. Agents do more.">
        <p className="text-sm leading-relaxed text-ink">
          The Ask tab is one model call returning text. A real agent reads
          structured input, calls the model with rules, and produces structured
          output that drives the app — not just words on a screen.
        </p>
      </SectionBlock>

      <SectionBlock n="2" title="Try the Coach Agent">
        <p className="mb-3 text-sm text-muted">
          On the Coach page there&apos;s a button: <em>Generate weekly plan</em>.
          When you press it, the agent:
        </p>
        <ol className="flex flex-col gap-2 text-sm text-ink">
          <li className="rounded-md border border-line bg-surface p-3">
            Reads your localStorage — builds, scenarios, shot stats,
            watchlist, codes, learned tips.
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            Packs it as JSON and sends it to Claude with a strict schema.
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            Parses the response as JSON and validates every field.
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            Renders 7 day cards × 3 actions on the page — links to{" "}
            <code className="rounded bg-bg px-1 font-mono text-[11px] text-ink">
              /shot-trainer
            </code>
            ,{" "}
            <code className="rounded bg-bg px-1 font-mono text-[11px] text-ink">
              /scenarios
            </code>
            , etc.
          </li>
        </ol>
        <div className="mt-4">
          <Link
            href="/coach"
            className="inline-flex h-12 items-center rounded-md bg-flame px-5 font-display text-base tracking-wider text-black"
          >
            Try the Coach Agent →
          </Link>
        </div>
      </SectionBlock>

      <SectionBlock n="3" title="Why structured output matters">
        <ul className="flex flex-col gap-2 text-sm text-ink">
          <li className="rounded-md border border-line bg-surface p-3">
            <span className="font-display tracking-wider text-flame">
              UI, not prose.
            </span>{" "}
            Structured JSON drives buttons, links, and cards. The model writes
            data, not a wall of text.
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            <span className="font-display tracking-wider text-flame">
              Validated.
            </span>{" "}
            The agent checks every field. If the model breaks the schema, you
            see the raw response and the parse error.
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            <span className="font-display tracking-wider text-flame">
              Reproducible.
            </span>{" "}
            Same input → same prompt → similar output. You can build pipelines
            instead of conversations.
          </li>
        </ul>
      </SectionBlock>
    </div>
  );
}

// ===========================================================================
// MEET THE AGENT
// ===========================================================================

function MeetTheAgent({
  personalization,
  hydrated,
}: {
  personalization: Personalization;
  hydrated: boolean;
}) {
  const contextBlock = useMemo(
    () =>
      hydrated
        ? buildContextBlock(personalization)
        : buildContextBlock({ name: "", goal: "", tier: "", buildCount: 0 }),
    [hydrated, personalization],
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionBlock n="1" title="The flow">
        <FlowDiagram />
      </SectionBlock>

      <SectionBlock n="2" title="What gets sent">
        <ol className="flex flex-col gap-3">
          <StepCard
            n={1}
            title="System prompt"
            body="Sets voice + rules. Editable in the Ask tab."
          >
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-line bg-bg p-2 font-mono text-[11px] leading-snug text-muted">
              {DEFAULT_SYSTEM_PROMPT}
            </pre>
          </StepCard>
          <StepCard
            n={2}
            title="Personalization context"
            body="Handle, goal, tier — pulled from your localStorage."
          >
            <pre className="mt-2 overflow-auto rounded-md border border-line bg-bg p-2 font-mono text-[11px] leading-snug text-ink">
              {contextBlock}
            </pre>
          </StepCard>
        </ol>
        <div className="mt-2 text-[11px] text-muted">
          Model: <span className="text-ink">{AI_MODEL}</span>. Browser →
          api.anthropic.com, your key only.
        </div>
      </SectionBlock>

      <SectionBlock n="3" title="Why it matters">
        <ul className="flex flex-col gap-1.5 text-sm text-ink">
          <li>· Loops with you, not at you.</li>
          <li>· Tools + model = any specialized helper.</li>
          <li>· Today chat. Tomorrow: patch-note crawlers.</li>
          <li>· Same plumbing powers /coach&apos;s weekly plan.</li>
        </ul>
      </SectionBlock>

      <SectionBlock n="4" title="Limitations">
        <ul className="flex flex-col gap-1.5 text-sm text-ink">
          <li>· Knowledge cutoff — new patches invisible.</li>
          <li>· No live internet in this version.</li>
          <li>· No memory across chats.</li>
          <li>· Can hallucinate — verify in-game.</li>
        </ul>
      </SectionBlock>
    </div>
  );
}

function FlowDiagram() {
  const nodes = [
    { label: "User input", tone: "ink" },
    { label: "System prompt", tone: "muted" },
    { label: "LLM", tone: "flame" },
    { label: "Tools: search · code · APIs", tone: "ice" },
    { label: "Response", tone: "lime" },
  ] as const;

  const toneClass = (tone: string) => {
    switch (tone) {
      case "flame":
        return "border-flame/70 bg-flame/10 text-flame";
      case "ice":
        return "border-ice/60 bg-ice/10 text-ice";
      case "lime":
        return "border-lime/60 bg-lime/10 text-lime";
      case "muted":
        return "border-line bg-bg text-muted";
      default:
        return "border-line bg-surface text-ink";
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-1">
        {nodes.map((n, i) => (
          <div
            key={n.label}
            className="flex flex-col items-stretch gap-2 md:flex-row md:items-center"
          >
            <div
              className={`rounded-md border px-3 py-2 text-center text-xs font-bold uppercase tracking-wider md:text-[11px] ${toneClass(
                n.tone,
              )}`}
            >
              {n.label}
            </div>
            {i < nodes.length - 1 && (
              <div className="self-center text-muted md:px-1">
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-display text-4xl leading-none tracking-wider text-flame">
          {n}
        </span>
        <h2 className="font-display text-2xl leading-tight tracking-wider text-ink md:text-3xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function StepCard({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg tracking-wider text-flame">
          {String(n).padStart(2, "0")}
        </span>
        <div className="font-display text-base tracking-wider text-ink">
          {title}
        </div>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
      {children}
    </li>
  );
}

// ===========================================================================
// BUILD YOURS
// ===========================================================================

const FIRST_AGENT_SNIPPET = `// my-first-agent.ts
// Run: npx tsx my-first-agent.ts
import Anthropic from "@anthropic-ai/sdk";
import readline from "node:readline/promises";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY env var

const system = "You are a Pokemon expert. Be specific about stats, types, and movesets.";
const history: { role: "user" | "assistant"; content: string }[] = [];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

while (true) {
  const userInput = await rl.question("you> ");
  if (!userInput.trim()) break;
  history.push({ role: "user", content: userInput });

  const resp = await client.messages.create({
    model: "${AI_MODEL}",
    max_tokens: 1024,
    system,
    messages: history,
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  history.push({ role: "assistant", content: text });
  console.log("bot>", text, "\\n");
}
rl.close();`;

const EXAMPLE_PROMPTS = [
  {
    label: "Pokemon expert",
    body: `"You are a Pokemon expert. Be specific about stats, types, IVs, EVs, and competitive movesets. Cite the generation when relevant."`,
  },
  {
    label: "Anime recommender",
    body: `"You are an anime expert. Recommend shows based on what the user already liked. Always give 3 options with one-line reasons and where to stream."`,
  },
  {
    label: "Coding tutor",
    body: `"You are a coding tutor for a 14-year-old learning TypeScript. Explain ideas with short code snippets. Never write more than 15 lines without explaining."`,
  },
  {
    label: "Basketball stats",
    body: `"You are a basketball stats nerd. When asked about a player, lead with their per-game line, then advanced stats (TS%, BPM), then context."`,
  },
];

function BuildYours() {
  return (
    <div className="flex flex-col gap-8">
      <SectionBlock n="1" title="Get the tools">
        <ul className="flex flex-col gap-2 text-sm text-ink">
          <li className="rounded-md border border-line bg-surface p-3">
            Install Claude Code (the CLI):
            <pre className="mt-2 overflow-auto rounded-md border border-line bg-bg p-2 font-mono text-xs text-ice">
              npm install -g @anthropic-ai/claude-code
            </pre>
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            Get an API key at{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="text-ice underline-offset-2 hover:underline"
            >
              console.anthropic.com
            </a>
            . Set it in your shell:
            <pre className="mt-2 overflow-auto rounded-md border border-line bg-bg p-2 font-mono text-xs text-ice">
              export ANTHROPIC_API_KEY=sk-ant-…
            </pre>
          </li>
          <li className="rounded-md border border-line bg-surface p-3 text-muted">
            Skill level: if you can install a game, you can do this.
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock n="2" title="Your first agent (5 minutes)">
        <p className="mb-3 text-sm text-muted">
          One file. Chats with you in the terminal. Change the{" "}
          <code className="rounded bg-bg px-1 font-mono text-[11px] text-ink">
            system
          </code>{" "}
          string to make it any expert.
        </p>
        <pre className="max-h-96 overflow-auto rounded-md border border-line bg-bg p-3 font-mono text-[11px] leading-relaxed text-ink">
          {FIRST_AGENT_SNIPPET}
        </pre>
        <p className="mt-2 text-xs text-muted">
          First install the SDK in your project:{" "}
          <code className="rounded bg-surface px-1 font-mono text-[11px] text-ice">
            npm install @anthropic-ai/sdk
          </code>
        </p>
      </SectionBlock>

      <SectionBlock n="3" title="Make it specialized">
        <p className="mb-3 text-sm text-muted">
          The system prompt is the agent&apos;s personality and ruleset. Swap it
          out, get a different expert.
        </p>
        <ul className="flex flex-col gap-2">
          {EXAMPLE_PROMPTS.map((p) => (
            <li
              key={p.label}
              className="rounded-md border border-line bg-surface p-3"
            >
              <div className="font-display text-sm tracking-wider text-flame">
                {p.label}
              </div>
              <pre className="mt-1 overflow-auto font-mono text-[11px] leading-relaxed text-ink">
                {p.body}
              </pre>
            </li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock n="4" title="Next steps">
        <ul className="flex flex-col gap-2 text-sm text-ink">
          <li className="rounded-md border border-line bg-surface p-3">
            <span className="font-display tracking-wider text-flame">
              Add tools.
            </span>{" "}
            Give it a function it can call (fetch a URL, query a JSON file, run
            a calc). Read the{" "}
            <a
              href="https://docs.anthropic.com/en/docs/build-with-claude/tool-use"
              target="_blank"
              rel="noreferrer"
              className="text-ice underline-offset-2 hover:underline"
            >
              tool-use docs
            </a>
            .
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            <span className="font-display tracking-wider text-flame">
              Make it remember.
            </span>{" "}
            Save the history array to a JSON file on disk. Load it on next
            start.
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            <span className="font-display tracking-wider text-flame">
              Add a UI.
            </span>{" "}
            Literally what this site does — Next.js + Tailwind + the SDK with{" "}
            <code className="rounded bg-bg px-1 font-mono text-[11px] text-ink">
              dangerouslyAllowBrowser
            </code>
            .
          </li>
          <li className="rounded-md border border-line bg-surface p-3">
            <span className="font-display tracking-wider text-flame">
              Read the docs.
            </span>{" "}
            <a
              href="https://docs.anthropic.com/"
              target="_blank"
              rel="noreferrer"
              className="text-ice underline-offset-2 hover:underline"
            >
              docs.anthropic.com
            </a>
          </li>
        </ul>
      </SectionBlock>
    </div>
  );
}
