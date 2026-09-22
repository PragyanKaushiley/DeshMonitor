import { Redis } from "@upstash/redis";
import { loadEnv } from "@desh-monitor/config";

export interface RedisCredentials {
  url: string;
  token: string;
}

/**
 * `credentials` lets callers pass values explicitly — required in Cloudflare
 * Workers, which receive env vars/secrets via a per-request `env` binding,
 * not `process.env`. Falls back to `loadEnv()` (process.env) for Node
 * contexts (scripts, tests) where no explicit credentials are given.
 */
export function createRedis(credentials?: RedisCredentials): Redis {
  if (credentials) {
    return new Redis(credentials);
  }

  const env = loadEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      "Redis is not configured: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to use packages/redis.",
    );
  }

  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}
