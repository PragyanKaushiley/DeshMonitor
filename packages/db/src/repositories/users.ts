import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { users } from "../schema/app";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export async function createUser(db: Database, input: CreateUserInput): Promise<UserRecord> {
  const [row] = await db
    .insert(users)
    .values({ email: input.email.toLowerCase(), passwordHash: input.passwordHash })
    .returning();

  if (!row) throw new Error("failed to create user");
  return row;
}

export async function getUserByEmail(db: Database, email: string): Promise<UserRecord | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return row ?? null;
}

export async function getUserById(db: Database, id: string): Promise<UserRecord | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

// Removes the account; its login-session records go with it (cascade) and
// any linked visitor is unlinked.
export async function deleteUser(db: Database, id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
