import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, run } from "./db";

/** Admin accounts live in D1 (tables admins / admin_sessions). Passwords: scrypt + random salt. */
export const ADMIN_COOKIE = "admin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

type Admin = { id: number; email: string };

const hash = (password: string, salt: string) => crypto.scryptSync(password, salt, 64).toString("hex");

export const hasAdmin = async () => !!(await one("SELECT 1 AS x FROM admins LIMIT 1"));

export async function createAdmin(email: string, password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const r = await run(
    "INSERT INTO admins (email, salt, password_hash) VALUES (?, ?, ?)",
    email,
    salt,
    hash(password, salt),
  );
  return Number(r.lastInsertRowid);
}

export async function verifyLogin(email: string, password: string): Promise<number | undefined> {
  const a = await one<{ id: number; salt: string; password_hash: string }>(
    "SELECT id, salt, password_hash FROM admins WHERE email = ?",
    email,
  );
  if (!a) return undefined;
  const given = Buffer.from(hash(password, a.salt), "hex");
  const stored = Buffer.from(a.password_hash, "hex");
  return given.length === stored.length && crypto.timingSafeEqual(given, stored) ? a.id : undefined;
}

/** Only call from a server action / route handler (sets a cookie). */
export async function startSession(adminId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await run("DELETE FROM admin_sessions WHERE expires_at < ?", Math.floor(Date.now() / 1000));
  await run("INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES (?, ?, ?)", token, adminId, expires);
  (await cookies()).set(ADMIN_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await run("DELETE FROM admin_sessions WHERE token = ?", token);
  jar.delete(ADMIN_COOKIE);
}

export async function currentAdmin(): Promise<Admin | undefined> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return undefined;
  return one<Admin>(
    `SELECT a.id, a.email FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.token = ? AND s.expires_at > ?`,
    token,
    Math.floor(Date.now() / 1000),
  );
}

/** Call at the top of every admin page AND every admin server action. */
export async function requireAdmin(): Promise<Admin> {
  const a = await currentAdmin();
  if (!a) redirect("/admin/");
  return a;
}

/** Check a specific admin's password (used before changing it). */
export async function checkPassword(adminId: number, password: string): Promise<boolean> {
  const a = await one<{ email: string }>("SELECT email FROM admins WHERE id = ?", adminId);
  return !!a && (await verifyLogin(a.email, password)) === adminId;
}

/** Set a new password and sign out every other session of that admin. */
export async function setPassword(adminId: number, password: string, keepToken?: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  await run("UPDATE admins SET salt = ?, password_hash = ? WHERE id = ?", salt, hash(password, salt), adminId);
  await run("DELETE FROM admin_sessions WHERE admin_id = ? AND token <> ?", adminId, keepToken ?? "");
}

export async function removeAdmin(id: number) {
  await run("DELETE FROM admins WHERE id = ?", id);
}

export async function currentToken() {
  return (await cookies()).get(ADMIN_COOKIE)?.value;
}
