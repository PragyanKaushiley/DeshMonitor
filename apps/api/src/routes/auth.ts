import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  createAuthSession,
  createDb,
  createUser,
  endAuthSession,
  getUserByEmail,
  getUserById,
  linkVisitorToUser,
  type Database,
} from "@desh-monitor/db";
import { checkRateLimit, createRedis, deleteSession, getSession, newSessionToken, storeSession } from "@desh-monitor/redis";
import type { Bindings } from "../types";
import { clearSessionCookie, getSessionToken, getVisitorId, setSessionCookie } from "../lib/cookies";
import { hashPassword, verifyPassword } from "../lib/password";
import { getRequestMeta, sha256Hex } from "../lib/requestMeta";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

function toPublicUser(user: { id: string; email: string }) {
  return { id: user.id, email: user.email };
}

// Starts a login session: a durable record in Neon (by token hash, with the
// request's IP/location), the active session in Redis, the cookie, and — if
// this browser has an anonymous visitor id — links its earlier visits.
async function startSession(
  c: Context<{ Bindings: Bindings }>,
  db: Database,
  redis: ReturnType<typeof createRedis>,
  userId: string,
): Promise<void> {
  const token = newSessionToken();
  const context = getRequestMeta(c);
  const authSessionId = await createAuthSession(db, { userId, tokenHash: await sha256Hex(token), context });
  await storeSession(redis, token, userId, {
    authSessionId,
    createdAt: new Date().toISOString(),
    ip: context.ip,
    country: context.country,
    city: context.city,
    userAgent: context.userAgent,
  });
  setSessionCookie(c, token);

  const visitorId = getVisitorId(c);
  if (visitorId) await linkVisitorToUser(db, visitorId, userId);
}

export const authRoutes = new Hono<{ Bindings: Bindings }>();

authRoutes.post("/signup", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);
  const existing = await getUserByEmail(db, parsed.data.email);
  if (existing) {
    return c.json({ error: "email_taken" }, 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await createUser(db, { email: parsed.data.email, passwordHash });

  const redis = createRedis({ url: c.env.UPSTASH_REDIS_REST_URL, token: c.env.UPSTASH_REDIS_REST_TOKEN });
  await startSession(c, db, redis, user.id);

  return c.json({ user: toPublicUser(user) }, 201);
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const redis = createRedis({ url: c.env.UPSTASH_REDIS_REST_URL, token: c.env.UPSTASH_REDIS_REST_TOKEN });

  const clientIp = c.req.header("cf-connecting-ip") ?? "unknown";
  const allowed = await checkRateLimit(redis, `login:${parsed.data.email}:${clientIp}`, 10, 15 * 60);
  if (!allowed) {
    return c.json({ error: "rate_limited" }, 429);
  }

  const db = createDb(c.env.DATABASE_URL);
  const user = await getUserByEmail(db, parsed.data.email);

  // Always run verifyPassword, even with no user, against a fixed dummy hash
  // so failed logins take the same time whether or not the email exists —
  // avoids leaking account existence via response timing.
  const dummyHash = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? dummyHash);

  if (!user || !valid) {
    return c.json({ error: "invalid_credentials" }, 401);
  }

  await startSession(c, db, redis, user.id);

  return c.json({ user: toPublicUser(user) });
});

authRoutes.post("/logout", async (c) => {
  const token = getSessionToken(c);
  if (token) {
    const redis = createRedis({ url: c.env.UPSTASH_REDIS_REST_URL, token: c.env.UPSTASH_REDIS_REST_TOKEN });
    await deleteSession(redis, token);
    await endAuthSession(createDb(c.env.DATABASE_URL), await sha256Hex(token));
  }
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get("/me", async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ user: null });

  const redis = createRedis({ url: c.env.UPSTASH_REDIS_REST_URL, token: c.env.UPSTASH_REDIS_REST_TOKEN });
  const session = await getSession(redis, token);
  if (!session) return c.json({ user: null });

  const db = createDb(c.env.DATABASE_URL);
  const user = await getUserById(db, session.userId);
  if (!user) return c.json({ user: null });

  return c.json({ user: toPublicUser(user) });
});
