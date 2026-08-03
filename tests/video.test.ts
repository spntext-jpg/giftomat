import assert from "node:assert/strict";
import test from "node:test";
import { computeExtractionTimestamps, fitWithinMaxDimension } from "../app/lib/video.ts";

test("fitWithinMaxDimension downscales large dimensions proportionally", () => {
  const result = fitWithinMaxDimension(3840, 2160, 1600);
  assert.equal(result.width, 1600);
  assert.equal(result.height, 900);
});

test("fitWithinMaxDimension leaves small dimensions untouched", () => {
  const result = fitWithinMaxDimension(640, 360, 1600);
  assert.equal(result.width, 640);
  assert.equal(result.height, 360);
});

test("fitWithinMaxDimension falls back to a square for invalid input", () => {
  const result = fitWithinMaxDimension(0, 0, 1600);
  assert.equal(result.width, 1600);
  assert.equal(result.height, 1600);
});

test("computeExtractionTimestamps returns evenly spaced times including both ends", () => {
  const timestamps = computeExtractionTimestamps(0, 10, 5);
  assert.deepEqual(timestamps, [0, 2.5, 5, 7.5, 10]);
});

test("computeExtractionTimestamps returns just the start for a single frame", () => {
  assert.deepEqual(computeExtractionTimestamps(3, 8, 1), [3]);
});

test("computeExtractionTimestamps returns an empty array for zero frames", () => {
  assert.deepEqual(computeExtractionTimestamps(0, 10, 0), []);
});
