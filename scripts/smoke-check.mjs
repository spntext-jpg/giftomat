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
// GIFTOMAT_AUGUST_DS_V1: navigation selection now uses August accent purple
// (Amado action semantics §62: "selected interactive state" = purple),
// not the legacy warm-orange accent and not Growth Lime (forbidden as a
// general selection color by the §47 AI lime rule).
if (!globalCss.includes("--nav-active: var(--august-accent)")) {
  throw new Error("Navigation active state must use the August accent purple");
}
if (globalCss.includes("--nav-active: var(--accent)")) {
  throw new Error("Navigation active state must not resolve through the legacy --accent (now Growth Lime) token");
}
if (!globalCss.includes("overflow-wrap: anywhere")) {
  throw new Error("Navigation labels are not protected from overflow");
}
// GIFTOMAT_AUGUST_DS_V2: don't pin a single frozen cache-version literal —
// each legitimate version bump (§36) would break this otherwise. Just
// require *a* quoted CACHE_VERSION assignment to exist and, if
// present, that it matches what caches.delete() cleans up (i.e. the
// version constant is actually wired into cache invalidation).
if (!/const CACHE_VERSION = "[^"]+"/.test(serviceWorker)) {
  throw new Error("Service worker is missing a CACHE_VERSION constant");
}
if (!serviceWorker.includes("key !== CACHE_VERSION")) {
  throw new Error("Service worker cache cleanup must compare against CACHE_VERSION");
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


// GIFTOMAT_AUGUST_AUDIT_V5_SMOKE_START
const augustAuditLayout = readFileSync("app/layout.tsx", "utf8");
const augustAuditVideoPanel = readFileSync("app/components/VideoImportPanel.tsx", "utf8");
const augustAuditVideoModule = readFileSync("app/lib/video.ts", "utf8");

if (!globalCss.startsWith('@import "tailwindcss";')) {
  throw new Error("Tailwind v4 entry must use @import tailwindcss");
}
for (const obsoleteDirective of ["@tailwind base;", "@tailwind components;", "@tailwind utilities;"]) {
  if (globalCss.includes(obsoleteDirective)) throw new Error(`Obsolete Tailwind v3 directive remains: ${obsoleteDirective}`);
}
if (!globalCss.includes("GIFTOMAT_AUGUST_AUDIT_V5_CSS")) {
  throw new Error("August audit CSS contract is missing");
}
if (!globalCss.includes("background: var(--august-surface) !important;")) {
  throw new Error("Active navigation must resolve to the August Surface state");
}
if (!globalCss.includes("color: var(--august-ink) !important;")) {
  throw new Error("Active navigation must use August Ink on the light Surface");
}
if (!augustAuditLayout.includes('content="#15172A"') || !augustAuditLayout.includes('content="#F7F8FC"')) {
  throw new Error("Browser theme-color is not synchronized with August Navy/Canvas");
}
if (!augustAuditLayout.includes('data-theme="light"') || page.includes('matchMedia("(prefers-color-scheme: light)")')) {
  throw new Error("August must use one explicit light Canvas theme instead of a fake OS dark-theme listener");
}
if (page.includes('aria-pressed={activeTool')) {
  throw new Error("Tool destinations must not expose redundant aria-pressed state");
}
if (!page.includes("GIFTOMAT_AUGUST_AUDIT_V5_URLS") ||
    !page.includes("setImages((current) => current.map((image) => replacements.get(image.id) ?? image));") ||
    page.includes("URL.revokeObjectURL(image.url);\n        return { id: image.id, url: URL.createObjectURL(update.file)")) {
  throw new Error("Blob URL side effects must stay outside the replaceImages state updater");
}
if (!augustAuditVideoPanel.includes("MAX_VIDEO_BYTES = 200 * 1024 * 1024")) {
  throw new Error("Video import must enforce the advertised 200 MB limit");
}
if (!augustAuditVideoModule.includes("normalizeExtractionRange")) {
  throw new Error("Video extraction range normalizer is missing");
}
// GIFTOMAT_AUGUST_AUDIT_V5_SMOKE_END
