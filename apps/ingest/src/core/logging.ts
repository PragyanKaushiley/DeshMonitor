import { createDb, insertLogEntries, toLogEntryInput, type Database } from "@desh-monitor/db";
import { createLogger, errorFields, type LogEntry, type LogFields, type Logger } from "@desh-monitor/logger";

// Every ingest script's log lines are printed as usual and also buffered
// here, then written to logs.entries when the script finishes (runScript).
// One batch at the end keeps logging off the ingestion hot path.
const buffered: LogEntry[] = [];

function persist(entry: LogEntry): void {
  if (entry.level !== "debug") buffered.push(entry);
}

export function createIngestLogger(context: LogFields = {}): Logger {
  // In GitHub Actions, the workflow run id ties each line to its run.
  const runId = process.env.GITHUB_RUN_ID;
  return createLogger({ app: "ingest", ...(runId ? { runId } : {}), ...context }, [persist]);
}

export async function flushLogs(db: Database): Promise<void> {
  const lines = buffered.splice(0);
  if (lines.length === 0) return;
  try {
    await insertLogEntries(db, lines.map((line) => toLogEntryInput(line, "ingest")));
  } catch (error) {
    // Losing logs must not fail the run; say so on the console instead.
    console.error(JSON.stringify({ level: "error", message: "writing logs to the database failed", lines: lines.length, ...errorFields(error) }));
  }
}

// Runs one ingest script: a database connection and logger, a logged crash
// (exit code 1), and the buffered logs written to the database at the end.
export function runScript(
  context: LogFields & { task: string },
  main: (deps: { db: Database; logger: Logger }) => Promise<void>,
): void {
  const logger = createIngestLogger(context);
  let db: Database | null = null;
  void (async () => {
    try {
      db = createDb();
      await main({ db, logger });
    } catch (error) {
      logger.error(`${context.task} crashed`, errorFields(error));
      process.exitCode = 1;
    } finally {
      if (db) await flushLogs(db);
    }
  })();
}
