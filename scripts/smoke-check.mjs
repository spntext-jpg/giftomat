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

// GIFTOMAT_CROP_SMOKE_V1_START
const cropWorkspace = readFileSync("app/components/CropWorkspace.tsx", "utf8");
const cropModule = readFileSync("app/lib/crop.ts", "utf8");
for (const marker of ["cropImageToBlob", "crop-preview-canvas", "Подготовить файл"]) {
  if (!cropWorkspace.includes(marker) && !cropModule.includes(marker)) {
    throw new Error(`Missing crop flow: ${marker}`);
  }
}
// GIFTOMAT_CROP_SMOKE_V1_END


// GIFTOMAT_NATIVE_DOWNLOAD_SMOKE_V1_START
const downloadModule = readFileSync("app/lib/download.ts", "utf8");
if (!downloadModule.includes("createDownloadUrl") || !downloadModule.includes("URL.createObjectURL")) {
  throw new Error("Native Blob URL download helper is missing");
}
if (page.includes("downloadBlob(") || cropWorkspace.includes("downloadBlob(")) {
  throw new Error("Legacy programmatic download call remains");
}
if (!/<a[\s\S]*?className="download-button"[\s\S]*?download=\{result\.fileName\}/m.test(page)) {
  throw new Error("Main GIF/PDF/compression result must use a native download link");
}
if (!/<a[\s\S]*?className="download-button"[\s\S]*?download=\{result\.name\}/m.test(cropWorkspace)) {
  throw new Error("Crop result must use a native download link");
}
for (const marker of [
  "const downloadUrl = createDownloadUrl(finalBlob)",
  "const downloadUrl = createDownloadUrl(pdf)",
  "const downloadUrl = createDownloadUrl(output)",
]) {
  if (!page.includes(marker)) throw new Error(`Missing native download URL: ${marker}`);
}
// GIFTOMAT_NATIVE_DOWNLOAD_SMOKE_V1_END
