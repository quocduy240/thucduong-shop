import { redirect } from "next/navigation";
import { invalidateStorefront } from "@/lib/cache-tags";

export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export const num = (f: FormData, k: string) => {
  const n = Math.round(Number(str(f, k).replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : 0;
};

export const uploaded = (f: FormData, k: string) => {
  const v = f.get(k);
  return v instanceof File && v.size > 0 ? v : undefined;
};

export const back = (path: string, error: string): never =>
  redirect(`${path}?error=${encodeURIComponent(error)}`);

export const refresh = () => invalidateStorefront();
