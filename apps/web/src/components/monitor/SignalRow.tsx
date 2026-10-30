"use client";

import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { SEVERITY, category } from "@/lib/monitor/categories";
import type { Signal } from "@/lib/monitor/types";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

// One finding in the list: what it is and how sure we are, in that order.

function agoLabel(timestamp: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "JUST NOW";
  if (minutes < 60) return `${minutes} MIN AGO`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} HR AGO`;
  return `${Math.round(hours / 24)} D AGO`;
}

export function SignalRow({
  signal,
  selected,
  onSelect,
}: {
  signal: Signal;
  selected: boolean;
  onSelect: (signal: Signal) => void;
}) {
  const tone = SEVERITY[signal.severity];
  const meta = category(signal.category);
  const reducedMotion = usePrefersReducedMotion();
  // Rows ease in as they scroll into view, once each. Nothing moves when
  // reduced motion is on, so the props are dropped rather than set to
  // undefined (which exactOptionalPropertyTypes rejects).
  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-10px" },
        transition: { duration: 0.35, ease: "easeOut" as const },
      };
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(signal)}
      data-signal-id={signal.id}
      aria-current={selected}
      {...motionProps}
      className={`group grid w-full grid-cols-[3px_1fr_auto] items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
        selected ? "border-teal-500/40 bg-teal-500/5" : "border-transparent hover:border-border hover:bg-muted/40"
      }`}
    >
      <span aria-hidden className={`mt-0.5 h-full min-h-9 rounded-full ${tone.bg}`} />

      <span className="flex min-w-0 flex-col gap-1">
        <span className={`font-mono text-[10px] tracking-[0.2em] ${tone.text}`}>
          {meta.name.toUpperCase()} · {agoLabel(signal.createdAt)}
          {signal.lat === null ? " · ALL INDIA" : ""}
        </span>
        <span className="font-display text-[15px] leading-snug text-foreground">{signal.title}</span>
        <span className="line-clamp-1 text-xs text-muted-foreground">{signal.summary}</span>
      </span>

      <span className="flex shrink-0 items-center gap-1 pt-0.5">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{signal.confidence}%</span>
        <ChevronRight aria-hidden className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </motion.button>
  );
}
