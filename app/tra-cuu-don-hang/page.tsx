import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui";
import OrderLookupClient from "@/components/OrderLookupClient";

export const metadata: Metadata = {
  title: "Tra cứu đơn hàng",
  description: "Kiểm tra trạng thái xử lý, giao hàng và điểm thưởng tích lũy của đơn hàng tại Thực Dưỡng Phúc Thọ.",
};

export default async function OrderLookupPage({ searchParams }: PageProps<"/tra-cuu-don-hang">) {
  const initialCode = String((await searchParams).code ?? "").trim().toUpperCase();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16">
      <Breadcrumb items={[{ label: "Tra cứu đơn hàng" }]} />
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-green-50 p-6">
        <h1 className="text-2xl font-extrabold text-gray-900">🔍 Tra cứu Trạng thái Đơn hàng</h1>
        <p className="mt-1 text-sm text-gray-600">
          Nhập Mã đơn hàng và Số điện thoại đặt hàng để kiểm tra tiến độ giao hàng và điểm tích lũy.
        </p>
      </div>
      <OrderLookupClient initialCode={initialCode} />
    </div>
  );
}
