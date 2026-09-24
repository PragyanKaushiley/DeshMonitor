import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb } from "../client";
import { entries } from "../schema/logs";
import { insertLogEntries, pruneLogEntries } from "./logs";

loadDotenv();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("logs repository (integration)", () => {
  // A unique app name keeps these rows apart from real logs.
  const app = `test-${randomUUID()}`;
  afterAll(async () => {
    await createDb().delete(entries).where(eq(entries.app, app));
  });

  it("stores entries with their context", async () => {
    const db = createDb();
    await insertLogEntries(db, [
      { loggedAt: new Date(), level: "info", app, message: "hello", context: { job: "news", n: 3 } },
      { loggedAt: new Date(), level: "error", app, message: "broke" },
    ]);
    const rows = await db.select().from(entries).where(eq(entries.app, app));
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.message === "hello")?.context).toEqual({ job: "news", n: 3 });
    expect(rows.find((r) => r.message === "broke")?.context).toEqual({});
  });

  it("prunes only entries logged before the cutoff", async () => {
    const db = createDb();
    // 1999 timestamps: far older than any real log, so the prune below can
    // only ever remove this test's own rows.
    await insertLogEntries(db, [
      { loggedAt: new Date("1999-01-01T00:00:00Z"), level: "info", app, message: "old" },
      { loggedAt: new Date("1999-12-31T00:00:00Z"), level: "info", app, message: "newer" },
    ]);
    const removed = await pruneLogEntries(db, new Date("1999-06-01T00:00:00Z"));
    expect(removed).toBe(1);
    const left = await db
      .select({ message: entries.message })
      .from(entries)
      .where(and(eq(entries.app, app), eq(entries.message, "newer")));
    expect(left).toHaveLength(1);
  });
});
