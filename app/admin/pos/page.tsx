import Link from "next/link";
import AdminPosClient from "@/components/admin/AdminPosClient";
import { Flash, PageHeader, strParam, ui } from "@/components/admin/ui";
import { requireRole } from "@/lib/auth";
import { listInventoryProducts } from "@/lib/retail-ops";

export const metadata = { title: "Bán hàng nhanh (POS) | Quản trị" };

export default async function AdminPosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["super_admin", "admin", "sales"]);
  const sp = await searchParams;
  const products = await listInventoryProducts({ limit: 300 });

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <PageHeader title="🛒 Bán hàng tại quầy & Lên đơn nhanh (POS)">
        <Link href="/admin/orders/" prefetch={false} className={ui.secondary}>
          🧾 Danh sách đơn hàng
        </Link>
        <Link href="/admin/inventory/" prefetch={false} className={ui.secondary}>
          📦 Kho &amp; Sổ quỹ
        </Link>
      </PageHeader>
      <Flash saved={strParam(sp.saved)} error={strParam(sp.error)} />

      <AdminPosClient
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          sale_price: p.sale_price,
          stock: p.stock,
          category_name: p.category_name,
        }))}
      />
    </div>
  );
}
