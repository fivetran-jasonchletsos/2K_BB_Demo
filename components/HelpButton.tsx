"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HELP, type HelpEntry } from "@/lib/help";

const STORAGE_KEY = "2klab.help.opened";

function lookup(pathname: string | null): { route: string; entry: HelpEntry } {
  if (!pathname) return { route: "/", entry: HELP["/"] };
  if (HELP[pathname]) return { route: pathname, entry: HELP[pathname] };
  // Match longest known prefix for nested routes.
  const candidates = Object.keys(HELP)
    .filter((k) => k !== "/" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length);
  if (candidates.length > 0) {
    return { route: candidates[0], entry: HELP[candidates[0]] };
  }
  return { route: "/", entry: HELP["/"] };
}

export function HelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const { route, entry } = useMemo(() => lookup(pathname), [pathname]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore (private mode, etc.)
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  // Hide the floating button on the /help page itself — the whole page is help.
  const hideFloating = route === "/help" && pathname === "/help";

  return (
    <>
      {!hideFloating && (
        <button
          type="button"
          aria-label="Open help for this page"
          aria-expanded={open}
          onClick={toggle}
          className="fixed right-4 z-[60] grid h-11 w-11 place-items-center rounded-full border border-line bg-surface font-mono text-lg text-ink shadow-card transition active:scale-95 hover:bg-surface2 md:right-6 md:top-20"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
          }}
        >
          <span aria-hidden="true">?</span>
        </button>
      )}

      {/* Overlay + sheet */}
      <div
        className={`fixed inset-0 z-[70] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        {/* Scrim */}
        <div
          onClick={close}
          className={`absolute inset-0 bg-bg/80 backdrop-blur transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Mobile bottom sheet / desktop right drawer */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Help: ${entry.title}`}
          className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-card transition-transform duration-200 md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-2xl md:border-l md:p-6 ${
            open
              ? "translate-y-0 md:translate-x-0"
              : "translate-y-full md:translate-y-0 md:translate-x-full"
          }`}
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
          }}
        >
          {/* Drag handle (mobile only) */}
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line md:hidden" />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Help
              </div>
              <h2 className="font-display text-3xl leading-tight tracking-wide text-ink">
                {entry.title}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close help"
              onClick={close}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line bg-surface2 text-ink transition active:scale-95 hover:bg-surface"
            >
              <span aria-hidden="true" className="font-mono text-base">
                ×
              </span>
            </button>
          </div>

          <section className="mt-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              What this is
            </h3>
            <p className="mt-1 text-sm text-ink">{entry.what}</p>
          </section>

          <section className="mt-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              How to use it
            </h3>
            <ol className="mt-2 space-y-2">
              {entry.how.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-surface2 font-mono text-[11px] text-muted">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Try this first
            </h3>
            <p className="mt-1 rounded-lg border border-flame/40 bg-flame/10 p-3 text-sm text-ink">
              {entry.tryFirst}
            </p>
          </section>

          <section className="mt-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Related
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  onClick={close}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-surface2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink transition active:scale-95 hover:bg-surface"
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-6 border-t border-line pt-4">
            <Link
              href="/help"
              onClick={close}
              className="inline-flex min-h-[44px] items-center text-sm font-bold uppercase tracking-wider text-ice"
            >
              Full site guide →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default HelpButton;
