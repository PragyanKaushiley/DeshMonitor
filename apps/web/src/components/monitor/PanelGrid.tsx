"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataCard, DataCardId } from "@/lib/monitor/types";
import { DataCardBody } from "./data-cards";

// The data panels under the signals list: a two-column grid of bordered
// cards, like World Monitor's panel column. Static rather than drifting, so
// the numbers can be read.
//
// Each card can be resized by dragging a corner. Only a few fixed sizes exist
// and the card snaps to the nearest one, so the grid stays tidy: half width or
// full width, and three heights. A card never leaves its column: the map and
// the signals list are off limits.

const HEIGHTS = [176, 264, 352] as const; // px
const GAP = 12; // the grid's gap-3
const STORAGE_KEY = "dm_panel_sizes";

interface Size {
  /** Columns spanned: 1 = half width, 2 = full width. */
  cols: 1 | 2;
  /** Index into HEIGHTS. */
  row: 0 | 1 | 2;
  /**
   * Set when the card was widened from the right-hand column. It then sorts
   * ahead of the card beside it, so it keeps its own row and the neighbour is
   * the one that moves down (otherwise the grid re-places it on a new row).
   */
  left?: true;
}

const DEFAULT_SIZE: Size = { cols: 1, row: 0 };
const nearest = (px: number): Size["row"] => {
  let best: Size["row"] = 0;
  for (const i of [1, 2] as const) {
    if (Math.abs(HEIGHTS[i] - px) < Math.abs(HEIGHTS[best] - px)) best = i;
  }
  return best;
};

// The width a dragged card has, as one of the fixed column counts.
function colsForWidth(width: number, gridWidth: number): Size["cols"] {
  const half = (gridWidth - GAP) / 2;
  return width > half * 1.5 ? 2 : 1;
}

function readSizes(): Partial<Record<DataCardId, Size>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const clean: Partial<Record<DataCardId, Size>> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const v = value as Partial<Size>;
      if ((v.cols === 1 || v.cols === 2 || v.cols === 3) && (v.row === 0 || v.row === 1 || v.row === 2)) {
        clean[id as DataCardId] = { cols: v.cols === 1 ? 1 : 2, row: v.row, ...(v.left === true && v.cols >= 2 ? { left: true as const } : {}) };
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
        : cards.map((card, index) => (
            <ResizablePanel
              key={card.id}
              card={card}
              index={index}
              size={sizes[card.id] ?? DEFAULT_SIZE}
              gridRef={gridRef}
              onResize={(size, save) => resize(card.id, size, save)}
            />
          ))}
    </section>
  );
}

type Side = "right" | "left";

function ResizablePanel({
  card,
  index,
  size,
  gridRef,
  onResize,
}: {
  card: DataCard;
  index: number;
  size: Size;
  gridRef: React.RefObject<HTMLElement | null>;
  onResize: (size: Size, save: boolean) => void;
}) {
  const drag = useRef<{ side: Side; x: number; y: number; width: number; height: number; anchored: boolean; last: Size } | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // The drag is followed on the window rather than through pointer capture on
  // the grip. The latest props are read through a ref.
  const live = useRef({ onResize, gridRef });
  live.current = { onResize, gridRef };
  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      stopDrag.current?.();
    },
    [],
  );

  // Is this card in the right-hand column? (Its slot starts to the right of the
  // grid's left edge.)
  const inRightColumn = () => {
    const grid = gridRef.current;
    const slot = slotRef.current;
    return !!grid && !!slot && slot.getBoundingClientRect().left > grid.getBoundingClientRect().left + 4;
  };

  const onPointerDown = (side: Side) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const box = event.currentTarget.closest("[data-panel]")?.getBoundingClientRect();
    if (!box) return;
    // A card widened leftwards from the right column keeps its row (see Size.left).
    const anchored = size.left === true || (side === "left" && inRightColumn());
    drag.current = { side, x: event.clientX, y: event.clientY, width: box.width, height: box.height, anchored, last: size };

    const move = (e: PointerEvent) => {
      const start = drag.current;
      const grid = live.current.gridRef.current;
      if (!start || !grid) return;
      // The right corner grows the card rightwards and the left one leftwards.
      const dx = start.side === "right" ? e.clientX - start.x : start.x - e.clientX;
      const cols = colsForWidth(start.width + dx, grid.clientWidth);
      const next: Size = {
        cols,
        row: nearest(start.height + (e.clientY - start.y)),
        ...(start.anchored && cols >= 2 ? { left: true as const } : {}),
      };
      if (next.cols !== start.last.cols || next.row !== start.last.row || next.left !== start.last.left) {
        start.last = next;
        live.current.onResize(next, false);
      }
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopDrag.current = null;
      const start = drag.current;
      drag.current = null;
      if (start) live.current.onResize(start.last, true);
    };
    stopDrag.current = end;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  // Arrow keys step through the same fixed sizes for keyboard users. On the
  // right corner, right widens and left narrows; on the left corner, left
  // widens and right narrows. Neither goes past the column.
  const onKeyDown = (side: Side) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const next = { ...size };
    const grow = side === "right" ? "ArrowRight" : "ArrowLeft";
    const shrink = side === "right" ? "ArrowLeft" : "ArrowRight";
    if (event.key === grow) next.cols = 2;
    else if (event.key === shrink) next.cols = 1;
    else if (event.key === "ArrowDown") next.row = Math.min(2, size.row + 1) as Size["row"];
    else if (event.key === "ArrowUp") next.row = Math.max(0, size.row - 1) as Size["row"];
    else return;
    event.preventDefault();
    if (next.cols >= 2 && (size.left === true || (side === "left" && inRightColumn()))) next.left = true;
    else delete next.left;
    onResize(next, true);
  };

  const grips = (
    <>
      <button
        type="button"
        aria-label={`Resize ${card.title}. Drag, or use the arrow keys.`}
        onPointerDown={onPointerDown("right")}
        onKeyDown={onKeyDown("right")}
        className="absolute right-0 bottom-0 grid size-6 cursor-nwse-resize touch-none place-items-end p-1.5 text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:text-teal-400 focus-visible:outline-2 focus-visible:outline-teal-400"
      >
        <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden fill="currentColor">
          <circle cx="8.5" cy="8.5" r="1.1" />
          <circle cx="4.5" cy="8.5" r="1.1" />
          <circle cx="8.5" cy="4.5" r="1.1" />
        </svg>
      </button>
      {/* A second grip at the other corner widens the card leftwards. Every card
          has one: a card in the right-hand column is already against the edge of
          the screen, so the right grip has nowhere to drag it, and leftwards is
          the only way it can grow. It stops at the column's edge. */}
      {(
        <button
          type="button"
          aria-label={`Widen ${card.title} to the left. Drag left, or use the arrow keys.`}
          onPointerDown={onPointerDown("left")}
          onKeyDown={onKeyDown("left")}
          className="absolute bottom-0 left-0 grid size-6 cursor-nesw-resize touch-none place-items-end p-1.5 text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:text-teal-400 focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <svg viewBox="0 0 10 10" className="size-2.5 -scale-x-100" aria-hidden fill="currentColor">
            <circle cx="8.5" cy="8.5" r="1.1" />
            <circle cx="4.5" cy="8.5" r="1.1" />
            <circle cx="8.5" cy="4.5" r="1.1" />
          </svg>
        </button>
      )}
    </>
  );

  return (
    // `layout`: when a card changes size, it and the cards the grid shifts around
    // it glide to their new places instead of jumping. The radius is inline so
    // Motion can keep the corners round while it stretches the box.
    <motion.div
      ref={slotRef}
      layout={!reducedMotion}
      transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.9 }}
      data-panel={card.id}
      className="relative min-w-0 overflow-hidden"
      style={{
        gridColumn: `span ${size.cols}`,
        height: HEIGHTS[size.row],
        // Normally in list order; a card widened from the right column sorts just ahead of
        // the card before it, so it holds its row and that card moves down.
        order: size.left && size.cols >= 2 ? (index - 1) * 10 - 5 : index * 10,
        borderRadius: 12,
      }}
    >
      <DataCardBody card={card} />
      {grips}
    </motion.div>
  );
}
