import { migrate } from "drizzle-orm/neon-http/migrator";
import { createDb } from "./client";

async function main() {
  const db = createDb();
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
