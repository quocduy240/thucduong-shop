import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { all, one, run } from "./db";

export const MEMBER_COOKIE = "member_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type Member = {
  id: number;
  name: string;
  email: string;
  phone: string;
  tier: "bronze" | "silver" | "gold";
  points: number;
  created_at: string;
};

export type CouponRow = {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  max_discount: number;
  member_only: number;
  active: number;
  used_count: number;
};

const hash = (password: string, salt: string) => crypto.scryptSync(password, salt, 64).toString("hex");

export async function currentMember(): Promise<Member | undefined> {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token) return undefined;
  return one<Member>(
    `SELECT m.id, m.name, m.email, m.phone, m.tier, m.points, m.created_at
     FROM member_sessions s JOIN members m ON m.id = s.member_id
     WHERE s.token = ? AND s.expires_at > ?`,
    token,
    Math.floor(Date.now() / 1000),
  );
}

export async function startMemberSession(memberId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await run("DELETE FROM member_sessions WHERE expires_at < ?", Math.floor(Date.now() / 1000));
  await run("INSERT INTO member_sessions (token, member_id, expires_at) VALUES (?, ?, ?)", token, memberId, expires);
  (await cookies()).set(MEMBER_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_SECONDS,
  });
}

export async function endMemberSession() {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  if (token) await run("DELETE FROM member_sessions WHERE token = ?", token);
  jar.delete(MEMBER_COOKIE);
}

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254 || email.includes("..")) return false;
  return EMAIL_REGEX.test(email);
}

export async function registerMemberAccount(opts: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ memberId?: number; error?: string }> {
  const name = opts.name.trim();
  const email = opts.email.trim().toLowerCase();
  const phone = opts.phone.trim();
  const pw = opts.password;

  if (!name) return { error: "Vui lòng nhập họ và tên." };
  if (!isValidEmail(email)) return { error: "Địa chỉ email không đúng định dạng (VD: tenban@gmail.com)." };
  if (phone && !/^0\d{9,10}$/.test(phone)) return { error: "Số điện thoại không hợp lệ." };
  if (pw.length < 6) return { error: "Mật khẩu tối thiểu 6 ký tự." };

  if (await one("SELECT 1 FROM members WHERE email = ?", email)) {
    return { error: "Email này đã được đăng ký thành viên. Vui lòng đăng nhập." };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const res = await run(
    "INSERT INTO members (name, email, phone, salt, password_hash, tier, points) VALUES (?, ?, ?, ?, ?, 'bronze', 100)",
    name,
    email,
    phone,
    salt,
    hash(pw, salt),
  );
  const memberId = Number(res.lastInsertRowid);

  // Also subscribe to newsletter automatically
  await run(
    "INSERT OR IGNORE INTO newsletter_subscribers (email, source, status) VALUES (?, 'member_register', 'active')",
    email,
  );

  return { memberId };
}

export async function verifyMemberLogin(identifier: string, password: string): Promise<number | undefined> {
  const idStr = identifier.trim().toLowerCase();
  const m = await one<{ id: number; salt: string; password_hash: string }>(
    "SELECT id, salt, password_hash FROM members WHERE email = ? OR (phone <> '' AND phone = ?)",
    idStr,
    identifier.trim(),
  );
  if (!m) return undefined;
  const given = Buffer.from(hash(password, m.salt), "hex");
  const stored = Buffer.from(m.password_hash, "hex");
  return given.length === stored.length && crypto.timingSafeEqual(given, stored) ? m.id : undefined;
}

export function getActiveCoupons(): Promise<CouponRow[]> {
  return all<CouponRow>(
    "SELECT id, code, title, description, discount_type, discount_value, min_order, max_discount, member_only, active, used_count FROM coupons WHERE active = 1 ORDER BY member_only DESC, min_order ASC",
  );
}

export async function evaluateCoupon(
  rawCode: string,
  subtotal: number,
  isMember: boolean,
): Promise<{ valid: boolean; discount: number; coupon?: CouponRow; error?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, discount: 0, error: "Vui lòng nhập mã giảm giá." };

  const c = await one<CouponRow>(
    "SELECT id, code, title, description, discount_type, discount_value, min_order, max_discount, member_only, active, used_count FROM coupons WHERE UPPER(code) = ? AND active = 1",
    code,
  );
  if (!c) return { valid: false, discount: 0, error: "Mã giảm giá không tồn tại hoặc đã hết hạn." };

  if (c.member_only === 1 && !isMember) {
    return {
      valid: false,
      discount: 0,
      error: `Mã "${c.code}" dành riêng cho Thành viên. Hãy đăng nhập hoặc đăng ký thành viên miễn phí để áp dụng!`,
    };
  }

  if (subtotal < c.min_order) {
    return {
      valid: false,
      discount: 0,
      error: `Mã "${c.code}" áp dụng cho đơn hàng tối thiểu ${c.min_order.toLocaleString("vi-VN")}₫.`,
    };
  }

  let discount =
    c.discount_type === "percent"
      ? Math.round((subtotal * c.discount_value) / 100)
      : c.discount_value;

  if (c.max_discount > 0 && discount > c.max_discount) {
    discount = c.max_discount;
  }
  if (discount > subtotal) {
    discount = subtotal;
  }

  return { valid: true, discount, coupon: c };
}

export function getMemberOrders(member: Member) {
  return all<{
    id: number;
    code: string;
    total: number;
    discount_amount: number;
    coupon_code: string;
    status: string;
    created_at: string;
  }>(
    `SELECT id, code, total, discount_amount, coupon_code, status, created_at
     FROM orders
     WHERE (email <> '' AND LOWER(email) = LOWER(?)) OR (phone <> '' AND phone = ?)
     ORDER BY id DESC LIMIT 20`,
    member.email,
    member.phone,
  );
}
