import { safeBaseName } from "./presets.ts";
const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/**
 * Heuristic that never reads file contents (mime type + extension). Some
 * platforms deliver HEIC with an empty or unknown type, so the extension is an
 * equal signal, not a fallback.
 */
export function looksLikeHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (HEIC_MIME_TYPES.has(type)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

/**
 * Returns a file usable by the rest of Giftomat (canvas/Image only decode
 * "ordinary" raster formats):
 *   - does not look like HEIC -> returned as is, heic-to is not even loaded;
 *   - looks like HEIC but isHeic() says no (e.g. a renamed .png) -> returned as is;
 *   - real HEIC/HEIF -> converted to JPEG;
 *   - conversion failed -> null (the caller marks the file as rejected).
 */
export async function resolveImageFile(file: File): Promise<File | null> {
  if (!looksLikeHeic(file)) return file;

  try {
    const { isHeic, heicTo } = await import("heic-to");
    const heic = await isHeic(file);
    if (!heic) return file;

    const converted = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    const fileName = `${safeBaseName(file.name)}.jpg`;
    return new File([converted], fileName, { type: "image/jpeg" });
  } catch {
    return null;
  }
}
