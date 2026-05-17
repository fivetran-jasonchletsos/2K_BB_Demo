"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const ROUTES: { href: string; label: string; sub: string }[] = [
  { href: "/builds", label: "Builds", sub: "MyPlayer optimizer" },
  { href: "/badges", label: "Badges", sub: "Tier list + filters" },
  { href: "/codes", label: "Codes", sub: "Active locker codes" },
  { href: "/moves", label: "Moves", sub: "Dribbles & combos" },
  { href: "/players", label: "Players", sub: "NBA database" },
  { href: "/scenarios", label: "Scenarios", sub: "Decision trainer" },
  { href: "/tips", label: "Secrets", sub: "Hidden mechanics" },
  { href: "/pulse", label: "Pulse", sub: "Live NBA → 2K" },
  { href: "/stack", label: "Stack", sub: "Data pipeline" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-flame font-display text-base text-black">
            2K
          </span>
          <span className="font-display text-xl tracking-wider text-ink">LAB</span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1">
          {ROUTES.map((r) => {
            const active = path === r.href;
            return (
              <Link
                key={r.href}
                href={r.href}
                className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  active
                    ? "bg-flame text-black"
                    : "text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {r.label}
              </Link>
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
          <ul className="grid grid-cols-2 gap-2">
            {ROUTES.map((r) => {
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
                    <div className="font-display text-2xl tracking-wider text-ink">
                      {r.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">{r.sub}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </header>
  );
}
