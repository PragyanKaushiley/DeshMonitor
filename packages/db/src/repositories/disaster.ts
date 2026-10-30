import { eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { fetches, items, sources } from "../schema/rawDisaster";

export interface DisasterSourceInput {
  slug: string;
  name: string;
  provider: string;
  sourceType: string;
  url: string;
  queryParams: Record<string, unknown>;
  license: string;
  attribution?: string | null;
  termsUrl?: string | null;
}

export interface DisasterSourceRecord {
  id: string;
  slug: string;
  name: string;
  provider: string;
  sourceType: string;
  url: string;
  queryParams: unknown;
  license: string;
  attribution: string | null;
  termsUrl: string | null;
  isActive: boolean;
}

export interface DisasterItemInput {
  sourceId: string;
  externalId: string;
  sourceUpdatedAt: Date;
  occurredAt: Date;
  hazardType: string;
  title: string;
  place?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  depthKm?: number | null;
  magnitude?: number | null;
  magnitudeType?: string | null;
  sourceStatus?: string | null;
  sourceAlertLevel?: string | null;
  tsunamiFlag?: boolean | null;
  significance?: number | null;
  feltReports?: number | null;
  url?: string | null;
  contentHash: string;
  rawPayload: unknown;
}

export interface DisasterFetchInput {
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

export async function upsertDisasterSources(
  db: Database,
  rows: DisasterSourceInput[],
): Promise<DisasterSourceRecord[]> {
  if (rows.length === 0) return [];

  return db
    .insert(sources)
    .values(rows)
    .onConflictDoUpdate({
      target: sources.slug,
      set: {
        name: sql`excluded.name`,
        provider: sql`excluded.provider`,
        sourceType: sql`excluded.source_type`,
        url: sql`excluded.url`,
        queryParams: sql`excluded.query_params`,
        license: sql`excluded.license`,
        attribution: sql`excluded.attribution`,
        termsUrl: sql`excluded.terms_url`,
        updatedAt: sql`now()`,
      },
    })
    .returning();
}

export async function getActiveDisasterSources(db: Database): Promise<DisasterSourceRecord[]> {
  return db.select().from(sources).where(eq(sources.isActive, true));
}

// A revision the provider has already published (same event, same
// last-updated time) is a duplicate and is skipped; a revised event is a new
// row, so earlier versions are kept.
export async function insertDisasterItems(
  db: Database,
  rows: DisasterItemInput[],
): Promise<{ insertedCount: number; duplicateCount: number }> {
  if (rows.length === 0) return { insertedCount: 0, duplicateCount: 0 };

  const seen = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    const key = `${row.sourceId}\u0000${row.externalId}\u0000${row.sourceUpdatedAt.getTime()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const written = await db
    .insert(items)
    .values(uniqueRows)
    .onConflictDoNothing({ target: [items.sourceId, items.externalId, items.sourceUpdatedAt] })
    .returning({ id: items.id });

  return {
    insertedCount: written.length,
    duplicateCount: rows.length - written.length,
  };
}

export async function recordDisasterFetch(db: Database, input: DisasterFetchInput): Promise<void> {
  await db.insert(fetches).values(input);
}
