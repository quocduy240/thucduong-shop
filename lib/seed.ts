import type { DatabaseSync } from "node:sqlite";

/**
 * Placeholder seed data. Structure mirrors the reference site (category
 * groups, post sections, policy pages); every name and text here is generic
 * sample content — replace it with your own catalogue.
 */

const productCategories: [string, string, string[]][] = [
  ["san-pham-ho-tro", "Sản phẩm hỗ trợ thực dưỡng", ["Canh rau củ dạng bột", "Viên gạo lứt mè đen", "Bột ngũ cốc dinh dưỡng", "Muối mè rang"]],
  ["tra-duong-sinh", "Trà dưỡng sinh", ["Trà gạo lứt rang", "Trà bancha 3 năm", "Trà ngò gai", "Trà thảo mộc an thần"]],
  ["sua-ngu-coc-dau-hat", "Sữa, ngũ cốc, đậu, hạt ăn liền", ["Sữa hạt sen", "Ngũ cốc gạo lứt", "Bột đậu đỏ", "Hạt điều rang muối"]],
  ["mo-muoi-lau-nam", "Mơ muối - chanh muối lâu năm", ["Mơ muối 3 năm", "Chanh muối 5 năm", "Tương mơ", "Giấm mơ"]],
  ["tuong-nuoc-tuong", "Nước tương - gia vị thực dưỡng", ["Nước tương ủ truyền thống", "Tương miso", "Muối biển tinh", "Dầu mè nguyên chất"]],
  ["bot-san-day-nguyen-chat", "Bột sắn dây nguyên chất", ["Bột sắn dây 500g", "Bột sắn dây 1kg", "Bột củ năng", "Bột huỳnh tinh"]],
  ["dung-cu-nha-bep", "Dụng cụ nhà bếp thực dưỡng", ["Nồi đất nấu cơm", "Chảo gang", "Thớt gỗ nghiến", "Bộ đũa tre"]],
  ["rong-tao", "Rong - tảo", ["Rong biển kombu", "Rong wakame", "Rong nori", "Tảo xoắn"]],
  ["gao-huu-co-dau-hat", "Gạo hữu cơ - đậu hạt thô", ["Gạo lứt đỏ hữu cơ", "Gạo lứt đen", "Đậu azuki", "Mè đen hữu cơ"]],
];

const postSections: [string, string, [string, string][]][] = [
  ["thuc-duong", "Thực dưỡng", [
    ["thuc-duong-can-ban", "Thực dưỡng căn bản"],
    ["nau-an-thuc-duong", "Nấu ăn thực dưỡng"],
    ["goc-nhin-thuc-duong", "Góc nhìn thực dưỡng"],
    ["tu-thuoc-thuc-duong", "Tủ thuốc thực dưỡng"],
  ]],
  ["song-khoe", "Sống khỏe", [
    ["kien-thuc-dinh-duong", "Kiến thức dinh dưỡng"],
    ["the-duc-duong-sinh", "Thể dục dưỡng sinh"],
    ["y-hoc-thuong-thuc", "Y học thường thức"],
  ]],
  ["thu-vien", "Thư viện", [
    ["bai-giang-thuc-duong", "Bài giảng"],
    ["tai-lieu-thuc-duong", "Tài liệu"],
  ]],
];

const pages: [string, string, string][] = [
  ["", "gioi-thieu", "Giới thiệu"],
  ["", "lien-he", "Liên hệ"],
  ["chinh-sach", "huong-dan-mua-hang", "Hướng dẫn mua hàng"],
  ["chinh-sach", "chinh-sach-bao-mat-thong-tin", "Chính sách bảo mật thông tin"],
  ["chinh-sach", "chinh-sach-doi-tra-hoan-tien", "Chính sách đổi trả - hoàn tiền"],
];

// Sample only — import the full province/ward dataset for production.
const provinces: [string, string, [string, string][]][] = [
  ["01", "Thành phố Hà Nội", [["00001", "Phường Ba Đình"], ["00002", "Phường Hoàn Kiếm"], ["00003", "Phường Đống Đa"]]],
  ["79", "Thành phố Hồ Chí Minh", [["26734", "Phường Sài Gòn"], ["26735", "Phường Bến Thành"], ["26736", "Phường Tân Định"]]],
  ["48", "Thành phố Đà Nẵng", [["20194", "Phường Hải Châu"], ["20195", "Phường Thanh Khê"]]],
];

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const lorem =
  "<p>Đây là nội dung mẫu. Thay bằng mô tả thật của bạn: nguồn gốc, thành phần, công dụng, cách dùng và bảo quản.</p>" +
  "<h3>Thành phần</h3><p>Nội dung mẫu.</p><h3>Hướng dẫn sử dụng</h3><p>Nội dung mẫu.</p>";

export function seed(db: DatabaseSync) {
  db.exec("BEGIN");
  try {
    const insCat = db.prepare("INSERT INTO product_categories (slug, name, sort) VALUES (?, ?, ?)");
    const insProd = db.prepare(
      "INSERT INTO products (slug, category_id, name, price, sale_price, summary, description, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    productCategories.forEach(([slug, name, items], i) => {
      const catId = Number(insCat.run(slug, name, i).lastInsertRowid);
      items.forEach((p, j) => {
        const price = 50000 + ((i * 7 + j * 13) % 20) * 15000;
        const sale = j % 2 === 0 ? price - 20000 : null;
        insProd.run(slugify(p), catId, p, price, sale, `Mô tả ngắn cho ${p.toLowerCase()}.`, lorem, j === 0 ? 1 : 0);
      });
    });

    const insSec = db.prepare("INSERT INTO post_sections (slug, name, sort) VALUES (?, ?, ?)");
    const insPCat = db.prepare("INSERT INTO post_categories (slug, section_slug, name) VALUES (?, ?, ?)");
    const insPost = db.prepare(
      "INSERT INTO posts (slug, category_id, title, excerpt, content, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', ?))",
    );
    let n = 0;
    postSections.forEach(([sec, secName, cats], i) => {
      insSec.run(sec, secName, i);
      for (const [cslug, cname] of cats) {
        const cid = Number(insPCat.run(cslug, sec, cname).lastInsertRowid);
        for (let k = 1; k <= 3; k++) {
          n++;
          const title = `${cname}: bài viết mẫu số ${k}`;
          insPost.run(slugify(title), cid, title, "Tóm tắt bài viết mẫu — thay bằng nội dung của bạn.", lorem, `-${n} days`);
        }
      }
    });

    const insPage = db.prepare("INSERT INTO pages (grp, slug, title, content) VALUES (?, ?, ?, ?)");
    for (const [grp, slug, title] of pages) {
      insPage.run(grp, slug, title, `<p>Nội dung trang “${title}” — thay bằng nội dung thật.</p>`);
    }

    const insProv = db.prepare("INSERT INTO provinces (code, name) VALUES (?, ?)");
    const insWard = db.prepare("INSERT INTO wards (code, province_code, name) VALUES (?, ?, ?)");
    for (const [code, name, wards] of provinces) {
      insProv.run(code, name);
      for (const [wcode, wname] of wards) insWard.run(wcode, code, wname);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
