import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeHtmlEntities,
  extractWebArticleFromHtml,
  extractYoutubeCaptionChunks,
} from "./html-extract";

test("decodes named, decimal, and hex HTML entities", () => {
  assert.equal(decodeHtmlEntities("G&#7841;o l&#x1EE9;t &amp; M&egrave; &ndash; 100%"), "Gạo lứt & M&egrave; – 100%");
  assert.equal(decodeHtmlEntities("&lt;b&gt;&quot;An l&#224;nh&quot;&lt;/b&gt;"), '<b>"An lành"</b>');
});

test("extracts article title, meta description, headings, paragraphs, and images while stripping scripts/nav", () => {
  const sampleHtml = `<!doctype html>
  <html>
    <head>
      <title>Fallback Title</title>
      <meta name="description" content="Mô tả chuẩn thực dưỡng cho sức khoẻ bền vững." />
      <meta property="og:image" content="https://cdn.example.com/cover.jpg" />
    </head>
    <body>
      <header><nav><a href="/">Trang chủ</a></nav></header>
      <script>alert("xss");</script>
      <article class="article-detail">
        <h1 class="post-detail-title">Lợi ích của Gạo Lứt Huyết Rồng</h1>
        <h2>1. Giá trị dinh dưỡng nguyên cám</h2>
        <p>Gạo lứt nguyên cám giữ nguyên lớp cám giàu vitamin nhóm B, chất xơ hòa tan và khoáng chất tự nhiên giúp ổn định đường huyết rất tốt.</p>
        <img data-isrc="/uploads/gao-lut.jpg" alt="Gạo lứt" />
        <img src="/assets/logo.png" alt="Logo" />
        <h3>2. Cách nấu cơm gạo lứt dẻo ngon</h3>
        <p>Ngâm gạo lứt từ 6 đến 8 tiếng trước khi nấu với chút muối biển hầm giúp hạt gạo mềm dẻo, dễ tiêu hóa hơn cho người mới bắt đầu.</p>
      </article>
      <footer><p>Copyright footer text that is very long and should be stripped completely from output.</p></footer>
    </body>
  </html>`;

  const result = extractWebArticleFromHtml(sampleHtml, "https://thucduongshop.duyvo.win/bai-viet/gao-lut.html");
  assert.equal(result.rawTitle, "Lợi ích của Gạo Lứt Huyết Rồng");
  assert.equal(result.description, "Mô tả chuẩn thực dưỡng cho sức khoẻ bền vững.");
  assert.deepEqual(result.headings, [
    "1. Giá trị dinh dưỡng nguyên cám",
    "2. Cách nấu cơm gạo lứt dẻo ngon",
  ]);
  assert.equal(result.paragraphs.length, 2);
  assert.ok(!result.paragraphs.some((p) => p.includes("Copyright footer")));
  assert.deepEqual(result.images, [
    "https://cdn.example.com/cover.jpg",
    "https://thucduongshop.duyvo.win/uploads/gao-lut.jpg",
  ]);
});

test("extracts and groups YouTube timedtext XML captions into chunks", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <transcript>
    <text start="0" dur="3">Xin chào quý vị đến với kênh thực dưỡng hiện đại Phúc Thọ hôm nay.</text>
    <text start="3" dur="4">Chúng ta cùng tìm hiểu về cách quân bình âm dương trong bữa ăn hằng ngày.</text>
  </transcript>`;
  const chunks = extractYoutubeCaptionChunks(xml);
  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].includes("quân bình âm dương"));
});
