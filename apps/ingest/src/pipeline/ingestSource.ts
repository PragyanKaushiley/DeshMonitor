import type { SourceConfig } from "../config/sources.js";
import { fetchFeed } from "./fetchFeed.js";
import { parseFeed } from "./parseFeed.js";
import { detectState } from "./geotag.js";
import { computeContentHash } from "./dedupe.js";
import type { RawNewsItemInput, SourceStatus } from "../db/queries.js";

export interface IngestSourceResult {
  sourceId: string;
  status: SourceStatus;
  items: RawNewsItemInput[];
  error?: unknown;
}

/**
 * Run the full fetch -> parse -> geotag -> hash pipeline for one source.
 * Never throws — a single source's failure is isolated and reported as
 * an `ERROR` result so it can't take the rest of the run down with it
 * (module-boundaries / fail-closed-only-where-it-matters guidelines: a
 * fetch failure here is an operational fact to record, not a security
 * boundary, so it fails soft and reports status instead of throwing).
 */
export async function ingestSource(source: SourceConfig): Promise<IngestSourceResult> {
  try {
    const xml = await fetchFeed(source.url);
    const normalized = await parseFeed(xml, source.url);

    const items: RawNewsItemInput[] = normalized.map((item) => ({
      contentHash: computeContentHash(item.url),
      sourceId: source.id,
      category: source.category,
      language: source.language,
      state: source.defaultState ?? detectState(item.title, item.description),
      title: item.title,
      url: item.url,
      publishedAt: item.publishedAt,
      imageUrl: item.imageUrl,
      rawPayload: item,
    }));

    return {
      sourceId: source.id,
      status: items.length > 0 ? "OK" : "EMPTY",
      items,
    };
  } catch (error) {
    return { sourceId: source.id, status: "ERROR", items: [], error };
  }
}
