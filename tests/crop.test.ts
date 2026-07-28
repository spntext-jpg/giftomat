import assert from "node:assert/strict";
import test from "node:test";
import { getCropPreviewSize, getCropTransform } from "../app/lib/crop.ts";

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
