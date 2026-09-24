"use client";

import { useEffect, useState } from "react";
import { criticalAssets, progressiveAssets } from "./assets";
import { fontsReady, loadAssets } from "./assetLoader";

export interface LandingAssetLoaderState {
  loaded: number;
  total: number;
  progress: number;
  currentAsset?: string;
  isComplete: boolean;
  failed: string[];
}

const TOTAL_CRITICAL_STEPS = criticalAssets.length + 1; // +1 for fonts

function initialState(): LandingAssetLoaderState {
  return { loaded: 0, total: TOTAL_CRITICAL_STEPS, progress: 0, isComplete: false, failed: [] };
}

/**
 * Tracks real asset readiness for the landing loader — no fake timers.
 * Critical assets (see lib/landing/assets.ts) gate `isComplete`; progressive
 * assets load in the background afterward and never block the loader.
 */
export function useLandingAssetLoader(): LandingAssetLoaderState {
  const [state, setState] = useState<LandingAssetLoaderState>(initialState);

  useEffect(() => {
    // No "already started" ref guard here on purpose: React Strict Mode's
    // dev-only mount -> cleanup -> remount would set such a guard on the
    // first (throwaway) mount and then never let the real mount start the
    // loader. The `cancelled` flag below already makes a duplicate run safe
    // — the throwaway run's state updates are suppressed by its own cleanup.
    let cancelled = false;
    let loaded = 0;
    const failed: string[] = [];

    function step(currentAsset?: string) {
      loaded += 1;
      if (cancelled) return;
      setState({
        loaded,
        total: TOTAL_CRITICAL_STEPS,
        progress: Math.min(loaded / TOTAL_CRITICAL_STEPS, 1),
        ...(currentAsset ? { currentAsset } : {}),
        isComplete: false,
        failed: [...failed],
      });
    }

    async function run() {
      await fontsReady();
      step("fonts");

      await loadAssets({
        assets: criticalAssets,
        onSettled: (result) => {
          if (!result.ok) failed.push(result.src);
          step(result.src);
        },
      });

      if (!cancelled) {
        setState({
          loaded: TOTAL_CRITICAL_STEPS,
          total: TOTAL_CRITICAL_STEPS,
          progress: 1,
          isComplete: true,
          failed: [...failed],
        });
      }

      // Progressive assets stream in the background — never gate isComplete.
      void loadAssets({ assets: progressiveAssets });
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
