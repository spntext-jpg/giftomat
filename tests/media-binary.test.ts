import assert from "node:assert/strict";
import test from "node:test";
import { buildImagePdf } from "../app/lib/pdf.ts";
import { buildStoredZip } from "../app/lib/zip.ts";
import {
  formatBytes,
  LINKEDIN_PDF_MAX_BYTES,
  LINKEDIN_PDF_TARGET_BYTES,
  safeBaseName,
  X_GIF_MOBILE_MAX_BYTES,
  X_GIF_WEB_MAX_BYTES,
  X_GIF_WEB_TARGET_BYTES,
} from "../app/lib/presets.ts";

const decoder = new TextDecoder("latin1");

test("PDF builder creates a multi-page PDF with a valid trailer", async () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const blob = buildImagePdf([
    { bytes: jpeg, pixelWidth: 1080, pixelHeight: 1350 },
    { bytes: jpeg, pixelWidth: 1080, pixelHeight: 1350 },
  ], 1080, 1350);

  assert.equal(blob.type, "application/pdf");
  const content = decoder.decode(new Uint8Array(await blob.arrayBuffer()));
  assert.match(content, /^%PDF-1\.4/);
  assert.match(content, /\/Count 2/);
  assert.match(content, /startxref/);
  assert.match(content, /%%EOF\n$/);
});

test("ZIP builder stores multiple files with local and central headers", async () => {
  const blob = buildStoredZip([
    { name: "01-test.jpg", data: new Uint8Array([1, 2, 3]) },
    { name: "02-тест.jpg", data: new Uint8Array([4, 5]) },
  ]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);

  assert.equal(blob.type, "application/zip");
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
});

test("file naming and byte formatting stay deterministic", () => {
  assert.equal(safeBaseName("Мой баннер финал.png"), "Мой-баннер-финал");
  assert.equal(safeBaseName("...png"), "image");
  assert.equal(formatBytes(1024 * 1024), "1.0 МБ");
});


test("social export safety thresholds stay below platform limits", () => {
  assert.ok(X_GIF_WEB_TARGET_BYTES < X_GIF_WEB_MAX_BYTES);
  assert.ok(X_GIF_MOBILE_MAX_BYTES < X_GIF_WEB_MAX_BYTES);
  assert.ok(LINKEDIN_PDF_TARGET_BYTES < LINKEDIN_PDF_MAX_BYTES);
});
