import { readFileSync } from "node:fs";

const requiredFiles = [
  "app/page.tsx",
  "app/lib/encoder.ts",
  "app/lib/pdf.ts",
  "app/lib/zip.ts",
  "public/gif.js",
  "public/gif.worker.js",
];

for (const file of requiredFiles) {
  const content = readFileSync(file, "utf8");
  if (!content.trim()) throw new Error(`${file} is empty`);
}

const page = readFileSync("app/page.tsx", "utf8");
for (const marker of ["generateGif", "generatePdf", "compressImages", "X_GIF_MAX_BYTES"]) {
  if (!page.includes(marker)) throw new Error(`Missing critical flow: ${marker}`);
}

console.log("Smoke check passed: critical Giftomat flows are present.");
