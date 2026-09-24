import { lt, sql } from "drizzle-orm";
import type { Database } from "../client";
import { entries } from "../schema/logs";

export interface LogEntryInput {
  loggedAt: Date;
  level: string;
  app: string;
  message: string;
  context?: Record<string, unknown>;
}

// Maps one structured log line (as the logger writes it) to a row: `app`
// becomes a column and every other key goes into `context`.
export function toLogEntryInput(
  line: { timestamp: string; level: string; message: string } & Record<string, unknown>,
  defaultApp: string,
): LogEntryInput {
  const { timestamp, level, message, app, ...context } = line;
  return {
    loggedAt: new Date(timestamp),
    level,
    message,
    app: typeof app === "string" ? app : defaultApp,
    context,
  };
}

// Rows per insert statement, to keep each request to the database bounded.
const BATCH_SIZE = 500;

export async function insertLogEntries(db: Database, rows: LogEntryInput[]): Promise<number> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(entries).values(
      rows.slice(i, i + BATCH_SIZE).map((row) => ({ ...row, context: row.context ?? {} })),
    );
  }
  return rows.length;
}

// Deletes entries logged before `before`; returns how many were removed.
export async function pruneLogEntries(db: Database, before: Date): Promise<number> {
  const deleted = await db.delete(entries).where(lt(entries.loggedAt, before)).returning({ id: entries.id });
  return deleted.length;
}

export async function countLogEntries(db: Database): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(entries);
  return row?.count ?? 0;
}
