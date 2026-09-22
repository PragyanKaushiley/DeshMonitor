import type { Redis } from "@upstash/redis";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface SessionData {
  userId: string;
}

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

export async function createSession(redis: Redis, userId: string): Promise<string> {
  const token = generateToken();
  const data: SessionData = { userId };
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
