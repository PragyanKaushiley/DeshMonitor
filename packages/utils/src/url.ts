const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAM_NAMES = new Set(["fbclid", "gclid", "ncid"]);

export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  for (const key of [...url.searchParams.keys()]) {
    const lowerKey = key.toLowerCase();
    const isTracking =
      TRACKING_PARAM_NAMES.has(lowerKey) || TRACKING_PARAM_PREFIXES.some((prefix) => lowerKey.startsWith(prefix));
    if (isTracking) {
      url.searchParams.delete(key);
    }
  }

  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  let normalized = url.toString();
  if (normalized.endsWith("/") && url.pathname !== "/") {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}
