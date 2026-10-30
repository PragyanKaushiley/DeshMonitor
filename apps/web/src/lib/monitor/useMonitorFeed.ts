"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMockSource } from "./mock";
import type { DataCard, MonitorSource, Signal } from "./types";

// Subscribes to the feed. Everything starts empty and fills in after mount:
// the data is random, so rendering it on the server would never match the
// client (the page shows skeletons until `ready`).

export interface MonitorFeed {
  ready: boolean;
  signals: Signal[];
  cards: DataCard[];
  // Signals held back because the visitor has scrolled away from the top.
  queued: Signal[];
  releaseQueued: () => void;
  // The most recently inserted signal, so the map can pulse its marker once.
  lastInsertedId: string | null;
}

const MAX_SIGNALS = 60;

export function useMonitorFeed(
  // Asked at the moment a signal arrives: may it be inserted, or should it
  // queue? Checked then rather than tracked in advance, so the answer is
  // always the list's real scroll position.
  canInsert?: () => boolean,
  makeSource: () => MonitorSource = createMockSource,
): MonitorFeed {
  const [ready, setReady] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [cards, setCards] = useState<DataCard[]>([]);
  const [queued, setQueued] = useState<Signal[]>([]);
  const [lastInsertedId, setLastInsertedId] = useState<string | null>(null);
  // Read inside the subscription callback, which is set up once, so the
  // latest test has to be reachable through a ref.
  const canInsertRef = useRef(canInsert);
  canInsertRef.current = canInsert;
  // The source is created once, on mount. Listing `makeSource` itself as a
  // dependency re-subscribed on every render in the production build (each
  // run regenerated the signals and started another timer loop), so the
  // factory is read through a ref instead.
  const makeSourceRef = useRef(makeSource);

  useEffect(() => {
    const source = makeSourceRef.current();
    setSignals(source.initialSignals());
    setCards(source.dataCards());
    setReady(true);

    const stopFeed = source.subscribe((event) => {
      if (event.type === "update") {
        setSignals((prev) => {
          if (prev.length === 0) return prev;
          // Revise one of the signals already on screen rather than the
          // freshly generated one, so updates land where they can be seen.
          const target = prev[Math.floor(Math.random() * Math.min(prev.length, 6))];
          if (!target) return prev;
          return prev.map((s) =>
            s.id === target.id
              ? { ...s, confidence: event.signal.confidence, severity: event.signal.severity, updatedAt: Date.now() }
              : s,
          );
        });
        return;
      }

      if (canInsertRef.current?.() === false) {
        setQueued((prev) => [event.signal, ...prev]);
        return;
      }
      setSignals((prev) => [event.signal, ...prev].slice(0, MAX_SIGNALS));
      setLastInsertedId(event.signal.id);
    });

    const stopCards = source.subscribeCards(setCards);
    return () => {
      stopFeed();
      stopCards();
    };
  }, []);

  // Stable identities: the panel observes scroll position through these, and
  // a new function each render would tear that observer down every time.
  const releaseQueued = useCallback(() => {
    setQueued((pending) => {
      if (pending.length > 0) {
        setSignals((prev) => [...pending, ...prev].slice(0, MAX_SIGNALS));
        setLastInsertedId(pending[0]?.id ?? null);
      }
      return [];
    });
  }, []);

  return useMemo(
    () => ({ ready, signals, cards, queued, releaseQueued, lastInsertedId }),
    [ready, signals, cards, queued, releaseQueued, lastInsertedId],
  );
}
