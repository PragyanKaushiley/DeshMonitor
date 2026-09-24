import { doublePrecision, index, integer, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const appSchema = pgSchema("app");

export const users = appSchema.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Request context captured at the Cloudflare edge (CF-Connecting-IP, request
// headers and `request.cf`). A fresh set of column builders per table — Drizzle
// builders can't be shared between tables. `cf` keeps the full object so
// fields not broken out here are still preserved.
function requestContextColumns() {
  return {
    ip: text("ip"),
    userAgent: text("user_agent"),
    acceptLanguage: text("accept_language"),
    country: text("country"),
    region: text("region"),
    regionCode: text("region_code"),
    city: text("city"),
    postalCode: text("postal_code"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    timezone: text("timezone"),
    continent: text("continent"),
    asn: integer("asn"),
    asOrganization: text("as_organization"),
    colo: text("colo"),
    cf: jsonb("cf"),
  };
}

// Durable record of login sessions. Redis stays the source of truth for which
// sessions are active; this is the history (who logged in from where, when).
export const authSessions = appSchema.table(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // SHA-256 of the session token — the raw token is never stored.
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...requestContextColumns(),
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);

// One row per anonymous browser, identified by the long-lived `dm_vid` cookie.
// Only created after the visitor accepts the consent banner.
export const visitors = appSchema.table("visitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  // Set when this browser signs up or logs in, linking its earlier visits.
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  consentVersion: text("consent_version").notNull(),
  consentGivenAt: timestamp("consent_given_at", { withTimezone: true }).notNull(),
});

// One row per visit; a visit continues while requests keep arriving within
// 30 minutes of each other (see recordVisit).
export const visitorSessions = appSchema.table(
  "visitor_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => visitors.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    pageViews: integer("page_views").notNull().default(1),
    landingPath: text("landing_path").notNull(),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),
    ...requestContextColumns(),
  },
  (table) => [
    index("visitor_sessions_visitor_id_last_seen_at_idx").on(table.visitorId, table.lastSeenAt),
    index("visitor_sessions_started_at_idx").on(table.startedAt),
    index("visitor_sessions_utm_campaign_idx").on(table.utmCampaign),
  ],
);
