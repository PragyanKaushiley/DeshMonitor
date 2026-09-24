import { Hono } from "hono";
import { z } from "zod";
import { createDb, getOrCreateVisitor, linkVisitorToUser, recordVisit } from "@desh-monitor/db";
import { checkRateLimit, createRedis, getSession } from "@desh-monitor/redis";
import type { Bindings } from "../types";
import { getSessionToken, getVisitorId, setVisitorCookie } from "../lib/cookies";
import { getRequestMeta } from "../lib/requestMeta";

const optionalText = (max: number) => z.string().trim().max(max).optional();

const visitSchema = z.object({
  path: z.string().trim().startsWith("/").max(512),
  referrer: optionalText(1024),
  consentVersion: z.string().trim().min(1).max(32),
  utm: z
    .object({
      source: optionalText(128),
      medium: optionalText(128),
      campaign: optionalText(128),
      term: optionalText(128),
      content: optionalText(128),
    })
    .optional(),
});

const VISITS_PER_MINUTE_PER_IP = 60;

// Public: records a landing-page visit. The web app only calls this after the
// visitor has accepted the consent banner, and it sends the consent version,
// which is stored on the visitor.
export const visitRoutes = new Hono<{ Bindings: Bindings }>();

visitRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = visitSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_input" }, 400);
  }

  const context = getRequestMeta(c);
  const redis = createRedis({ url: c.env.UPSTASH_REDIS_REST_URL, token: c.env.UPSTASH_REDIS_REST_TOKEN });
  const allowed = await checkRateLimit(redis, `visits:${context.ip ?? "unknown"}`, VISITS_PER_MINUTE_PER_IP, 60);
  if (!allowed) {
    return c.json({ error: "rate_limited" }, 429);
  }

  const db = createDb(c.env.DATABASE_URL);
  const visitor = await getOrCreateVisitor(db, {
    id: getVisitorId(c),
    consentVersion: parsed.data.consentVersion,
  });
  if (visitor.created) setVisitorCookie(c, visitor.id);

  const utm = parsed.data.utm;
  await recordVisit(db, {
    visitorId: visitor.id,
    landingPath: parsed.data.path,
    referrer: parsed.data.referrer || null,
    utmSource: utm?.source || null,
    utmMedium: utm?.medium || null,
    utmCampaign: utm?.campaign || null,
    utmTerm: utm?.term || null,
    utmContent: utm?.content || null,
    context,
  });

  // Logged-in browser: attribute this visitor's visits to the account.
  const token = getSessionToken(c);
  if (token) {
    const session = await getSession(redis, token);
    if (session) await linkVisitorToUser(db, visitor.id, session.userId);
  }

  return c.json({ ok: true });
});
