import type { Context } from "hono";
import type { RequestContext } from "@desh-monitor/db";

function str(value: unknown, max = 256): string | null {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;
}

// Cloudflare sends latitude/longitude as strings and asn as a number.
function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// Client IP from CF-Connecting-IP (set by Cloudflare's edge — it can't be
// spoofed by the client there), headers, and the geolocation/network data
// Cloudflare attaches to every request as `request.cf`. Every field is
// nullable: `cf` is absent outside Workers (e.g. in tests).
export function buildRequestContext(headers: Headers, cf: Record<string, unknown> | undefined): RequestContext {
  const asn = num(cf?.asn);
  return {
    ip: str(headers.get("cf-connecting-ip"), 64),
    userAgent: str(headers.get("user-agent"), 512),
    acceptLanguage: str(headers.get("accept-language"), 256),
    country: str(cf?.country, 8),
    region: str(cf?.region),
    regionCode: str(cf?.regionCode, 16),
    city: str(cf?.city),
    postalCode: str(cf?.postalCode, 32),
    latitude: num(cf?.latitude),
    longitude: num(cf?.longitude),
    timezone: str(cf?.timezone, 64),
    continent: str(cf?.continent, 8),
    asn: asn === null ? null : Math.trunc(asn),
    asOrganization: str(cf?.asOrganization),
    colo: str(cf?.colo, 16),
    cf: cf ?? null,
  };
}

export function getRequestMeta(c: Context): RequestContext {
  const cf = (c.req.raw as Request & { cf?: Record<string, unknown> }).cf;
  return buildRequestContext(c.req.raw.headers, cf);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
