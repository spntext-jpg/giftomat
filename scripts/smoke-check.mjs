import { readFileSync } from "node:fs";

const requiredFiles = [
  "app/page.tsx",
  "app/lib/images.ts",
  "app/lib/encoder.ts",
  "app/lib/pdf.ts",
  "app/lib/presets.ts",
  "app/lib/zip.ts",
  "public/gif.js",
  "public/gif.worker.js",
];

for (const file of requiredFiles) {
  const content = readFileSync(file, "utf8");
  if (!content.trim()) throw new Error(`${file} is empty`);
}

const page = readFileSync("app/page.tsx", "utf8");
const images = readFileSync("app/lib/images.ts", "utf8");
const presets = readFileSync("app/lib/presets.ts", "utf8");

for (const marker of ["generateGif", "generatePdf", "compressImages", "buildGifAttempts"]) {
  if (!page.includes(marker) && !presets.includes(marker)) {
    throw new Error(`Missing critical flow: ${marker}`);
  }
}

for (const forbidden of ["x-landscape", "X · полный экран", "GIF_PRESETS", "GifPresetId", "gifPreset"]) {
  if (page.includes(forbidden) || presets.includes(forbidden)) {
    throw new Error(`Obsolete forced-X format remains: ${forbidden}`);
  }
}

if (!/imagesToImageData\([\s\S]*?,\s*"cover"\s*\)/m.test(page)) {
  throw new Error("GIF generation must explicitly use cover rendering");
}

if (!images.includes('fit === "cover"') || !images.includes("Math.max(")) {
  throw new Error("Cover rendering math is missing");
}

console.log("Smoke check passed: GIF orientation and critical Giftomat flows are present.");
