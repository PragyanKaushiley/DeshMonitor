import { getActiveSources, recordFetch } from "@desh-monitor/db";
import { runScript } from "../../core/logging";
import { runIngestion } from "../../core/runner";
import { createRssAdapter } from "./adapter";

runScript({ task: "news ingestion", domain: "news" }, async ({ db, logger }) => {
  const sources = await getActiveSources(db);

  if (sources.length === 0) {
    logger.warn("no active news sources configured; run seed:news first");
    return;
  }

  const adapter = createRssAdapter(db);

  const results = await runIngestion({
    sources,
    adapter,
    logger,
    onSourceComplete: async (result, source) => {
      const finishedAt = new Date();
      await recordFetch(db, {
        sourceId: source.id,
        startedAt: new Date(finishedAt.getTime() - result.durationMs),
        finishedAt,
        durationMs: result.durationMs,
        httpStatus: result.httpStatus ?? null,
        success: result.success,
        itemsFound: result.itemsFound,
        itemsInserted: result.itemsInserted,
        itemsDuplicate: result.itemsDuplicate,
        errorMessage: result.errorMessage ?? null,
      });
    },
  });

  const succeeded = results.filter((result) => result.success).length;
  const failed = results.length - succeeded;

  logger.info("news ingestion run complete", {
    sourcesTotal: results.length,
    sourcesSucceeded: succeeded,
    sourcesFailed: failed,
    itemsInserted: results.reduce((sum, result) => sum + result.itemsInserted, 0),
    itemsDuplicate: results.reduce((sum, result) => sum + result.itemsDuplicate, 0),
    itemsRejected: results.reduce((sum, result) => sum + result.itemsRejected, 0),
  });

  if (results.length > 0 && failed === results.length) {
    process.exitCode = 1;
  }
});
