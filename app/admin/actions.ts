/**
 * Barrel re-export for all modularized Admin Server Actions.
 * Each domain module under `./_actions/*` declares `"use server"` directly.
 */

export {
  addAdminAction,
  changePasswordAction,
  deleteAdminAction,
  loginAction,
  logoutAction,
  setupAction,
} from "./_actions/auth";

export {
  adjustProductInventoryAction,
  bulkProductsAction,
  cloneProductAction,
  deleteProductAction,
  deleteProductCategoryAction,
  quickUpdateProductPricingAction,
  saveProductAction,
  saveProductCategoryAction,
  updateProductStockAction,
} from "./_actions/catalog";

export {
  addVideoAction,
  deleteBlockAction,
  deleteCommentAction,
  deleteDocumentAction,
  deleteDocumentLeadAction,
  deletePostAction,
  deletePostCategoryAction,
  deleteVideoAction,
  saveBlockAction,
  saveDocumentAction,
  savePageAction,
  savePostAction,
  savePostCategoryAction,
  toggleBlockAction,
  updateVideoAction,
} from "./_actions/content";

export {
  createPosOrderAction,
  pushOrderKiotVietAction,
  returnOrderAction,
  saveOrderShippingAction,
  updateOrderStatusAction,
} from "./_actions/orders";

export {
  addSubscriberAction,
  deleteCouponAction,
  deleteMemberAction,
  deleteSubscriberAction,
  saveCouponAction,
  toggleCouponAction,
  updateMemberAction,
} from "./_actions/members";

export {
  autoGenerateFlashSaleAction,
  deleteFlashSaleItemAction,
  deleteFlashSaleSlotAction,
  deleteQrAction,
  saveFlashSaleConfigAction,
  saveFlashSaleItemAction,
  saveFlashSaleSlotAction,
  saveQrAction,
  toggleQrAction,
  updateQrUrlQuickAction,
} from "./_actions/marketing";

export {
  addCashbookAction,
  deleteDeliveryPartnerAction,
  deleteSupplierAction,
  exportInventoryIssueAction,
  importInventoryAction,
  saveDeliveryPartnerAction,
  saveKiotVietConfigAction,
  saveSupplierAction,
  settleSupplierDebtAction,
  stocktakeInventoryAction,
  syncKiotVietInventoryAction,
  testKiotVietAction,
} from "./_actions/retail";

export {
  deleteConsultationAction,
  rollbackAuditLogAction,
  saveGeminiKeyAction,
  saveHandbookCustomNoteAction,
  saveInvoicePrintConfigAction,
  saveMailSettingsAction,
  saveSettingsAction,
  saveTelegramWebhookSettingsAction,
  saveWidgetSettingsAction,
  testMailAction,
  updateConsultationStatusAction,
} from "./_actions/settings";
