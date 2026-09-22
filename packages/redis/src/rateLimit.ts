import type { Redis } from "@upstash/redis";

export async function checkRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const rateLimitKey = `ratelimit:${key}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) {
    await redis.expire(rateLimitKey, windowSeconds);
  }
  return count <= limit;
}
