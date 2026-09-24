import { describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { app } from "../index";
import type { Bindings } from "../types";

loadDotenv();
const hasCredentials = Boolean(
  process.env.DATABASE_URL && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

describe("GET /health", () => {
  it("reports 503 and which dependency failed, without error details", async () => {
    const env: Bindings = {
      DATABASE_URL: "postgres://user:pass@127.0.0.1:1/none",
      UPSTASH_REDIS_REST_URL: "http://127.0.0.1:1",
      UPSTASH_REDIS_REST_TOKEN: "unused",
      WEB_APP_ORIGIN: "http://localhost:3000",
    };
    const res = await app.request("/health", {}, env);
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { status: string; checks: Record<string, { ok: boolean }> };
    expect(body.status).toBe("degraded");
    expect(body.checks.database?.ok).toBe(false);
    expect(body.checks.redis?.ok).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/pass|127\.0\.0\.1/);
  });

  it.skipIf(!hasCredentials)("reports 200 when the database and Redis are reachable", async () => {
    const env: Bindings = {
      DATABASE_URL: process.env.DATABASE_URL as string,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL as string,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN as string,
      WEB_APP_ORIGIN: "http://localhost:3000",
    };
    const res = await app.request("/health", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", checks: { database: { ok: true }, redis: { ok: true } } });
  });
});
