import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const rawDisasterSchema = pgSchema("raw_disaster");

// One row per upstream feed or query. The licence and attribution the
// provider asks for are kept next to the data they apply to.
export const sources = rawDisasterSchema.table("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  sourceType: text("source_type").notNull(),
  url: text("url").notNull(),
  // How the query is built (region bounds, minimum magnitude, look-back
  // window, page size) — the source's own parameters, not our inference.
  queryParams: jsonb("query_params").notNull(),
  license: text("license").notNull(),
  attribution: text("attribution"),
  termsUrl: text("terms_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Hazards exactly as a provider reports them. Providers revise events
// (magnitude, location, review status), so every revision is its own row,
// keyed by the provider's own "last updated" time; the current picture of an
// event is its row with the latest source_updated_at. Nothing is overwritten.
export const items = rawDisasterSchema.table(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    externalId: text("external_id").notNull(),
    // When the provider last revised this event (not when we fetched it).
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }).notNull(),
    // When the hazard happened, per the provider.
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    // The provider's own event type, e.g. "earthquake", "explosion".
    hazardType: text("hazard_type").notNull(),
    title: text("title").notNull(),
    // The provider's description of the location, e.g. "5 km N of Bhuj, India".
    place: text("place"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    depthKm: doublePrecision("depth_km"),
    magnitude: doublePrecision("magnitude"),
    magnitudeType: text("magnitude_type"),
    // The provider's review state ("automatic", "reviewed", ...).
    sourceStatus: text("source_status"),
    // The provider's own alert level, if it assigns one.
    sourceAlertLevel: text("source_alert_level"),
    tsunamiFlag: boolean("tsunami_flag"),
    significance: integer("significance"),
    feltReports: integer("felt_reports"),
    url: text("url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    contentHash: text("content_hash").notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("items_source_id_external_id_updated_key").on(table.sourceId, table.externalId, table.sourceUpdatedAt),
    index("items_occurred_at_idx").on(table.occurredAt),
    index("items_source_id_external_id_idx").on(table.sourceId, table.externalId),
  ],
);

export const fetches = rawDisasterSchema.table("fetches", {
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
