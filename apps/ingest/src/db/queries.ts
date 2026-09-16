import type { Category, Language, State } from "@deshmonitor/shared-types";
import { getPool } from "./pool.js";

export interface RawNewsItemInput {
  contentHash: string;
  sourceId: string;
  category: Category;
  language: Language;
  state: State | null;
  title: string;
  url: string;
  publishedAt: string | null;
  imageUrl: string | null;
  rawPayload: unknown;
}

const RAW_ITEM_COLUMNS = [
  "content_hash",
  "source_id",
  "category",
  "language",
  "state",
  "title",
  "url",
  "image_url",
  "published_at",
  "raw_payload",
] as const;

/**
 * Batch-insert raw items in one round trip (performance guideline: batch
 * writes, never row-by-row). Idempotent via `ON CONFLICT (content_hash)
 * DO NOTHING` — safe to re-run the same batch twice, which matters
 * because a cron run can retry or overlap.
 *
 * The query string is built dynamically only to compute how many
 * `($1,$2,...)` placeholder groups are needed for this batch's size —
 * every actual value still flows through as a bound parameter, never
 * interpolated into the SQL text (backend-development-guidelines §1).
 */
export async function insertRawItems(items: RawNewsItemInput[]): Promise<number> {
  if (items.length === 0) return 0;

  const values: unknown[] = [];
  const placeholderGroups: string[] = [];

  items.forEach((item, index) => {
    const base = index * RAW_ITEM_COLUMNS.length;
    const placeholders = RAW_ITEM_COLUMNS.map((_, col) => `$${base + col + 1}`);
    placeholderGroups.push(`(${placeholders.join(", ")})`);
    values.push(
      item.contentHash,
      item.sourceId,
      item.category,
      item.language,
      item.state,
      item.title,
      item.url,
      item.imageUrl,
      item.publishedAt,
      JSON.stringify(item.rawPayload),
    );
  });

  const sql = `
    INSERT INTO raw.news_items (${RAW_ITEM_COLUMNS.join(", ")})
    VALUES ${placeholderGroups.join(", ")}
    ON CONFLICT (content_hash) DO NOTHING
  `;

  const result = await getPool().query(sql, values);
  return result.rowCount ?? 0;
}

export type SourceStatus = "OK" | "EMPTY" | "ERROR";

/** Upsert this run's freshness record for one source — idempotent by
 * design (`ON CONFLICT ... DO UPDATE`), so a retried or overlapping run
 * just overwrites with its own latest observation. */
export async function upsertSourceMeta(
  sourceId: string,
  fetchedAt: Date,
  recordCount: number,
  status: SourceStatus,
): Promise<void> {
  await getPool().query(
    `INSERT INTO raw.source_meta (source_id, fetched_at, record_count, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (source_id) DO UPDATE
       SET fetched_at = EXCLUDED.fetched_at,
           record_count = EXCLUDED.record_count,
           status = EXCLUDED.status`,
    [sourceId, fetchedAt.toISOString(), recordCount, status],
  );
}

/**
 * Copy new rows from raw.news_items into public.news_items — run once at
 * the end of every ingestion pass. Idempotent (`ON CONFLICT DO NOTHING`
 * plus an explicit anti-join), so re-running it never double-inserts.
 */
export async function transformRawToPublic(): Promise<number> {
  const result = await getPool().query(`
    INSERT INTO public.news_items
      (content_hash, source_id, category, language, state, title, url, image_url, published_at)
    SELECT content_hash, source_id, category, language, state, title, url, image_url, published_at
    FROM raw.news_items
    WHERE content_hash NOT IN (SELECT content_hash FROM public.news_items)
    ON CONFLICT (content_hash) DO NOTHING
  `);
  return result.rowCount ?? 0;
}

/** Best-effort exception log — see logger.ts, which is the only caller
 * and which guarantees a failure here never masks the original error. */
export async function insertLog(
  level: "error" | "warn",
  message: string,
  stack: string | null,
  context: unknown,
): Promise<void> {
  await getPool().query(
    `INSERT INTO public.logs (source, level, message, stack, context)
     VALUES ('ingest', $1, $2, $3, $4)`,
    [level, message, stack, context ? JSON.stringify(context) : null],
  );
}
