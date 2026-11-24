import CategoriesManagerClient from "@/components/admin/CategoriesManagerClient";
import { Flash, PageHeader } from "@/components/admin/ui";
import { listPostCategoriesWithCount, listProductCategoriesWithCount } from "@/lib/admin-data";
import { requireAdminPath } from "@/lib/auth";
import { getPostSections } from "@/lib/data";
import {
  deletePostCategoryAction,
  deleteProductCategoryAction,
  savePostCategoryAction,
  saveProductCategoryAction,
} from "../actions";

export const metadata = { title: "Danh mục | Quản trị" };

export default async function CategoriesAdmin({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdminPath("/admin/categories/");
  const sp = await searchParams;
  const [productCats, postCats, sections] = await Promise.all([
    listProductCategoriesWithCount(),
    listPostCategoriesWithCount(),
    getPostSections(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <PageHeader title="Quản lý Danh mục & Hiển thị" />
      <Flash saved={sp.saved} error={sp.error} />

      <CategoriesManagerClient
        initialProductCats={productCats}
        initialPostCats={postCats}
        sections={sections}
        saveProductCategoryAction={saveProductCategoryAction}
        deleteProductCategoryAction={deleteProductCategoryAction}
        savePostCategoryAction={savePostCategoryAction}
        deletePostCategoryAction={deletePostCategoryAction}
      />
    </div>
  );
}
