import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadDotenv } from "@desh-monitor/config";
import { createDb } from "../client";
import { createUser, getUserByEmail, getUserById } from "./users";

loadDotenv();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("users repository (integration)", () => {
  it("creates a user and finds it by email and by id, case-insensitively", async () => {
    const db = createDb();
    const email = `Test-${randomUUID()}@Example.com`;

    const user = await createUser(db, { email, passwordHash: "irrelevant-for-this-test" });
    expect(user.email).toBe(email.toLowerCase());

    const byEmail = await getUserByEmail(db, email.toUpperCase());
    expect(byEmail?.id).toBe(user.id);

    const byId = await getUserById(db, user.id);
    expect(byId?.email).toBe(email.toLowerCase());
  });

  it("returns null for an email that doesn't exist", async () => {
    const db = createDb();
    const result = await getUserByEmail(db, `nobody-${randomUUID()}@example.com`);
    expect(result).toBeNull();
  });

  it("rejects a duplicate email at the database level", async () => {
    const db = createDb();
    const email = `dup-${randomUUID()}@example.com`;

    await createUser(db, { email, passwordHash: "a" });
    await expect(createUser(db, { email, passwordHash: "b" })).rejects.toThrow();
  });
});
