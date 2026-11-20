import assert from "node:assert/strict";
import test from "node:test";
import { buildImageSrcSet, optimizeImageUrl } from "./image-url";

test("optimizeImageUrl passes through original path when CDN and Cloudflare resizing are disabled", () => {
  const url = optimizeImageUrl("/api/media/products/gao-lut.jpg", {
    width: 480,
    cfResizingEnabled: false,
    cdnBaseUrl: "",
  });
  assert.equal(url, "/api/media/products/gao-lut.jpg");
  assert.equal(
    buildImageSrcSet("/api/media/products/gao-lut.jpg", [240, 480], { cfResizingEnabled: false }),
    undefined,
  );
});

test("optimizeImageUrl rewrites /api/media/ to R2 CDN domain and wraps Cloudflare Image Resizing when enabled", () => {
  const cdnOnly = optimizeImageUrl("/api/media/products/gao-lut.jpg", {
    width: 480,
    cfResizingEnabled: false,
    cdnBaseUrl: "https://media.thucduongshop.duyvo.win/",
  });
  assert.equal(cdnOnly, "https://media.thucduongshop.duyvo.win/products/gao-lut.jpg");

  const resizedLocal = optimizeImageUrl("/api/media/products/gao-lut.jpg", {
    width: 480,
    quality: 82,
    fit: "cover",
    cfResizingEnabled: true,
    cdnBaseUrl: "",
  });
  assert.equal(
    resizedLocal,
    "/cdn-cgi/image/width=480,quality=82,fit=cover,format=auto/api/media/products/gao-lut.jpg",
  );

  const srcSet = buildImageSrcSet("/api/media/products/gao-lut.jpg", [240, 480], {
    quality: 80,
    cfResizingEnabled: true,
    cdnBaseUrl: "",
  });
  assert.equal(
    srcSet,
    "/cdn-cgi/image/width=240,quality=80,fit=cover,format=auto/api/media/products/gao-lut.jpg 240w, /cdn-cgi/image/width=480,quality=80,fit=cover,format=auto/api/media/products/gao-lut.jpg 480w",
  );
});

test("optimizeImageUrl skips SVGs, data URIs, already-resized URLs, and untrusted external hosts", () => {
  assert.equal(
    optimizeImageUrl("/api/media/qr/code.svg", { width: 300, cfResizingEnabled: true, cdnBaseUrl: "" }),
    "/api/media/qr/code.svg",
  );
  assert.equal(
    optimizeImageUrl("data:image/png;base64,AAAA", { width: 300, cfResizingEnabled: true }),
    "data:image/png;base64,AAAA",
  );
  assert.equal(
    optimizeImageUrl("https://other-site.example/pic.jpg", { width: 300, cfResizingEnabled: true, cdnBaseUrl: "" }),
    "https://other-site.example/pic.jpg",
  );
  assert.equal(
    optimizeImageUrl("/cdn-cgi/image/width=200/uploads/a.jpg", { width: 400, cfResizingEnabled: true }),
    "/cdn-cgi/image/width=200/uploads/a.jpg",
  );
});
