"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminProductCategoryRow } from "@/lib/admin-data";
import CategoryDeleteControl from "./CategoryDeleteControl";

type PostCategoryRow = {
  id: number;
  slug: string;
  name: string;
  section_slug: string;
  n: number;
};

type SectionOption = { slug: string; name: string };

type QuickItem = {
  id: number;
  name?: string;
  title?: string;
  slug: string;
  price?: number;
  stock?: number;
  created_at?: string;
};

function slugifyVi(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriesManagerClient({
  initialProductCats,
  initialPostCats,
  sections,
  saveProductCategoryAction,
  deleteProductCategoryAction,
  savePostCategoryAction,
  deletePostCategoryAction,
}: {
  initialProductCats: AdminProductCategoryRow[];
  initialPostCats: PostCategoryRow[];
  sections: SectionOption[];
  saveProductCategoryAction: (fd: FormData) => Promise<void>;
  deleteProductCategoryAction: (fd: FormData) => Promise<void>;
  savePostCategoryAction: (fd: FormData) => Promise<void>;
  deletePostCategoryAction: (fd: FormData) => Promise<void>;
}) {
  const [tab, setTab] = useState<"products" | "posts">("products");
  const [search, setSearch] = useState("");
  const [productCats, setProductCats] = useState<AdminProductCategoryRow[]>(initialProductCats);
  const [postCats, setPostCats] = useState<PostCategoryRow[]>(initialPostCats);
  const [originalSlugs] = useState<Record<number, string>>(() =>
    Object.fromEntries(initialProductCats.map((c) => [c.id, c.slug])),
  );

  const [seoOpenId, setSeoOpenId] = useState<number | null>(null);
  const [newProdName, setNewProdName] = useState("");
  const [newProdSlug, setNewProdSlug] = useState("");
  const [newSlugTouched, setNewSlugTouched] = useState(false);

  const [newPostName, setNewPostName] = useState("");
  const [newPostSlug, setNewPostSlug] = useState("");
  const [newPostSlugTouched, setNewPostSlugTouched] = useState(false);

  // Quick-view & bulk move items drawer state
  const [inspectTarget, setInspectTarget] = useState<{
    type: "product" | "post";
    categoryId: number;
    categoryName: string;
  } | null>(null);
  const [inspectItems, setInspectItems] = useState<QuickItem[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [selectedMoveIds, setSelectedMoveIds] = useState<number[]>([]);
  const [moveTargetId, setMoveTargetId] = useState<string>("-1");

  const [savingAll, setSavingAll] = useState(false);
  const [movingItems, setMovingItems] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const q = search.trim().toLowerCase();
  const filteredProductCats = useMemo(
    () =>
      q
        ? productCats.filter(
            (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
          )
        : productCats,
    [productCats, q],
  );

  const filteredPostCats = useMemo(
    () =>
      q
        ? postCats.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.slug.toLowerCase().includes(q) ||
              c.section_slug.toLowerCase().includes(q),
          )
        : postCats,
    [postCats, q],
  );

  const totalProducts = useMemo(
    () => productCats.reduce((sum, c) => sum + c.n, 0),
    [productCats],
  );
  const totalInStock = useMemo(
    () => productCats.reduce((sum, c) => sum + c.in_stock_count, 0),
    [productCats],
  );

  function updateProductCat(id: number, patch: Partial<AdminProductCategoryRow>) {
    setProductCats((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function moveCategoryOrder(id: number, dir: -1 | 1) {
    setProductCats((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy.map((c, i) => ({ ...c, sort: i + 1 }));
    });
  }

  async function saveAllProductCategories() {
    setSavingAll(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/categories/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_save_product_categories",
          items: productCats,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "Không thể lưu danh mục.");
        return;
      }
      if (Array.isArray(d.productCats)) setProductCats(d.productCats);
      setMsg("✓ Đã lưu toàn bộ danh mục sản phẩm, thứ tự, cấu hình hiển thị & SEO!");
    } catch {
      setErr("Lỗi kết nối máy chủ.");
    } finally {
      setSavingAll(false);
    }
  }

  async function openInspector(type: "product" | "post", categoryId: number, categoryName: string) {
    if (inspectTarget?.type === type && inspectTarget.categoryId === categoryId) {
      setInspectTarget(null);
      return;
    }
    setInspectTarget({ type, categoryId, categoryName });
    setInspectLoading(true);
    setSelectedMoveIds([]);
    if (type === "product") {
      const firstOther = productCats.find((c) => c.id !== categoryId);
      setMoveTargetId(firstOther ? String(firstOther.id) : "-1");
    } else {
      const firstOther = postCats.find((c) => c.id !== categoryId);
      setMoveTargetId(firstOther ? String(firstOther.id) : "");
    }
    try {
      const res = await fetch(`/api/admin/categories/?type=${type}&category_id=${categoryId}`);
      const d = await res.json().catch(() => ({}));
      setInspectItems(Array.isArray(d.items) ? d.items : []);
    } catch {
      setInspectItems([]);
    } finally {
      setInspectLoading(false);
    }
  }

  async function handleBulkMoveItems() {
    if (!inspectTarget || selectedMoveIds.length === 0 || !moveTargetId) return;
    setMovingItems(true);
    setMsg("");
    setErr("");
    try {
      const action = inspectTarget.type === "product" ? "move_products" : "move_posts";
      const payload =
        inspectTarget.type === "product"
          ? { action, product_ids: selectedMoveIds, target_category_id: Number(moveTargetId) }
          : { action, post_ids: selectedMoveIds, target_category_id: Number(moveTargetId) };

      const res = await fetch("/api/admin/categories/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "Không thể chuyển mục đã chọn.");
        return;
      }
      if (Array.isArray(d.productCats)) setProductCats(d.productCats);
      if (Array.isArray(d.postCats)) setPostCats(d.postCats);
      setInspectItems((prev) => prev.filter((it) => !selectedMoveIds.includes(it.id)));
      setSelectedMoveIds([]);
      setMsg(`✓ Đã chuyển ${d.moved ?? selectedMoveIds.length} mục sang danh mục mới!`);
    } catch {
      setErr("Lỗi kết nối máy chủ.");
    } finally {
      setMovingItems(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Stats + Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("products")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              tab === "products"
                ? "bg-brand text-white shadow-sm"
                : "border bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            🛍️ Danh mục Sản phẩm ({productCats.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("posts")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              tab === "posts"
                ? "bg-brand text-white shadow-sm"
                : "border bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
          >
            📝 Chuyên mục Bài viết ({postCats.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-800">
            Tổng: {totalProducts} SP ({totalInStock} còn hàng)
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm tên hoặc slug..."
            className="w-56 rounded-xl border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-brand"
          />
        </div>
      </div>

      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${
            err
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* TAB 1: PRODUCT CATEGORIES */}
      {tab === "products" && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              Dùng nút <strong>↑ / ↓</strong> để đổi thứ tự hiển thị ngoài website, bật/tắt vị trí hiển thị (Menu, Trang chủ, Footer), bấm vào số <strong>SP</strong> để xem &amp; chuyển nhanh sản phẩm.
            </p>
            <button
              type="button"
              disabled={savingAll}
              onClick={saveAllProductCategories}
              className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {savingAll ? "Đang lưu tất cả..." : "💾 Lưu tất cả thay đổi"}
            </button>
          </div>

          <div className="divide-y rounded-2xl border bg-white shadow-2xs">
            {filteredProductCats.map((c, idx) => {
              const slugChanged = originalSlugs[c.id] && originalSlugs[c.id] !== c.slug;
              const isInspecting =
                inspectTarget?.type === "product" && inspectTarget.categoryId === c.id;

              return (
                <div
                  key={c.id}
                  className={`p-3.5 space-y-2.5 ${c.is_active === 0 ? "bg-gray-50/80 opacity-80" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Move Up/Down */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0 || Boolean(q)}
                        onClick={() => moveCategoryOrder(c.id, -1)}
                        title="Đưa lên trên"
                        className="cursor-pointer rounded border bg-gray-50 px-1.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === filteredProductCats.length - 1 || Boolean(q)}
                        onClick={() => moveCategoryOrder(c.id, 1)}
                        title="Đưa xuống dưới"
                        className="cursor-pointer rounded border bg-gray-50 px-1.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>

                    <input
                      value={c.name}
                      onChange={(e) => updateProductCat(c.id, { name: e.target.value })}
                      className="min-w-48 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-brand"
                      placeholder="Tên danh mục"
                    />
                    <input
                      value={c.slug}
                      onChange={(e) => updateProductCat(c.id, { slug: e.target.value })}
                      className="w-48 rounded-lg border border-gray-300 px-2.5 py-1.5 font-mono text-[11px] text-gray-700 outline-none focus:border-brand"
                      title="Đường dẫn URL (/san-pham/<slug>/)"
                    />

                    {/* Quick Inspector Button */}
                    <button
                      type="button"
                      onClick={() => openInspector("product", c.id, c.name)}
                      className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                        isInspecting
                          ? "border-brand bg-brand text-white"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                      title="Xem danh sách & chuyển nhanh sản phẩm trong danh mục này"
                    >
                      📦 {c.n} SP {c.out_stock_count > 0 ? `(${c.out_stock_count} hết)` : ""}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSeoOpenId(seoOpenId === c.id ? null : c.id)}
                      className="cursor-pointer rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                    >
                      📝 SEO &amp; Mô tả
                    </button>

                    <CategoryDeleteControl
                      categoryId={c.id}
                      categoryName={c.name}
                      itemCount={c.n}
                      itemLabel="sản phẩm"
                      targets={productCats.map((item) => ({ id: item.id, name: item.name }))}
                      allowUnassigned={c.slug !== "chua-phan-loai"}
                      action={deleteProductCategoryAction}
                    />
                  </div>

                  {/* Visibility Switches */}
                  <div className="flex flex-wrap items-center gap-4 pl-14 text-[11px]">
                    <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={c.show_in_menu !== 0}
                        onChange={(e) =>
                          updateProductCat(c.id, { show_in_menu: e.target.checked ? 1 : 0 })
                        }
                        className="h-3.5 w-3.5 accent-brand"
                      />
                      <span>Hiện Menu</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={c.show_in_home !== 0}
                        onChange={(e) =>
                          updateProductCat(c.id, { show_in_home: e.target.checked ? 1 : 0 })
                        }
                        className="h-3.5 w-3.5 accent-brand"
                      />
                      <span>Hiện Trang chủ</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={c.show_in_footer !== 0}
                        onChange={(e) =>
                          updateProductCat(c.id, { show_in_footer: e.target.checked ? 1 : 0 })
                        }
                        className="h-3.5 w-3.5 accent-brand"
                      />
                      <span>Hiện Footer</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={c.is_active !== 0}
                        onChange={(e) =>
                          updateProductCat(c.id, { is_active: e.target.checked ? 1 : 0 })
                        }
                        className="h-3.5 w-3.5 accent-amber-600"
                      />
                      <span className={c.is_active === 0 ? "text-amber-700 font-bold" : ""}>
                        {c.is_active === 0 ? "Đang Tạm ẩn" : "Đang Hoạt động"}
                      </span>
                    </label>
                    <a
                      href={`/san-pham/${c.slug}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto font-semibold text-brand hover:underline"
                    >
                      Xem trang danh mục ↗
                    </a>
                  </div>

                  {slugChanged && (
                    <div className="ml-14 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900">
                      ⚠️ Lưu ý SEO: Bạn đang đổi đường dẫn từ <code>{originalSlugs[c.id]}</code> sang{" "}
                      <code>{c.slug}</code> — URL của toàn bộ {c.n} sản phẩm trong nhóm này sẽ đổi theo.
                    </div>
                  )}

                  {/* Collapsible SEO & Description Box */}
                  {seoOpenId === c.id && (
                    <div className="ml-14 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 text-xs space-y-2.5">
                      <div>
                        <label className="mb-1 block font-bold text-gray-700">
                          Tiêu đề SEO (Meta Title — để trống sẽ dùng tên danh mục)
                        </label>
                        <input
                          value={c.seo_title}
                          onChange={(e) => updateProductCat(c.id, { seo_title: e.target.value })}
                          placeholder={`VD: ${c.name} Chính Hãng | Thực Dưỡng Phúc Thọ`}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-bold text-gray-700">
                          Đoạn giới thiệu đầu trang danh mục (Hiển thị trực tiếp dưới tiêu đề ngoài web)
                        </label>
                        <textarea
                          rows={2}
                          value={c.description}
                          onChange={(e) => updateProductCat(c.id, { description: e.target.value })}
                          placeholder="Giới thiệu ngắn về nhóm sản phẩm thực dưỡng này để hỗ trợ SEO và tư vấn khách hàng..."
                          className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Quick Product Inspector & Bulk Move */}
                  {isInspecting && (
                    <div className="ml-14 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-3.5 text-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-extrabold text-emerald-950">
                          📦 Sản phẩm trong &quot;{c.name}&quot; ({inspectItems.length})
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={moveTargetId}
                            onChange={(e) => setMoveTargetId(e.target.value)}
                            className="cursor-pointer rounded-lg border bg-white px-2.5 py-1 text-xs font-semibold"
                          >
                            {c.slug !== "chua-phan-loai" && (
                              <option value="-1">→ ? (Chưa phân loại)</option>
                            )}
                            {productCats
                              .filter((other) => other.id !== c.id)
                              .map((other) => (
                                <option key={other.id} value={other.id}>
                                  → {other.name}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            disabled={movingItems || selectedMoveIds.length === 0}
                            onClick={handleBulkMoveItems}
                            className="cursor-pointer rounded-lg bg-brand px-3 py-1 font-bold text-white hover:bg-brand-dark disabled:opacity-40"
                          >
                            {movingItems
                              ? "Đang chuyển..."
                              : `Chuyển ${selectedMoveIds.length} SP đã chọn`}
                          </button>
                        </div>
                      </div>

                      {inspectLoading ? (
                        <p className="text-gray-500">Đang tải danh sách sản phẩm...</p>
                      ) : inspectItems.length === 0 ? (
                        <p className="text-gray-500">Danh mục này chưa có sản phẩm nào.</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto rounded-lg border bg-white divide-y">
                          {inspectItems.map((it) => {
                            const checked = selectedMoveIds.includes(it.id);
                            return (
                              <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setSelectedMoveIds((prev) =>
                                        checked
                                          ? prev.filter((x) => x !== it.id)
                                          : [...prev, it.id],
                                      )
                                    }
                                    className="h-3.5 w-3.5 accent-brand"
                                  />
                                  <span className="truncate font-semibold text-gray-800">
                                    #{it.id} — {it.name}
                                  </span>
                                </label>
                                <div className="flex shrink-0 items-center gap-2 text-[11px]">
                                  <span className={it.stock && it.stock > 0 ? "text-emerald-700" : "text-red-600 font-bold"}>
                                    {it.stock && it.stock > 0 ? `Còn ${it.stock}` : "Hết hàng"}
                                  </span>
                                  <Link
                                    href={`/admin/products/${it.id}/`}
                                    className="rounded border px-2 py-0.5 font-bold text-brand hover:bg-emerald-50"
                                  >
                                    Sửa ↗
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add New Product Category */}
            <form
              action={saveProductCategoryAction}
              className="flex flex-wrap items-center gap-2 bg-gray-50 p-3.5 text-xs"
            >
              <input type="hidden" name="id" value="0" />
              <input type="hidden" name="is_active" value="1" />
              <input
                name="name"
                required
                value={newProdName}
                onChange={(e) => {
                  setNewProdName(e.target.value);
                  if (!newSlugTouched) setNewProdSlug(slugifyVi(e.target.value));
                }}
                placeholder="+ Tên danh mục sản phẩm mới..."
                className="min-w-48 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold"
              />
              <input
                name="slug"
                value={newProdSlug}
                onChange={(e) => {
                  setNewSlugTouched(true);
                  setNewProdSlug(e.target.value);
                }}
                placeholder="Đường dẫn slug (tự tạo)"
                className="w-48 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono"
              />
              <label className="flex cursor-pointer items-center gap-1 font-semibold text-gray-700">
                <input type="checkbox" name="show_in_menu" value="1" defaultChecked className="h-3.5 w-3.5 accent-brand" />
                <span>Menu</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1 font-semibold text-gray-700">
                <input type="checkbox" name="show_in_home" value="1" defaultChecked className="h-3.5 w-3.5 accent-brand" />
                <span>Trang chủ</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1 font-semibold text-gray-700">
                <input type="checkbox" name="show_in_footer" value="1" defaultChecked className="h-3.5 w-3.5 accent-brand" />
                <span>Footer</span>
              </label>
              <button className="cursor-pointer rounded-xl bg-brand px-4 py-1.5 font-extrabold text-white hover:bg-brand-dark">
                + Thêm danh mục
              </button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 2: POST CATEGORIES */}
      {tab === "posts" && (
        <section className="space-y-3">
          <div className="divide-y rounded-2xl border bg-white shadow-2xs">
            {filteredPostCats.map((c) => {
              const isInspecting =
                inspectTarget?.type === "post" && inspectTarget.categoryId === c.id;
              return (
                <div key={c.id} className="p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={savePostCategoryAction} className="flex flex-1 flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <select
                        name="section_slug"
                        defaultValue={c.section_slug}
                        className="w-40 cursor-pointer rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                      >
                        {sections.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="name"
                        defaultValue={c.name}
                        required
                        className="min-w-48 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold"
                      />
                      <input
                        name="slug"
                        defaultValue={c.slug}
                        required
                        className="w-48 rounded-lg border border-gray-300 px-2.5 py-1.5 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => openInspector("post", c.id, c.name)}
                        className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          isInspecting
                            ? "border-brand bg-brand text-white"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        📝 {c.n} bài
                      </button>
                      <button className="cursor-pointer rounded-lg border bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100">
                        Lưu
                      </button>
                    </form>
                    <CategoryDeleteControl
                      categoryId={c.id}
                      categoryName={c.name}
                      itemCount={c.n}
                      itemLabel="bài viết"
                      targets={postCats.map((item) => ({ id: item.id, name: item.name }))}
                      allowUnassigned={c.slug !== "chua-phan-loai"}
                      action={deletePostCategoryAction}
                    />
                  </div>

                  {isInspecting && (
                    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-3.5 text-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-extrabold text-emerald-950">
                          📝 Bài viết trong &quot;{c.name}&quot; ({inspectItems.length})
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={moveTargetId}
                            onChange={(e) => setMoveTargetId(e.target.value)}
                            className="cursor-pointer rounded-lg border bg-white px-2.5 py-1 text-xs font-semibold"
                          >
                            {postCats
                              .filter((other) => other.id !== c.id)
                              .map((other) => (
                                <option key={other.id} value={other.id}>
                                  → {other.name}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            disabled={movingItems || selectedMoveIds.length === 0 || !moveTargetId}
                            onClick={handleBulkMoveItems}
                            className="cursor-pointer rounded-lg bg-brand px-3 py-1 font-bold text-white hover:bg-brand-dark disabled:opacity-40"
                          >
                            {movingItems
                              ? "Đang chuyển..."
                              : `Chuyển ${selectedMoveIds.length} bài đã chọn`}
                          </button>
                        </div>
                      </div>

                      {inspectLoading ? (
                        <p className="text-gray-500">Đang tải bài viết...</p>
                      ) : inspectItems.length === 0 ? (
                        <p className="text-gray-500">Chuyên mục này chưa có bài viết nào.</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto rounded-lg border bg-white divide-y">
                          {inspectItems.map((it) => {
                            const checked = selectedMoveIds.includes(it.id);
                            return (
                              <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setSelectedMoveIds((prev) =>
                                        checked
                                          ? prev.filter((x) => x !== it.id)
                                          : [...prev, it.id],
                                      )
                                    }
                                    className="h-3.5 w-3.5 accent-brand"
                                  />
                                  <span className="truncate font-semibold text-gray-800">
                                    #{it.id} — {it.title}
                                  </span>
                                </label>
                                <Link
                                  href={`/admin/posts/${it.id}/`}
                                  className="shrink-0 rounded border px-2 py-0.5 text-[11px] font-bold text-brand hover:bg-emerald-50"
                                >
                                  Sửa ↗
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <form
              action={savePostCategoryAction}
              className="flex flex-wrap items-center gap-2 bg-gray-50 p-3.5 text-xs"
            >
              <input type="hidden" name="id" value="0" />
              <select
                name="section_slug"
                className="w-40 cursor-pointer rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-semibold"
              >
                {sections.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                name="name"
                required
                value={newPostName}
                onChange={(e) => {
                  setNewPostName(e.target.value);
                  if (!newPostSlugTouched) setNewPostSlug(slugifyVi(e.target.value));
                }}
                placeholder="+ Tên chuyên mục mới..."
                className="min-w-48 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold"
              />
              <input
                name="slug"
                value={newPostSlug}
                onChange={(e) => {
                  setNewPostSlugTouched(true);
                  setNewPostSlug(e.target.value);
                }}
                placeholder="Đường dẫn slug (tự tạo)"
                className="w-48 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono"
              />
              <button className="cursor-pointer rounded-xl bg-brand px-4 py-1.5 font-extrabold text-white hover:bg-brand-dark">
                + Thêm chuyên mục
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
