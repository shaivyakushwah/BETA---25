import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

const COOKIE_NAME = "shortlist_session";
const SESSION_TTL_DAYS = 30;

export interface UserAccount {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface AuthSession {
  user: UserAccount;
  expiresAt: string;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, combinedHash: string): boolean {
  const parts = combinedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const derived = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

export async function getCurrentUser(): Promise<UserAccount | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getDb();
  const sessionRow = db
    .prepare(
      `SELECT s.id, s.expires_at, u.id as user_id, u.email, u.name, u.role, u.created_at
       FROM session s
       JOIN user_account u ON s.user_id = u.id
       WHERE s.id = ?`,
    )
    .get(token) as
    | {
        id: string;
        expires_at: string;
        user_id: number;
        email: string;
        name: string;
        role: string;
        created_at: string;
      }
    | undefined;

  if (!sessionRow) {
    return null;
  }

  // Check expiration
  if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM session WHERE id = ?").run(token);
    return null;
  }

  return {
    id: sessionRow.user_id,
    email: sessionRow.email,
    name: sessionRow.name,
    role: sessionRow.role,
    createdAt: sessionRow.created_at,
  };
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString();
  const createdAt = new Date().toISOString();

  const db = getDb();
  db.prepare("INSERT INTO session (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    token,
    userId,
    expiresAt,
    createdAt,
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return token;
}

export async function signUpUser(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string; user?: UserAccount }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName || cleanName.length < 2) {
    return { ok: false, error: "Please enter your name" };
  }
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { ok: false, error: "Please enter a valid email address" };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters" };
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM user_account WHERE email = ?").get(cleanEmail);
  if (existing) {
    return { ok: false, error: "An account with this email already exists" };
  }

  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  const res = db
    .prepare("INSERT INTO user_account (name, email, password_hash, role, created_at) VALUES (?, ?, ?, 'job_seeker', ?)")
    .run(cleanName, cleanEmail, passwordHash, now);

  const userId = Number(res.lastInsertRowid);
  await createSession(userId);

  // Sync candidate table name/email
  db.prepare("UPDATE candidate SET name = ?, email = ? WHERE id = 1").run(cleanName, cleanEmail);

  return {
    ok: true,
    user: {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      role: "job_seeker",
      createdAt: now,
    },
  };
}

export async function signInUser(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string; user?: UserAccount }> {
  const cleanEmail = email.trim().toLowerCase();
  const db = getDb();

  const userRow = db
    .prepare("SELECT id, name, email, password_hash, role, created_at FROM user_account WHERE email = ?")
    .get(cleanEmail) as
    | {
        id: number;
        name: string;
        email: string;
        password_hash: string;
        role: string;
        created_at: string;
      }
    | undefined;

  if (!userRow) {
    return { ok: false, error: "Invalid email or password" };
  }

  if (!verifyPassword(password, userRow.password_hash)) {
    return { ok: false, error: "Invalid email or password" };
  }

  await createSession(userRow.id);

  // Sync candidate name/email
  db.prepare("UPDATE candidate SET name = ?, email = ? WHERE id = 1").run(userRow.name, userRow.email);

  return {
    ok: true,
    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      createdAt: userRow.created_at,
    },
  };
}

export async function signOutUser(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const db = getDb();
    db.prepare("DELETE FROM session WHERE id = ?").run(token);
    cookieStore.delete(COOKIE_NAME);
  }
}
