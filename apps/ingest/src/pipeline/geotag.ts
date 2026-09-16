// Pure, dependency-free state detection — no DB, no network, so it's
// cheap to unit-test directly (see __tests__/geotag.test.ts) per the
// testing guideline's "pure functions with real correctness stakes" bar.

import { STATE_KEYWORDS } from "../config/state-keywords.js";
import type { State } from "@deshmonitor/shared-types";

/**
 * Tier-2 geo-tagging: scan `title` + `description` for the first matching
 * state keyword. Insertion order in STATE_KEYWORDS decides precedence
 * when a story could plausibly match more than one state — this is a
 * heuristic, not a guarantee (data-sourcing-standards guideline).
 *
 * Tier-1 (a source's fixed `defaultState`) is handled by the caller
 * (ingestSource.ts) before this ever runs, so this function only ever
 * sees text that genuinely needs keyword analysis.
 */
export function detectState(title: string, description?: string): State | null {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  for (const [state, keywords] of Object.entries(STATE_KEYWORDS) as [State, readonly string[]][]) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return state;
    }
  }

  return null;
}
