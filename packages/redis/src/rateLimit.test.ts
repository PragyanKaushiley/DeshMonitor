import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createRedis } from "./client";
import { checkRateLimit } from "./rateLimit";

loadDotenv();
const hasRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

describe.skipIf(!hasRedis)("checkRateLimit (integration)", () => {
  it("allows requests under the limit and blocks once it's exceeded", async () => {
    const redis = createRedis();
    const key = `test:${randomUUID()}`;

    expect(await checkRateLimit(redis, key, 3, 60)).toBe(true);
    expect(await checkRateLimit(redis, key, 3, 60)).toBe(true);
    expect(await checkRateLimit(redis, key, 3, 60)).toBe(true);
    expect(await checkRateLimit(redis, key, 3, 60)).toBe(false);
  });

  it("tracks separate keys independently", async () => {
    const redis = createRedis();
    const keyA = `test:${randomUUID()}`;
    const keyB = `test:${randomUUID()}`;

    expect(await checkRateLimit(redis, keyA, 1, 60)).toBe(true);
    expect(await checkRateLimit(redis, keyA, 1, 60)).toBe(false);
    expect(await checkRateLimit(redis, keyB, 1, 60)).toBe(true);
  });
});
