import "server-only";
import { all, run } from "./db";
import { normalizeEmail, normalizePhone, type MemberProfile } from "./loyalty";

export type RfmSegment = "vip" | "refill_due" | "at_risk" | "new_buyer" | "lead";

export type CrmNote = {
  id: number;
  customer_key: string;
  admin_email: string;
  note: string;
  next_followup_date: string | null;
  created_at: string;
};

export type CrmCustomer = {
  customerKey: string;
  name: string;
  phone: string;
  email: string;
  isRegistered: boolean;
  tier: string;
  points: number;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  lastProducts: string[];
  segment: RfmSegment;
  notes: CrmNote[];
};

function classifyRfm(ordersCount: number, totalSpent: number, daysSince: number | null): RfmSegment {
  if (ordersCount === 0) return "lead";
  if (daysSince !== null && daysSince >= 20 && daysSince <= 45) return "refill_due";
  if (daysSince !== null && daysSince > 45) return "at_risk";
  if (ordersCount >= 3 || totalSpent >= 3000000) return "vip";
  return "new_buyer";
}

export async function getCrmCustomers(): Promise<CrmCustomer[]> {
  const [profiles, orders, orderItems, notes] = await Promise.all([
    all<MemberProfile>("SELECT * FROM member_profiles WHERE status = 'active'"),
    all<{
      id: number;
      code: string;
      name: string;
      phone: string;
      email: string;
      total: number;
      status: string;
      created_at: string;
    }>(
      "SELECT id, code, name, phone, email, total, status, created_at FROM orders WHERE status <> 'cancelled' ORDER BY created_at DESC",
    ),
    all<{ order_id: number; name: string }>(
      "SELECT order_id, name FROM order_items ORDER BY rowid DESC LIMIT 500",
    ),
    all<CrmNote>("SELECT * FROM crm_notes ORDER BY created_at DESC LIMIT 300"),
  ]);

  const itemsByOrder = new Map<number, string[]>();
  for (const it of orderItems) {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it.name);
    itemsByOrder.set(it.order_id, arr);
  }

  const notesByKey = new Map<string, CrmNote[]>();
  for (const n of notes) {
    const arr = notesByKey.get(n.customer_key) ?? [];
    arr.push(n);
    notesByKey.set(n.customer_key, arr);
  }

  const map = new Map<string, CrmCustomer>();

  const ensureEntry = (phoneRaw: string | null, emailRaw: string | null, name: string): CrmCustomer => {
    const phone = normalizePhone(phoneRaw) ?? "";
    const email = normalizeEmail(emailRaw) ?? "";
    const key = phone || email || `name:${name.trim().toLowerCase()}`;
    let cur = map.get(key);
    if (!cur) {
      cur = {
        customerKey: key,
        name: name.trim() || "Khách hàng",
        phone,
        email,
        isRegistered: false,
        tier: "bronze",
        points: 0,
        ordersCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
        daysSinceLastOrder: null,
        lastProducts: [],
        segment: "lead",
        notes: notesByKey.get(key) ?? [],
      };
      map.set(key, cur);
    }
    return cur;
  };

  for (const p of profiles) {
    const c = ensureEntry(p.phone, p.email, p.full_name);
    c.isRegistered = p.user_id !== null;
    c.tier = p.tier;
    c.points = p.current_points;
    if (p.full_name && c.name === "Khách hàng") c.name = p.full_name;
  }

  const nowMs = Date.now();
  for (const o of orders) {
    const c = ensureEntry(o.phone, o.email, o.name);
    c.ordersCount += 1;
    c.totalSpent += o.total;
    if (!c.lastOrderAt || o.created_at > c.lastOrderAt) {
      c.lastOrderAt = o.created_at;
      c.lastProducts = (itemsByOrder.get(o.id) ?? []).slice(0, 3);
      const t = Date.parse(o.created_at.replace(" ", "T") + "Z");
      if (!Number.isNaN(t)) {
        c.daysSinceLastOrder = Math.max(0, Math.floor((nowMs - t) / 86400000));
      }
    }
  }

  const list = Array.from(map.values()).map((c) => ({
    ...c,
    segment: classifyRfm(c.ordersCount, c.totalSpent, c.daysSinceLastOrder),
  }));

  list.sort((a, b) => b.totalSpent - a.totalSpent || b.ordersCount - a.ordersCount);
  return list;
}

export async function addCrmNote(params: {
  customerKey: string;
  adminEmail: string;
  note: string;
  nextFollowupDate?: string | null;
}) {
  await run(
    "INSERT INTO crm_notes (customer_key, admin_email, note, next_followup_date) VALUES (?, ?, ?, ?)",
    params.customerKey,
    params.adminEmail,
    params.note.trim(),
    params.nextFollowupDate || null,
  );
}
