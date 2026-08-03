import { safeBaseName } from "./presets.ts";

// GIFTOMAT_HEIC_V1_LIB
const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/**
 * Эвристика без обращения к содержимому файла (mime + расширение). На части
 * платформ HEIC приходит с пустым/неизвестным type, поэтому расширение — не
 * запасной, а равноправный признак.
 */
export function looksLikeHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (HEIC_MIME_TYPES.has(type)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

/**
 * Возвращает файл, пригодный для остальной части Гифтомата (canvas/Image
 * умеют декодировать только "обычные" растровые форматы):
 *   - не похож на HEIC -> файл возвращается как есть, heic-to даже не грузится;
 *   - похож на HEIC, но isHeic() говорит "нет" (например, кто-то просто
 *     переименовал .png в .heic) -> тоже возвращается как есть;
 *   - настоящий HEIC/HEIF -> конвертируется в JPEG;
 *   - конвертация упала -> null (вызывающий код помечает файл как отклонённый).
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
