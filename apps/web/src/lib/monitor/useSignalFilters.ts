"use client";

import { useCallback, useMemo, useState } from "react";
import { CATEGORIES } from "./categories";
import type { CategoryId, Signal } from "./types";
import type { TimeWindow } from "./categories";

// One filter state shared by the left rail's switches and the signals
// panel's chips — changing either moves both, and the map and list follow.

const WINDOW_MINUTES: Record<TimeWindow, number> = { "6H": 360, "24H": 1440, "7D": 10080, "30D": 43200 };

export interface SignalFilters {
  active: Set<CategoryId>;
  allOn: boolean;
  toggle: (id: CategoryId) => void;
  set: (id: CategoryId, on: boolean) => void;
  only: (id: CategoryId) => void;
  clear: () => void;
  window: TimeWindow;
  setWindow: (w: TimeWindow) => void;
  region: string;
  setRegion: (r: string) => void;
  apply: (signals: Signal[]) => Signal[];
  countFor: (signals: Signal[], id: CategoryId) => number;
}

const ALL = CATEGORIES.map((c) => c.id);

export function useSignalFilters(): SignalFilters {
  // "Everything on" is the resting state; a category is filtered out only
  // when the visitor switches it off.
  const [active, setActive] = useState<Set<CategoryId>>(() => new Set(ALL));
  const [window, setWindow] = useState<TimeWindow>("24H");
  const [region, setRegion] = useState("All India");

  const set = useCallback((id: CategoryId, on: boolean) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: CategoryId) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Chip behaviour: picking one category shows only that one.
  const only = useCallback((id: CategoryId) => setActive(new Set([id])), []);
  const clear = useCallback(() => setActive(new Set(ALL)), []);

  const allOn = active.size === ALL.length;

  const apply = useCallback(
    (signals: Signal[]) => {
      const cutoff = Date.now() - WINDOW_MINUTES[window] * 60_000;
      return signals.filter(
        (s) =>
          active.has(s.category) &&
          s.createdAt >= cutoff &&
          (region === "All India" || s.state === region || s.state === "All India"),
      );
    },
    [active, window, region],
  );

  const countFor = useCallback(
    (signals: Signal[], id: CategoryId) => signals.filter((s) => s.category === id).length,
    [],
  );

  return useMemo(
    () => ({ active, allOn, toggle, set, only, clear, window, setWindow, region, setRegion, apply, countFor }),
    [active, allOn, toggle, set, only, clear, window, region, apply, countFor],
  );
}
