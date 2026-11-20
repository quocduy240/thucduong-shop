export type KiotVietImportOptions = {
  createCategories: boolean;
  overwritePriceStock: boolean;
  publishImported: boolean;
  skipServices: boolean;
};

export type KiotVietPreviewItem = {
  rowNum: number;
  action: "create" | "update" | "skip";
  reason?: string;
  kvCode: string;
  name: string;
  kvGroup: string;
  targetCategoryName: string;
  targetCategorySlug: string;
  isNewCategory: boolean;
  price: number;
  costPrice: number;
  stock: number;
  negativeStockAdjusted: boolean;
  brand: string;
  origin: string;
  unit: string;
  imagesCount: number;
  matchedProductId?: number;
  matchedBy?: "kv_code" | "sku" | "name";
};

export type KiotVietPreviewResult = {
  totalRows: number;
  goodsCount: number;
  serviceCount: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  negativeStockCount: number;
  zeroPriceCount: number;
  missingImageCount: number;
  newCategories: { name: string; slug: string; count: number; showInMenu: boolean }[];
  sample: KiotVietPreviewItem[];
};

export type KiotVietApplyResult = {
  createdCategories: number;
  createdProducts: number;
  updatedProducts: number;
  skippedRows: number;
  warnings: string[];
};
