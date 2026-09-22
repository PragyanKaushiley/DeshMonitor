import { eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { fetches, items, sources } from "../schema/rawNews";

export interface SourceSeedInput {
  name: string;
  publisher: string;
  sourceType: string;
  url: string;
  category?: string | null;
}

export interface SourceRecord {
  id: string;
  name: string;
  publisher: string;
  sourceType: string;
  url: string;
  category: string | null;
  isActive: boolean;
}

export interface NewsItemInput {
  sourceId: string;
  externalId: string;
  url: string;
  title: string;
  description?: string | null;
  author?: string | null;
  publishedAt?: Date | null;
  sourceCategories?: string[] | null;
  contentHash: string;
  rawPayload: unknown;
}

export interface FetchRecordInput {
  sourceId: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  httpStatus?: number | null;
  success: boolean;
  itemsFound: number;
  itemsInserted: number;
  itemsDuplicate: number;
  errorMessage?: string | null;
}

export async function upsertSources(db: Database, rows: SourceSeedInput[]): Promise<SourceRecord[]> {
  if (rows.length === 0) return [];

  return db
    .insert(sources)
    .values(rows)
    .onConflictDoUpdate({
      target: sources.url,
      set: {
        name: sql`excluded.name`,
        publisher: sql`excluded.publisher`,
        sourceType: sql`excluded.source_type`,
        category: sql`excluded.category`,
        updatedAt: sql`now()`,
      },
    })
    .returning();
}

export async function getActiveSources(db: Database): Promise<SourceRecord[]> {
  return db.select().from(sources).where(eq(sources.isActive, true));
}

export async function insertItems(
  db: Database,
  rows: NewsItemInput[],
): Promise<{ insertedCount: number; duplicateCount: number }> {
  if (rows.length === 0) return { insertedCount: 0, duplicateCount: 0 };

  const inserted = await db
    .insert(items)
    .values(rows)
    .onConflictDoNothing({ target: [items.sourceId, items.externalId] })
    .returning({ id: items.id });

  return {
    insertedCount: inserted.length,
    duplicateCount: rows.length - inserted.length,
  };
}

export async function recordFetch(db: Database, input: FetchRecordInput): Promise<void> {
  await db.insert(fetches).values(input);
}
