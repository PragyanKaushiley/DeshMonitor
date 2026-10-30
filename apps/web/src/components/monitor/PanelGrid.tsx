"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { DataCard } from "@/lib/monitor/types";
import { DataCardBody } from "./data-cards";

// The data panels under the signals list: a two-column grid of bordered
// cards, like World Monitor's panel column. Static rather than drifting, so
// the numbers can be read.

export function PanelGrid({ cards, ready }: { cards: DataCard[]; ready: boolean }) {
  return (
    <section aria-label="Data panels" className="grid grid-cols-2 gap-3 pb-3">
      {!ready
        ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
        : cards.map((card) => (
            <div key={card.id} className="min-h-44">
              <DataCardBody card={card} />
            </div>
          ))}
    </section>
  );
}
