"use client";

import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { AnimatedListItem } from "@/components/ui/animated-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShineBorder } from "@/components/ui/shine-border";
import { Skeleton } from "@/components/ui/skeleton";
import { SHINE_COLORS } from "@/lib/monitor/categories";
import type { Signal } from "@/lib/monitor/types";
import type { SignalFilters } from "@/lib/monitor/useSignalFilters";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import { NewSignalsPill } from "./NewSignalsPill";
import { SignalRow } from "./SignalRow";

// The signals panel. Its chips and the left rail's switches are the same
// state, so the map, the list and the rail always agree.

export function SignalsPanel({
  signals,
  ready,
  filters,
  selectedId,
  onSelect,
  queuedCount,
  onReleaseQueued,
  viewportRef,
  total,
  className = "",
}: {
  signals: Signal[];
  ready: boolean;
  filters: SignalFilters;
  selectedId: string | null;
  onSelect: (signal: Signal) => void;
  queuedCount: number;
  onReleaseQueued: () => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  // How many signals match the filters, when `signals` is only the first few
  // of them (the phone layout shows four until you ask for all).
  total?: number;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();

  // A different set of signals starts at the top. Otherwise a list that was
  // scrolled to the bottom keeps its position when a filter narrows it, and
  // shows only the last few entries until you scroll back up.
  const activeKey = [...filters.active].sort().join(",");
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
  }, [filters.region, filters.window, activeKey, viewportRef]);
  function releaseAndScroll() {
    viewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    // Let the scroll settle so the insertion animation is actually seen.
    window.setTimeout(onReleaseQueued, 220);
  }

  return (
    <section
      aria-label="Signals"
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card/80 shadow-(--shadow-card) backdrop-blur-sm ${className}`}
    >
      <ShineBorder shineColor={SHINE_COLORS} />

      <header className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-3">
        <h2 className="font-mono text-[11px] tracking-[0.2em] text-foreground">SIGNALS</h2>
        <span className="rounded border border-teal-500/30 bg-teal-500/5 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.15em] whitespace-nowrap text-teal-400 max-sm:hidden">
          LINKED TO MAP
        </span>
        <span className="ml-auto font-mono text-[10px] tracking-[0.15em] whitespace-nowrap text-muted-foreground">
          {total ?? signals.length} ACTIVE · {filters.window}
        </span>
      </header>

      <NewSignalsPill count={queuedCount} onClick={releaseAndScroll} />

      <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef} // overscroll-contain: at the end of the list, further scrolling must not
        // carry on into the column or page around it, which slid the whole list
        // out of view.
        viewportClassName="overscroll-contain px-2 py-2 [&>div]:block!">
        {!ready ? (
          <div className="flex flex-col gap-2 px-1">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : signals.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            No signals match these filters. Turn a category back on, or widen the time window.
          </p>
        ) : (
          // Magic UI's Animated List item, but driven by the feed rather
          // than by its timed reveal: `initial={false}` means the signals
          // already on screen don't animate, only ones that arrive later —
          // each springing in at the top and pushing the rest down (layout).
          <div className="flex flex-col">
            <AnimatePresence initial={false}>
              {signals.map((signal) =>
                reducedMotion ? (
                  <SignalRow key={signal.id} signal={signal} selected={selectedId === signal.id} onSelect={onSelect} />
                ) : (
                  <AnimatedListItem key={signal.id}>
                    <SignalRow signal={signal} selected={selectedId === signal.id} onSelect={onSelect} />
                  </AnimatedListItem>
                ),
              )}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </section>
  );
}
