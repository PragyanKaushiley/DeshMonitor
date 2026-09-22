import { runWithConcurrency } from "@desh-monitor/utils";
import type { Logger } from "@desh-monitor/logger";
import type { PipelineResult, SourceAdapter, SourceLike } from "./types";

export interface RunIngestionOptions<TSource extends SourceLike, TRawItem, TNormalized> {
  sources: TSource[];
  adapter: SourceAdapter<TSource, TRawItem, TNormalized>;
  logger: Logger;
  concurrency?: number;
  onSourceComplete?: (result: PipelineResult, source: TSource) => Promise<void>;
}

const DEFAULT_CONCURRENCY = 5;

export async function runIngestion<TSource extends SourceLike, TRawItem, TNormalized>(
  options: RunIngestionOptions<TSource, TRawItem, TNormalized>,
): Promise<PipelineResult[]> {
  const { sources, adapter, logger, onSourceComplete } = options;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  return runWithConcurrency(sources, concurrency, async (source) => {
    const startedAt = Date.now();
    let result: PipelineResult;

    try {
      const { httpStatus, rawItems } = await adapter.fetch(source);
      const validItems = rawItems.filter((item) => adapter.validate(item));
      const itemsRejected = rawItems.length - validItems.length;
      const normalizedItems = validItems.map((item) => adapter.normalize(item, source));
      const { insertedCount, duplicateCount } = await adapter.persist(source, normalizedItems);

      result = {
        sourceId: source.id,
        success: true,
        itemsFound: rawItems.length,
        itemsInserted: insertedCount,
        itemsDuplicate: duplicateCount,
        itemsRejected,
        ...(httpStatus !== undefined ? { httpStatus } : {}),
        durationMs: Date.now() - startedAt,
      };

      logger.info("source ingestion succeeded", { ...result });
    } catch (error) {
      result = {
        sourceId: source.id,
        success: false,
        itemsFound: 0,
        itemsInserted: 0,
        itemsDuplicate: 0,
        itemsRejected: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      };

      logger.error("source ingestion failed", { sourceId: source.id, error: result.errorMessage });
    }

    if (onSourceComplete) {
      await onSourceComplete(result, source);
    }

    return result;
  });
}
