import { pruneLogEntries } from "@desh-monitor/db";
import { runScript } from "../core/logging";

// Operational logs (logs.entries) are kept for 30 days.
const RETENTION_DAYS = 30;

runScript({ task: "logs prune", domain: "logs" }, async ({ db, logger }) => {
  const before = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const removed = await pruneLogEntries(db, before);
  logger.info("pruned old log entries", { removed, before: before.toISOString(), retentionDays: RETENTION_DAYS });
});
