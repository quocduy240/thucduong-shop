import "server-only";
import { all, run } from "./db";
import { normalizeEmail, normalizePhone, todayHoChiMinh, type MemberProfile } from "./loyalty";
import { sendEmail } from "./mail";

export type RfmSegment = "vip" | "refill_due" | "at_risk" | "new_buyer" | "lead";

export type CrmNote = {
  id: number;
  customer_key: string;
  admin_email: string;
  note: string;
  next_followup_date: string | null;
  followup_done: number;
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
  firstOrderRevenue: number;
  repeatRevenue: number;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  lastProducts: string[];
  segment: RfmSegment;
  tags: string[];
  followupDue: boolean;
  nextFollowupDate: string | null;
  notes: CrmNote[];
};

export type CrmAnalytics = {
  totalBuyers: number;
  repeatBuyers: number;
  repeatRatePct: number;
  newRevenue: number;
  returningRevenue: number;
  advisorStats: {
    adminEmail: string;
    notesCount: number;
    followupsDone: number;
    caredCustomers: number;
  }[];
};

export type AutomationQueueItem = {
  orderId: number;
  orderCode: string;
  customerName: string;
  phone: string;
  email: string;
  stepCode: "day3_guide" | "day25_refill";
  daysSinceOrder: number;
  products: string[];
  messageText: string;
};

function classifyRfm(ordersCount: number, totalSpent: number, daysSince: number | null): RfmSegment {
  if (ordersCount === 0) return "lead";
  if (daysSince !== null && daysSince >= 20 && daysSince <= 45) return "refill_due";
  if (daysSince !== null && daysSince > 45) return "at_risk";
  if (ordersCount >= 3 || totalSpent >= 3000000) return "vip";
  return "new_buyer";
}

export async function getCrmDashboardData(): Promise<{
  customers: CrmCustomer[];
  analytics: CrmAnalytics;
  automationQueue: AutomationQueueItem[];
  allTags: string[];
}> {
  const [profiles, orders, orderItems, notes, tagRows, sentLogs] = await Promise.all([
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
      "SELECT id, code, name, phone, email, total, status, created_at FROM orders WHERE status <> 'cancelled' ORDER BY created_at ASC",
    ),
    all<{ order_id: number; name: string }>(
      "SELECT order_id, name FROM order_items ORDER BY rowid DESC LIMIT 500",
    ),
    all<CrmNote>("SELECT * FROM crm_notes ORDER BY created_at DESC LIMIT 500"),
    all<{ customer_key: string; tag: string }>("SELECT customer_key, tag FROM crm_customer_tags ORDER BY created_at ASC"),
    all<{ order_id: number; step_code: string }>("SELECT order_id, step_code FROM crm_automation_logs"),
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

  const tagsByKey = new Map<string, string[]>();
  const tagSet = new Set<string>();
  for (const t of tagRows) {
    const arr = tagsByKey.get(t.customer_key) ?? [];
    arr.push(t.tag);
    tagsByKey.set(t.customer_key, arr);
    tagSet.add(t.tag);
  }

  const todayVn = todayHoChiMinh();
  const map = new Map<string, CrmCustomer>();

  const ensureEntry = (phoneRaw: string | null, emailRaw: string | null, name: string): CrmCustomer => {
    const phone = normalizePhone(phoneRaw) ?? "";
    const email = normalizeEmail(emailRaw) ?? "";
    const key = phone || email || `name:${name.trim().toLowerCase()}`;
    let cur = map.get(key);
    if (!cur) {
      const custNotes = notesByKey.get(key) ?? [];
      const pendingFollowups = custNotes
        .filter((n) => n.followup_done === 0 && n.next_followup_date && n.next_followup_date.trim() !== "")
        .map((n) => n.next_followup_date!)
        .sort();
      const nextDate = pendingFollowups[0] ?? null;

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
        firstOrderRevenue: 0,
        repeatRevenue: 0,
        lastOrderAt: null,
        daysSinceLastOrder: null,
        lastProducts: [],
        segment: "lead",
        tags: tagsByKey.get(key) ?? [],
        followupDue: Boolean(nextDate && nextDate <= todayVn),
        nextFollowupDate: nextDate,
        notes: custNotes,
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
  const sentSet = new Set(sentLogs.map((l) => `${l.order_id}:${l.step_code}`));
  const automationQueue: AutomationQueueItem[] = [];

  for (const o of orders) {
    const c = ensureEntry(o.phone, o.email, o.name);
    c.ordersCount += 1;
    c.totalSpent += o.total;
    if (c.ordersCount === 1) c.firstOrderRevenue += o.total;
    else c.repeatRevenue += o.total;

    if (!c.lastOrderAt || o.created_at > c.lastOrderAt) {
      c.lastOrderAt = o.created_at;
      c.lastProducts = (itemsByOrder.get(o.id) ?? []).slice(0, 3);
      const t = Date.parse(o.created_at.replace(" ", "T") + "Z");
      if (!Number.isNaN(t)) {
        c.daysSinceLastOrder = Math.max(0, Math.floor((nowMs - t) / 86400000));
      }
    }

    if (o.status === "done") {
      const t = Date.parse(o.created_at.replace(" ", "T") + "Z");
      const days = Number.isNaN(t) ? 0 : Math.floor((nowMs - t) / 86400000);
      const prods = (itemsByOrder.get(o.id) ?? []).slice(0, 2);
      const prodLabel = prods[0] ? ` (${prods[0]})` : "";

      if (days >= 3 && days <= 7 && !sentSet.has(`${o.id}:day3_guide`)) {
        automationQueue.push({
          orderId: o.id,
          orderCode: o.code,
          customerName: o.name,
          phone: normalizePhone(o.phone) ?? "",
          email: normalizeEmail(o.email) ?? "",
          stepCode: "day3_guide",
          daysSinceOrder: days,
          products: prods,
          messageText: `Dạ chào anh/chị ${o.name}, em bên Thực Dưỡng Phúc Thọ ạ. Đơn hàng #${o.code}${prodLabel} anh/chị nhận được 3 ngày rồi, không biết mình dùng thấy hợp khẩu vị không ạ? Nếu cần hướng dẫn chi tiết cách nấu/pha chuẩn Thực dưỡng, anh/chị nhắn em hỗ trợ ngay nhé!`,
        });
      } else if (days >= 25 && days <= 35 && !sentSet.has(`${o.id}:day25_refill`)) {
        automationQueue.push({
          orderId: o.id,
          orderCode: o.code,
          customerName: o.name,
          phone: normalizePhone(o.phone) ?? "",
          email: normalizeEmail(o.email) ?? "",
          stepCode: "day25_refill",
          daysSinceOrder: days,
          products: prods,
          messageText: `Dạ chào anh/chị ${o.name}, em bên Thực Dưỡng Phúc Thọ ạ. Thấm thoắt đã gần 1 tháng từ đơn #${o.code}${prodLabel}, không biết nhà mình sắp dùng hết chưa ạ? Đặt lại hôm nay em ưu tiên gửi hàng date mới nhất và tích thêm điểm thưởng cho mình nhé!`,
        });
      }
    }
  }

  const customers = Array.from(map.values()).map((c) => ({
    ...c,
    segment: classifyRfm(c.ordersCount, c.totalSpent, c.daysSinceLastOrder),
  }));

  customers.sort((a, b) => {
    if (a.followupDue !== b.followupDue) return a.followupDue ? -1 : 1;
    return b.totalSpent - a.totalSpent || b.ordersCount - a.ordersCount;
  });

  // Retention & Advisor Analytics
  const buyers = customers.filter((c) => c.ordersCount > 0);
  const repeatBuyers = buyers.filter((c) => c.ordersCount >= 2).length;
  const newRevenue = buyers.reduce((s, c) => s + c.firstOrderRevenue, 0);
  const returningRevenue = buyers.reduce((s, c) => s + c.repeatRevenue, 0);

  const advisorMap = new Map<string, { notesCount: number; followupsDone: number; keys: Set<string> }>();
  for (const n of notes) {
    const email = n.admin_email || "Admin";
    const cur = advisorMap.get(email) ?? { notesCount: 0, followupsDone: 0, keys: new Set<string>() };
    cur.notesCount += 1;
    if (n.followup_done === 1) cur.followupsDone += 1;
    cur.keys.add(n.customer_key);
    advisorMap.set(email, cur);
  }

  const advisorStats = Array.from(advisorMap.entries()).map(([adminEmail, v]) => ({
    adminEmail,
    notesCount: v.notesCount,
    followupsDone: v.followupsDone,
    caredCustomers: v.keys.size,
  }));

  return {
    customers,
    analytics: {
      totalBuyers: buyers.length,
      repeatBuyers,
      repeatRatePct: buyers.length > 0 ? Math.round((repeatBuyers / buyers.length) * 100) : 0,
      newRevenue,
      returningRevenue,
      advisorStats,
    },
    automationQueue,
    allTags: Array.from(tagSet),
  };
}

export async function addCrmNote(params: {
  customerKey: string;
  adminEmail: string;
  note: string;
  nextFollowupDate?: string | null;
}) {
  // Adding a new note resolves older due followups on the same customer
  await run("UPDATE crm_notes SET followup_done = 1 WHERE customer_key = ? AND followup_done = 0", params.customerKey);
  await run(
    "INSERT INTO crm_notes (customer_key, admin_email, note, next_followup_date, followup_done) VALUES (?, ?, ?, ?, 0)",
    params.customerKey,
    params.adminEmail,
    params.note.trim(),
    params.nextFollowupDate || null,
  );
}

export async function markFollowupsDone(customerKey: string) {
  await run("UPDATE crm_notes SET followup_done = 1 WHERE customer_key = ? AND followup_done = 0", customerKey);
}

export async function addCustomerTag(customerKey: string, rawTag: string) {
  let tag = rawTag.trim().replace(/\s+/g, "_");
  if (!tag) return;
  if (!tag.startsWith("#")) tag = `#${tag}`;
  await run("INSERT OR IGNORE INTO crm_customer_tags (customer_key, tag) VALUES (?, ?)", customerKey, tag.slice(0, 40));
}

export async function removeCustomerTag(customerKey: string, tag: string) {
  await run("DELETE FROM crm_customer_tags WHERE customer_key = ? AND tag = ?", customerKey, tag);
}

export async function markAutomationSent(orderId: number, stepCode: string, channel: string, recipient: string) {
  await run(
    "INSERT OR IGNORE INTO crm_automation_logs (order_id, step_code, channel, recipient) VALUES (?, ?, ?, ?)",
    orderId,
    stepCode,
    channel,
    recipient,
  );
}

export async function runCrmEmailAutomation(): Promise<{ processed: number; sent: number; skipped: number }> {
  const { automationQueue } = await getCrmDashboardData();
  let sent = 0;
  let skipped = 0;

  for (const item of automationQueue) {
    if (!item.email) {
      skipped++;
      continue;
    }
    const subject =
      item.stepCode === "day3_guide"
        ? `[Thực Dưỡng Phúc Thọ] Hướng dẫn sử dụng đơn hàng #${item.orderCode}`
        : `[Thực Dưỡng Phúc Thọ] Hỏi thăm & ưu đãi đặt lại đơn hàng #${item.orderCode}`;
    const html = `
      <div style="font-family:sans-serif;line-height:1.6;color:#1f2937">
        <p>Kính chào anh/chị <strong>${item.customerName}</strong>,</p>
        <p>${item.messageText}</p>
        <p>Quý khách có thể xem lại đơn hàng và điểm thưởng tại:
          <a href="https://thucduongshop.duyvo.win/thanh-vien/">thucduongshop.duyvo.win/thanh-vien/</a>
        </p>
        <p>Trân trọng,<br/><strong>Thực Dưỡng Phúc Thọ</strong> · Hotline: 0767.518.592</p>
      </div>
    `;
    const ok = await sendEmail({ to: item.email, subject, html });
    if (ok) {
      await markAutomationSent(item.orderId, item.stepCode, "email", item.email);
      sent++;
    } else {
      skipped++;
    }
  }

  return { processed: automationQueue.length, sent, skipped };
}
