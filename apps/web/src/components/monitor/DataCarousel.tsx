"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AutoScroll from "embla-carousel-auto-scroll";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { DataCardBody } from "./data-cards";
import type { DataCard } from "@/lib/monitor/types";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";

// "MORE DATA": a row of small cards that drifts continuously like Magic UI's
// Marquee, but stays draggable — hence Embla with the auto-scroll plugin
// rather than Marquee, which is CSS-animated and can't be grabbed.

export function DataCarousel({
  cards,
  ready,
  cardWidth = 290,
  className = "",
}: {
  cards: DataCard[];
  ready: boolean;
  cardWidth?: number;
  className?: string;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const reducedMotion = usePrefersReducedMotion();

  // Drift stops while the pointer is over the row and resumes after a drag;
  // with reduced motion it never starts. Memoised because Embla re-creates
  // the carousel whenever this array's identity changes, which would restart
  // the scroll on every render and leave it looking frozen.
  const plugins = useMemo(
    () =>
      reducedMotion
        ? []
        : [
            // shadcn/ui#4509: the plugin's type doesn't line up with Embla's
            // expected generic, so it is cast at the boundary.
            AutoScroll({ speed: 0.6, stopOnInteraction: false, stopOnMouseEnter: true }) as never,
          ],
    [reducedMotion],
  );
  const opts = useMemo(() => ({ loop: true, dragFree: true, align: "start" as const }), []);

  useEffect(() => {
    if (!api || reducedMotion) return;
    const plugin = api.plugins().autoScroll as { play?: () => void } | undefined;
    // Embla pauses the drift while dragging; start it again on release.
    const resume = () => plugin?.play?.();
    api.on("pointerUp", resume);
    return () => {
      api.off("pointerUp", resume);
    };
  }, [api, reducedMotion]);

  // A side-scroll wheel or a trackpad's horizontal swipe sends `deltaX`, which
  // Embla ignores. Pushed into the carousel here; a mostly vertical wheel is
  // left alone so the page still scrolls past it.
  useEffect(() => {
    if (!api) return;
    const root = api.rootNode();
    let resume: number | undefined;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const plugin = api.plugins().autoScroll as { stop?: () => void; play?: () => void } | undefined;
      plugin?.stop?.();
      api.internalEngine().scrollTo.distance(-event.deltaX, false);
      window.clearTimeout(resume);
      if (plugin) resume = window.setTimeout(() => plugin.play?.(), 2500);
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      root.removeEventListener("wheel", onWheel);
      window.clearTimeout(resume);
    };
  }, [api]);

  // The drift keeps running through a programmatic scroll and overwrites
  // it, so the buttons pause it first and let it carry on afterwards.
  const step = useCallback(
    (direction: "prev" | "next") => {
      if (!api) return;
      const plugin = api.plugins().autoScroll as { stop?: () => void; play?: () => void } | undefined;
      plugin?.stop?.();
      if (direction === "prev") api.scrollPrev();
      else api.scrollNext();
      if (plugin) window.setTimeout(() => plugin.play?.(), 2500);
    },
    [api],
  );

  return (
    <section className={`flex min-h-0 flex-col gap-2 ${className}`} aria-label="More data">
      <header className="flex shrink-0 items-center gap-3 px-1">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
          MORE DATA · {ready ? cards.length : 0}
        </h2>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            aria-label="Previous data cards"
            onClick={() => step("prev")}
            className="grid size-9 place-items-center lg:size-6 rounded-md border border-border text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <ChevronLeft aria-hidden className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next data cards"
            onClick={() => step("next")}
            className="grid size-9 place-items-center lg:size-6 rounded-md border border-border text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <ChevronRight aria-hidden className="size-3.5" />
          </button>
        </div>
      </header>

      {!ready ? (
        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden px-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-full shrink-0 rounded-xl" style={{ width: cardWidth }} />
          ))}
        </div>
      ) : (
        <div className="marquee-fade-x min-h-0 flex-1">
          <Carousel
            setApi={setApi}
            opts={opts}
            plugins={plugins}
            className="h-full [&_[data-slot=carousel-content]]:h-full"
          >
            <CarouselContent className="-ml-3 h-full">
              {cards.map((card) => (
                <CarouselItem key={card.id} className="h-full basis-auto pl-3" style={{ width: cardWidth }}>
                  <DataCardBody card={card} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      )}
    </section>
  );
}
