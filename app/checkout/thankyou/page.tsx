import Link from "next/link";
import { one } from "@/lib/db";
import { vnd } from "@/lib/site";

export const metadata = { title: "Đặt hàng thành công" };

export default async function ThankYou({ searchParams }: PageProps<"/checkout/thankyou">) {
  const code = String((await searchParams).code ?? "");
  const order = one<{ code: string; name: string; total: number; payment: string }>(
    "SELECT code, name, total, payment FROM orders WHERE code = ?",
    code,
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="mt-4 text-2xl font-bold text-brand">Đặt hàng thành công!</h1>
      {order ? (
        <p className="mt-3 text-gray-600">
          Cảm ơn {order.name}. Mã đơn hàng: <b>{order.code}</b> - Tổng: <b>{vnd(order.total)}</b>
          {order.payment === "bank" && <><br />Vui lòng chuyển khoản theo hướng dẫn chúng tôi gửi qua điện thoại.</>}
        </p>
      ) : (
        <p className="mt-3 text-gray-600">Chúng tôi sẽ liên hệ để xác nhận đơn hàng.</p>
      )}
      <Link href="/" className="mt-6 inline-block rounded-full bg-brand px-5 py-2 text-white">Về trang chủ</Link>
    </div>
  );
}
