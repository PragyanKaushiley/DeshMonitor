// Every outbound call gets a hard timeout, and a 200 status is never
// trusted on its own — the actual body is sniffed to confirm it's really
// feed XML, not an HTML bot-protection or redirect page returned with a
// success status (backend-development-guidelines §7). This has already
// caught a real source silently serving HTML instead of its feed.

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "DeshMonitorIngest/1.0 (+https://deshmonitor.com)";

export class FeedFetchError extends Error {
  constructor(
    message: string,
    readonly sourceUrl: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FeedFetchError";
  }
}

function looksLikeFeed(body: string): boolean {
  const head = body.slice(0, 512).trimStart().toLowerCase();
  // A real RSS/Atom document starts with an XML declaration or an
  // <rss>/<feed> root element within the first few hundred characters.
  // An HTML bot-protection/redirect page — the actual failure mode this
  // has hit in production — starts with <!doctype html> or <html.
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) {
    return false;
  }
  return head.includes("<?xml") || head.includes("<rss") || head.includes("<feed");
}

/**
 * Fetch a feed URL with a hard timeout and verify the response is really
 * feed content before returning it. Throws `FeedFetchError` on any
 * failure — timeout, network error, non-2xx status, or a 200 that isn't
 * actually a feed — so every call site handles exactly one error type.
 */
export async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });
  } catch (cause) {
    const timedOut = controller.signal.aborted;
    throw new FeedFetchError(
      timedOut ? `Timed out after ${FETCH_TIMEOUT_MS}ms` : "Network error",
      url,
      cause,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new FeedFetchError(`HTTP ${response.status}`, url);
  }

  const body = await response.text();
  if (!looksLikeFeed(body)) {
    throw new FeedFetchError("Response body is not recognizable feed XML", url);
  }

  return body;
}
