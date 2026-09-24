import { Hono } from "hono";
import { createDb, pingDatabase } from "@desh-monitor/db";
import { errorFields } from "@desh-monitor/logger";
import { createRedis } from "@desh-monitor/redis";
import type { AppEnv } from "../types";

const CHECK_TIMEOUT_MS = 3000;

interface CheckResult {
  ok: boolean;
  ms: number;
}

async function timed(name: string, check: () => Promise<unknown>, onError: (name: string, error: unknown) => void): Promise<CheckResult> {
  const started = Date.now();
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${CHECK_TIMEOUT_MS}ms`)), CHECK_TIMEOUT_MS)),
    ]);
    return { ok: true, ms: Date.now() - started };
  } catch (error) {
    onError(name, error);
    return { ok: false, ms: Date.now() - started };
  }
}

// Public: is the API up and can it reach its dependencies? 200 when every
// check passes, 503 otherwise. Failure details go to the logs, not the
// response.
export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get("/", async (c) => {
  const logger = c.get("logger");
  const onError = (check: string, error: unknown) => logger.error("health check failed", { check, ...errorFields(error) });

  const [database, redis] = await Promise.all([
    timed("database", () => pingDatabase(createDb(c.env.DATABASE_URL)), onError),
    timed(
      "redis",
      () => createRedis({ url: c.env.UPSTASH_REDIS_REST_URL, token: c.env.UPSTASH_REDIS_REST_TOKEN }).ping(),
      onError,
    ),
  ]);

  const ok = database.ok && redis.ok;
  c.header("Cache-Control", "no-store");
  return c.json(
    { status: ok ? "ok" : "degraded", checks: { database, redis }, time: new Date().toISOString() },
    ok ? 200 : 503,
  );
});
