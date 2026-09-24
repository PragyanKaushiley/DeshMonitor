import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const rawNewsSchema = pgSchema("raw_news");

export const sources = rawNewsSchema.table("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  publisher: text("publisher").notNull(),
  sourceType: text("source_type").notNull().default("rss"),
  url: text("url").notNull().unique(),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const items = rawNewsSchema.table(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    author: text("author"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    sourceCategories: text("source_categories").array(),
    // Cover image URL exactly as the feed provides it (media:content,
    // media:thumbnail, an image enclosure, or an <img> in the description).
    imageUrl: text("image_url"),
    contentHash: text("content_hash").notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("items_source_id_external_id_key").on(table.sourceId, table.externalId)],
);

export const fetches = rawNewsSchema.table("fetches", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  httpStatus: integer("http_status"),
  success: boolean("success").notNull(),
  itemsFound: integer("items_found").notNull().default(0),
  itemsInserted: integer("items_inserted").notNull().default(0),
  itemsDuplicate: integer("items_duplicate").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
