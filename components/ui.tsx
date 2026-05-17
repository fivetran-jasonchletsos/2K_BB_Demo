import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: any;
}) {
  return (
    <Tag
      className={`rounded-xl border border-line bg-surface p-4 shadow-card ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl tracking-wide text-ink md:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "flame" | "ice" | "gold" | "lime";
}) {
  const toneClass = {
    default: "text-ink",
    flame: "text-flame",
    ice: "text-ice",
    gold: "text-gold",
    lime: "text-lime",
  }[tone];
  return (
    <div className="rounded-lg border border-line bg-surface p-3 md:p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl md:text-3xl ${toneClass} num`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "flame" | "ice" | "gold" | "lime" | "muted";
  className?: string;
}) {
  const toneClass = {
    default: "border-line bg-surface2 text-ink",
    flame: "border-flame/40 bg-flame/10 text-flame",
    ice: "border-ice/40 bg-ice/10 text-ice",
    gold: "border-gold/40 bg-gold/10 text-gold",
    lime: "border-lime/40 bg-lime/10 text-lime",
    muted: "border-line bg-surface2 text-muted",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: "S" | "A" | "B" | "C" | "D" }) {
  const map = {
    S: "bg-tierS text-black shadow-glowGold",
    A: "bg-tierA text-white",
    B: "bg-tierB text-black",
    C: "bg-tierC text-black",
    D: "bg-tierD text-white",
  };
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-display text-lg ${map[tier]}`}
    >
      {tier}
    </span>
  );
}

export function Bar({
  value,
  max = 99,
  tone = "flame",
}: {
  value: number;
  max?: number;
  tone?: "flame" | "ice" | "gold" | "lime";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = {
    flame: "bg-flame",
    ice: "bg-ice",
    gold: "bg-gold",
    lime: "bg-lime",
  }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
      <div className={`h-full ${bg}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
