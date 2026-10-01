import assert from "node:assert/strict";
import test from "node:test";
import {
  CROP_MAX_ZOOM,
  CROP_MIN_ZOOM,
  getCropPreviewSize,
  getCropTransform,
  nudgeCropOffset,
  stepCropZoom,
} from "../app/lib/crop.ts";
import { CROP_PRESETS } from "../app/lib/presets.ts";

// Mirrors MIN_CROP_DIMENSION/MAX_CROP_DIMENSION from CropWorkspace.tsx.
const MIN_CROP_DIMENSION = 64;
const MAX_CROP_DIMENSION = 8000;

test("crop presets stay within supported dimension bounds", () => {
  assert.ok(CROP_PRESETS.length > 0);
  for (const preset of CROP_PRESETS) {
    assert.ok(Number.isInteger(preset.width), `${preset.id}: width must be an integer`);
    assert.ok(Number.isInteger(preset.height), `${preset.id}: height must be an integer`);
    assert.ok(preset.width >= MIN_CROP_DIMENSION && preset.width <= MAX_CROP_DIMENSION, `${preset.id}: width out of range`);
    assert.ok(preset.height >= MIN_CROP_DIMENSION && preset.height <= MAX_CROP_DIMENSION, `${preset.id}: height out of range`);
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

test("nudgeCropOffset converts output pixels into a normalized offset", () => {
  assert.ok(Math.abs(nudgeCropOffset(0, 100, 1) - 0.01) < 1e-9);
  assert.ok(Math.abs(nudgeCropOffset(0.5, 100, -10) - 0.4) < 1e-9);
});

test("nudgeCropOffset clamps to the available range and ignores axes without room", () => {
  assert.equal(nudgeCropOffset(0.995, 100, 5), 1);
  assert.equal(nudgeCropOffset(-0.995, 100, -5), -1);
  assert.equal(nudgeCropOffset(0.3, 0, 1), 0.3);
});

test("a one-pixel nudge moves the drawn image by exactly one output pixel", () => {
  const before = getCropTransform(2000, 1000, 1000, 1000, 1, 0, 0);
  const offset = nudgeCropOffset(0, before.maxOffsetX, 1);
  const after = getCropTransform(2000, 1000, 1000, 1000, 1, offset, 0);
  assert.ok(Math.abs(after.x - before.x - 1) < 1e-9);
});

test("stepCropZoom stays within the cover-safe range and avoids float drift", () => {
  assert.equal(stepCropZoom(CROP_MIN_ZOOM, -0.05), CROP_MIN_ZOOM);
  assert.equal(stepCropZoom(CROP_MAX_ZOOM - 0.01, 0.05), CROP_MAX_ZOOM);
  assert.equal(stepCropZoom(1.1, 0.05), 1.15);
});
