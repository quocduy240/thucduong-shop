import { requireAdmin } from "@/lib/auth";
import { listMembersData } from "@/lib/admin-data";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: Request) {
  await requireAdmin();
  const type = new URL(req.url).searchParams.get("type") ?? "subscribers";
  const { members, subscribers } = await listMembersData();

  if (type === "members") {
    const header = ["ID", "Ho ten", "Email", "So dien thoai", "Hang thanh vien", "Diem tich luy", "Ngay dang ky"].join(",");
    const lines = members.map((m) =>
      [m.id, esc(m.name), esc(m.email), esc(m.phone), esc(m.tier), m.points, esc(m.created_at)].join(","),
    );
    return new Response("\uFEFF" + [header, ...lines].join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="thanh-vien-phuc-tho.csv"',
      },
    });
  }

  const header = ["ID", "Email", "Nguon dang ky", "Trang thai", "Ngay dang ky"].join(",");
  const lines = subscribers.map((s) =>
    [s.id, esc(s.email), esc(s.source), esc(s.status), esc(s.created_at)].join(","),
  );
  return new Response("\uFEFF" + [header, ...lines].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="email-nhan-tin-phuc-tho.csv"',
    },
  });
}
