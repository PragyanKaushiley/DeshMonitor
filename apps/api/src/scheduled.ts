import { errorFields, type Logger } from "@desh-monitor/logger";
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
  "logs-prune",
] as const;

export type IngestJob = (typeof INGEST_JOBS)[number];

const INGEST_WORKFLOW = "ingest.yml";
const INGEST_REF = "main";

// The cron fires every 15 minutes (:05, :20, :35, :50 UTC); which jobs are
// due at that slot. Cadences follow how often each source changes and what
// storage and Open-Meteo's free quota allow: news every 15 minutes; forecast,
// air quality and marine hourly; flood daily (GloFAS publishes once a day);
// seasonal weekly and climate projections (a fixed model dataset) monthly,
// both of which are heavy requests. Old logs are pruned daily.
export function jobsDue(at: Date): IngestJob[] {
  const jobs: IngestJob[] = ["news"];
  if (at.getUTCMinutes() >= 15) return jobs; // only the hour's first slot runs weather
  const hour = at.getUTCHours();
  jobs.push("weather-forecast", "weather-air-quality", "weather-marine");
  if (hour === 0) jobs.push("logs-prune");
  if (hour === 1) jobs.push("weather-flood");
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

export async function runScheduled(
  scheduledTime: number,
  env: Bindings,
  logger: Logger,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    logger.error("ingest dispatch skipped: GITHUB_TOKEN or GITHUB_REPO not set");
    return;
  }
  const github = { GITHUB_TOKEN: env.GITHUB_TOKEN, GITHUB_REPO: env.GITHUB_REPO };
  const jobs = jobsDue(new Date(scheduledTime));
  const results = await Promise.allSettled(jobs.map((job) => dispatchIngest(github, job, fetchImpl)));
  const failed = results.flatMap((r, i) => (r.status === "rejected" ? [{ job: jobs[i], reason: r.reason as unknown }] : []));
  if (failed.length) {
    logger.error("ingest dispatch failed", { jobs, failed: failed.map((f) => ({ job: f.job, ...errorFields(f.reason) })) });
    // Failing the invocation marks it as an error in Cloudflare's cron history.
    throw new Error(failed.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))).join("; "));
  }
  logger.info("ingest jobs dispatched", { jobs });
}
