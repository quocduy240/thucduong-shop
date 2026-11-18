import { currentAdmin } from "@/lib/auth";
import { getQuickConsultById, updateQuickConsultFollowup } from "@/lib/quick-consult";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: number;
      shareToken?: string;
      followupChoice?: "hotline" | "advanced_free" | "advanced_paid";
      phone?: string;
      email?: string;
      note?: string;
      bookingPackage?: string;
      bookingMode?: string;
      bookingDate?: string;
      bookingSlot?: string;
      bookingExpert?: string;
    };

    const id = Number(body.id ?? 0);
    const choice = body.followupChoice;
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Mã hồ sơ tư vấn không hợp lệ." }, { status: 400 });
    }
    if (choice !== "hotline" && choice !== "advanced_free" && choice !== "advanced_paid") {
      return Response.json({ error: "Tuỳ chọn tư vấn tiếp theo không hợp lệ." }, { status: 400 });
    }

    const admin = await currentAdmin();
    if (!admin) {
      const existing = await getQuickConsultById(id);
      if (!existing || !body.shareToken || existing.share_token !== body.shareToken) {
        return Response.json({ error: "Không có quyền cập nhật hồ sơ này." }, { status: 403 });
      }
    }

    await updateQuickConsultFollowup({
      id,
      followupChoice: choice,
      phone: body.phone,
      email: body.email,
      note: body.note,
      bookingPackage: body.bookingPackage,
      bookingMode: body.bookingMode,
      bookingDate: body.bookingDate,
      bookingSlot: body.bookingSlot,
      bookingExpert: body.bookingExpert,
    });

    return Response.json({
      ok: true,
      message:
        choice === "hotline"
          ? "Đã ghi nhận yêu cầu kết nối chuyên gia qua Hotline!"
          : choice === "advanced_free"
            ? "Đã đăng ký gói Tư vấn Nâng cao Miễn phí! Chuyên gia sẽ liên hệ với bạn sớm."
            : "Đã đăng ký gói Tư vấn Chuyên sâu 1-1 (Trả phí)! Chuyên gia sẽ liên hệ xác nhận lịch hẹn.",
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "Không thể lưu yêu cầu tư vấn tiếp theo." },
      { status: 500 },
    );
  }
}
