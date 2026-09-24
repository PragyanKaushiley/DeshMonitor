import type { Context, MiddlewareHandler } from "hono";
import { createDb, insertLogEntries, toLogEntryInput, type LogEntryInput } from "@desh-monitor/db";
import { createLogger, errorFields, type LogEntry, type LogFields, type Logger } from "@desh-monitor/logger";
import type { AppEnv } from "../types";

interface WaitUntil {
  waitUntil(promise: Promise<unknown>): void;
}

// Writes rows to logs.entries in the background (after the response / cron
// run), so logging never delays or fails the work itself. Without an
// execution context — tests calling app.request() directly — nothing is
// written, so test runs leave no log rows behind.
export function persistLogs(databaseUrl: string, rows: LogEntryInput[], ctx: WaitUntil | null): void {
  if (!ctx || rows.length === 0) return;
  ctx.waitUntil(
    insertLogEntries(createDb(databaseUrl), rows).catch((error: unknown) => {
      console.error(JSON.stringify({ level: "error", message: "writing logs to the database failed", rows: rows.length, ...errorFields(error) }));
    }),
  );
}

// A logger whose lines (info and up) are also collected for persistLogs.
export function createCollectingLogger(context: LogFields): { logger: Logger; lines: LogEntry[] } {
  const lines: LogEntry[] = [];
  const logger = createLogger({ app: "api", ...context }, [(entry) => entry.level !== "debug" && lines.push(entry)]);
  return { logger, lines };
}

function executionContext(c: Context): WaitUntil | null {
  try {
    return c.executionCtx;
  } catch {
    return null; // app.request() in tests has none
  }
}

// Gives every request a logger (c.get("logger")) and stores what it logged.
export function requestLogging(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const { logger, lines } = createCollectingLogger({ method: c.req.method, path: c.req.path });
    c.set("logger", logger);
    await next();
    persistLogs(c.env.DATABASE_URL, lines.map((line) => toLogEntryInput(line, "api")), executionContext(c));
  };
}
