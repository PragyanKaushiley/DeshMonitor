import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createRedis } from "./client";
import { createSession, deleteSession, getSession } from "./session";

loadDotenv();
const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

describe.skipIf(!hasRedis)("session (integration)", () => {
  it("creates a session, reads it back, then deletes it", async () => {
    const redis = createRedis();
    const userId = randomUUID();

    const token = await createSession(redis, userId);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const session = await getSession(redis, token);
    expect(session?.userId).toBe(userId);

    await deleteSession(redis, token);
    const afterDelete = await getSession(redis, token);
    expect(afterDelete).toBeNull();
  });

  it("returns null for an unknown token", async () => {
    const redis = createRedis();
    const session = await getSession(redis, "not-a-real-token");
    expect(session).toBeNull();
  });

  it("generates a different token on each call", async () => {
    const redis = createRedis();
    const userId = randomUUID();
    const a = await createSession(redis, userId);
    const b = await createSession(redis, userId);
    expect(a).not.toBe(b);
  });
});
