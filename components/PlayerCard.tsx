"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import {
  CardData,
  TIER_BORDER,
  TIER_LABEL,
  loadCardData,
} from "@/lib/playerCard";

/**
 * 2K-style MyTeam-ish player card. Hydration-gated by the caller — this
 * component still defends itself with an internal `mounted` guard so its
 * SSR output matches the first client render (a neutral skeleton).
 */
export default function PlayerCard() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<CardData | null>(null);

  useEffect(() => {
    setData(loadCardData());
    setMounted(true);
  }, []);

  // Server render & first client render: render a neutral placeholder of the
  // same shape so layout doesn't jump. Hidden via visibility to avoid flash.
  if (!mounted || !data) {
    return <Skeleton />;
  }

  const isGradient = TIER_BORDER[data.tier] === "gradient";
  const borderColor = isGradient ? "transparent" : TIER_BORDER[data.tier];

  const gradientBg =
    data.tier === "galaxy_opal"
      ? "linear-gradient(135deg, #FFB6C1 0%, #9966CC 50%, #00E5FF 100%)"
      : data.tier === "dark_matter"
        ? "linear-gradient(135deg, #FF3D00 0%, #FFD60A 25%, #00E676 50%, #00E5FF 75%, #9966CC 100%)"
        : null;

  // Wrap in a gradient frame for opal/dark-matter; otherwise just border the card.
  const frameStyle: CSSProperties | undefined = gradientBg
    ? { background: gradientBg, padding: 2, borderRadius: 14 }
    : undefined;

  const innerCardStyle: CSSProperties = {
    borderColor: gradientBg ? "transparent" : borderColor,
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 12,
  };

  // Accent color used for OVR + position chip. For gradient tiers, fall back
  // to ink so the gradient frame stays the personality.
  const accentColor = gradientBg ? "var(--accent-ink, #F5F5F7)" : borderColor;

  const ovrLabel = data.ovr === null ? "—" : String(data.ovr);
  const nameLabel = data.name ?? "—";
  const positionLabel = data.position ?? "—";

  const card = (
    <div
      style={innerCardStyle}
      className="relative overflow-hidden bg-gradient-to-br from-surface via-surface to-surface2"
    >
      {/* Subtle diagonal stripe pattern behind the OVR area */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #FFFFFF 0 1px, transparent 1px 14px)",
        }}
      />

      <div className="relative grid grid-cols-[1fr_auto] items-start gap-2 p-4">
        {/* Top-left: position chip */}
        <div
          className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md px-2 font-display text-base tracking-wide"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: accentColor,
            color: accentColor,
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
        >
          {positionLabel}
        </div>

        {/* Top-right: tier name */}
        <div
          className="text-right font-display text-sm uppercase tracking-[0.18em]"
          style={{ color: accentColor }}
        >
          {TIER_LABEL[data.tier]}
        </div>
      </div>

      {/* Big center: OVR + name */}
      <div className="relative px-4 pb-3 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          OVR
        </div>
        <div
          className="font-display leading-none num"
          style={{
            color: accentColor,
            fontSize: "5.5rem",
            lineHeight: 0.9,
            textShadow: gradientBg
              ? "0 2px 12px rgba(0,0,0,0.5)"
              : `0 0 18px ${withAlpha(borderColor, 0.25)}`,
          }}
        >
          {ovrLabel}
        </div>

        <div className="mt-2 flex items-baseline justify-center gap-2">
          <div className="font-display text-2xl tracking-wide text-ink md:text-3xl">
            {nameLabel}
          </div>
          {!data.name && (
            <Link
              href="/coach"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] font-bold uppercase tracking-wider text-flame hover:text-ink"
            >
              Set handle
            </Link>
          )}
        </div>
      </div>

      {/* Stat row */}
      <div
        className="relative grid grid-cols-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <StatCell label="GRN" value={data.grn > 0 ? `${data.grn}%` : "—"} />
        <StatCell label="SCN" value={data.scn > 0 ? `${data.scn}%` : "—"} divider />
        <StatCell label="BLD" value={data.bld > 0 ? `${data.bld}` : "—"} divider />
        <StatCell label="DLY" value={data.dly > 0 ? `${data.dly}d` : "—"} divider />
      </div>

      {/* Footer: status line + view path */}
      <div
        className="relative flex items-center justify-between gap-2 px-4 py-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {!data.hasSignal ? (
          <Link
            href="/diagnose"
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
          >
            Run the diagnostic to start →
          </Link>
        ) : (
          <span className="text-[11px] font-mono text-muted">
            {summaryLine(data)}
          </span>
        )}

        <Link
          href="/path"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-bold uppercase tracking-wider text-flame hover:text-ink"
        >
          View Path →
        </Link>
      </div>
    </div>
  );

  return (
    <Link
      href="/coach"
      aria-label="Open coach"
      className="block focus:outline-none focus:ring-2 focus:ring-ice"
      style={frameStyle}
    >
      {card}
    </Link>
  );
}

function StatCell({
  label,
  value,
  divider = false,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      className="px-2 py-3 text-center"
      style={
        divider
          ? { borderLeft: "1px solid rgba(255,255,255,0.06)" }
          : undefined
      }
    >
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-bold text-ink num">
        {value}
      </div>
    </div>
  );
}

function summaryLine(d: CardData): string {
  const parts: string[] = [];
  if (d.ovr !== null) parts.push(`OVR ${d.ovr}`);
  if (d.grn > 0) parts.push(`GRN ${d.grn}%`);
  if (d.scn > 0) parts.push(`SCN ${d.scn}%`);
  if (d.bld > 0) parts.push(`BLD ${d.bld}`);
  if (d.dly > 0) parts.push(`DLY ${d.dly}d`);
  return parts.join(" · ");
}

function Skeleton() {
  return (
    <div
      aria-hidden
      className="rounded-xl border-2 border-line bg-surface"
      style={{ minHeight: 240 }}
    />
  );
}

/** Convert "#RRGGBB" to "rgba(r,g,b,a)". Falls back to ink-ish if invalid. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return `rgba(245,245,247,${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
