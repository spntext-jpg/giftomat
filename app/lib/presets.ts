export type ToolMode = "gif" | "pdf" | "compress" | "crop" | "html2pdf";
export type PdfPresetId =
  | "linkedin-portrait"
  | "portrait-3-4"
  | "square"
  | "social-wide"
  | "landscape"
  | "story"
  | "document-a4";
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

// GIFTOMAT_CONTRAST_PRESETS_V2_PDF_START
export const PDF_PRESETS: Record<PdfPresetId, Omit<FixedPreset, "id">> = {
  "linkedin-portrait": {
    label: "LinkedIn · 4:5",
    description: "1080 × 1350 px — mobile-first карусель",
    width: 1080,
    height: 1350,
  },
  "portrait-3-4": {
    label: "Вертикаль · 3:4",
    description: "1080 × 1440 px — современный вертикальный документ",
    width: 1080,
    height: 1440,
  },
  square: {
    label: "Квадрат · 1:1",
    description: "1080 × 1080 px — универсальная квадратная карусель",
    width: 1080,
    height: 1080,
  },
  "social-wide": {
    label: "Широкий · 1.91:1",
    description: "1200 × 628 px — презентация и social preview",
    width: 1200,
    height: 628,
  },
  landscape: {
    label: "Landscape · 16:9",
    description: "1920 × 1080 px — широкоформатная презентация",
    width: 1920,
    height: 1080,
  },
  story: {
    label: "Полный экран · 9:16",
    description: "1080 × 1920 px — вертикальная презентация",
    width: 1080,
    height: 1920,
  },
  "document-a4": {
    label: "Документ · A4-пропорции",
    description: "1240 × 1754 px — страницы с привычным документным соотношением",
    width: 1240,
    height: 1754,
  },
};
// GIFTOMAT_CONTRAST_PRESETS_V2_PDF_END

// GIFTOMAT_SPRINT1_V1_CROP_PRESETS
// GIFTOMAT_CONTRAST_PRESETS_V2_CROP_START
export const CROP_PRESETS: FixedPreset[] = [
  { id: "ig-post", label: "Instagram · квадрат", description: "1080 × 1080 px · 1:1", width: 1080, height: 1080 },
  { id: "ig-portrait", label: "Instagram · портрет", description: "1080 × 1350 px · 4:5", width: 1080, height: 1350 },
  { id: "ig-photo", label: "Instagram · фото", description: "1080 × 1440 px · 3:4", width: 1080, height: 1440 },
  { id: "ig-story", label: "Stories / Reels / TikTok", description: "1080 × 1920 px · 9:16", width: 1080, height: 1920 },
  { id: "linkedin-post", label: "LinkedIn · пост", description: "1200 × 628 px · 1.91:1", width: 1200, height: 628 },
  { id: "linkedin-banner", label: "LinkedIn · баннер", description: "1584 × 396 px · 4:1", width: 1584, height: 396 },
  { id: "x-post", label: "X · пост", description: "1600 × 900 px · 16:9", width: 1600, height: 900 },
  { id: "x-header", label: "X · шапка профиля", description: "1500 × 500 px · 3:1", width: 1500, height: 500 },
  { id: "youtube-thumb", label: "YouTube · превью", description: "1280 × 720 px · 16:9", width: 1280, height: 720 },
  { id: "youtube-banner", label: "YouTube · баннер", description: "2560 × 1440 px · 16:9", width: 2560, height: 1440 },
];
// GIFTOMAT_CONTRAST_PRESETS_V2_CROP_END

// GIFTOMAT_SPRINT3_V1_FRAME_DURATION_CYCLE
export const GIF_FRAME_DURATION_STEPS = [0.3, 0.5, 0.8, 1, 1.5, 2, 3, 5];

export function getNextFrameDuration(
  current: number | undefined,
  steps: number[] = GIF_FRAME_DURATION_STEPS
): number | undefined {
  if (current === undefined) return steps[0];
  const index = steps.findIndex((step) => Math.abs(step - current) < 0.01);
  if (index === -1 || index === steps.length - 1) return undefined;
  return steps[index + 1];
}

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
