import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-5xl font-bold text-brand">404</h1>
      <p className="mt-4 text-gray-600">Trang bạn tìm không tồn tại.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-brand px-5 py-2 text-white">Về trang chủ</Link>
    </div>
  );
}
