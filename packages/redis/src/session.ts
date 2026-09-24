import type { Redis } from "@upstash/redis";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface SessionData {
  userId: string;
  // Present on sessions created since login context was recorded; older
  // sessions still in Redis only carry userId.
  authSessionId?: string;
  createdAt?: string;
  ip?: string | null;
  country?: string | null;
  city?: string | null;
  userAgent?: string | null;
}

export type SessionMeta = Omit<SessionData, "userId">;

function sessionKey(token: string): string {
  return `session:${token}`;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newSessionToken(): string {
  return generateToken();
}

export async function createSession(redis: Redis, userId: string, meta: SessionMeta = {}): Promise<string> {
  return storeSession(redis, generateToken(), userId, meta);
}

// For callers that need the token before storing (e.g. to record its hash
// in the database first).
export async function storeSession(redis: Redis, token: string, userId: string, meta: SessionMeta = {}): Promise<string> {
  const data: SessionData = { userId, ...meta };
  await redis.set(sessionKey(token), data, { ex: SESSION_TTL_SECONDS });
  return token;
}

export async function getSession(redis: Redis, token: string): Promise<SessionData | null> {
  const data = await redis.get<SessionData>(sessionKey(token));
  return data ?? null;
}

export async function deleteSession(redis: Redis, token: string): Promise<void> {
  await redis.del(sessionKey(token));
}
