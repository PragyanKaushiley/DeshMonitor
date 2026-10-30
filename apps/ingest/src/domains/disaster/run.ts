import { getActiveDisasterSources, recordDisasterFetch, upsertDisasterSources } from "@desh-monitor/db";
import { runScript } from "../../core/logging";
import { runIngestion } from "../../core/runner";
import { SOURCES } from "./sources";
import { createEonetAdapter } from "./eonet";
import { createUsgsAdapter } from "./usgs";

runScript({ task: "disaster ingestion", domain: "disaster" }, async ({ db, logger }) => {
  // Sources are defined in code; keep the table in step with them.
  await upsertDisasterSources(db, SOURCES);
  const sources = await getActiveDisasterSources(db);

  if (sources.length === 0) {
    logger.warn("no active disaster sources configured");
    return;
  }

  // Each source type has its own adapter; sources of other types are skipped
  // with a warning rather than failing the run.
  const adapters = {
    "usgs-fdsn-geojson": createUsgsAdapter(db),
    "nasa-eonet-v3": createEonetAdapter(db),
  } as const;

  const results = [];
  for (const [sourceType, adapter] of Object.entries(adapters)) {
    const ofType = sources.filter((source) => source.sourceType === sourceType);
    if (ofType.length === 0) continue;
    results.push(
      ...(await runIngestion({
        sources: ofType,
        adapter,
        logger,
        onSourceComplete: async (result, source) => {
          const finishedAt = new Date();
          await recordDisasterFetch(db, {
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
      })),
    );
  }

  const known = new Set<string>(Object.keys(adapters));
  for (const source of sources.filter((s) => !known.has(s.sourceType))) {
    logger.warn("no adapter for disaster source type", { slug: source.slug, sourceType: source.sourceType });
  }

  const succeeded = results.filter((result) => result.success).length;
  const failed = results.length - succeeded;

  logger.info("disaster ingestion run complete", {
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
