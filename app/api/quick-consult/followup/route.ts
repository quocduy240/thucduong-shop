import { updateQuickConsultFollowup } from "@/lib/quick-consult";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: number;
      followupChoice?: "hotline" | "advanced_free" | "advanced_paid";
      phone?: string;
      email?: string;
      note?: string;
    };

    const id = Number(body.id ?? 0);
    const choice = body.followupChoice;
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Mã hồ sơ tư vấn không hợp lệ." }, { status: 400 });
    }
    if (choice !== "hotline" && choice !== "advanced_free" && choice !== "advanced_paid") {
      return Response.json({ error: "Tuỳ chọn tư vấn tiếp theo không hợp lệ." }, { status: 400 });
    }

    await updateQuickConsultFollowup({
      id,
      followupChoice: choice,
      phone: body.phone,
      email: body.email,
      note: body.note,
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
