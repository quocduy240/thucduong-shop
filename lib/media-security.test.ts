import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentAddressedFilename,
  sanitizeSvgContent,
  verifyFileMagicBytes,
} from "./media-security";

test("verifyFileMagicBytes accepts valid image and document signatures", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const gif = Buffer.from("GIF89a\x01\x00", "ascii");
  const webp = Buffer.from("RIFF\x24\x00\x00\x00WEBP", "ascii");
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>', "utf8");
  const pdf = Buffer.from("%PDF-1.7\n1 0 obj", "ascii");
  const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

  assert.equal(verifyFileMagicBytes(jpeg, "image/jpeg"), true);
  assert.equal(verifyFileMagicBytes(png, "image/png"), true);
  assert.equal(verifyFileMagicBytes(gif, "image/gif"), true);
  assert.equal(verifyFileMagicBytes(webp, "image/webp"), true);
  assert.equal(verifyFileMagicBytes(svg, "image/svg+xml"), true);
  assert.equal(verifyFileMagicBytes(pdf, "application/pdf"), true);
  assert.equal(
    verifyFileMagicBytes(docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    true,
  );
});

test("verifyFileMagicBytes rejects spoofed HTML/executable content disguised as images or PDF", () => {
  const htmlPayload = Buffer.from("<!doctype html><script>alert(1)</script>", "utf8");
  assert.equal(verifyFileMagicBytes(htmlPayload, "image/jpeg"), false);
  assert.equal(verifyFileMagicBytes(htmlPayload, "image/png"), false);
  assert.equal(verifyFileMagicBytes(htmlPayload, "image/webp"), false);
  assert.equal(verifyFileMagicBytes(htmlPayload, "image/svg+xml"), false);
  assert.equal(verifyFileMagicBytes(htmlPayload, "application/pdf"), false);
  assert.equal(verifyFileMagicBytes(new Uint8Array([1, 2]), "image/jpeg"), false);
});

test("sanitizeSvgContent strips scripts, iframes, inline event handlers, and javascript hrefs", () => {
  const dirty =
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>fetch("/steal")</script><a href="javascript:alert(2)"><rect width="10" height="10" onclick="x()"/></a></svg>';
  const clean = sanitizeSvgContent(dirty);

  assert.equal(clean.includes("<script"), false);
  assert.equal(clean.includes("onload="), false);
  assert.equal(clean.includes("onclick="), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.equal(clean.includes("<rect"), true);
});

test("buildContentAddressedFilename is deterministic and sanitizes prefix", () => {
  const bytes = Buffer.from("same-image-bytes", "utf8");
  const a = buildContentAddressedFilename(".webp", bytes, "Gạo Lứt 2026!");
  const b = buildContentAddressedFilename("webp", bytes, "Gạo Lứt 2026!");
  const other = buildContentAddressedFilename(".webp", Buffer.from("different-bytes", "utf8"), "Gạo Lứt 2026!");

  assert.equal(a, b);
  assert.notEqual(a, other);
  assert.match(a, /^g-o-l-t-2026-[a-f0-9]{16}\.webp$/);
});
