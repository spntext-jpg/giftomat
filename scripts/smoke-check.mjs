import { readFileSync } from "node:fs";

const requiredFiles = [
  "app/page.tsx",
  "app/globals.css",
  "app/icon.tsx",
  "app/lib/encoder.ts",
  "app/lib/images.ts",
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
for (const marker of [
  "generateGif",
  "generatePdf",
  "compressImages",
  "X_GIF_WEB_TARGET_BYTES",
  "LINKEDIN_PDF_TARGET_BYTES",
  "imageToOptimizedBlob",
  "webOutputFormat",
  "Гифтомат",
]) {
  if (!page.includes(marker)) throw new Error(`Missing critical flow: ${marker}`);
}

const styles = readFileSync("app/globals.css", "utf8");
for (const marker of ["--primary: #00ace3", "--success:", "--warning:", "--danger:", ".preview-media-shell"]) {
  if (!styles.includes(marker)) throw new Error(`Missing design-system marker: ${marker}`);
}
if (styles.includes("--lime")) throw new Error("Legacy lime token is still present");

console.log("Smoke check passed: Giftomat UI and export flows are present.");
