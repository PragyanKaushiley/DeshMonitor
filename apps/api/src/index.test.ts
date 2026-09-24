import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb, deleteUser, getUserByEmail } from "@desh-monitor/db";
import app from "./index";
import type { Bindings } from "./types";

// Integration test against real Neon + Upstash. Skipped when credentials
// aren't configured, same gated pattern as packages/db's integration tests.
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

function extractSessionCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("expected a set-cookie header");
  const match = setCookie.match(/session=([^;]+)/);
  if (!match) throw new Error("expected a session cookie");
  return `session=${match[1]}`;
}

describe.skipIf(!hasCredentials)("apps/api auth routes (integration)", () => {
  // Accounts signed up here are deleted afterwards (their login-session
  // records go with them).
  const usedEmails: string[] = [];
  function testEmail() {
    const email = `test-${randomUUID()}@example.com`;
    usedEmails.push(email);
    return email;
  }
  afterAll(async () => {
    const db = createDb(testEnv().DATABASE_URL);
    for (const email of usedEmails) {
      const user = await getUserByEmail(db, email);
      if (user) await deleteUser(db, user.id);
    }
  });

  it("signup -> me -> logout -> me round trip", async () => {
    const email = testEmail();
    const password = "correct horse battery staple";

    const signupRes = await app.request(
      "/auth/signup",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_ORIGIN },
        body: JSON.stringify({ email, password }),
      },
      testEnv(),
    );
    expect(signupRes.status).toBe(201);
    const signupBody = (await signupRes.json()) as { user: { email: string } };
    expect(signupBody.user.email).toBe(email);
    const cookie = extractSessionCookie(signupRes);

    const meRes = await app.request(
      "/auth/me",
      { headers: { cookie, origin: WEB_ORIGIN } },
      testEnv(),
    );
    expect(meRes.status).toBe(200);
    const meBody = (await meRes.json()) as { user: { email: string } | null };
    expect(meBody.user?.email).toBe(email);

    const logoutRes = await app.request(
      "/auth/logout",
      { method: "POST", headers: { cookie, origin: WEB_ORIGIN } },
      testEnv(),
    );
    expect(logoutRes.status).toBe(200);

    const meAfterLogoutRes = await app.request(
      "/auth/me",
      { headers: { cookie, origin: WEB_ORIGIN } },
      testEnv(),
    );
    const meAfterLogoutBody = (await meAfterLogoutRes.json()) as { user: unknown };
    expect(meAfterLogoutBody.user).toBeNull();
  });

  it("GET /auth/me with no cookie returns 200 with a null user, not a 401", async () => {
    const res = await app.request("/auth/me", { headers: { origin: WEB_ORIGIN } }, testEnv());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: unknown };
    expect(body.user).toBeNull();
  });

  it("rejects signup with an already-used email", async () => {
    const email = testEmail();
    const password = "correct horse battery staple";

    await app.request(
      "/auth/signup",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_ORIGIN },
        body: JSON.stringify({ email, password }),
      },
      testEnv(),
    );

    const secondRes = await app.request(
      "/auth/signup",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_ORIGIN },
        body: JSON.stringify({ email, password }),
      },
      testEnv(),
    );
    expect(secondRes.status).toBe(409);
  });

  it("rejects login with a wrong password", async () => {
    const email = testEmail();
    await app.request(
      "/auth/signup",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_ORIGIN },
        body: JSON.stringify({ email, password: "correct horse battery staple" }),
      },
      testEnv(),
    );

    const loginRes = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_ORIGIN },
        body: JSON.stringify({ email, password: "wrong password" }),
      },
      testEnv(),
    );
    expect(loginRes.status).toBe(401);
  });
});

describe("CORS", () => {
  it("allows the configured web origin", async () => {
    const res = await app.request(
      "/",
      { headers: { origin: WEB_ORIGIN } },
      { DATABASE_URL: "unused", UPSTASH_REDIS_REST_URL: "unused", UPSTASH_REDIS_REST_TOKEN: "unused", WEB_APP_ORIGIN: WEB_ORIGIN },
    );
    expect(res.headers.get("access-control-allow-origin")).toBe(WEB_ORIGIN);
  });

  it("does not reflect a different origin", async () => {
    const res = await app.request(
      "/",
      { headers: { origin: "https://evil.example" } },
      { DATABASE_URL: "unused", UPSTASH_REDIS_REST_URL: "unused", UPSTASH_REDIS_REST_TOKEN: "unused", WEB_APP_ORIGIN: WEB_ORIGIN },
    );
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
