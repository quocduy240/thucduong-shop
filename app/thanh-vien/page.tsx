import { Breadcrumb } from "@/components/ui";
import MemberPortal from "@/components/MemberPortal";
import { getDocuments } from "@/lib/data";
import { currentMember, getActiveCoupons, getMemberOrders } from "@/lib/member-auth";

export const metadata = {
  title: "Thành viên & Ưu đãi đặc quyền",
  description: "Đăng ký thành viên Thực Dưỡng Phúc Thọ để tải tài liệu miễn phí, nhận mã giảm giá và tích điểm VIP.",
};

export default async function MemberPage() {
  const member = await currentMember();
  const [coupons, orders, docs] = await Promise.all([
    getActiveCoupons(),
    member ? getMemberOrders(member) : Promise.resolve([]),
    getDocuments(),
  ]);
  const documents = docs.map((d) => ({
    id: d.id,
    title: d.title,
    folder_path: d.folder_path,
    doc_type: d.doc_type,
    pages: d.pages,
    file_size: d.file_size,
    drive_url: d.drive_url,
  }));

  return (
    <>
      <Breadcrumb items={[{ label: "Thành viên & Ưu đãi" }]} />
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <MemberPortal
          initialMember={member ?? null}
          coupons={coupons}
          orders={orders}
          documents={documents}
        />
      </div>
    </>
  );
}
