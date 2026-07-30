export type ToolMode = "gif" | "pdf" | "compress" | "crop";
export type PdfPresetId = "linkedin-portrait" | "square" | "landscape";
export type FitMode = "cover" | "contain";
export type WebOutputFormat = "jpeg" | "webp";

export interface FixedPreset {
  id: string;
  label: string;
  description: string;
  width: number;
  height: number;
}

export interface GifAttempt {
  width: number;
  height: number;
  quality: number;
}

export const GIF_WEB_MAX_BYTES = 15 * 1024 * 1024;
export const GIF_MOBILE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Creates proportional render attempts from the first frame.
 * The first frame defines the GIF canvas orientation and aspect ratio.
 */
export function buildGifAttempts(
  sourceWidth: number,
  sourceHeight: number
): GifAttempt[] {
  const width = Math.max(1, Math.round(sourceWidth));
  const height = Math.max(1, Math.round(sourceHeight));
  const sourceMaxEdge = Math.max(width, height);
  const firstMaxEdge = Math.min(sourceMaxEdge, 1280);
  const edges = [firstMaxEdge, 1080, 900, 720, 600]
    .filter((edge, index, values) => edge > 0 && edge <= firstMaxEdge && values.indexOf(edge) === index);
  const qualities = [15, 19, 24, 30, 36];

  return edges.map((maxEdge, index) => {
    const scale = Math.min(1, maxEdge / sourceMaxEdge);
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      quality: qualities[Math.min(index, qualities.length - 1)],
    };
  });
}

export const PDF_PRESETS: Record<PdfPresetId, Omit<FixedPreset, "id">> = {
  "linkedin-portrait": {
    label: "LinkedIn · 4:5",
    description: "1080 × 1350 px — mobile-first карусель",
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

// GIFTOMAT_SPRINT1_V1_CROP_PRESETS
export const CROP_PRESETS: FixedPreset[] = [
  { id: "ig-post", label: "Instagram пост", description: "1080 × 1080 px", width: 1080, height: 1080 },
  { id: "ig-story", label: "Instagram сторис", description: "1080 × 1920 px", width: 1080, height: 1920 },
  { id: "linkedin-banner", label: "LinkedIn баннер", description: "1584 × 396 px", width: 1584, height: 396 },
  { id: "youtube-thumb", label: "YouTube превью", description: "1280 × 720 px", width: 1280, height: 720 },
];

export const X_GIF_WEB_MAX_BYTES = 15 * 1024 * 1024;
export const X_GIF_WEB_TARGET_BYTES = Math.floor(14.5 * 1024 * 1024);
export const X_GIF_MOBILE_MAX_BYTES = 5 * 1024 * 1024;
export const LINKEDIN_PDF_MAX_BYTES = 100 * 1024 * 1024;
export const LINKEDIN_PDF_TARGET_BYTES = 95 * 1024 * 1024;

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
