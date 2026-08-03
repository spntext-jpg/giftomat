import assert from "node:assert/strict";
import test from "node:test";
import { looksLikeHeic } from "../app/lib/heic.ts";

function makeFile(name: string, type: string): File {
  return new File([new Uint8Array([0, 1, 2, 3])], name, { type });
}

test("looksLikeHeic recognizes standard HEIC/HEIF mime types", () => {
  assert.equal(looksLikeHeic(makeFile("photo.heic", "image/heic")), true);
  assert.equal(looksLikeHeic(makeFile("photo.heif", "image/heif")), true);
  assert.equal(looksLikeHeic(makeFile("burst.heic", "image/heic-sequence")), true);
});

test("looksLikeHeic falls back to file extension when mime type is empty", () => {
  // iOS/некоторые браузеры иногда отдают HEIC с пустым или generic type.
  assert.equal(looksLikeHeic(makeFile("IMG_0001.HEIC", "")), true);
  assert.equal(looksLikeHeic(makeFile("IMG_0002.heif", "application/octet-stream")), true);
});

test("looksLikeHeic is case-insensitive on extension", () => {
  assert.equal(looksLikeHeic(makeFile("Photo.HEIC", "")), true);
});

test("looksLikeHeic returns false for ordinary image formats", () => {
  assert.equal(looksLikeHeic(makeFile("banner.png", "image/png")), false);
  assert.equal(looksLikeHeic(makeFile("banner.jpg", "image/jpeg")), false);
  assert.equal(looksLikeHeic(makeFile("banner.webp", "image/webp")), false);
});
