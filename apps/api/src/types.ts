export interface Bindings {
  DATABASE_URL: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  WEB_APP_ORIGIN: string;
  COOKIE_DOMAIN?: string;
  // Cron → ingest dispatch (see scheduled.ts). GITHUB_REPO is "owner/name";
  // GITHUB_TOKEN is a secret with Actions write access to that repo only.
  GITHUB_REPO?: string;
  GITHUB_TOKEN?: string;
}
