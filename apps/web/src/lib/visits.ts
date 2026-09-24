import { errorFields } from "@desh-monitor/logger";
import { CONSENT_VERSION, getConsent } from "./consent";
import { log } from "./log";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;

// One call per path per page load (React Strict Mode runs effects twice in
// dev, which would otherwise count an extra page view).
const recordedThisLoad = new Set<string>();

function externalReferrer(): string | undefined {
  if (!document.referrer) return undefined;
  try {
    return new URL(document.referrer).origin === window.location.origin ? undefined : document.referrer;
  } catch {
    return undefined;
  }
}

// Records this page view as part of the visitor's session (see the API's
// POST /visits). Only runs after consent; never throws or blocks rendering.
export function recordVisit(): void {
  if (!API_URL || getConsent() !== "accepted") return;
  const path = window.location.pathname;
  if (recordedThisLoad.has(path)) return;
  recordedThisLoad.add(path);

  const params = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(
    UTM_KEYS.map((key) => [key, params.get(`utm_${key}`) ?? undefined]).filter(([, value]) => value),
  );

  void fetch(`${API_URL}/visits`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path,
      referrer: externalReferrer(),
      consentVersion: CONSENT_VERSION,
      ...(Object.keys(utm).length > 0 ? { utm } : {}),
    }),
  }).then(
    (res) => {
      if (!res.ok) log.warn("visit recording failed", { status: res.status, path });
    },
    // Analytics must never affect the page — only note that it failed.
    (error: unknown) => log.warn("visit recording failed", { ...errorFields(error), path }),
  );
}
