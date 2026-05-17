"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavRoute = { href: string; label: string; sub: string };
export type NavGroup = { id: string; label: string; routes: NavRoute[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "play",
    label: "PLAY",
    routes: [
      { href: "/codes", label: "Codes", sub: "Active locker codes" },
      { href: "/moves", label: "Moves", sub: "Dribbles & combos" },
      { href: "/shot-trainer", label: "Shot Lab", sub: "Release timing" },
      { href: "/scenarios", label: "Scenarios", sub: "Decision trainer" },
      { href: "/tips", label: "Tips", sub: "Hidden mechanics" },
    ],
  },
  {
    id: "plan",
    label: "PLAN",
    routes: [
      { href: "/builds", label: "Builds", sub: "MyPlayer optimizer" },
      { href: "/badges", label: "Badges", sub: "Tier list + filters" },
      { href: "/coach", label: "Coach", sub: "Today's plan" },
      { href: "/path", label: "Path", sub: "Mastery tiers" },
      { href: "/diagnose", label: "Diagnose", sub: "Find your gap" },
    ],
  },
  {
    id: "data",
    label: "DATA",
    routes: [
      { href: "/players", label: "Players", sub: "NBA database" },
      { href: "/pulse", label: "Pulse", sub: "Live NBA → 2K" },
      { href: "/my-stats", label: "My Stats", sub: "Log your games" },
      { href: "/my-roster", label: "My Roster", sub: "Pin your players" },
    ],
  },
  {
    id: "ai",
    label: "AI",
    routes: [
      { href: "/ai", label: "AI", sub: "Ask the expert" },
      { href: "/connect", label: "Connect", sub: "API keys" },
    ],
  },
  {
    id: "about",
    label: "ABOUT",
    routes: [
      { href: "/stack", label: "Stack", sub: "Data pipeline" },
      { href: "/help", label: "Help", sub: "How to use this site" },
    ],
  },
];

// Back-compat: flat list of all routes for consumers that import ROUTES.
export const ROUTES: NavRoute[] = NAV_GROUPS.flatMap((g) => g.routes);

function groupContainsPath(group: NavGroup, path: string | null): boolean {
  if (!path) return false;
  return group.routes.some((r) => r.href === path);
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g.id, true])),
  );
  const [openDesktop, setOpenDesktop] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setOpenDesktop(null);
  }, [path]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Reset accordion to all-expanded each time menu opens
      setExpanded(Object.fromEntries(NAV_GROUPS.map((g) => [g.id, true])));
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggleGroup = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-flame font-display text-base text-black">
            2K
          </span>
          <span className="font-display text-xl tracking-wider text-ink">LAB</span>
        </Link>

        {/* Desktop nav: 5 group dropdowns */}
        <nav
          className="hidden md:flex md:items-center md:gap-1"
          onMouseLeave={() => setOpenDesktop(null)}
        >
          {NAV_GROUPS.map((g) => {
            const activeInGroup = groupContainsPath(g, path);
            const isOpen = openDesktop === g.id;
            return (
              <div
                key={g.id}
                className="relative"
                onMouseEnter={() => setOpenDesktop(g.id)}
                onFocus={() => setOpenDesktop(g.id)}
              >
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() => setOpenDesktop(isOpen ? null : g.id)}
                  className={`relative rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    activeInGroup
                      ? "text-ink"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {g.label}
                  {activeInGroup && (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lime"
                    />
                  )}
                </button>

                {isOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-line bg-surface p-2 shadow-2xl"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                      {g.label} · {g.routes.length}
                    </div>
                    <ul className="grid grid-cols-1 gap-1">
                      {g.routes.map((r) => {
                        const active = path === r.href;
                        return (
                          <li key={r.href}>
                            <Link
                              role="menuitem"
                              href={r.href}
                              className={`block rounded-md border px-3 py-2 transition ${
                                active
                                  ? "border-flame bg-flame/10"
                                  : "border-transparent hover:border-line hover:bg-surface2"
                              }`}
                            >
                              <div className="font-display text-base tracking-wide text-ink">
                                {r.label}
                              </div>
                              <div className="text-[11px] text-muted">{r.sub}</div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-md border border-line bg-surface text-ink md:hidden"
        >
          <span className="relative block h-3 w-5">
            <span
              className={`absolute left-0 right-0 h-0.5 bg-ink transition ${
                open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 right-0 h-0.5 bg-ink transition ${
                open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 top-[57px] z-40 md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-bg/95 backdrop-blur transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute inset-x-0 top-0 max-h-[calc(100vh-57px)] overflow-y-auto px-4 py-4 transition-transform duration-200 ${
            open ? "translate-y-0" : "-translate-y-4"
          }`}
        >
          <ul className="space-y-3">
            {NAV_GROUPS.map((g) => {
              const isExpanded = expanded[g.id] !== false;
              const activeInGroup = groupContainsPath(g, path);
              return (
                <li
                  key={g.id}
                  className="overflow-hidden rounded-lg border border-line bg-surface/60"
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`nav-group-${g.id}`}
                    onClick={() => toggleGroup(g.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-display text-lg tracking-wider text-ink">
                        {g.label}
                      </span>
                      {activeInGroup && (
                        <span
                          aria-hidden
                          className="inline-block h-1.5 w-1.5 rounded-full bg-lime"
                        />
                      )}
                      <span className="text-[11px] uppercase tracking-wider text-muted">
                        · {g.routes.length}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`text-muted transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      ›
                    </span>
                  </button>

                  {isExpanded && (
                    <ul
                      id={`nav-group-${g.id}`}
                      className="grid grid-cols-2 gap-2 border-t border-line bg-bg/40 p-2"
                    >
                      {g.routes.map((r) => {
                        const active = path === r.href;
                        return (
                          <li key={r.href}>
                            <Link
                              href={r.href}
                              className={`block rounded-lg border p-3 transition active:scale-[0.98] ${
                                active
                                  ? "border-flame bg-flame/10"
                                  : "border-line bg-surface"
                              }`}
                            >
                              <div className="font-display text-xl tracking-wider text-ink">
                                {r.label}
                              </div>
                              <div className="mt-0.5 text-[11px] text-muted">
                                {r.sub}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </header>
  );
}
