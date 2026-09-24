import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { Database } from "../client";
import { authSessions, visitorSessions, visitors } from "../schema/app";

// A visit continues while requests arrive within this window of each other.
export const VISIT_IDLE_WINDOW_MS = 30 * 60 * 1000;

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
  country: string | null;
  region: string | null;
  regionCode: string | null;
  city: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  continent: string | null;
  asn: number | null;
  asOrganization: string | null;
  colo: string | null;
  cf: unknown;
}

export interface CreateAuthSessionInput {
  userId: string;
  tokenHash: string;
  context: RequestContext;
}

export async function createAuthSession(db: Database, input: CreateAuthSessionInput): Promise<string> {
  const [row] = await db
    .insert(authSessions)
    .values({ userId: input.userId, tokenHash: input.tokenHash, ...input.context })
    .returning({ id: authSessions.id });
  if (!row) throw new Error("failed to create auth session");
  return row.id;
}

export async function endAuthSession(db: Database, tokenHash: string): Promise<void> {
  await db
    .update(authSessions)
    .set({ endedAt: new Date() })
    .where(and(eq(authSessions.tokenHash, tokenHash), sql`${authSessions.endedAt} is null`));
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  createdAt: Date;
  endedAt: Date | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
}

export async function getAuthSessionByTokenHash(db: Database, tokenHash: string): Promise<AuthSessionRecord | null> {
  const [row] = await db
    .select({
      id: authSessions.id,
      userId: authSessions.userId,
      createdAt: authSessions.createdAt,
      endedAt: authSessions.endedAt,
      ip: authSessions.ip,
      country: authSessions.country,
      city: authSessions.city,
      userAgent: authSessions.userAgent,
    })
    .from(authSessions)
    .where(eq(authSessions.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

export interface VisitorSessionRecord {
  id: string;
  startedAt: Date;
  lastSeenAt: Date;
  pageViews: number;
  landingPath: string;
  utmSource: string | null;
  utmCampaign: string | null;
  ip: string | null;
  country: string | null;
}

export async function listVisitorSessions(db: Database, visitorId: string): Promise<VisitorSessionRecord[]> {
  return db
    .select({
      id: visitorSessions.id,
      startedAt: visitorSessions.startedAt,
      lastSeenAt: visitorSessions.lastSeenAt,
      pageViews: visitorSessions.pageViews,
      landingPath: visitorSessions.landingPath,
      utmSource: visitorSessions.utmSource,
      utmCampaign: visitorSessions.utmCampaign,
      ip: visitorSessions.ip,
      country: visitorSessions.country,
    })
    .from(visitorSessions)
    .where(eq(visitorSessions.visitorId, visitorId))
    .orderBy(visitorSessions.startedAt);
}

export interface VisitorRecord {
  id: string;
  userId: string | null;
  consentVersion: string;
}

export async function getVisitor(db: Database, id: string): Promise<VisitorRecord | null> {
  const [row] = await db
    .select({ id: visitors.id, userId: visitors.userId, consentVersion: visitors.consentVersion })
    .from(visitors)
    .where(eq(visitors.id, id))
    .limit(1);
  return row ?? null;
}

// Returns the existing visitor (refreshing its last-seen time and consent
// version) or creates a new one when the id is missing or unknown.
export async function getOrCreateVisitor(
  db: Database,
  input: { id: string | null; consentVersion: string; now?: Date },
): Promise<{ id: string; created: boolean }> {
  const now = input.now ?? new Date();
  if (input.id) {
    const [updated] = await db
      .update(visitors)
      .set({ lastSeenAt: now, consentVersion: input.consentVersion })
      .where(eq(visitors.id, input.id))
      .returning({ id: visitors.id });
    if (updated) return { id: updated.id, created: false };
  }
  const [created] = await db
    .insert(visitors)
    .values({ firstSeenAt: now, lastSeenAt: now, consentVersion: input.consentVersion, consentGivenAt: now })
    .returning({ id: visitors.id });
  if (!created) throw new Error("failed to create visitor");
  return { id: created.id, created: true };
}

export async function linkVisitorToUser(db: Database, visitorId: string, userId: string): Promise<void> {
  await db.update(visitors).set({ userId }).where(eq(visitors.id, visitorId));
}

export interface VisitInput {
  visitorId: string;
  landingPath: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  context: RequestContext;
  now?: Date;
}

const UTM_FIELDS = ["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"] as const;

// Continues the visitor's latest session if it was active within the idle
// window (counting another page view); otherwise starts a new session, which
// keeps the landing path, referrer and UTM tags of that first request.
// As in Google Analytics, arriving with *different* campaign (UTM) tags also
// starts a new session — otherwise a tagged link followed mid-visit (e.g. the
// landing page's CTA) would never be attributed.
export async function recordVisit(db: Database, input: VisitInput): Promise<{ sessionId: string; isNew: boolean }> {
  const now = input.now ?? new Date();
  const cutoff = new Date(now.getTime() - VISIT_IDLE_WINDOW_MS);

  const [active] = await db
    .select({
      id: visitorSessions.id,
      utmSource: visitorSessions.utmSource,
      utmMedium: visitorSessions.utmMedium,
      utmCampaign: visitorSessions.utmCampaign,
      utmTerm: visitorSessions.utmTerm,
      utmContent: visitorSessions.utmContent,
    })
    .from(visitorSessions)
    .where(and(eq(visitorSessions.visitorId, input.visitorId), gt(visitorSessions.lastSeenAt, cutoff)))
    .orderBy(desc(visitorSessions.lastSeenAt))
    .limit(1);

  const hasUtm = UTM_FIELDS.some((field) => input[field] !== null);
  const newCampaign = active !== undefined && hasUtm && UTM_FIELDS.some((field) => input[field] !== active[field]);

  if (active && !newCampaign) {
    await db
      .update(visitorSessions)
      .set({ lastSeenAt: now, pageViews: sql`${visitorSessions.pageViews} + 1` })
      .where(eq(visitorSessions.id, active.id));
    return { sessionId: active.id, isNew: false };
  }

  const [created] = await db
    .insert(visitorSessions)
    .values({
      visitorId: input.visitorId,
      startedAt: now,
      lastSeenAt: now,
      landingPath: input.landingPath,
      referrer: input.referrer,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmTerm: input.utmTerm,
      utmContent: input.utmContent,
      ...input.context,
    })
    .returning({ id: visitorSessions.id });
  if (!created) throw new Error("failed to create visitor session");
  return { sessionId: created.id, isNew: true };
}
