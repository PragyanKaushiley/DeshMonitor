import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb } from "../client";
import { fetches, items, sources } from "../schema/rawNews";
import { getActiveSources, insertItems, recordFetch, upsertSources, type NewsItemInput } from "./news";

// Integration test against a real Neon/Postgres database. Skipped when no
// DATABASE_URL is configured (e.g. in environments without DB access yet).
loadDotenv();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("news repository (integration)", () => {
  const db = hasDatabase ? createDb() : null;
  const createdSourceIds: string[] = [];

  // Test sources are active, so leaving them behind would make real
  // ingestion runs try to fetch them.
  afterAll(async () => {
    if (!db || createdSourceIds.length === 0) return;
    await db.delete(items).where(inArray(items.sourceId, createdSourceIds));
    await db.delete(fetches).where(inArray(fetches.sourceId, createdSourceIds));
    await db.delete(sources).where(inArray(sources.id, createdSourceIds));
  });

  async function createTestSource() {
    if (!db) throw new Error("expected a database");
    const url = `https://example.com/test-feed-${randomUUID()}`;
    const [source] = await upsertSources(db, [
      { name: "Integration Test Source", publisher: "Test", sourceType: "rss", url, category: "test" },
    ]);
    if (!source) throw new Error("expected source to be created");
    createdSourceIds.push(source.id);
    return source;
  }

  it("upserts a source, then persists items and fetch history against it", async () => {
    if (!db) throw new Error("expected a database");
    const source = await createTestSource();

    const activeSources = await getActiveSources(db);
    expect(activeSources.some((s) => s.id === source.id)).toBe(true);

    const item: NewsItemInput = {
      sourceId: source.id,
      externalId: randomUUID(),
      url: `${source.url}/item-1`,
      title: "Test item",
      contentHash: "abc123",
      rawPayload: { title: "Test item" },
    };
    expect(await insertItems(db, [item])).toEqual({ insertedCount: 1, duplicateCount: 0 });
    expect(await insertItems(db, [item])).toEqual({ insertedCount: 0, duplicateCount: 1 });

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

  it("fills a missing cover image when a stored item is seen again, but never replaces one", async () => {
    if (!db) throw new Error("expected a database");
    const source = await createTestSource();
    const base: NewsItemInput = {
      sourceId: source.id,
      externalId: randomUUID(),
      url: `${source.url}/item-2`,
      title: "Test item",
      contentHash: "def456",
      rawPayload: { title: "Test item" },
    };
    const imageOf = async () => {
      const [row] = await db
        .select({ imageUrl: items.imageUrl, rawPayload: items.rawPayload })
        .from(items)
        .where(inArray(items.externalId, [base.externalId]));
      return row;
    };

    await insertItems(db, [{ ...base, imageUrl: null }]);
    expect((await imageOf())?.imageUrl).toBeNull();

    const filled = await insertItems(db, [
      { ...base, imageUrl: "https://img.example.com/a.jpg", rawPayload: { title: "changed" } },
    ]);
    expect(filled).toEqual({ insertedCount: 0, duplicateCount: 1 });
    // Only the image is filled; the stored raw payload stays as first fetched.
    expect(await imageOf()).toEqual({ imageUrl: "https://img.example.com/a.jpg", rawPayload: { title: "Test item" } });

    await insertItems(db, [{ ...base, imageUrl: "https://img.example.com/b.jpg" }]);
    expect((await imageOf())?.imageUrl).toBe("https://img.example.com/a.jpg");
  });

  it("counts an item repeated within one batch as a duplicate", async () => {
    if (!db) throw new Error("expected a database");
    const source = await createTestSource();
    const item: NewsItemInput = {
      sourceId: source.id,
      externalId: randomUUID(),
      url: `${source.url}/item-3`,
      title: "Test item",
      contentHash: "ghi789",
      rawPayload: { title: "Test item" },
    };
    expect(await insertItems(db, [item, item])).toEqual({ insertedCount: 1, duplicateCount: 1 });
  });
});
