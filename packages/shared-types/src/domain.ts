import type { Category, Language, State } from "./constants.js";

/**
 * A published news item, as the API returns it. This is a DTO, not a
 * database row shape — see the backend guideline on never returning a raw
 * row (`../../input/guidelines/07-backend-development-guidelines.md` §2).
 */
export interface NewsItem {
  id: number;
  contentHash: string;
  sourceId: string;
  sourceName: string;
  category: Category;
  language: Language;
  /** `null` means no state was detected — rendered as "National" in the UI. */
  state: State | null;
  title: string;
  url: string;
  /** A representative image URL for the story, or `null` when the
   * source feed carried none. Always a reference to the publisher's own
   * image, never a downloaded/re-hosted copy. */
  imageUrl: string | null;
  /** ISO 8601, nullable — some feeds omit a publish date. */
  publishedAt: string | null;
  createdAt: string;
}

/** The authenticated-user shape returned by every /api/auth/* route. */
export interface User {
  id: number;
  email: string;
  isPro: boolean;
  isAdmin: boolean;
  createdAt: string;
}

/** One row of GET /api/states-summary. */
export interface StateSummary {
  state: State;
  count: number;
}

/** Per-source ingestion freshness, from GET /api/health. */
export interface SourceHealth {
  sourceId: string;
  sourceName: string;
  fetchedAt: string;
  recordCount: number;
  status: "OK" | "EMPTY" | "ERROR";
}

/** The cache subsystem's self-reported health. */
export interface CacheHealth {
  configured: boolean;
  ok?: boolean;
  latencyMs?: number;
  error?: string;
}

export interface HealthResponse {
  overall: "healthy" | "stale" | "unknown";
  staleAfterMinutes: number;
  sources: SourceHealth[];
  cache: CacheHealth;
  generatedAt: string;
}

/** One row of GET /api/admin/logs — mirrors public.logs. */
export interface LogEntry {
  id: number;
  source: "ingest" | "api";
  level: "error" | "warn";
  message: string;
  stack: string | null;
  context: unknown;
  createdAt: string;
}
