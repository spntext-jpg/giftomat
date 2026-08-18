import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const requiredFiles = [
  "app/page.tsx",
  "app/components/CropWorkspace.tsx",
  "app/components/HtmlToPdfPanel.tsx",
  "app/components/VideoImportPanel.tsx",
  "app/lib/binary.ts",
  "app/lib/download.ts",
  "app/lib/encoder.ts",
  "app/lib/images.ts",
  "app/lib/pdf.ts",
  "app/lib/presets.ts",
  "app/lib/video.ts",
  "app/lib/zip.ts",
  "app/globals.css",
  "public/gif.js",
  "public/gif.worker.js",
  "public/html-to-image.js",
  "public/sw.js",
];

for (const file of requiredFiles) {
  if (!existsSync(file) || !read(file).trim()) throw new Error(`Required file is missing or empty: ${file}`);
}

const page = read("app/page.tsx");
const cropWorkspace = read("app/components/CropWorkspace.tsx");
const htmlPanel = read("app/components/HtmlToPdfPanel.tsx");
const videoPanel = read("app/components/VideoImportPanel.tsx");
const images = read("app/lib/images.ts");
const binary = read("app/lib/binary.ts");
const download = read("app/lib/download.ts");
const presets = read("app/lib/presets.ts");
const video = read("app/lib/video.ts");
const globalCss = read("app/globals.css");
const layout = read("app/layout.tsx");
const serviceWorker = read("public/sw.js");
const nextConfig = read("next.config.ts");
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const readme = read("README.md");

// Core product flows.
for (const marker of ["generateGif", "generatePdf", "compressImages", "buildGifAttempts"]) {
  if (!page.includes(marker) && !presets.includes(marker)) throw new Error(`Missing critical flow: ${marker}`);
}
for (const marker of [
  'switchTool("gif")',
  'switchTool("pdf")',
  'switchTool("compress")',
  'switchTool("crop")',
  'switchTool("html2pdf")',
]) {
  if (!page.includes(marker)) throw new Error(`Missing navigation flow: ${marker}`);
}
for (const forbidden of ["x-landscape", "X · полный экран", "GIF_PRESETS", "GifPresetId", "gifPreset"]) {
  if (page.includes(forbidden) || presets.includes(forbidden)) throw new Error(`Obsolete forced-X format remains: ${forbidden}`);
}
if (!/imagesToImageData\([\s\S]*?,\s*"cover"\s*\)/m.test(page)) {
  throw new Error("GIF generation must explicitly use cover rendering");
}
if (!images.includes('fit === "cover"') || !images.includes("Math.max(")) {
  throw new Error("Cover rendering math is missing");
}

// Crop, video and HTML capture contracts.
for (const marker of ["cropImageToBlob", "crop-preview-canvas", "Подготовить файл"]) {
  if (!cropWorkspace.includes(marker) && !read("app/lib/crop.ts").includes(marker)) {
    throw new Error(`Missing crop flow: ${marker}`);
  }
}
if (!videoPanel.includes("MAX_VIDEO_BYTES = 200 * 1024 * 1024") || !video.includes("normalizeExtractionRange")) {
  throw new Error("Video import safety contract is incomplete");
}
if (!htmlPanel.includes("event.source !== iframeRef.current?.contentWindow")) {
  throw new Error("HTML capture messages must be accepted only from the preview iframe");
}
if (!htmlPanel.includes('sandbox="allow-scripts"') || !htmlPanel.includes('referrerPolicy="no-referrer"')) {
  throw new Error("HTML preview sandbox/referrer protections are missing");
}

// One canonical download and binary implementation.
if (!download.includes("triggerDownload") || !download.includes("URL.createObjectURL")) {
  throw new Error("Download helpers are incomplete");
}
for (const source of [page, cropWorkspace, htmlPanel]) {
  if (!source.includes("triggerDownload(")) throw new Error("A result panel bypasses the shared download helper");
  if (source.includes('document.createElement("a")')) throw new Error("Duplicate temporary-anchor download code remains");
}
if (!binary.includes("copyToArrayBuffer") || !binary.includes("concatBytes")) {
  throw new Error("Shared binary helpers are incomplete");
}
for (const file of ["app/page.tsx", "app/lib/pdf.ts", "app/lib/zip.ts"]) {
  const source = read(file);
  if (/function\s+copyToArrayBuffer\s*\(/.test(source)) throw new Error(`Duplicate copyToArrayBuffer remains in ${file}`);
}

// August Design System is canonical, not a migration layer.
for (const token of ["--august-canvas: #F7F8FC", "--august-accent: #6E5CF6", "--august-navy: #15172A"]) {
  if (!globalCss.includes(token)) throw new Error(`Missing August token: ${token}`);
}
if (!globalCss.includes("background: var(--august-surface);") || !globalCss.includes("color: var(--august-ink);")) {
  throw new Error("Active navigation must use August Surface/Ink");
}
if (!globalCss.includes("overflow-wrap: anywhere") || !globalCss.includes("@media (prefers-reduced-motion: reduce)")) {
  throw new Error("Responsive/accessibility CSS contracts are incomplete");
}
for (const debt of ["!important", '@import "tailwindcss"', "@tailwind base"]) {
  if (globalCss.includes(debt)) throw new Error(`Legacy CSS debt remains: ${debt}`);
}
if (globalCss.includes('[data-theme="')) throw new Error("Legacy data-theme overrides remain in canonical CSS");
if (page.includes('matchMedia("(prefers-color-scheme: light)")') || layout.includes('data-theme="')) {
  throw new Error("A fake OS-driven theme contract was reintroduced");
}
if (page.includes("aria-pressed={activeTool")) throw new Error("Navigation destinations expose redundant aria-pressed state");
if (!page.includes("setImages((current) => current.map((image) => replacements.get(image.id) ?? image));")) {
  throw new Error("replaceImages must keep its state updater pure");
}

// PWA/security contracts.
if (!/const CACHE_VERSION = "[^"]+"/.test(serviceWorker) || !serviceWorker.includes("key !== CACHE_VERSION")) {
  throw new Error("Service worker cache-version contract is incomplete");
}
for (const asset of ['"/gif.js"', '"/gif.worker.js"', '"/html-to-image.js"']) {
  if (!serviceWorker.includes(asset)) throw new Error(`Offline shell is missing ${asset}`);
}
for (const header of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "frame-ancestors 'self'"]) {
  if (!nextConfig.includes(header)) throw new Error(`Missing production security contract: ${header}`);
}

// Presets and repository hygiene.
for (const marker of [
  '"portrait-3-4"', '"social-wide"', '"document-a4"', 'id: "ig-photo"',
  'id: "linkedin-post"', 'id: "x-header"', 'id: "youtube-banner"',
]) {
  if (!presets.includes(marker)) throw new Error(`Missing production preset: ${marker}`);
}
if (presets.includes("X_GIF_") || page.includes("X_GIF_")) throw new Error("Duplicate X_GIF limit aliases remain");
if (packageJson.type !== "module") throw new Error('package.json must declare "type": "module"');
if (packageJson.dependencies?.["gif.js"]) throw new Error("Unused npm gif.js dependency remains");
if (packageJson.devDependencies?.tailwindcss || packageJson.devDependencies?.["@tailwindcss/postcss"]) {
  throw new Error("Unused Tailwind toolchain remains");
}
const lockRoot = packageLock.packages?.[""] ?? {};
if (lockRoot.dependencies?.["gif.js"] || lockRoot.devDependencies?.tailwindcss || lockRoot.devDependencies?.["@tailwindcss/postcss"]) {
  throw new Error("package-lock.json is not synchronized with package.json cleanup");
}
for (const packagePath of ["node_modules/gif.js", "node_modules/tailwindcss", "node_modules/@tailwindcss/postcss"]) {
  if (packageLock.packages?.[packagePath]) throw new Error(`Removed dependency remains in package-lock.json: ${packagePath}`);
}
const firstParty = [page, cropWorkspace, htmlPanel, videoPanel, globalCss, nextConfig, serviceWorker, presets].join("\n");
for (const historicalPrefix of [
  "GIFTOMAT_AUGUST_", "GIFTOMAT_SPRINT", "GIFTOMAT_PRODUCTION_", "GIFTOMAT_CONTRAST_",
  "GIFTOMAT_UI_", "GIFTOMAT_PREMIUM_", "GIFTOMAT_NEXT_", "GIFTOMAT_CJM_", "GIFTOMAT_PDF_",
  "GIFTOMAT_MOBILE_", "GIFTOMAT_VIDEO_", "GIFTOMAT_HTML2PDF_", "GIFTOMAT_HEIC_", "GIFTOMAT_CROP_",
  "GIFTOMAT_NATIVE_", "GIFTOMAT_NAV_", "GIFTOMAT_TOOL_",
]) {
  if (firstParty.includes(historicalPrefix)) {
    throw new Error(`Historical migration/version marker remains: ${historicalPrefix}`);
  }
}
for (const file of ["tailwind.config.ts", "postcss.config.mjs", "apply_august_design_system.py", "fix_download_buttons_and_smoke.py"]) {
  if (existsSync(file)) throw new Error(`Obsolete repository artifact remains: ${file}`);
}
if (!readme.includes("August Design System") || !readme.includes("npm run verify")) {
  throw new Error("README is not synchronized with the current product/quality contract");
}

console.log("Smoke check passed: canonical Giftomat product, design, security and cleanup contracts are present.");
