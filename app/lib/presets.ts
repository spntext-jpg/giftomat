export type ToolMode = "gif" | "pdf" | "compress";
export type GifPresetId = "original" | "x-landscape";
export type PdfPresetId = "linkedin-portrait" | "square" | "landscape";
export type FitMode = "cover" | "contain";

export interface FixedPreset {
  id: string;
  label: string;
  description: string;
  width: number;
  height: number;
}

export const GIF_PRESETS: Record<GifPresetId, Omit<FixedPreset, "id"> & { fixed: boolean }> = {
  original: {
    label: "Исходный формат",
    description: "Пропорции первого кадра, до 800 × 1200 px",
    width: 800,
    height: 1200,
    fixed: false,
  },
  "x-landscape": {
    label: "X · полный экран",
    description: "Лента X, 16:9, автоматическое удержание файла до 15 МБ",
    width: 1200,
    height: 675,
    fixed: true,
  },
};

export const PDF_PRESETS: Record<PdfPresetId, Omit<FixedPreset, "id">> = {
  "linkedin-portrait": {
    label: "LinkedIn · 4:5",
    description: "1080 × 1350 px — оптимально для карусели",
    width: 1080,
    height: 1350,
  },
  square: {
    label: "Квадрат · 1:1",
    description: "1080 × 1080 px",
    width: 1080,
    height: 1080,
  },
  landscape: {
    label: "Landscape · 16:9",
    description: "1920 × 1080 px",
    width: 1920,
    height: 1080,
  },
};

export const X_GIF_MAX_BYTES = 15 * 1024 * 1024;
export const LINKEDIN_PDF_MAX_BYTES = 100 * 1024 * 1024;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function safeBaseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const sanitized = withoutExtension
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return sanitized || "image";
}
