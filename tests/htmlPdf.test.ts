import assert from "node:assert/strict";
import test from "node:test";
import { buildCapturePreviewDocument, computePageSlices, pointsToCssPixels } from "../app/lib/htmlPdf.ts";

test("computePageSlices splits content into full-height pages", () => {
  const slices = computePageSlices(2000, 800);
  assert.equal(slices.length, 3);
  assert.deepEqual(slices[0], { y: 0, height: 800 });
  assert.deepEqual(slices[1], { y: 800, height: 800 });
  assert.deepEqual(slices[2], { y: 1600, height: 400 });
});

test("computePageSlices returns a single page when content fits", () => {
  const slices = computePageSlices(500, 800);
  assert.equal(slices.length, 1);
  assert.deepEqual(slices[0], { y: 0, height: 500 });
});

test("computePageSlices handles exact multiples without an empty trailing page", () => {
  const slices = computePageSlices(1600, 800);
  assert.equal(slices.length, 2);
  assert.deepEqual(slices[1], { y: 800, height: 800 });
});

test("computePageSlices returns an empty array for invalid input", () => {
  assert.deepEqual(computePageSlices(0, 800), []);
  assert.deepEqual(computePageSlices(500, 0), []);
  assert.deepEqual(computePageSlices(-100, 800), []);
});

test("pointsToCssPixels converts PDF points to 96dpi CSS pixels", () => {
  assert.equal(pointsToCssPixels(595), 793);
  assert.equal(pointsToCssPixels(72), 96);
});

test("buildCapturePreviewDocument injects the capture script before </body>", () => {
  const input = "<html><head></head><body><h1>Привет</h1></body></html>";
  const output = buildCapturePreviewDocument(input);
  assert.ok(output.includes("<h1>Привет</h1>"));
  assert.ok(output.includes('src="/html-to-image.js"'));
  assert.ok(output.indexOf("html-to-image.js") < output.indexOf("</body>"));
});

test("buildCapturePreviewDocument falls back to </html> when there is no </body>", () => {
  const input = "<html><head></head><h1>Без body-тега</h1></html>";
  const output = buildCapturePreviewDocument(input);
  assert.ok(output.includes("<h1>Без body-тега</h1>"));
  assert.ok(output.indexOf("html-to-image.js") < output.indexOf("</html>"));
});

test("buildCapturePreviewDocument appends the script for a bare HTML fragment", () => {
  const input = "<div>Просто фрагмент, без html/body</div>";
  const output = buildCapturePreviewDocument(input);
  assert.ok(output.startsWith(input));
  assert.ok(output.includes("html-to-image.js"));
});
