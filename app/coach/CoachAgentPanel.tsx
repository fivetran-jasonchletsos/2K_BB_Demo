"use client";

// CoachAgentPanel — surfaces the "Generate Weekly Plan" agent inside the
// Coach page. Reads localStorage, calls Claude via the SDK, parses the
// structured response, and renders 7 day cards. Educational toggles show
// the exact prompt and raw response so the user can see how it works.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Pill } from "@/components/ui";
import { loadApiKey, loadProxyUrl } from "@/lib/ai";
import {
  analyze,
  getGoal,
  getMasteryTier,
  getName,
  KEYS,
  relativeTime,
} from "@/lib/coach";
import {
  AgentError,
  COACH_AGENT_MODEL,
  COACH_AGENT_SYSTEM_PROMPT,
  SAMPLE_PLAN,
  type AgentEvent,
  type CachedWeeklyPlan,
  type WeeklyPlanAction,
  type WeeklyPlanDay,
  type WeeklyPlanRequest,
  type WeeklyPlanResponse,
  generateWeeklyPlan,
  isStale,
  loadCachedPlan,
  packRequest,
  saveCachedPlan,
} from "@/lib/coach-agent";

type Step = "idle" | "reading" | "calling" | "parsing" | "rendering";

const STEP_COPY: Record<Exclude<Step, "idle">, string> = {
  reading: "Reading your stats…",
  calling: `Calling Claude (${COACH_AGENT_MODEL})…`,
  parsing: "Parsing plan…",
  rendering: "Rendering…",
};

const STEP_ORDER: Exclude<Step, "idle">[] = [
  "reading",
  "calling",
  "parsing",
  "rendering",
];

// SSR-safe localStorage helpers (mirror lib/coach but inlined to avoid
// pulling in non-public helpers).
function readJSONLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function buildRequest(): WeeklyPlanRequest {
  const report = analyze();
  const name = getName();
  const goal = getGoal();
  const tier = getMasteryTier();

  const builds = readJSONLocal<unknown[]>(KEYS.builds, []);
  const watchlist = readJSONLocal<string[]>(KEYS.watchlist, []);
  const redeemed = readJSONLocal<string[]>(KEYS.redeemedCodes, []);
  const learnedCanonical = readJSONLocal<string[]>(
    KEYS.learnedTipsCanonical,
    [],
  );
  const learnedAlt = readJSONLocal<string[]>(KEYS.learnedTipsAlt, []);
  const learnedTipsCount =
    (Array.isArray(learnedCanonical) ? learnedCanonical.length : 0) ||
    (Array.isArray(learnedAlt) ? learnedAlt.length : 0);

  // Pick the first "stuck" entry as the dominant weakness signal.
  const weakness = report.stuck[0];

  return {
    snapshot: report.snapshot,
    goal,
    name,
    tier,
    weakness,
    stuck: report.stuck,
    growing: report.growing,
    buildCount: Array.isArray(builds) ? builds.length : 0,
    watchlistCount: Array.isArray(watchlist) ? watchlist.length : 0,
    redeemedCount: Array.isArray(redeemed) ? redeemed.length : 0,
    learnedTipsCount,
  };
}

export function CoachAgentPanel() {
  const [hydrated, setHydrated] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [hasProxy, setHasProxy] = useState(false);
  const [cached, setCached] = useState<CachedWeeklyPlan | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string>("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  // Show the sample plan inline when the user clicks Generate without
  // any credentials configured. Toggled off when real generation succeeds.
  const [showSample, setShowSample] = useState(false);
  // Recomputed each generate so the displayed prompt matches what was sent.
  const [lastUserPayload, setLastUserPayload] = useState<string>("");

  // Preview the prompt for the *current* state, even before generating —
  // helps the educational toggle feel real.
  const previewRequest = useMemo<WeeklyPlanRequest | null>(
    () => (hydrated ? buildRequest() : null),
    [hydrated],
  );
  const previewPayload = useMemo<string>(
    () => (previewRequest ? packRequest(previewRequest) : ""),
    [previewRequest],
  );

  useEffect(() => {
    setHasKey(!!loadApiKey());
    setHasProxy(!!loadProxyUrl());
    setCached(loadCachedPlan());
    setHydrated(true);
  }, []);

  const canGenerate = hasKey || hasProxy;

  const stale = isStale(cached);
  const generating = step !== "idle";

  const onGenerate = useCallback(async () => {
    if (generating) return;
    const apiKey = loadApiKey();
    const proxyUrl = loadProxyUrl();
    setHasKey(!!apiKey);
    setHasProxy(!!proxyUrl);
    if (!apiKey && !proxyUrl) {
      // Nothing wired up — surface the inline sample plan so the user
      // sees the shape of the output without a setup gate.
      setShowSample(true);
      return;
    }
    setShowSample(false);
    setError(null);
    setRawResponse("");
    setStep("reading");

    const req = buildRequest();
    const payload = packRequest(req);
    setLastUserPayload(payload);

    // Tiny visual delay so the "Reading your stats…" step is legible.
    await new Promise((r) => setTimeout(r, 200));

    try {
      const plan = await generateWeeklyPlan(req, {
        apiKey,
        onEvent: (e: AgentEvent) => {
          if (e.type === "reading") setStep("reading");
          else if (e.type === "calling") setStep("calling");
          else if (e.type === "parsing") setStep("parsing");
          else if (e.type === "done") setStep("rendering");
        },
      });

      // Capture the raw text for the educational toggle. The agent already
      // parsed/validated — re-serialize to show what valid output looks like.
      setRawResponse(JSON.stringify(plan, null, 2));

      // Small render delay so the user sees the final step.
      await new Promise((r) => setTimeout(r, 100));

      const generatedAt = Date.now();
      saveCachedPlan(plan, generatedAt);
      setCached({ plan, generatedAt });
      setStep("idle");
    } catch (err) {
      const e = err as AgentError | Error;
      if (e instanceof AgentError) {
        setError(e.message);
        setRawResponse(e.raw || "");
      } else {
        setError(e.message || "Unknown error");
      }
      setStep("idle");
    }
  }, [generating]);

  // ---------- Render -----------------------------------------------------

  const statusLabel = (() => {
    if (!hydrated) return "—";
    if (!cached) return "Sample plan";
    if (stale) return "Stale — regenerate";
    return `Plan generated ${relativeTime(cached.generatedAt)}`;
  })();

  const statusTone: "muted" | "lime" | "flame" = !cached
    ? "muted"
    : stale
      ? "flame"
      : "lime";

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl leading-tight tracking-wide text-ink md:text-4xl">
            Generate weekly plan
          </h2>
          <p className="mt-1 text-sm text-muted">
            An AI agent reads your stats and writes a 7-day plan. Updates
            anytime.
          </p>
        </div>
        <Pill tone={statusTone}>{statusLabel}</Pill>
      </div>

      <Card className="border-line">
        {/* Action row -------------------------------------------------- */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-muted">
            Model: <span className="font-mono text-ink">{COACH_AGENT_MODEL}</span>
            {" · "}
            Output: structured JSON (7 days × 3 actions)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGenerate}
              disabled={!hydrated || generating}
              className="h-12 rounded-md bg-flame px-5 font-display text-base tracking-wider text-black transition disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
            >
              {generating
                ? "Working…"
                : cached
                  ? "Regenerate plan"
                  : "Generate plan"}
            </button>
          </div>
        </div>

        {/* Progress narrative ----------------------------------------- */}
        {generating && (
          <div className="mt-4 rounded-lg border border-line bg-bg/60 p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              Agent is thinking…
            </div>
            <ol className="space-y-1.5 font-mono text-xs">
              {STEP_ORDER.map((s) => {
                const currentIdx = STEP_ORDER.indexOf(step as Exclude<Step, "idle">);
                const thisIdx = STEP_ORDER.indexOf(s);
                const active = step === s;
                const done = currentIdx > thisIdx;
                const tone = done
                  ? "text-lime"
                  : active
                    ? "text-flame"
                    : "text-muted";
                return (
                  <li key={s} className={`flex items-center gap-2 ${tone}`}>
                    <span className="inline-block w-3 text-center">
                      {done ? "✓" : active ? "▸" : "·"}
                    </span>
                    <span>{STEP_COPY[s]}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Error ------------------------------------------------------ */}
        {error && (
          <div className="mt-4 rounded-md border border-flame/60 bg-flame/10 p-3">
            <div className="mb-1 font-display text-sm tracking-wider text-flame">
              Parse / call failed
            </div>
            <div className="font-mono text-xs text-flame">{error}</div>
            {rawResponse && (
              <>
                <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Raw response
                </div>
                <pre className="mt-1 max-h-60 overflow-auto rounded-md border border-line bg-bg p-2 font-mono text-[11px] leading-snug text-ink">
                  {rawResponse}
                </pre>
              </>
            )}
          </div>
        )}

        {/* Plan grid -------------------------------------------------- */}
        {hydrated && cached && !generating && !error && (
          <div className="mt-5">
            <div className="mb-3 rounded-md border border-line bg-bg/60 p-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                Why this plan
              </div>
              <p className="text-sm text-ink">{cached.plan.rationale}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {cached.plan.days.map((d) => (
                <DayCard key={d.day} day={d} />
              ))}
            </div>
          </div>
        )}

        {/* No-credential / sample state ------------------------------- */}
        {hydrated && !cached && !generating && !error && (
          <div className="mt-5">
            {!canGenerate && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-ice/40 bg-ice/[0.07] p-3 text-xs">
                <span className="text-ink">
                  {showSample
                    ? "Sample plan below. Real one needs credentials."
                    : "Press Generate to see a sample plan."}
                </span>
                <Link
                  href="/connect"
                  className="rounded-md border border-ice/60 bg-ice/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ice hover:bg-ice/20"
                >
                  Add Worker proxy or API key on /connect →
                </Link>
              </div>
            )}
            <div className="mb-3 rounded-md border border-line bg-bg/60 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Why this plan
                </span>
                <Pill tone="muted" className="!text-[10px]">
                  Sample
                </Pill>
              </div>
              <p className="text-sm text-ink">{SAMPLE_PLAN.rationale}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {SAMPLE_PLAN.days.map((d) => (
                <DayCard key={`sample-${d.day}`} day={d} />
              ))}
            </div>
          </div>
        )}

        {/* Educational toggles --------------------------------------- */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4 text-[11px]">
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="rounded-md border border-line bg-surface2 px-2.5 py-1 font-bold uppercase tracking-wider text-muted hover:border-ice hover:text-ice"
          >
            {showPrompt ? "Hide" : "Show"} prompt
          </button>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="rounded-md border border-line bg-surface2 px-2.5 py-1 font-bold uppercase tracking-wider text-muted hover:border-ice hover:text-ice"
          >
            {showRaw ? "Hide" : "Show"} raw response
          </button>
        </div>

        {showPrompt && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                System prompt
              </div>
              <pre className="max-h-60 overflow-auto rounded-md border border-line bg-bg p-2 font-mono text-[11px] leading-snug text-ink">
                {COACH_AGENT_SYSTEM_PROMPT}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                User message (packed snapshot)
              </div>
              <pre className="max-h-60 overflow-auto rounded-md border border-line bg-bg p-2 font-mono text-[11px] leading-snug text-ice">
                {lastUserPayload || previewPayload || "{}"}
              </pre>
              {!lastUserPayload && (
                <div className="mt-1 text-[11px] text-muted">
                  Preview built from current localStorage. The real payload is
                  captured when you press Generate.
                </div>
              )}
            </div>
          </div>
        )}

        {showRaw && (
          <div className="mt-3">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Raw response (validated JSON)
            </div>
            <pre className="max-h-72 overflow-auto rounded-md border border-line bg-bg p-2 font-mono text-[11px] leading-snug text-lime">
              {rawResponse ||
                (cached ? JSON.stringify(cached.plan, null, 2) : "—")}
            </pre>
          </div>
        )}
      </Card>
    </section>
  );
}

// ---------- Day card -------------------------------------------------------

function DayCard({ day }: { day: WeeklyPlanDay }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-card">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-display text-xl tracking-wider text-ink">
          {day.dayLabel}
        </div>
        <Pill tone="muted" className="!text-[10px]">
          Day {day.day}
        </Pill>
      </div>
      <ul className="space-y-2">
        {day.actions.map((a, i) => (
          <ActionRow key={`${day.day}-${i}`} action={a} />
        ))}
      </ul>
    </div>
  );
}

function ActionRow({ action }: { action: WeeklyPlanAction }) {
  return (
    <li className="rounded-md border border-line bg-bg/40 p-2">
      <div className="font-mono text-sm text-ink">{action.label}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Pill tone="muted" className="!text-[10px]">
          ~{action.estMinutes} min
        </Pill>
        <Link
          href={action.page}
          className="text-[11px] font-bold uppercase tracking-wider text-ice hover:text-ink"
        >
          {action.page} →
        </Link>
      </div>
      <div className="mt-1 text-[11px] leading-snug text-muted">
        {action.reason}
      </div>
    </li>
  );
}
