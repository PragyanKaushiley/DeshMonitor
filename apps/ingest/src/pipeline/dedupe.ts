// Pure content-hash / URL-normalization logic — the DB enforces the
// resulting uniqueness constraint (idempotency guideline), but the hash
// itself has to be *computed* deterministically first, and that's exactly
// the kind of small, pure, easy-to-get-subtly-wrong function the testing
// guideline calls out for a real unit test.

import { createHash } from "node:crypto";

/**
 * Normalize a story URL before hashing it, so the same article reached
 * through different tracking parameters or a trailing slash still
 * produces the same content_hash. Deliberately conservative: this strips
 * common tracking noise, not arbitrary query parameters that might
 * actually distinguish two different pages on the same path.
 */
export function normalizeUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    // Not a parseable URL at all — return the trimmed original rather than
    // throwing; an unparseable "URL" still needs a stable hash so dedupe
    // doesn't break for it, and a downstream validity check (not this
    // function's job) can reject it later if needed.
    return rawUrl.trim();
  }

  const TRACKING_PARAM_PREFIXES = ["utm_", "fbclid", "gclid", "ref", "ncid"];
  for (const key of [...parsed.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (TRACKING_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
      parsed.searchParams.delete(key);
    }
  }

  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = "";
  let pathname = parsed.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  parsed.pathname = pathname;

  // Sort remaining query params so param order doesn't affect the hash.
  parsed.searchParams.sort();

  return parsed.toString();
}

/** Deterministic content_hash for a news item: sha256 of its normalized URL. */
export function computeContentHash(url: string): string {
  return createHash("sha256").update(normalizeUrl(url)).digest("hex");
}
