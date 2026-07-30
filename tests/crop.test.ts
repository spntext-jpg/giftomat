import assert from "node:assert/strict";
import test from "node:test";
import { getCropPreviewSize, getCropTransform } from "../app/lib/crop.ts";
import { CROP_PRESETS } from "../app/lib/presets.ts";

// Зеркалит MIN_CROP_DIMENSION/MAX_CROP_DIMENSION из CropWorkspace.tsx (GIFTOMAT_CROP_RATIO_CLEANUP_V1).
const MIN_CROP_DIMENSION = 64;
const MAX_CROP_DIMENSION = 8000;

// GIFTOMAT_SPRINT1_V1_TESTS
test("crop presets stay within supported dimension bounds", () => {
  assert.ok(CROP_PRESETS.length > 0);
  for (const preset of CROP_PRESETS) {
    assert.ok(Number.isInteger(preset.width), `${preset.id}: width должен быть целым`);
    assert.ok(Number.isInteger(preset.height), `${preset.id}: height должен быть целым`);
    assert.ok(preset.width >= MIN_CROP_DIMENSION && preset.width <= MAX_CROP_DIMENSION, `${preset.id}: width вне диапазона`);
    assert.ok(preset.height >= MIN_CROP_DIMENSION && preset.height <= MAX_CROP_DIMENSION, `${preset.id}: height вне диапазона`);
  }
});

test("crop preset ids are unique", () => {
  const ids = CROP_PRESETS.map((preset) => preset.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("crop transform always covers the target", () => {
  const transform = getCropTransform(1600, 900, 1080, 1350, 1, 0, 0);
  assert.ok(transform.drawWidth >= 1080);
  assert.ok(transform.drawHeight >= 1350);
});

test("crop offsets stay inside the available image area", () => {
  const left = getCropTransform(2000, 1000, 1000, 1000, 1, -10, 10);
  assert.ok(left.x <= 0);
  assert.ok(left.y <= 0);
  assert.equal(left.maxOffsetY, 0);
});

test("preview keeps the requested aspect ratio", () => {
  const preview = getCropPreviewSize(1200, 628, 900, 600);
  assert.ok(preview.width <= 900);
  assert.ok(preview.height <= 600);
  assert.ok(Math.abs(preview.width / preview.height - 1200 / 628) < 0.01);
});
