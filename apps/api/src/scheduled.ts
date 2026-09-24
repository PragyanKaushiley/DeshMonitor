import type { Bindings } from "./types";

// Cloudflare cron → GitHub Actions. Ingestion itself runs in the "Ingest"
// workflow (Node, apps/ingest); this handler only starts it on time, since
// GitHub's own schedule can start late or be skipped. The workflow keeps a
// fallback schedule that skips jobs already dispatched from here — keep its
// crons in step with jobsDue().

export const INGEST_JOBS = [
  "news",
  "weather-forecast",
  "weather-air-quality",
  "weather-marine",
  "weather-flood",
  "weather-seasonal",
  "weather-climate",
] as const;

export type IngestJob = (typeof INGEST_JOBS)[number];

const INGEST_WORKFLOW = "ingest.yml";
const INGEST_REF = "main";

// The cron runs hourly; which jobs are due at that hour (UTC). Cadences
// follow how often each source actually changes: news hourly, forecasts
// and air quality every 3 hours, marine and flood daily, seasonal weekly,
// climate projections (a fixed model dataset) monthly.
export function jobsDue(at: Date): IngestJob[] {
  const hour = at.getUTCHours();
  const jobs: IngestJob[] = ["news"];
  if (hour % 3 === 0) jobs.push("weather-forecast", "weather-air-quality");
  if (hour === 1) jobs.push("weather-marine", "weather-flood");
  if (hour === 2 && at.getUTCDay() === 1) jobs.push("weather-seasonal");
  if (hour === 3 && at.getUTCDate() === 1) jobs.push("weather-climate");
  return jobs;
}

export async function dispatchIngest(
  env: { GITHUB_TOKEN: string; GITHUB_REPO: string },
  job: IngestJob,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${INGEST_WORKFLOW}/dispatches`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "desh-monitor-scheduler",
    },
    body: JSON.stringify({ ref: INGEST_REF, inputs: { job } }),
  });
  if (!res.ok) {
    throw new Error(`dispatching ${job} failed: HTTP ${res.status} ${await res.text()}`);
  }
}

export async function runScheduled(scheduledTime: number, env: Bindings, fetchImpl: typeof fetch = fetch): Promise<void> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    console.error(JSON.stringify({ level: "error", message: "ingest dispatch skipped: GITHUB_TOKEN or GITHUB_REPO not set" }));
    return;
  }
  const github = { GITHUB_TOKEN: env.GITHUB_TOKEN, GITHUB_REPO: env.GITHUB_REPO };
  const jobs = jobsDue(new Date(scheduledTime));
  const results = await Promise.allSettled(jobs.map((job) => dispatchIngest(github, job, fetchImpl)));
  const failed = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason)] : []));
  console.log(JSON.stringify({ level: failed.length ? "error" : "info", message: "ingest dispatch", jobs, failed }));
  // Failing the invocation marks it as an error in Cloudflare's cron history.
  if (failed.length) throw new Error(failed.join("; "));
}
