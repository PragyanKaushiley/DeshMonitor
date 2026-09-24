import { createLogger, type LogEntry, type LogFields } from "@desh-monitor/logger";

// The web app's logger. Lines go to the console as usual; warnings and
// errors are also reported to the API (POST /logs), which stores them in
// logs.entries — the web app never talks to the database itself. Works in
// the browser and on the web server (see instrumentation.ts).

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const BATCH_SIZE = 20; // the API's per-request maximum
const FLUSH_DELAY_MS = 2000;
// Keep a broken page (e.g. an error in a render loop) from flooding the API.
const MAX_REPORTS_PER_LOAD = 50;
// The API caps messages at 500 characters and context at 4,000.
const MAX_MESSAGE_CHARS = 500;
const MAX_CONTEXT_CHARS = 3500;

const queue: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let reported = 0;

function fitContext(context: LogFields): LogFields {
  if (JSON.stringify(context).length <= MAX_CONTEXT_CHARS) return context;
  const withoutStack = { ...context, stack: undefined };
  if (JSON.stringify(withoutStack).length <= MAX_CONTEXT_CHARS) return withoutStack;
  return { truncated: true };
}

function send(entries: LogEntry[]): Promise<void> {
  if (!API_URL || entries.length === 0) return Promise.resolve();
  const source = typeof window === "undefined" ? "server" : "browser";
  const body = {
    entries: entries.map(({ timestamp, level, message, app: _app, ...context }) => ({
      timestamp,
      level,
      message: message.slice(0, MAX_MESSAGE_CHARS),
      source,
      context: fitContext(context),
    })),
  };
  return fetch(`${API_URL}/logs`, {
    method: "POST",
    credentials: "omit",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(
    () => undefined,
    // Never log a failure to report a log — that could loop.
    () => undefined,
  );
}

// Sends everything queued now (e.g. when the page is being hidden, or before
// a server request finishes).
export async function flushLogs(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  while (queue.length > 0) {
    await send(queue.splice(0, BATCH_SIZE));
  }
}

function report(entry: LogEntry): void {
  if (entry.level !== "warn" && entry.level !== "error") return;
  // Per page load in the browser. On the server this module lives across
  // requests, so it isn't capped there (the API rate-limits either way).
  if (typeof window !== "undefined") {
    if (reported >= MAX_REPORTS_PER_LOAD) return;
    reported += 1;
  }
  queue.push(entry);
  if (queue.length >= BATCH_SIZE) void flushLogs();
  else if (!timer) timer = setTimeout(() => void flushLogs(), FLUSH_DELAY_MS);
}

export const log = createLogger({ app: "web" }, [report]);
