"use client";

import { useEffect } from "react";

export default function PrintPdfButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => {
      window.print();
    }, 350);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-dark cursor-pointer print:hidden"
    >
      <span>📥</span>
      <span>Tải xuống PDF / In Hồ Sơ</span>
    </button>
  );
}
