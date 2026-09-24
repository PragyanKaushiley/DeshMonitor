import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../types";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
  });
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
  });
}

export function getSessionToken(c: Context<AppEnv>): string | undefined {
  return getCookie(c, SESSION_COOKIE_NAME);
}

// Anonymous visitor id — only ever set after the visitor accepts the consent
// banner (see routes/visits.ts).
const VISITOR_COOKIE_NAME = "dm_vid";
const VISITOR_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getVisitorId(c: Context<AppEnv>): string | null {
  const value = getCookie(c, VISITOR_COOKIE_NAME);
  return value && UUID_PATTERN.test(value) ? value : null;
}

export function setVisitorCookie(c: Context<AppEnv>, visitorId: string): void {
  setCookie(c, VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: VISITOR_MAX_AGE_SECONDS,
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
  });
}
