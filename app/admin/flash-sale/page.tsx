import Link from "next/link";
import {
  autoGenerateFlashSaleAction,
  deleteFlashSaleItemAction,
  deleteFlashSaleSlotAction,
  saveFlashSaleConfigAction,
  saveFlashSaleItemAction,
  saveFlashSaleSlotAction,
} from "@/app/admin/actions";
import { Flash, PageHeader } from "@/components/admin/ui";
import { all } from "@/lib/db";
import { getFlashSaleConfig, getFlashSaleItems, getFlashSaleSlots } from "@/lib/flash-sale";
import { vnd } from "@/lib/site";

export const metadata = { title: "Quản lý Giờ Vàng Săn Sale (Flash Sale)" };

export default async function AdminFlashSalePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const [config, slots, items, products] = await Promise.all([
    getFlashSaleConfig(),
    getFlashSaleSlots(),
    getFlashSaleItems(),
    all<{ id: number; name: string; price: number; sale_price: number | null; stock: number }>(
      "SELECT id, name, price, sale_price, stock FROM products WHERE price > 0 ORDER BY name ASC",
    ),
  ]);

  const totalSold = items.reduce((acc, it) => acc + it.sold, 0);
  const totalQuota = items.reduce((acc, it) => acc + it.quota, 0);

  return (
    <div>
      <PageHeader title="⚡ Quản lý Giờ Vàng Săn Sale (Flash Sale)">
        <Link
          href="/"
          target="_blank"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
        >
          👁️ Xem ngoài Trang chủ ↗
        </Link>
      </PageHeader>
      <p className="-mt-4 mb-5 text-xs text-gray-500">
        Hệ thống khuyến mãi theo khung giờ vàng lấy cảm hứng từ Tiến Khang (11h-14h, 19h-22h) kết hợp tự động hóa xoay vòng 24/7.
      </p>

      <Flash saved={sp.saved === "1"} error={sp.err} />

      {/* Thống kê tổng quan */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Trạng thái chiến dịch</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-extrabold">
            {config.enabled ? (
              <span className="text-emerald-600">🟢 Đang kích hoạt</span>
            ) : (
              <span className="text-gray-400">⚪ Đang tạm tắt</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Chế độ: {config.mode === "auto_24h" ? "Tự động xoay vòng 24/7" : "Khung giờ nghiêm ngặt"}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Khung Giờ Vàng</div>
          <div className="mt-1 text-2xl font-extrabold text-brand">{slots.length} khung giờ</div>
          <div className="mt-1 text-[11px] text-gray-500">
            Reset tự động mỗi ngày: {config.auto_reset_daily ? "Bật (Hôm nay: " + config.last_reset_date + ")" : "Tắt"}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Sản phẩm đang Săn Sale</div>
          <div className="mt-1 text-2xl font-extrabold text-red-600">{items.length} deal</div>
          <div className="mt-1 text-[11px] text-gray-500">Ưu đãi giảm 10% – 20% trực tiếp</div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Lượt săn ưu đãi hôm nay</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-600">
            {totalSold} / {totalQuota} suất
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Tự động cộng khi khách đặt hàng</div>
        </div>
      </div>

      {/* Khối 1: Cấu hình chung & Tự động hóa 1-Click */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Cấu hình chiến dịch */}
        <form action={saveFlashSaleConfigAction} className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-base font-bold text-gray-900">1. Cấu hình Hiển thị & Tự động hóa hàng ngày</h2>
            <p className="text-xs text-gray-500">
              Tuỳ chỉnh tiêu đề, chế độ vận hành khung giờ và tự động reset số suất săn sale mỗi ngày mới.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-gray-700">
              Trạng thái hiển thị
              <select
                name="enabled"
                defaultValue={config.enabled ? "1" : "0"}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="1">🟢 Bật Giờ Vàng Săn Sale</option>
                <option value="0">⚪ Tạm ẩn</option>
              </select>
            </label>

            <label className="block text-xs font-semibold text-gray-700">
              Chế độ vận hành Khung Giờ
              <select
                name="mode"
                defaultValue={config.mode}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="auto_24h">🔄 Luôn kích hoạt khung giờ gần nhất (24/7)</option>
                <option value="strict_slots">⏰ Chỉ mở bán đúng giờ quy định</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-gray-700">
            Tiêu đề khối Giờ Vàng Săn Sale
            <input
              name="title"
              defaultValue={config.title}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-semibold text-gray-700">
            Mô tả phụ (Subtitle)
            <input
              name="subtitle"
              defaultValue={config.subtitle}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              name="auto_reset_daily"
              value="1"
              defaultChecked={config.auto_reset_daily}
              className="h-4 w-4 rounded border-gray-300 text-brand"
            />
            <span>
              Tự động làm mới (Reset) số lượng đã bán sang ngày mới lúc 00:00 để chiến dịch chạy tự động mỗi ngày
            </span>
          </label>

          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer"
          >
            💾 Lưu cấu hình Giờ Vàng
          </button>
        </form>

        {/* Tự động hóa phân bổ sản phẩm 1-Click */}
        <form
          action={autoGenerateFlashSaleAction}
          className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-red-50/40 p-5 shadow-sm flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="border-b border-amber-200 pb-3">
              <div className="inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white mb-1">
                AI & Automation
              </div>
              <h2 className="text-base font-bold text-gray-900">
                2. Tự động chọn & chia sản phẩm vào các Khung Giờ Vàng
              </h2>
              <p className="text-xs text-gray-600">
                Chỉ với 1 cú nhấp chuột, hệ thống sẽ tự động lấy các sản phẩm nổi bật còn hàng, tính giá giảm theo % và phân bổ đều 4 sản phẩm vào mỗi khung giờ kèm quà tặng thực dưỡng.
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-gray-700">
                Mức giảm giá tự động (%)
                <input
                  type="number"
                  name="discount_pct"
                  defaultValue={15}
                  min={5}
                  max={50}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-xs font-semibold text-gray-700">
                Số suất ưu đãi mỗi sản phẩm (Quota)
                <input
                  type="number"
                  name="quota"
                  defaultValue={20}
                  min={5}
                  max={500}
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-700">
              <input
                type="checkbox"
                name="replace_existing"
                value="1"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-red-600"
              />
              <span>Làm mới toàn bộ danh sách sản phẩm trong các khung giờ hiện tại</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-red-600 to-amber-600 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow hover:from-red-700 hover:to-amber-700 cursor-pointer"
          >
            ⚡ Tự động tạo & phân bổ Deal Giờ Vàng ngay
          </button>
        </form>
      </div>

      {/* Khối 2: Quản lý các Khung Giờ Vàng (Time Slots) */}
      <div className="mb-8 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">
          3. Danh sách Khung Giờ Vàng trong ngày ({slots.length})
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Tham khảo chuẩn Tiến Khang: Khung trưa (11:00 – 14:00) và Khung tối (19:00 – 22:00/24:00), kèm khung sáng và chiều.
        </p>

        <div className="space-y-3">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-stone-50/70 p-3"
            >
              <form action={saveFlashSaleSlotAction} className="flex flex-1 flex-wrap items-center gap-2.5">
                <input type="hidden" name="id" value={slot.id} />
                <input
                  name="name"
                  defaultValue={slot.name}
                  placeholder="Tên khung giờ"
                  className="w-48 rounded border bg-white px-2.5 py-1.5 text-xs font-semibold"
                />
                <div className="flex items-center gap-1 text-xs">
                  <span>Từ:</span>
                  <input
                    type="number"
                    name="start_hour"
                    defaultValue={slot.start_hour}
                    min={0}
                    max={23}
                    className="w-14 rounded border bg-white px-2 py-1.5 text-center font-mono text-xs"
                  />
                  <span>h đến</span>
                  <input
                    type="number"
                    name="end_hour"
                    defaultValue={slot.end_hour}
                    min={1}
                    max={24}
                    className="w-14 rounded border bg-white px-2 py-1.5 text-center font-mono text-xs"
                  />
                  <span>h</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span>Giảm mặc định:</span>
                  <input
                    type="number"
                    name="discount_pct"
                    defaultValue={slot.discount_pct}
                    min={1}
                    max={90}
                    className="w-14 rounded border bg-white px-2 py-1.5 text-center font-bold text-red-600 text-xs"
                  />
                  <span>%</span>
                </div>
                <select
                  name="active"
                  defaultValue={slot.active ? "1" : "0"}
                  className="rounded border bg-white px-2 py-1.5 text-xs"
                >
                  <option value="1">Đang bật</option>
                  <option value="0">Tạm ẩn</option>
                </select>
                <button
                  type="submit"
                  className="rounded bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark cursor-pointer"
                >
                  Lưu
                </button>
              </form>
              <form action={deleteFlashSaleSlotAction}>
                <input type="hidden" name="id" value={slot.id} />
                <button
                  type="submit"
                  className="rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  Xóa khung giờ
                </button>
              </form>
            </div>
          ))}

          {/* Thêm khung giờ mới */}
          <form
            action={saveFlashSaleSlotAction}
            className="flex flex-wrap items-center gap-2.5 rounded-lg border border-dashed border-brand/40 bg-green-50/30 p-3"
          >
            <span className="text-xs font-bold text-brand">+ Thêm khung giờ:</span>
            <input
              name="name"
              placeholder="VD: Giờ Vàng Đêm Khuya"
              required
              className="w-48 rounded border bg-white px-2.5 py-1.5 text-xs"
            />
            <div className="flex items-center gap-1 text-xs">
              <span>Từ:</span>
              <input
                type="number"
                name="start_hour"
                defaultValue={22}
                min={0}
                max={23}
                className="w-14 rounded border bg-white px-2 py-1.5 text-center text-xs"
              />
              <span>h đến</span>
              <input
                type="number"
                name="end_hour"
                defaultValue={24}
                min={1}
                max={24}
                className="w-14 rounded border bg-white px-2 py-1.5 text-center text-xs"
              />
              <span>h</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span>Giảm:</span>
              <input
                type="number"
                name="discount_pct"
                defaultValue={15}
                min={1}
                max={90}
                className="w-14 rounded border bg-white px-2 py-1.5 text-center text-xs"
              />
              <span>%</span>
            </div>
            <input type="hidden" name="active" value="1" />
            <button
              type="submit"
              className="rounded bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer"
            >
              + Thêm Khung Giờ
            </button>
          </form>
        </div>
      </div>

      {/* Khối 3: Thêm sản phẩm vào Khung Giờ Vàng & Danh sách chi tiết */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">
          4. Quản lý Sản phẩm Săn Sale trong từng Khung Giờ ({items.length} sản phẩm)
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Nếu bạn để trống ô &ldquo;Giá Flash Sale&rdquo; khi thêm mới, hệ thống sẽ tự động tính giá giảm theo % của khung giờ đó.
        </p>

        {/* Form thêm nhanh sản phẩm vào khung giờ */}
        <form
          action={saveFlashSaleItemAction}
          className="mb-6 grid gap-3 rounded-xl border border-red-200 bg-red-50/40 p-4 md:grid-cols-6"
        >
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Chọn sản phẩm *</label>
            <select name="product_id" required className="w-full rounded border bg-white px-2.5 py-2 text-xs">
              <option value="">-- Chọn sản phẩm thực dưỡng --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({vnd(p.sale_price ?? p.price)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Khung giờ *</label>
            <select name="slot_id" required className="w-full rounded border bg-white px-2.5 py-2 text-xs">
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {String(s.start_hour).padStart(2, "0")}h-{String(s.end_hour).padStart(2, "0")}h ({s.name} -{s.discount_pct}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Giá Giờ Vàng (đ)</label>
            <input
              type="number"
              name="flash_price"
              placeholder="Để trống = Tự tính"
              className="w-full rounded border bg-white px-2.5 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Tổng suất / Đã bán</label>
            <div className="flex gap-1">
              <input
                type="number"
                name="quota"
                defaultValue={20}
                min={1}
                className="w-1/2 rounded border bg-white px-2 py-2 text-xs"
                title="Tổng suất"
              />
              <input
                type="number"
                name="sold"
                defaultValue={5}
                min={0}
                className="w-1/2 rounded border bg-white px-2 py-2 text-xs"
                title="Đã bán"
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <input
              type="hidden"
              name="gift_note"
              value="Tặng cẩm nang Thực Dưỡng"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
            >
              ⚡ Thêm vào Giờ Vàng
            </button>
          </div>
        </form>

        {/* Bảng danh sách sản phẩm theo từng khung giờ */}
        <div className="space-y-6">
          {slots.map((slot) => {
            const slotItems = items.filter((i) => i.slot_id === slot.id);
            return (
              <div key={slot.id} className="rounded-xl border overflow-hidden">
                <div className="bg-stone-100 px-4 py-2.5 flex items-center justify-between border-b">
                  <div className="font-bold text-xs md:text-sm text-stone-800">
                    ⏰ {String(slot.start_hour).padStart(2, "0")}:00 - {String(slot.end_hour).padStart(2, "0")}:00 · {slot.name} (Giảm chuẩn -{slot.discount_pct}%)
                  </div>
                  <span className="text-xs text-stone-500">{slotItems.length} sản phẩm</span>
                </div>

                {slotItems.length > 0 ? (
                  <div className="divide-y">
                    {slotItems.map((item) => {
                      const pct =
                        item.original_price > item.flash_price
                          ? Math.round(((item.original_price - item.flash_price) / item.original_price) * 100)
                          : 0;
                      return (
                        <div
                          key={item.id}
                          className="p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-stone-50"
                        >
                          <form
                            action={saveFlashSaleItemAction}
                            className="flex flex-1 flex-wrap items-center gap-2.5"
                          >
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="slot_id" value={item.slot_id} />
                            <input type="hidden" name="product_id" value={item.product_id} />
                            <input type="hidden" name="sort" value={item.sort} />
                            <input type="hidden" name="active" value="1" />

                            <div className="min-w-[200px] flex-1">
                              <div className="font-bold text-xs text-gray-900">{item.product_name}</div>
                              <div className="text-[11px] text-gray-500">
                                Giá gốc: <span className="line-through">{vnd(item.original_price)}</span> · Giảm{" "}
                                <strong className="text-red-600">-{pct}%</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-gray-500">Giá Sale:</span>
                              <input
                                type="number"
                                name="flash_price"
                                defaultValue={item.flash_price}
                                className="w-24 rounded border px-2 py-1 font-bold text-red-600 text-xs"
                              />
                            </div>

                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-gray-500">Đã bán/Tổng:</span>
                              <input
                                type="number"
                                name="sold"
                                defaultValue={item.sold}
                                className="w-12 rounded border px-1.5 py-1 text-center text-xs"
                              />
                              <span>/</span>
                              <input
                                type="number"
                                name="quota"
                                defaultValue={item.quota}
                                className="w-12 rounded border px-1.5 py-1 text-center text-xs"
                              />
                            </div>

                            <input
                              name="gift_note"
                              defaultValue={item.gift_note}
                              placeholder="Quà tặng kèm..."
                              className="w-44 rounded border px-2 py-1 text-xs"
                            />

                            <button
                              type="submit"
                              className="rounded bg-stone-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black cursor-pointer"
                            >
                              Cập nhật
                            </button>
                          </form>

                          <form action={deleteFlashSaleItemAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <button
                              type="submit"
                              className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              Xóa
                            </button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-400">
                    Chưa có sản phẩm nào trong khung giờ này.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
