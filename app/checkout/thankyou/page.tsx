import Link from "next/link";
import { one } from "@/lib/db";
import { vnd } from "@/lib/site";

export const metadata = { title: "Đặt hàng thành công" };

export default async function ThankYou({ searchParams }: PageProps<"/checkout/thankyou">) {
  const code = String((await searchParams).code ?? "");
  const order = await one<{ code: string; name: string; total: number; payment: string }>(
    "SELECT code, name, total, payment FROM orders WHERE code = ?",
    code,
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="mt-4 text-2xl font-bold text-brand">Đặt hàng thành công!</h1>
      {order ? (
        <div className="mt-3 space-y-4 text-gray-700">
          <p>
            Cảm ơn <b>{order.name}</b>. Mã đơn hàng: <b>{order.code}</b> — Tổng thanh toán: <b className="text-accent">{vnd(order.total)}</b>
          </p>
          {order.payment === "bank" && (
            <div className="mx-auto max-w-md rounded-xl border border-green-200 bg-green-50 p-4 text-left text-sm space-y-1.5">
              <div className="font-bold text-brand">Thông tin chuyển khoản ngân hàng:</div>
              <div>• <strong>Ngân hàng:</strong> BIDV</div>
              <div>• <strong>Số tài khoản (STK):</strong> <span className="font-mono font-bold text-accent">8610312888</span></div>
              <div>• <strong>Chủ tài khoản:</strong> HO KINH DOANH CUA HANG PHUC THO</div>
              <div>• <strong>Số tiền:</strong> <span className="font-bold text-accent">{vnd(order.total)}</span></div>
              <div>• <strong>Nội dung CK:</strong> <span className="font-mono font-semibold">{order.code} - {order.name}</span></div>
            </div>
          )}
          <div className="mx-auto max-w-md rounded-xl border bg-white p-3.5 text-left text-xs text-gray-600 space-y-1">
            <div>• <strong>Thời gian giao hàng dự kiến:</strong> 1 – 2 ngày tại TP.HCM, 3 – 4 ngày tại các khu vực khác.</div>
            <div>• <strong>Lưu ý khi nhận hàng:</strong> Quý khách được đồng kiểm với nhân viên giao hàng (hoặc trong 30 phút sau khi nhận) và vui lòng quay video lúc mở thùng hàng để đối chiếu khi cần thiết.</div>
            <div>• <strong>Hotline hỗ trợ:</strong> 0767.518.592 - 0858.816.070</div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-gray-600">Chúng tôi sẽ liên hệ để xác nhận đơn hàng.</p>
      )}
      <Link href="/" className="mt-6 inline-block rounded-full bg-brand px-5 py-2 text-white">Về trang chủ</Link>
    </div>
  );
}
