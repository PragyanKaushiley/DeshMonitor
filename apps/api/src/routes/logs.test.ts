import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb, logsSchema } from "@desh-monitor/db";
import { app } from "../index";
import type { Bindings } from "../types";

loadDotenv();
const hasCredentials = Boolean(
  process.env.DATABASE_URL && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const WEB_ORIGIN = "http://localhost:3000";
const unusedEnv: Bindings = {
  DATABASE_URL: "unused",
  UPSTASH_REDIS_REST_URL: "unused",
  UPSTASH_REDIS_REST_TOKEN: "unused",
  WEB_APP_ORIGIN: WEB_ORIGIN,
};

function post(body: unknown, env: Bindings, ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}-${randomUUID().slice(0, 8)}`) {
  return app.request(
    "/logs",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: WEB_ORIGIN, "cf-connecting-ip": ip },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe("POST /logs validation", () => {
  it("rejects info-level entries (only warnings and errors are accepted)", async () => {
    const res = await post({ entries: [{ level: "info", message: "hi", source: "browser" }] }, unusedEnv);
    expect(res.status).toBe(400);
  });

  it("rejects oversized context and too many entries", async () => {
    const big = { level: "error", message: "x", source: "browser", context: { blob: "a".repeat(5000) } };
    expect((await post({ entries: [big] }, unusedEnv)).status).toBe(400);
    const many = Array.from({ length: 21 }, () => ({ level: "warn", message: "x", source: "browser" }));
    expect((await post({ entries: many }, unusedEnv)).status).toBe(400);
  });
});

describe.skipIf(!hasCredentials)("POST /logs (integration)", () => {
  const message = `test log ${randomUUID()}`;
  afterAll(async () => {
    await createDb().delete(logsSchema.entries).where(eq(logsSchema.entries.message, message));
  });

  it("stores web entries as app web, with their source and context", async () => {
    const env: Bindings = {
      DATABASE_URL: process.env.DATABASE_URL as string,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL as string,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN as string,
      WEB_APP_ORIGIN: WEB_ORIGIN,
    };
    const res = await post(
      { entries: [{ level: "error", message, source: "browser", context: { path: "/", app: "spoofed" } }] },
      env,
    );
    expect(res.status).toBe(200);

    const rows = await createDb().select().from(logsSchema.entries).where(eq(logsSchema.entries.message, message));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ app: "web", level: "error" });
    expect(rows[0]?.context).toMatchObject({ path: "/", source: "browser" });
  });
});
