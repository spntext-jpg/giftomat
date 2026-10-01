import assert from "node:assert/strict";
import test from "node:test";
import { GIF_FRAME_DURATION_STEPS, GIF_PRESETS, getNextFrameDuration } from "../app/lib/presets.ts";

test("frame duration cycles through all steps in order", () => {
  let value: number | undefined = undefined;
  for (const step of GIF_FRAME_DURATION_STEPS) {
    value = getNextFrameDuration(value);
    assert.equal(value, step);
  }
});

test("frame duration wraps back to auto (undefined) after the last step", () => {
  const lastStep = GIF_FRAME_DURATION_STEPS[GIF_FRAME_DURATION_STEPS.length - 1];
  assert.equal(getNextFrameDuration(lastStep), undefined);
});

test("frame duration starting from undefined returns the first step", () => {
  assert.equal(getNextFrameDuration(undefined), GIF_FRAME_DURATION_STEPS[0]);
});

test("frame duration recovers from a value not on the step list", () => {
  // If an override came from the global slider (0.1 step) and matches no fixed
  // step, the cycle must not stall: it restarts from auto.
  const result = getNextFrameDuration(1.7);
  assert.equal(result, undefined);
});


test("GIF presets expose common output ratios", () => {
  const byId = new Map(GIF_PRESETS.map((preset) => [preset.id, preset]));
  assert.deepEqual([byId.get("x-16-9")?.width, byId.get("x-16-9")?.height], [1280, 720]);
  assert.deepEqual([byId.get("square")?.width, byId.get("square")?.height], [1080, 1080]);
  assert.deepEqual([byId.get("portrait-4-5")?.width, byId.get("portrait-4-5")?.height], [1080, 1350]);
  assert.deepEqual([byId.get("vertical-9-16")?.width, byId.get("vertical-9-16")?.height], [720, 1280]);
});
