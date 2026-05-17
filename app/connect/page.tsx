"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Pill, Section } from "@/components/ui";
import {
  AI_KEYS,
  AI_MODEL,
  clearApiKey as clearAnthropicKey,
  loadApiKey as loadAnthropicKey,
  saveApiKey as saveAnthropicKey,
} from "@/lib/ai";
import {
  BDL_KEY_STORAGE,
  clearKey as clearBdlKey,
  fetchTeams,
  loadKey as loadBdlKey,
  saveKey as saveBdlKey,
} from "@/lib/balldontlie";

type TestState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ok"; detail?: string }
  | { kind: "err"; detail: string };

function StatusPill({ connected }: { connected: boolean }) {
  return connected ? (
    <Pill tone="lime">Connected</Pill>
  ) : (
    <Pill tone="muted">Not set</Pill>
  );
}

function TestResultLine({ state }: { state: TestState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "running") {
    return (
      <div className="font-mono text-[11px] text-muted">testing…</div>
    );
  }
  if (state.kind === "ok") {
    return (
      <div className="font-mono text-[11px] text-lime">
        ok{state.detail ? ` · ${state.detail}` : ""}
      </div>
    );
  }
  return (
    <div className="font-mono text-[11px] text-flame">
      {state.detail || "failed"}
    </div>
  );
}

export default function ConnectPage() {
  const [hydrated, setHydrated] = useState(false);

  // Anthropic
  const [anthKey, setAnthKey] = useState("");
  const [anthSaved, setAnthSaved] = useState(false);
  const [anthShow, setAnthShow] = useState(false);
  const [anthTest, setAnthTest] = useState<TestState>({ kind: "idle" });
  const [anthAutoPill, setAnthAutoPill] = useState(false);

  // balldontlie
  const [bdlKey, setBdlKey] = useState("");
  const [bdlSaved, setBdlSaved] = useState(false);
  const [bdlShow, setBdlShow] = useState(false);
  const [bdlTest, setBdlTest] = useState<TestState>({ kind: "idle" });
  const [bdlAutoPill, setBdlAutoPill] = useState(false);

  useEffect(() => {
    const ak = loadAnthropicKey();
    const bk = loadBdlKey();
    setAnthKey(ak);
    setBdlKey(bk);
    setAnthSaved(!!ak);
    setBdlSaved(!!bk);
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <div className="space-y-10" aria-hidden />;
  }

  // ---- Anthropic handlers ----

  function handleSaveAnth() {
    saveAnthropicKey(anthKey);
    setAnthSaved(!!anthKey.trim());
    setAnthTest({ kind: "idle" });
  }
  function handleBlurAnth() {
    const k = anthKey.trim();
    if (!k) return;
    saveAnthropicKey(k);
    setAnthSaved(true);
    setAnthAutoPill(true);
    setTimeout(() => setAnthAutoPill(false), 2000);
  }
  function handleClearAnth() {
    clearAnthropicKey();
    setAnthKey("");
    setAnthSaved(false);
    setAnthTest({ kind: "idle" });
  }
  async function handleTestAnth() {
    const k = anthKey.trim();
    if (!k) {
      setAnthTest({ kind: "err", detail: "no key entered" });
      return;
    }
    setAnthTest({ kind: "running" });
    try {
      // Minimal `messages.create` call with 1-token max — cheapest probe.
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": k,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (res.ok) {
        setAnthTest({ kind: "ok", detail: `model ${AI_MODEL}` });
      } else {
        let msg = `${res.status}`;
        try {
          const body = await res.json();
          if (body?.error?.message) msg = `${res.status} ${body.error.message}`;
        } catch {
          // ignore
        }
        setAnthTest({ kind: "err", detail: msg });
      }
    } catch (e) {
      setAnthTest({
        kind: "err",
        detail: e instanceof Error ? e.message : "network error",
      });
    }
  }

  // ---- balldontlie handlers ----

  function handleSaveBdl() {
    saveBdlKey(bdlKey);
    setBdlSaved(!!bdlKey.trim());
    setBdlTest({ kind: "idle" });
  }
  function handleBlurBdl() {
    const k = bdlKey.trim();
    if (!k) return;
    saveBdlKey(k);
    setBdlSaved(true);
    setBdlAutoPill(true);
    setTimeout(() => setBdlAutoPill(false), 2000);
  }
  function handleClearBdl() {
    clearBdlKey();
    setBdlKey("");
    setBdlSaved(false);
    setBdlTest({ kind: "idle" });
  }
  async function handleTestBdl() {
    setBdlTest({ kind: "running" });
    try {
      // `fetchTeams` reads the freshly saved key from localStorage. Save first
      // to make sure we're testing the key the user just pasted.
      saveBdlKey(bdlKey);
      const teams = await fetchTeams();
      setBdlTest({ kind: "ok", detail: `${teams.length} teams` });
      setBdlSaved(!!bdlKey.trim());
    } catch (e) {
      setBdlTest({
        kind: "err",
        detail: e instanceof Error ? e.message : "network error",
      });
    }
  }

  return (
    <div className="space-y-10">
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-ice">
          /connect
        </div>
        <h1 className="mt-1 font-display text-5xl leading-none tracking-wide text-ink md:text-6xl">
          CONNECT
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">
          Optional credentials for live data and AI. Keys are stored only in
          your browser&apos;s localStorage. They never leave this site except
          to call the respective APIs directly.
        </p>
      </header>

      <Section title="Anthropic" subtitle="Powers the /ai agent (Claude)">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
              <span>status</span>
              <StatusPill connected={anthSaved} />
              <span className="text-ink">{AI_MODEL}</span>
            </div>
            <div className="font-mono text-[10px] text-muted">
              storage key: <span className="text-ink">{AI_KEYS.apiKey}</span>
            </div>
          </div>

          <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-muted">
            API key
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type={anthShow ? "text" : "password"}
              value={anthKey}
              onChange={(e) => setAnthKey(e.target.value)}
              onBlur={handleBlurAnth}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface2 px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-ice focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setAnthShow((v) => !v)}
              className="rounded-md border border-line bg-surface2 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink"
            >
              {anthShow ? "hide" : "show"}
            </button>
            {anthAutoPill && (
              <Pill tone="lime" className="!text-[10px]">
                saved
              </Pill>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAnth}
              className="rounded-md border border-lime/60 bg-lime/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-lime hover:bg-lime/20"
            >
              save
            </button>
            <button
              type="button"
              onClick={handleTestAnth}
              className="rounded-md border border-ice/60 bg-ice/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ice hover:bg-ice/20"
            >
              test connection
            </button>
            <button
              type="button"
              onClick={handleClearAnth}
              disabled={!anthSaved && !anthKey}
              className="rounded-md border border-line bg-surface2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-flame hover:text-ink disabled:opacity-40"
            >
              clear
            </button>
            <div className="ml-auto">
              <TestResultLine state={anthTest} />
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="balldontlie"
        subtitle="Optional — used by Pulse Live mode"
      >
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
              <span>status</span>
              <StatusPill connected={bdlSaved} />
              <span className="text-ink">api.balldontlie.io/v1</span>
            </div>
            <div className="font-mono text-[10px] text-muted">
              storage key: <span className="text-ink">{BDL_KEY_STORAGE}</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted">
            balldontlie&apos;s basic endpoints (teams, players, games) work
            without a key but are heavily rate-limited. A paid key unlocks
            higher rates and the season-averages endpoint.
          </p>

          <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-muted">
            API key (optional)
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type={bdlShow ? "text" : "password"}
              value={bdlKey}
              onChange={(e) => setBdlKey(e.target.value)}
              onBlur={handleBlurBdl}
              placeholder="paste key or leave blank for free tier"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface2 px-3 py-2 font-mono text-sm text-ink placeholder:text-muted focus:border-ice focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setBdlShow((v) => !v)}
              className="rounded-md border border-line bg-surface2 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink"
            >
              {bdlShow ? "hide" : "show"}
            </button>
            {bdlAutoPill && (
              <Pill tone="lime" className="!text-[10px]">
                saved
              </Pill>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveBdl}
              className="rounded-md border border-lime/60 bg-lime/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-lime hover:bg-lime/20"
            >
              save
            </button>
            <button
              type="button"
              onClick={handleTestBdl}
              className="rounded-md border border-ice/60 bg-ice/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ice hover:bg-ice/20"
            >
              test connection
            </button>
            <button
              type="button"
              onClick={handleClearBdl}
              disabled={!bdlSaved && !bdlKey}
              className="rounded-md border border-line bg-surface2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-flame hover:text-ink disabled:opacity-40"
            >
              clear
            </button>
            <div className="ml-auto">
              <TestResultLine state={bdlTest} />
            </div>
          </div>
        </Card>
      </Section>

      <Card className="!p-4">
        <div className="font-display text-lg tracking-wide text-ink">
          Storage &amp; security
        </div>
        <p className="mt-2 text-xs text-muted">
          Your keys stay on your device. They never hit any server except
          Anthropic / balldontlie. Wipe with one tap.
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-wider text-muted">
        <Link href="/ai" className="text-ice hover:text-ink">
          About the AI Agent →
        </Link>
        <Link href="/stack" className="text-ice hover:text-ink">
          Architecture →
        </Link>
      </div>
    </div>
  );
}
