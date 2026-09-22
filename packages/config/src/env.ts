import { z } from "zod";
import { loadDotenv } from "./dotenv";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  // Optional here — only scripts that actually touch Redis (packages/redis)
  // require these; making them mandatory for every loadEnv() caller would
  // break ingestion scripts that have no need for Redis at all.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source?: NodeJS.ProcessEnv): Env {
  if (!source) {
    loadDotenv();
  }

  const parsed = envSchema.safeParse(source ?? process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return parsed.data;
}
