import { completeFetch, type Database } from "@desh-monitor/db";
import type { Logger } from "@desh-monitor/logger";
import { runIngestion } from "../../core/runner";
import type { SourceAdapter } from "../../core/types";
import type { WeatherDataType, WeatherSource } from "./types";

export async function runWeatherIngestion<TRawItem, TNormalized>(params: {
  db: Database;
  logger: Logger;
  dataType: WeatherDataType;
  sources: WeatherSource[];
  makeAdapter: (db: Database) => SourceAdapter<WeatherSource, TRawItem, TNormalized>;
  concurrency?: number;
}): Promise<void> {
  const logger = params.logger.child({ dataType: params.dataType });
  const db = params.db;

  if (params.sources.length === 0) {
    logger.warn("no locations configured for this data type; run seed:weather first");
    return;
  }

  const adapter = params.makeAdapter(db);

  const results = await runIngestion({
    sources: params.sources,
    adapter,
    logger,
    ...(params.concurrency !== undefined ? { concurrency: params.concurrency } : {}),
    onSourceComplete: async (result, source) => {
      if (!source.fetchId) return;
      await completeFetch(db, source.fetchId, {
        finishedAt: new Date(),
        durationMs: result.durationMs,
        httpStatus: result.httpStatus ?? null,
        success: result.success,
        recordsFound: result.itemsFound,
        recordsInserted: result.itemsInserted,
        errorMessage: result.errorMessage ?? null,
      });
    },
  });

  const succeeded = results.filter((result) => result.success).length;

  logger.info(`${params.dataType} ingestion run complete`, {
    locationsTotal: results.length,
    succeeded,
    failed: results.length - succeeded,
    recordsInserted: results.reduce((sum, result) => sum + result.itemsInserted, 0),
  });

  if (results.length > 0 && succeeded === 0) {
    process.exitCode = 1;
  }
}
