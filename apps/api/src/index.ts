import { Hono } from "hono";
import { cors } from "hono/cors";
import { toLogEntryInput } from "@desh-monitor/db";
import { errorFields } from "@desh-monitor/logger";
import { createCollectingLogger, persistLogs, requestLogging } from "./lib/logging";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { logRoutes } from "./routes/logs";
import { visitRoutes } from "./routes/visits";
import { runScheduled } from "./scheduled";
import type { AppEnv, Bindings } from "./types";

export const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: (origin, c) => (origin === c.env.WEB_APP_ORIGIN ? origin : null),
    credentials: true,
  }),
);
app.use("*", requestLogging());

app.onError((error, c) => {
  c.get("logger").error("unhandled error", errorFields(error));
  return c.json({ error: "internal_error" }, 500);
});

app.get("/", (c) => c.json({ name: "desh-monitor-api" }));
app.route("/health", healthRoutes);
app.route("/auth", authRoutes);
app.route("/visits", visitRoutes);
app.route("/logs", logRoutes);

export default {
  fetch: app.fetch,
  // Cron trigger (wrangler.jsonc): starts the ingest jobs that are due, and
  // stores the run's log lines like a request's.
  async scheduled(controller, env, ctx) {
    const { logger, lines } = createCollectingLogger({ trigger: "cron", cron: controller.cron });
    try {
      await runScheduled(controller.scheduledTime, env, logger);
    } finally {
      persistLogs(env.DATABASE_URL, lines.map((line) => toLogEntryInput(line, "api")), ctx);
    }
  },
} satisfies ExportedHandler<Bindings>;
