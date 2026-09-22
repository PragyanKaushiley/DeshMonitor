import { pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const appSchema = pgSchema("app");

export const users = appSchema.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
