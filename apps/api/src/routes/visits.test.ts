import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import {
  createDb,
  deleteUser,
  deleteVisitor,
  getAuthSessionByTokenHash,
  getVisitor,
  listVisitorSessions,
} from "@desh-monitor/db";
import app from "../index";
import { sha256Hex } from "../lib/requestMeta";
import type { Bindings } from "../types";

// Integration test against real Neon + Upstash, skipped without credentials
// (same gated pattern as src/index.test.ts).
loadDotenv();
const hasCredentials = Boolean(
  process.env.DATABASE_URL && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const WEB_ORIGIN = "http://localhost:3000";

function testEnv(): Bindings {
  return {
    DATABASE_URL: process.env.DATABASE_URL as string,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL as string,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    WEB_APP_ORIGIN: WEB_ORIGIN,
  };
}

function cookieValue(res: Response, name: string): string | null {
  const match = (res.headers.get("set-cookie") ?? "").match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? null;
}

// A unique IP per test keeps the per-IP rate limit from leaking between runs.
function headers(extra: Record<string, string> = {}) {
  return {
    "content-type": "application/json",
    origin: WEB_ORIGIN,
    "cf-connecting-ip": `198.51.100.${Math.floor(Math.random() * 250) + 1}-${randomUUID().slice(0, 8)}`,
    ...extra,
  };
}

const visitBody = {
  path: "/",
  referrer: "https://example.com/post",
  consentVersion: "1",
  utm: { source: "newsletter", medium: "email", campaign: "launch" },
};

describe.skipIf(!hasCredentials)("POST /visits (integration)", () => {
  const createdVisitorIds: string[] = [];
  const createdUserIds: string[] = [];
  afterAll(async () => {
    const db = createDb(testEnv().DATABASE_URL);
    for (const id of createdVisitorIds) await deleteVisitor(db, id);
    for (const id of createdUserIds) await deleteUser(db, id);
  });

  it("creates a visitor + session, then continues the same session for the same browser", async () => {
    const first = await app.request(
      "/visits",
      { method: "POST", headers: headers(), body: JSON.stringify(visitBody) },
      testEnv(),
    );
    expect(first.status).toBe(200);
    const visitorId = cookieValue(first, "dm_vid");
    expect(visitorId).toMatch(/^[0-9a-f-]{36}$/);
    createdVisitorIds.push(visitorId as string);

    const second = await app.request(
      "/visits",
      {
        method: "POST",
        headers: headers({ cookie: `dm_vid=${visitorId}` }),
        body: JSON.stringify({ path: "/monitor", consentVersion: "1" }),
      },
      testEnv(),
    );
    expect(second.status).toBe(200);
    // Known visitor: no new cookie issued.
    expect(cookieValue(second, "dm_vid")).toBeNull();

    const sessions = await listVisitorSessions(createDb(testEnv().DATABASE_URL), visitorId as string);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ pageViews: 2, landingPath: "/", utmSource: "newsletter", utmCampaign: "launch" });
  });

  it("rejects a malformed body", async () => {
    const res = await app.request(
      "/visits",
      { method: "POST", headers: headers(), body: JSON.stringify({ path: "no-leading-slash", consentVersion: "1" }) },
      testEnv(),
    );
    expect(res.status).toBe(400);
  });

  it("records the login session with its IP, links the visitor on signup, and ends it on logout", async () => {
    const visit = await app.request(
      "/visits",
      { method: "POST", headers: headers(), body: JSON.stringify(visitBody) },
      testEnv(),
    );
    const visitorId = cookieValue(visit, "dm_vid") as string;
    createdVisitorIds.push(visitorId);

    const signup = await app.request(
      "/auth/signup",
      {
        method: "POST",
        headers: headers({ cookie: `dm_vid=${visitorId}`, "cf-connecting-ip": "203.0.113.42" }),
        body: JSON.stringify({ email: `visit-${randomUUID()}@example.com`, password: "correct horse battery staple" }),
      },
      testEnv(),
    );
    expect(signup.status).toBe(201);
    const token = cookieValue(signup, "session") as string;
    const { user } = (await signup.json()) as { user: { id: string } };
    createdUserIds.push(user.id);

    const db = createDb(testEnv().DATABASE_URL);
    const tokenHash = await sha256Hex(token);
    expect(await getAuthSessionByTokenHash(db, tokenHash)).toMatchObject({ userId: user.id, ip: "203.0.113.42", endedAt: null });
    expect((await getVisitor(db, visitorId))?.userId).toBe(user.id);

    const logout = await app.request(
      "/auth/logout",
      { method: "POST", headers: headers({ cookie: `session=${token}` }) },
      testEnv(),
    );
    expect(logout.status).toBe(200);
    expect((await getAuthSessionByTokenHash(db, tokenHash))?.endedAt).toBeInstanceOf(Date);
  });
});
