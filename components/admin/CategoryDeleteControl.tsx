"use client";

import { useState } from "react";

const DANGER_BTN =
  "cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50";

export type TargetCategoryOption = {
  id: number;
  name: string;
};

export default function CategoryDeleteControl({
  categoryId,
  categoryName,
  itemCount,
  itemLabel,
  targets,
  allowUnassigned = false,
  action,
}: {
  categoryId: number;
  categoryName: string;
  itemCount: number;
  itemLabel: string;
  targets: TargetCategoryOption[];
  allowUnassigned?: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const otherTargets = targets.filter((t) => t.id !== categoryId);
  const defaultTarget = allowUnassigned
    ? "-1"
    : otherTargets[0]
      ? String(otherTargets[0].id)
      : "";
  const [targetId, setTargetId] = useState<string>(defaultTarget);

  if (itemCount === 0) {
    return (
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm(`Xoá "${categoryName}"?`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={categoryId} />
        <button className={DANGER_BTN}>Xoá</button>
      </form>
    );
  }

  const selectedLabel =
    targetId === "-1"
      ? "Chưa phân loại (?)"
      : otherTargets.find((t) => String(t.id) === targetId)?.name || "danh mục khác";

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!targetId) {
          e.preventDefault();
          alert(`Vui lòng chọn danh mục đích để chuyển ${itemCount} ${itemLabel}.`);
          return;
        }
        if (
          !confirm(
            `Xoá "${categoryName}" và chuyển toàn bộ ${itemCount} ${itemLabel} sang "${selectedLabel}"?`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-1.5"
    >
      <input type="hidden" name="id" value={categoryId} />
      <select
        name="target_category_id"
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        title={`Chuyển ${itemCount} ${itemLabel} sang danh mục nào trước khi xoá`}
        className="max-w-48 cursor-pointer rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-800"
      >
        {allowUnassigned && <option value="-1">→ ? (Chưa phân loại)</option>}
        {otherTargets.map((t) => (
          <option key={t.id} value={t.id}>
            → {t.name}
          </option>
        ))}
      </select>
      <button className={DANGER_BTN} title={`Xoá danh mục và chuyển ${itemCount} ${itemLabel}`}>
        Xoá
      </button>
    </form>
  );
}
