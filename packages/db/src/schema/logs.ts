import { bigserial, index, jsonb, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

// Operational logs from every app (ingest, api, web). Not raw source data —
// kept separate from the raw_* domains and pruned after a retention period.
export const logsSchema = pgSchema("logs");

export const entries = logsSchema.table(
  "entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    // When the line was logged (from the logger), not when it was stored.
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
    level: text("level").notNull(),
    app: text("app").notNull(),
    message: text("message").notNull(),
    // Everything else on the line: logger context (domain, job, …) and fields.
    context: jsonb("context").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("entries_logged_at_idx").on(table.loggedAt),
    index("entries_app_level_logged_at_idx").on(table.app, table.level, table.loggedAt),
  ],
);
