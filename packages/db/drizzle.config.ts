import { defineConfig } from "drizzle-kit";
import { loadEnv } from "@desh-monitor/config";

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["raw_news", "raw_weather", "app", "logs"],
  dbCredentials: {
    url: loadEnv().DATABASE_URL,
  },
});
