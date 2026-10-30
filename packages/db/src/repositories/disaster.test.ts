import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb } from "../client";
import { fetches, items, sources } from "../schema/rawDisaster";
import {
  insertDisasterItems,
  recordDisasterFetch,
  upsertDisasterSources,
  type DisasterItemInput,
} from "./disaster";

loadDotenv();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("disaster repository (integration)", () => {
  const createdSourceIds: string[] = [];

  // Test sources are active, so leaving them behind would make real runs
  // fetch them.
  afterAll(async () => {
    if (createdSourceIds.length === 0) return;
    const db = createDb();
    await db.delete(items).where(inArray(items.sourceId, createdSourceIds));
    await db.delete(fetches).where(inArray(fetches.sourceId, createdSourceIds));
    await db.delete(sources).where(inArray(sources.id, createdSourceIds));
  });

  async function makeSource() {
    const db = createDb();
    const slug = `test-source-${randomUUID()}`;
    const [source] = await upsertDisasterSources(db, [
      {
        slug,
        name: "Test source",
        provider: "Test",
        sourceType: "test",
        url: "https://example.test/query",
        queryParams: { limit: 1 },
        license: "Test licence",
      },
    ]);
    if (!source) throw new Error("expected source to be created");
    createdSourceIds.push(source.id);
    return source;
  }

  function item(sourceId: string, overrides: Partial<DisasterItemInput> = {}): DisasterItemInput {
    return {
      sourceId,
      externalId: "ev1",
      sourceUpdatedAt: new Date("2026-10-30T10:00:00Z"),
      occurredAt: new Date("2026-10-30T09:00:00Z"),
      hazardType: "earthquake",
      title: "M 4.0 - test",
      magnitude: 4,
      contentHash: "h1",
      rawPayload: { id: "ev1" },
      ...overrides,
    };
  }

  it("upserts a source by slug and keeps its licence and query", async () => {
    const db = createDb();
    const source = await makeSource();
    const [again] = await upsertDisasterSources(db, [
      {
        slug: source.slug,
        name: "Renamed",
        provider: "Test",
        sourceType: "test",
        url: "https://example.test/query",
        queryParams: { limit: 2 },
        license: "Test licence",
      },
    ]);
    expect(again?.id).toBe(source.id);
    expect(again?.name).toBe("Renamed");
    expect(again?.queryParams).toEqual({ limit: 2 });
    expect(again?.license).toBe("Test licence");
  });

  it("skips a revision it already has and keeps a revised event as a new row", async () => {
    const db = createDb();
    const source = await makeSource();

    expect(await insertDisasterItems(db, [item(source.id)])).toEqual({ insertedCount: 1, duplicateCount: 0 });
    // The same revision again (an overlapping look-back window).
    expect(await insertDisasterItems(db, [item(source.id)])).toEqual({ insertedCount: 0, duplicateCount: 1 });
    // The provider revised the event: a later updated time, a new magnitude.
    expect(
      await insertDisasterItems(db, [
        item(source.id, { sourceUpdatedAt: new Date("2026-10-30T11:00:00Z"), magnitude: 4.4, contentHash: "h2" }),
      ]),
    ).toEqual({ insertedCount: 1, duplicateCount: 0 });

    const rows = await db.select().from(items).where(eq(items.sourceId, source.id));
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.magnitude).sort()).toEqual([4, 4.4]);
  });

  it("does not collapse independent events, and tolerates a repeated row in one batch", async () => {
    const db = createDb();
    const source = await makeSource();
    const result = await insertDisasterItems(db, [
      item(source.id, { externalId: "a" }),
      item(source.id, { externalId: "a" }),
      item(source.id, { externalId: "b" }),
    ]);
    expect(result.insertedCount).toBe(2);
    expect(result.duplicateCount).toBe(1);
  });

  it("records a fetch", async () => {
    const db = createDb();
    const source = await makeSource();
    const now = new Date();
    await recordDisasterFetch(db, {
      sourceId: source.id,
      startedAt: now,
      finishedAt: now,
      durationMs: 5,
      httpStatus: 200,
      success: true,
      itemsFound: 3,
      itemsInserted: 2,
      itemsDuplicate: 1,
    });
    const rows = await db.select().from(fetches).where(eq(fetches.sourceId, source.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ success: true, itemsFound: 3, itemsInserted: 2, itemsDuplicate: 1 });
  });
});
