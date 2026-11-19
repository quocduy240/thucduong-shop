"use client";

import { useEffect, useRef, useState } from "react";

export default function ArticleReadTracker({ postId, postTitle }: { postId: number; postTitle: string }) {
  const sentRef = useRef(false);
  const startRef = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    startRef.current = Date.now();
    sentRef.current = false;
    maxScrollRef.current = 0;

    function checkAndAward() {
      if (sentRef.current) return;
      const docH = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const pct = Math.round((window.scrollY / docH) * 100);
      if (pct > maxScrollRef.current) maxScrollRef.current = pct;

      const elapsedSec = (Date.now() - startRef.current) / 1000;
      if (maxScrollRef.current >= 70 && elapsedSec >= 30) {
        sentRef.current = true;
        fetch("/api/loyalty/earn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "read_article",
            postId,
            postTitle,
            scrollPct: maxScrollRef.current,
            seconds: Math.round(elapsedSec),
          }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { awarded?: boolean } | null) => {
            if (d?.awarded) {
              setToast("🎁 +2 điểm thưởng đọc bài viết kiến thức!");
              setTimeout(() => setToast(""), 4500);
            }
          })
          .catch(() => {});
      }
    }

    const timer = setInterval(checkAndAward, 5000);
    window.addEventListener("scroll", checkAndAward, { passive: true });
    return () => {
      clearInterval(timer);
      window.removeEventListener("scroll", checkAndAward);
    };
  }, [postId, postTitle]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-20 right-4 z-40 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-lg md:bottom-6">
      {toast}
    </div>
  );
}
