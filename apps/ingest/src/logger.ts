import { insertLog } from "./db/queries.js";

/**
 * Best-effort exception logging: a logging failure must never mask the
 * original error (performance-and-scaling / observability guidelines).
 * Every call site awaits this, but its own failure is caught and
 * reported to stderr only — it never throws back into the caller.
 */
export async function logError(message: string, error: unknown, context?: Record<string, unknown>): Promise<void> {
  const stack = error instanceof Error ? (error.stack ?? null) : null;
  const fullMessage = error instanceof Error ? `${message}: ${error.message}` : message;

  console.error(`[ingest] ${fullMessage}`);

  try {
    await insertLog("error", fullMessage, stack, context ?? null);
  } catch (loggingError) {
    console.error("[ingest] failed to write to public.logs (continuing):", loggingError);
  }
}

export async function logWarn(message: string, context?: Record<string, unknown>): Promise<void> {
  console.warn(`[ingest] ${message}`);
  try {
    await insertLog("warn", message, null, context ?? null);
  } catch (loggingError) {
    console.error("[ingest] failed to write to public.logs (continuing):", loggingError);
  }
}
