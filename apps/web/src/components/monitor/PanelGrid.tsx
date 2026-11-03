"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataCard, DataCardId } from "@/lib/monitor/types";
import { DataCardBody } from "./data-cards";

// The data panels under the signals list: a two-column grid of bordered
// cards, like World Monitor's panel column. Static rather than drifting, so
// the numbers can be read.
//
// Each card can be resized by dragging its bottom-right corner. Only a few
// fixed sizes exist — half or full width, and three heights — and the card
// snaps to the nearest one, so the grid stays tidy.

const HEIGHTS = [176, 264, 352] as const; // px
const GAP = 12; // the grid's gap-3
const STORAGE_KEY = "dm_panel_sizes";

interface Size {
  /** Columns spanned: 1 = half width, 2 = full width. */
  cols: 1 | 2;
  /** Index into HEIGHTS. */
  row: 0 | 1 | 2;
}

const DEFAULT_SIZE: Size = { cols: 1, row: 0 };
const nearest = (px: number): Size["row"] => {
  let best: Size["row"] = 0;
  for (const i of [1, 2] as const) {
    if (Math.abs(HEIGHTS[i] - px) < Math.abs(HEIGHTS[best] - px)) best = i;
  }
  return best;
};

function readSizes(): Partial<Record<DataCardId, Size>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const clean: Partial<Record<DataCardId, Size>> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const v = value as Partial<Size>;
      if ((v.cols === 1 || v.cols === 2) && (v.row === 0 || v.row === 1 || v.row === 2)) {
        clean[id as DataCardId] = { cols: v.cols, row: v.row };
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function PanelGrid({ cards, ready }: { cards: DataCard[]; ready: boolean }) {
  const gridRef = useRef<HTMLElement>(null);
  const [sizes, setSizes] = useState<Partial<Record<DataCardId, Size>>>({});

  // Read after mount so the server and first client render agree.
  useEffect(() => setSizes(readSizes()), []);

  const resize = useCallback((id: DataCardId, size: Size, save: boolean) => {
    setSizes((current) => {
      const next = { ...current, [id]: size };
      if (save) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Storage can be blocked; the size just won't be remembered.
        }
      }
      return next;
    });
  }, []);

  return (
    <section
      ref={gridRef}
      aria-label="Data panels"
      className="grid grid-cols-2 gap-3 pb-3 [grid-auto-flow:row_dense]"
    >
      {!ready
        ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
        : cards.map((card) => (
            <ResizablePanel
              key={card.id}
              card={card}
              size={sizes[card.id] ?? DEFAULT_SIZE}
              gridRef={gridRef}
              onResize={(size, save) => resize(card.id, size, save)}
            />
          ))}
    </section>
  );
}

function ResizablePanel({
  card,
  size,
  gridRef,
  onResize,
}: {
  card: DataCard;
  size: Size;
  gridRef: React.RefObject<HTMLElement | null>;
  onResize: (size: Size, save: boolean) => void;
}) {
  const drag = useRef<{ x: number; y: number; width: number; height: number; last: Size } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const box = event.currentTarget.closest("[data-panel]")?.getBoundingClientRect();
    if (!box) return;
    drag.current = { x: event.clientX, y: event.clientY, width: box.width, height: box.height, last: size };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    const grid = gridRef.current;
    if (!start || !grid) return;
    const half = (grid.clientWidth - GAP) / 2;
    const width = start.width + (event.clientX - start.x);
    const next: Size = {
      cols: width > half * 1.5 ? 2 : 1,
      row: nearest(start.height + (event.clientY - start.y)),
    };
    if (next.cols !== start.last.cols || next.row !== start.last.row) {
      start.last = next;
      onResize(next, false);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (start) onResize(start.last, true);
  };

  // Arrow keys step through the same fixed sizes for keyboard users.
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const next = { ...size };
    if (event.key === "ArrowRight") next.cols = 2;
    else if (event.key === "ArrowLeft") next.cols = 1;
    else if (event.key === "ArrowDown") next.row = Math.min(2, size.row + 1) as Size["row"];
    else if (event.key === "ArrowUp") next.row = Math.max(0, size.row - 1) as Size["row"];
    else return;
    event.preventDefault();
    onResize(next, true);
  };

  return (
    <div
      data-panel={card.id}
      className="relative min-w-0 overflow-hidden rounded-xl"
      style={{ gridColumn: `span ${size.cols}`, height: HEIGHTS[size.row] }}
    >
      <DataCardBody card={card} />
      <button
        type="button"
        aria-label={`Resize ${card.title}. Drag, or use the arrow keys.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="absolute right-0 bottom-0 grid size-6 cursor-nwse-resize touch-none place-items-end p-1.5 text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:text-teal-400 focus-visible:outline-2 focus-visible:outline-teal-400"
      >
        <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden fill="currentColor">
          <circle cx="8.5" cy="8.5" r="1.1" />
          <circle cx="4.5" cy="8.5" r="1.1" />
          <circle cx="8.5" cy="4.5" r="1.1" />
        </svg>
      </button>
    </div>
  );
}
