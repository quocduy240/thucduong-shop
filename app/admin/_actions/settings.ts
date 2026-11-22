"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { run } from "@/lib/db";
import { logInfo } from "@/lib/logger";
import { sendEmail } from "@/lib/mail";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import {
  getSite,
  MAIL_KEYS,
  saveInvoicePrintConfig,
  saveMailSettings,
  saveSite,
  saveWidgetSettings,
  SETTING_KEYS,
  WIDGET_KEYS,
} from "@/lib/settings";
import type { InvoiceFontSize, InvoicePaperSize } from "@/lib/invoice-print";
import { back, num, refresh, str } from "./shared";

export async function saveSettingsAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.system_settings);
  const values: Record<string, string> = {};
  for (const k of SETTING_KEYS) values[k] = str(formData, k);
  if (!values.name) back("/admin/settings/", "Tên cửa hàng không được để trống.");
  await saveSite(values);
  logInfo("admin.settings_updated", { actor: admin.email });
  refresh();
  redirect("/admin/settings/?saved=1");
}

export async function saveWidgetSettingsAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.system_settings);
  const values: Record<string, string> = {};
  for (const k of WIDGET_KEYS) values[k] = str(formData, k);
  values.widget_enabled = str(formData, "widget_enabled") === "0" ? "0" : "1";
  await saveWidgetSettings(values);
  logInfo("admin.widget_settings_updated", { actor: admin.email });
  refresh();
  redirect("/admin/settings/?saved=1");
}

export async function updateConsultationStatusAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.consultations);
  const id = num(formData, "id");
  const status = str(formData, "status") === "done" ? "done" : "new";
  await run("UPDATE consultation_requests SET status = ? WHERE id = ?", status, id);
  redirect("/admin/settings/?saved=1");
}

export async function deleteConsultationAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.consultations);
  await run("DELETE FROM consultation_requests WHERE id = ?", num(formData, "id"));
  redirect("/admin/settings/?saved=1");
}

export async function saveMailSettingsAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.system_settings);
  const values: Record<string, string> = {};
  for (const k of MAIL_KEYS) values[k] = str(formData, k);
  if (!values.order_notify_email) {
    back("/admin/settings/", "Vui lòng nhập email nhận thông báo đơn hàng.");
  }
  const invalid = values.order_notify_email
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .find((s) => !/^\S+@\S+\.\S+$/.test(s));
  if (invalid) back("/admin/settings/", `Email nhận đơn không hợp lệ: ${invalid}`);
  await saveMailSettings(values);
  logInfo("admin.mail_settings_updated", { actor: admin.email });
  redirect("/admin/settings/?saved=1");
}

export async function testMailAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.system_settings);
  const values: Record<string, string> = {};
  for (const k of MAIL_KEYS) values[k] = str(formData, k);
  if (values.order_notify_email) await saveMailSettings(values);
  const site = await getSite();
  try {
    const res = await sendEmail({
      to: values.order_notify_email || undefined,
      subject: `[${site.name}] Email kiểm tra kết nối thông báo đơn hàng`,
      html: `<p>Xin chào,</p><p>Đây là email kiểm tra từ trang quản trị <strong>${site.name}</strong>.</p><p>Cấu hình gửi email thông báo đơn hàng mới tới <strong>${values.order_notify_email || "agvinh@gmail.com"}</strong> đã hoạt động tốt!</p>`,
    });
    if (!res.sent) back("/admin/settings/", res.error ?? "Không gửi được email thử.");
  } catch (e) {
    back("/admin/settings/", `Lỗi gửi email: ${(e as Error).message}`);
  }
  redirect("/admin/settings/?mail_sent=1");
}

export async function saveGeminiKeyAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.system_settings);
  const key = str(formData, "gemini_api_key");
  if (!key) {
    await run("DELETE FROM settings WHERE key = 'gemini_api_key'");
    refresh();
    redirect("/admin/settings/?saved=1");
  }
  if (!(key.startsWith("AIza") || key.startsWith("AQ.")) || key.length < 25 || /\s/.test(key)) {
    redirect(
      `/admin/settings/?error=${encodeURIComponent("Gemini API Key không hợp lệ (Key Google AI Studio phải bắt đầu bằng 'AIza...' hoặc 'AQ....').")}`,
    );
  }
  await run("INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_api_key', ?)", key);
  refresh();
  redirect("/admin/settings/?saved=1");
}

export async function saveInvoicePrintConfigAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.orders_ops);
  const rawPaper = str(formData, "paperSize");
  const paperSize: InvoicePaperSize =
    rawPaper === "A5_landscape" || rawPaper === "A4" || rawPaper === "K80" ? rawPaper : "A5_portrait";
  const rawFont = str(formData, "fontSize");
  const fontSize: InvoiceFontSize = rawFont === "sm" || rawFont === "lg" ? rawFont : "md";

  const bool = (k: string) => str(formData, k) === "1";

  await saveInvoicePrintConfig({
    paperSize,
    fontSize,
    showLogo: bool("showLogo"),
    showShopInfo: bool("showShopInfo"),
    showWebQr: bool("showWebQr"),
    shopHeaderTitle: str(formData, "shopHeaderTitle") || "CỬA HÀNG PHÚC THỌ",
    shopHeaderHotline: str(formData, "shopHeaderHotline") || "0858.816.070 - 0767.518.592",
    shopHeaderAddress: str(formData, "shopHeaderAddress"),
    invoiceTitle: str(formData, "invoiceTitle") || "HÓA ĐƠN BÁN HÀNG",
    showInvoiceBarcode: bool("showInvoiceBarcode"),
    showCashierAndChannel: bool("showCashierAndChannel"),
    showCustomerBlock: bool("showCustomerBlock"),
    showShippingBlock: bool("showShippingBlock"),
    showColStt: bool("showColStt"),
    showColSku: bool("showColSku"),
    showColUnit: bool("showColUnit"),
    showColDiscount: bool("showColDiscount"),
    showTotalQty: bool("showTotalQty"),
    showAmountInWords: bool("showAmountInWords"),
    showVietQr: bool("showVietQr"),
    bankBin: str(formData, "bankBin") || "970418",
    bankName: str(formData, "bankName") || "BIDV",
    bankAccountNo: str(formData, "bankAccountNo") || "8610312888",
    bankAccountName: str(formData, "bankAccountName") || "THUC DUONG PHUC THO",
    showReturnPolicy: bool("showReturnPolicy"),
    returnPolicyText: str(formData, "returnPolicyText"),
    showThankYou: bool("showThankYou"),
    thankYouText: str(formData, "thankYouText"),
    showSignatures: bool("showSignatures"),
    showShipperSignature: bool("showShipperSignature"),
  });

  refresh();
  const returnTo = str(formData, "return_to");
  if (returnTo && returnTo.startsWith("/admin/")) {
    redirect(returnTo.includes("?") ? `${returnTo}&saved=1` : `${returnTo}?saved=1`);
  }
  redirect("/admin/orders/?saved=1");
}
