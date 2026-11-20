import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { all, one, run } from "./db";
import { normalizeRole, type AdminRole } from "./rbac";

/** Admin accounts live in D1 (tables admins / admin_sessions). Passwords: scrypt + random salt. */
export const ADMIN_COOKIE = "admin_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type Admin = { id: number; email: string; phone: string; name: string; role: AdminRole };

const hash = (password: string, salt: string) => crypto.scryptSync(password, salt, 64).toString("hex");

export function normalizeAdminPhone(raw: string): string {
  const cleaned = raw.trim().replace(/[\s.\-()]/g, "");
  if (!cleaned) return "";
  if (/^\+?84\d{9,10}$/.test(cleaned)) {
    return "0" + cleaned.replace(/^\+?84/, "");
  }
  return cleaned;
}

export function isValidAdminPhone(raw: string): boolean {
  const normalized = normalizeAdminPhone(raw);
  return /^0\d{9,10}$/.test(normalized);
}

let ensuredAdminSchema: Promise<void> | null = null;
export async function ensureAdminSchema() {
  if (!ensuredAdminSchema) {
    ensuredAdminSchema = (async () => {
      const cols = await all<{ name: string }>("PRAGMA table_info(admins)");
      const names = new Set(cols.map((c) => c.name));
      if (!names.has("phone")) {
        await run("ALTER TABLE admins ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
      }
      await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_phone_unique ON admins(phone) WHERE phone <> ''");
    })().catch((err) => {
      ensuredAdminSchema = null;
      throw err;
    });
  }
  await ensuredAdminSchema;
}

export const hasAdmin = async () => !!(await one("SELECT 1 AS x FROM admins LIMIT 1"));

export async function createAdmin(
  email: string,
  password: string,
  role: AdminRole = "super_admin",
  name = "",
  phone = "",
) {
  await ensureAdminSchema();
  const salt = crypto.randomBytes(16).toString("hex");
  const normalizedPhone = normalizeAdminPhone(phone);
  const r = await run(
    "INSERT INTO admins (email, phone, name, role, salt, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
    email.trim().toLowerCase(),
    normalizedPhone,
    name.trim(),
    role,
    salt,
    hash(password, salt),
  );
  return Number(r.lastInsertRowid);
}

export async function verifyLogin(identifier: string, password: string): Promise<number | undefined> {
  await ensureAdminSchema();
  const raw = identifier.trim();
  if (!raw) return undefined;

  let a: { id: number; salt: string; password_hash: string } | undefined;
  if (raw.includes("@")) {
    a = await one<{ id: number; salt: string; password_hash: string }>(
      "SELECT id, salt, password_hash FROM admins WHERE LOWER(email) = ?",
      raw.toLowerCase(),
    );
  } else {
    const phone = normalizeAdminPhone(raw);
    if (phone) {
      a = await one<{ id: number; salt: string; password_hash: string }>(
        "SELECT id, salt, password_hash FROM admins WHERE phone = ?",
        phone,
      );
    }
    if (!a) {
      a = await one<{ id: number; salt: string; password_hash: string }>(
        "SELECT id, salt, password_hash FROM admins WHERE LOWER(email) = ?",
        raw.toLowerCase(),
      );
    }
  }
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
    secure: process.env.NODE_ENV === "production",
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
  await ensureAdminSchema();
  const row = await one<{ id: number; email: string; phone?: string; name?: string; role?: string }>(
    `SELECT a.id, a.email, a.phone, a.name, a.role FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.token = ? AND s.expires_at > ?`,
    token,
    Math.floor(Date.now() / 1000),
  );
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    phone: row.phone ?? "",
    name: row.name ?? "",
    role: normalizeRole(row.role),
  };
}

/** Call at the top of every admin page AND every admin server action. */
export async function requireAdmin(): Promise<Admin> {
  const a = await currentAdmin();
  if (!a) redirect("/admin/");
  return a;
}

export async function requireRole(allowed: AdminRole[]): Promise<Admin> {
  const a = await requireAdmin();
  if (!allowed.includes(a.role)) {
    redirect("/admin/?error=" + encodeURIComponent("Bạn không có quyền truy cập khu vực này."));
  }
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
