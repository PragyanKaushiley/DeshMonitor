import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb } from "../client";
import { getActiveSources, insertItems, recordFetch, upsertSources } from "./news";

// Integration test against a real Neon/Postgres database. Skipped when no
// DATABASE_URL is configured (e.g. in environments without DB access yet).
loadDotenv();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("news repository (integration)", () => {
  it("upserts a source, then persists items and fetch history against it", async () => {
    const db = createDb();
    const uniqueUrl = `https://example.com/test-feed-${randomUUID()}`;

    const [source] = await upsertSources(db, [
      {
        name: "Integration Test Source",
        publisher: "Test",
        sourceType: "rss",
        url: uniqueUrl,
        category: "test",
      },
    ]);
    expect(source).toBeDefined();
    if (!source) throw new Error("expected source to be created");

    const activeSources = await getActiveSources(db);
    expect(activeSources.some((s) => s.id === source.id)).toBe(true);

    const externalId = randomUUID();
    const first = await insertItems(db, [
      {
        sourceId: source.id,
        externalId,
        url: `${uniqueUrl}/item-1`,
        title: "Test item",
        contentHash: "abc123",
        rawPayload: { title: "Test item" },
      },
    ]);
    expect(first).toEqual({ insertedCount: 1, duplicateCount: 0 });

    const second = await insertItems(db, [
      {
        sourceId: source.id,
        externalId,
        url: `${uniqueUrl}/item-1`,
        title: "Test item",
        contentHash: "abc123",
        rawPayload: { title: "Test item" },
      },
    ]);
    expect(second).toEqual({ insertedCount: 0, duplicateCount: 1 });

    await expect(
      recordFetch(db, {
        sourceId: source.id,
        startedAt: new Date(Date.now() - 1000),
        finishedAt: new Date(),
        durationMs: 1000,
        httpStatus: 200,
        success: true,
        itemsFound: 1,
        itemsInserted: 1,
        itemsDuplicate: 0,
      }),
    ).resolves.toBeUndefined();
  });
});
