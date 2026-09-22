export interface FetchWithTimeoutOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface FetchWithTimeoutResult {
  status: number;
  body: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 1;

function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<FetchWithTimeoutResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        ...(options.headers ? { headers: options.headers } : {}),
      });
      const body = await response.text();

      if (isRetryableStatus(response.status) && attempt < retries) {
        attempt += 1;
        continue;
      }

      return { status: response.status, body };
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        throw error;
      }
      attempt += 1;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}
