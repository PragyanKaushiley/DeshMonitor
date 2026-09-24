import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { visitRoutes } from "./routes/visits";
import type { Bindings } from "./types";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => (origin === c.env.WEB_APP_ORIGIN ? origin : null),
    credentials: true,
  }),
);

app.get("/", (c) => c.json({ name: "desh-monitor-api" }));
app.route("/auth", authRoutes);
app.route("/visits", visitRoutes);

export default app;
