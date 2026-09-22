import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Bindings } from "../types";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function setSessionCookie(c: Context<{ Bindings: Bindings }>, token: string): void {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
  });
}

export function clearSessionCookie(c: Context<{ Bindings: Bindings }>): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
    ...(c.env.COOKIE_DOMAIN ? { domain: c.env.COOKIE_DOMAIN } : {}),
  });
}

export function getSessionToken(c: Context<{ Bindings: Bindings }>): string | undefined {
  return getCookie(c, SESSION_COOKIE_NAME);
}
