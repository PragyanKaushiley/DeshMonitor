import { SOURCES } from "./config/sources.js";
import { ingestSource } from "./pipeline/ingestSource.js";
import { runWithConcurrencyLimit } from "./pipeline/concurrency.js";
import { insertRawItems, upsertSourceMeta, transformRawToPublic } from "./db/queries.js";
import { logError, logWarn } from "./logger.js";
import { closePool } from "./db/pool.js";

// Fetching 29 sources fully in parallel would be needlessly aggressive
// against both this process's own resources and each publisher's server;
// a small concurrency cap keeps one slow/misbehaving source from starving
// the others without serializing the whole run either.
const FETCH_CONCURRENCY = 6;

async function run(): Promise<void> {
  const startedAt = Date.now();
  console.log(`[ingest] starting run: ${SOURCES.length} sources, concurrency ${FETCH_CONCURRENCY}`);

  const results = await runWithConcurrencyLimit(
    SOURCES.map((source) => () => ingestSource(source)),
    FETCH_CONCURRENCY,
  );

  let totalInserted = 0;
  let okCount = 0;
  let emptyCount = 0;
  let errorCount = 0;

  for (const result of results) {
    const fetchedAt = new Date();

    if (result.status === "ERROR") {
      errorCount++;
      await logError(`Source "${result.sourceId}" failed`, result.error, { sourceId: result.sourceId });
    } else if (result.status === "EMPTY") {
      emptyCount++;
      await logWarn(`Source "${result.sourceId}" returned zero items`, { sourceId: result.sourceId });
    } else {
      okCount++;
    }

    try {
      await upsertSourceMeta(result.sourceId, fetchedAt, result.items.length, result.status);
      if (result.items.length > 0) {
        const inserted = await insertRawItems(result.items);
        totalInserted += inserted;
      }
    } catch (error) {
      // A DB write failure for one source's results is itself an
      // exception worth recording, distinct from the source's own
      // fetch/parse outcome above.
      await logError(`Failed to persist results for source "${result.sourceId}"`, error, {
        sourceId: result.sourceId,
      });
    }
  }

  let promoted = 0;
  try {
    promoted = await transformRawToPublic();
  } catch (error) {
    await logError("raw -> public transform failed", error);
  }

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[ingest] run complete in ${elapsedMs}ms — ${okCount} OK, ${emptyCount} empty, ${errorCount} errored, ` +
      `${totalInserted} new raw rows, ${promoted} promoted to public.news_items`,
  );
}

run()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("[ingest] fatal error, run did not complete:", error);
    await logError("Fatal error — run did not complete", error).catch(() => {});
    await closePool().catch(() => {});
    process.exit(1);
  });
