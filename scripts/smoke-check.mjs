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
// GIFTOMAT_SPRINT7_V1_DOWNLOAD_FIX: main and crop downloads now use a programmatic anchor
// (created, clicked, and removed) instead of a native <a download target="_blank">
// link, matching the reliable pattern already used in HtmlToPdfPanel.
if (!/className="download-button"[\s\S]*?onClick=\{[\s\S]*?link\.download = result\.fileName/m.test(page)) {
  throw new Error("Main GIF/PDF/compression result must use the programmatic download button");
}
if (!/className="download-button"[\s\S]*?onClick=\{[\s\S]*?link\.download = result\.name/m.test(cropWorkspace)) {
  throw new Error("Crop result must use the programmatic download button");
}
for (const marker of [
  "const downloadUrl = createDownloadUrl(finalBlob)",
  "const downloadUrl = createDownloadUrl(pdf)",
  "const downloadUrl = createDownloadUrl(output)",
]) {
  if (!page.includes(marker)) throw new Error(`Missing native download URL: ${marker}`);
}
// GIFTOMAT_NATIVE_DOWNLOAD_SMOKE_V1_END

// GIFTOMAT_PRODUCTION_RELEASE_V1_SMOKE_START
const htmlPanel = readFileSync("app/components/HtmlToPdfPanel.tsx", "utf8");
const globalCss = readFileSync("app/globals.css", "utf8");
const serviceWorker = readFileSync("public/sw.js", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");

for (const marker of [
  'switchTool("gif")',
  'switchTool("pdf")',
  'switchTool("compress")',
  'switchTool("crop")',
  'switchTool("html2pdf")',
]) {
  if (!page.includes(marker)) throw new Error(`Missing navigation flow: ${marker}`);
}

if (!htmlPanel.includes("event.source !== iframeRef.current?.contentWindow")) {
  throw new Error("HTML capture messages must be accepted only from the preview iframe");
}
if (!htmlPanel.includes('referrerPolicy="no-referrer"')) {
  throw new Error("HTML preview iframe must suppress referrer data");
}
if (!globalCss.includes("GIFTOMAT_PRODUCTION_RELEASE_V1_CSS_START")) {
  throw new Error("Production navigation CSS is missing");
}
if (!globalCss.includes("--nav-active: var(--accent)")) {
  throw new Error("Navigation active state must use the warm orange accent");
}
if (!globalCss.includes("overflow-wrap: anywhere")) {
  throw new Error("Navigation labels are not protected from overflow");
}
if (!serviceWorker.includes('CACHE_VERSION = "giftomat-v2"')) {
  throw new Error("Service worker cache version was not upgraded");
}
if (!serviceWorker.includes('"/html-to-image.js"')) {
  throw new Error("HTML-to-PDF runtime is missing from the offline shell");
}
// GIFTOMAT_SPRINT7_V1_DOWNLOAD_FIX: X-Frame-Options is superseded by the CSP frame-ancestors
// directive; accept either as valid clickjacking protection.
for (const header of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
  if (!nextConfig.includes(header)) throw new Error(`Missing production header: ${header}`);
}
if (!nextConfig.includes("X-Frame-Options") && !nextConfig.includes("frame-ancestors")) {
  throw new Error("Missing clickjacking protection: expected X-Frame-Options or CSP frame-ancestors");
}
// GIFTOMAT_PRODUCTION_RELEASE_V1_SMOKE_END

// GIFTOMAT_CONTRAST_PRESETS_V2_SMOKE_START
const contrastPresetCss = readFileSync("app/globals.css", "utf8");
const expandedPresets = readFileSync("app/lib/presets.ts", "utf8");

// GIFTOMAT_SPRINT7_V1_DOWNLOAD_FIX: the text-shadow/rgba(5, 7, 10, .96) hack was intentionally
// removed in favor of WCAG AA-compliant solid colors for the active nav label.
for (const marker of [
  "GIFTOMAT_CONTRAST_PRESETS_V2_CSS_START",
  "--accent-soft",
]) {
  if (!contrastPresetCss.includes(marker)) throw new Error(`Missing selected-navigation contrast marker: ${marker}`);
}
if (contrastPresetCss.includes("text-shadow:") && contrastPresetCss.includes("rgba(5, 7, 10, .96)")) {
  throw new Error("Obsolete text-shadow contrast hack should not be reintroduced");
}

for (const marker of [
  '"portrait-3-4"',
  '"social-wide"',
  '"document-a4"',
  'id: "ig-photo"',
  'id: "linkedin-post"',
  'id: "x-header"',
  'id: "youtube-banner"',
]) {
  if (!expandedPresets.includes(marker)) throw new Error(`Missing expanded preset: ${marker}`);
}
// GIFTOMAT_CONTRAST_PRESETS_V2_SMOKE_END
