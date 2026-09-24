import { Hono } from "hono";
import { z } from "zod";
import { createDb, insertLogEntries } from "@desh-monitor/db";
import { checkRateLimit, createRedis } from "@desh-monitor/redis";
import type { AppEnv } from "../types";
import { getRequestMeta } from "../lib/requestMeta";

const MAX_CONTEXT_CHARS = 4000;
// A reported timestamp is trusted only within this distance of now.
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;
const BATCHES_PER_MINUTE_PER_IP = 20;

const entrySchema = z.object({
  level: z.enum(["warn", "error"]),
  message: z.string().trim().min(1).max(500),
  timestamp: z.string().datetime().optional(),
  // Where in the web app it happened: a visitor's browser or its server.
  source: z.enum(["browser", "server"]),
  context: z
    .record(z.unknown())
    .optional()
    .refine((context) => !context || JSON.stringify(context).length <= MAX_CONTEXT_CHARS, "context too large"),
});

const bodySchema = z.object({ entries: z.array(entrySchema).min(1).max(20) });

// Public: the web app reports its warnings and errors here (browsers can't
// reach the database, and the web app never does — see CLAUDE.md). Stored
// as app "web" without the reporter's IP, cookies or visitor id: purely
// diagnostic data.
export const logRoutes = new Hono<AppEnv>();

logRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const { ip } = getRequestMeta(c);
  const redis = createRedis({ url: c.env.UPSTASH_REDIS_REST_URL, token: c.env.UPSTASH_REDIS_REST_TOKEN });
  const allowed = await checkRateLimit(redis, `logs:${ip ?? "unknown"}`, BATCHES_PER_MINUTE_PER_IP, 60);
  if (!allowed) {
    return c.json({ error: "rate_limited" }, 429);
  }

  const now = Date.now();
  await insertLogEntries(
    createDb(c.env.DATABASE_URL),
    parsed.data.entries.map((entry) => {
      const reported = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
      const loggedAt = Math.abs(reported - now) <= MAX_CLOCK_SKEW_MS ? new Date(reported) : new Date(now);
      return {
        loggedAt,
        level: entry.level,
        app: "web",
        message: entry.message,
        context: { ...entry.context, source: entry.source },
      };
    }),
  );

  return c.json({ ok: true });
});
