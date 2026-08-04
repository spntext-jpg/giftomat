import assert from "node:assert/strict";
import test from "node:test";
import { CROP_PRESETS, PDF_PRESETS } from "../app/lib/presets.ts";

const cropById = new Map(CROP_PRESETS.map((preset) => [preset.id, preset]));

// GIFTOMAT_CONTRAST_PRESETS_V2_TESTS
test("crop dropdown contains the expanded production formats", () => {
  const expected = [
    ["ig-portrait", 1080, 1350],
    ["ig-photo", 1080, 1440],
    ["linkedin-post", 1200, 628],
    ["x-post", 1600, 900],
    ["x-header", 1500, 500],
    ["youtube-banner", 2560, 1440],
  ] as const;

  for (const [id, width, height] of expected) {
    const preset = cropById.get(id);
    assert.ok(preset, `Missing crop preset: ${id}`);
    assert.equal(preset.width, width, `${id}: unexpected width`);
    assert.equal(preset.height, height, `${id}: unexpected height`);
  }
});

test("PDF dropdown contains common portrait, wide, full-screen and document ratios", () => {
  assert.deepEqual(PDF_PRESETS["portrait-3-4"], {
    label: "Вертикаль · 3:4",
    description: "1080 × 1440 px — современный вертикальный документ",
    width: 1080,
    height: 1440,
  });
  assert.equal(PDF_PRESETS["social-wide"].width, 1200);
  assert.equal(PDF_PRESETS["social-wide"].height, 628);
  assert.equal(PDF_PRESETS.story.width / PDF_PRESETS.story.height, 1080 / 1920);
  assert.equal(PDF_PRESETS["document-a4"].width, 1240);
  assert.equal(PDF_PRESETS["document-a4"].height, 1754);
});

test("expanded preset collections remain unique and valid", () => {
  const cropIds = CROP_PRESETS.map((preset) => preset.id);
  assert.equal(new Set(cropIds).size, cropIds.length);

  for (const preset of [...CROP_PRESETS, ...Object.values(PDF_PRESETS)]) {
    assert.ok(Number.isInteger(preset.width) && preset.width > 0);
    assert.ok(Number.isInteger(preset.height) && preset.height > 0);
    assert.ok(preset.label.trim().length > 0);
  }
});
