import { errorFields } from "@desh-monitor/logger";
import { log } from "./log";

// Talks to the API's /auth routes. Every call sends cookies, since the
// session lives in an httpOnly cookie the browser can't read; the site and
// the API are the same site (deshmonitor.com / api.deshmonitor.com), so the
// SameSite=Lax cookie is sent with these requests.

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AuthUser {
  id: string;
  email: string;
}

// The API's own error codes, plus the two failures that never reach it.
export type AuthErrorCode =
  | "invalid_input"
  | "invalid_credentials"
  | "email_taken"
  | "rate_limited"
  | "network"
  | "server";

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: AuthErrorCode };

export interface Session {
  user: AuthUser | null;
  // ISO timestamp of when this login started; the session lasts 30 days from
  // it. Null when signed out, or for sessions predating this field.
  sessionStartedAt: string | null;
}

const SIGNED_OUT: Session = { user: null, sessionStartedAt: null };

const ERROR_CODES: ReadonlySet<string> = new Set([
  "invalid_input",
  "invalid_credentials",
  "email_taken",
  "rate_limited",
]);

async function post(path: string, body: unknown): Promise<AuthResult> {
  if (!API_URL) return { ok: false, error: "server" };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Offline, DNS, CORS — never the visitor's fault to explain in detail.
    log.warn("auth request failed", { ...errorFields(error), path });
    return { ok: false, error: "network" };
  }

  const payload = (await res.json().catch(() => null)) as
    | { user?: AuthUser; error?: string }
    | null;

  if (res.ok && payload?.user) return { ok: true, user: payload.user };

  const code = payload?.error;
  if (code && ERROR_CODES.has(code)) return { ok: false, error: code as AuthErrorCode };

  log.warn("auth request returned an unexpected response", { path, status: res.status, code });
  return { ok: false, error: "server" };
}

export function login(email: string, password: string): Promise<AuthResult> {
  return post("/auth/login", { email, password });
}

export function signup(email: string, password: string): Promise<AuthResult> {
  return post("/auth/signup", { email, password });
}

// Who is signed in, if anyone. A failure here is never shown to the visitor:
// the site treats it as signed out, so auth can't break the page.
export async function me(): Promise<Session> {
  if (!API_URL) return SIGNED_OUT;
  try {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
    if (!res.ok) {
      log.warn("auth check failed", { status: res.status });
      return SIGNED_OUT;
    }
    const payload = (await res.json()) as Partial<Session>;
    return { user: payload.user ?? null, sessionStartedAt: payload.sessionStartedAt ?? null };
  } catch (error) {
    log.warn("auth check failed", errorFields(error));
    return SIGNED_OUT;
  }
}

export async function logout(): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
  } catch (error) {
    // The cookie may outlive this, but the UI signs out either way.
    log.warn("logout request failed", errorFields(error));
  }
}

// Sessions run a fixed 30 days from login (they aren't extended by use).
const SESSION_DAYS = 30;

export function sessionEndsAt(startedAt: string | null): Date | null {
  if (!startedAt) return null;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return null;
  return new Date(started + SESSION_DAYS * 24 * 60 * 60 * 1000);
}
