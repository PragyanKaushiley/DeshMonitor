import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb } from "../client";
import { createUser, deleteUser } from "./users";
import {
  VISIT_IDLE_WINDOW_MS,
  createAuthSession,
  deleteVisitor,
  endAuthSession,
  getAuthSessionByTokenHash,
  getOrCreateVisitor,
  getVisitor,
  linkVisitorToUser,
  listVisitorSessions,
  recordVisit,
  type RequestContext,
} from "./sessions";

loadDotenv();
const hasDatabase = Boolean(process.env.DATABASE_URL);

const context: RequestContext = {
  ip: "203.0.113.9",
  userAgent: "vitest",
  acceptLanguage: "en-IN",
  country: "IN",
  region: "Karnataka",
  regionCode: "KA",
  city: "Bengaluru",
  postalCode: "560001",
  latitude: 12.97,
  longitude: 77.59,
  timezone: "Asia/Kolkata",
  continent: "AS",
  asn: 24560,
  asOrganization: "Airtel",
  colo: "BLR",
  cf: { country: "IN", city: "Bengaluru" },
};

function visit(visitorId: string, now: Date, overrides: { utmCampaign?: string; landingPath?: string } = {}) {
  return {
    visitorId,
    landingPath: overrides.landingPath ?? "/",
    referrer: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: overrides.utmCampaign ?? null,
    utmTerm: null,
    utmContent: null,
    context,
    now,
  };
}

describe.skipIf(!hasDatabase)("sessions repository (integration)", () => {
  const createdVisitorIds: string[] = [];
  const createdUserIds: string[] = [];
  afterAll(async () => {
    const db = createDb();
    for (const id of createdVisitorIds) await deleteVisitor(db, id);
    for (const id of createdUserIds) await deleteUser(db, id);
  });

  async function newVisitor(db: ReturnType<typeof createDb>) {
    const visitor = await getOrCreateVisitor(db, { id: null, consentVersion: "1" });
    createdVisitorIds.push(visitor.id);
    return visitor;
  }

  it("continues a visit within the idle window and starts a new one after it", async () => {
    const db = createDb();
    const { id: visitorId, created } = await newVisitor(db);
    expect(created).toBe(true);

    const t0 = new Date();
    const first = await recordVisit(db, visit(visitorId, t0, { utmCampaign: "launch" }));
    expect(first.isNew).toBe(true);

    // Untagged follow-up within the window: same session, another page view.
    const withinWindow = new Date(t0.getTime() + VISIT_IDLE_WINDOW_MS - 60_000);
    const second = await recordVisit(db, visit(visitorId, withinWindow));
    expect(second).toEqual({ sessionId: first.sessionId, isNew: false });

    const afterIdle = new Date(withinWindow.getTime() + VISIT_IDLE_WINDOW_MS + 60_000);
    const third = await recordVisit(db, visit(visitorId, afterIdle));
    expect(third.isNew).toBe(true);

    const sessions = await listVisitorSessions(db, visitorId);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ pageViews: 2, utmCampaign: "launch", ip: "203.0.113.9", country: "IN" });
    expect(sessions[1]).toMatchObject({ pageViews: 1 });
  });

  it("starts a new session for different campaign tags, but not for the same ones", async () => {
    const db = createDb();
    const { id: visitorId } = await newVisitor(db);
    const t0 = new Date();

    const first = await recordVisit(db, visit(visitorId, t0, { utmCampaign: "launch" }));
    const sameTags = await recordVisit(db, visit(visitorId, new Date(t0.getTime() + 60_000), { utmCampaign: "launch" }));
    expect(sameTags).toEqual({ sessionId: first.sessionId, isNew: false });

    const otherTags = await recordVisit(
      db,
      visit(visitorId, new Date(t0.getTime() + 120_000), { utmCampaign: "enter_monitor", landingPath: "/monitor" }),
    );
    expect(otherTags.isNew).toBe(true);

    const sessions = await listVisitorSessions(db, visitorId);
    expect(sessions.map((s) => s.utmCampaign)).toEqual(["launch", "enter_monitor"]);
  });

  it("reuses a known visitor id and creates a new visitor for an unknown one", async () => {
    const db = createDb();
    const { id } = await newVisitor(db);
    await expect(getOrCreateVisitor(db, { id, consentVersion: "2" })).resolves.toEqual({ id, created: false });
    expect((await getVisitor(db, id))?.consentVersion).toBe("2");

    const unknown = await getOrCreateVisitor(db, { id: randomUUID(), consentVersion: "1" });
    createdVisitorIds.push(unknown.id);
    expect(unknown.created).toBe(true);
  });

  it("records a login session by token hash, links the visitor, and ends it", async () => {
    const db = createDb();
    const user = await createUser(db, { email: `sess-${randomUUID()}@example.com`, passwordHash: "x" });
    createdUserIds.push(user.id);
    const tokenHash = randomUUID().replace(/-/g, "");

    const authSessionId = await createAuthSession(db, { userId: user.id, tokenHash, context });
    const stored = await getAuthSessionByTokenHash(db, tokenHash);
    expect(stored).toMatchObject({ id: authSessionId, userId: user.id, ip: "203.0.113.9", city: "Bengaluru", endedAt: null });

    const { id: visitorId } = await newVisitor(db);
    await linkVisitorToUser(db, visitorId, user.id);
    expect((await getVisitor(db, visitorId))?.userId).toBe(user.id);

    await endAuthSession(db, tokenHash);
    expect((await getAuthSessionByTokenHash(db, tokenHash))?.endedAt).toBeInstanceOf(Date);
  });
});
