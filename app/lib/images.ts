import type { FitMode } from "./presets";

export interface FramePosition {
  x: number;
  y: number;
}

export interface RenderOptions {
  width: number;
  height: number;
  fit?: FitMode;
  background?: string | null;
  position?: FramePosition;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    img.src = src;
  });
}

export function computeDimensions(
  images: HTMLImageElement[],
  maxWidth: number = 800,
  maxHeight: number = 1200
): { width: number; height: number } {
  if (!images.length) return { width: maxWidth, height: Math.min(maxWidth, maxHeight) };

  const first = images[0];
  const sourceWidth = Math.max(1, first.naturalWidth);
  const sourceHeight = Math.max(1, first.naturalHeight);
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function drawImageToCanvas(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  options: RenderOptions
): void {
  const { width, height, fit = "cover", background = "#ffffff" } = options;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (background !== null) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }

  const sourceWidth = Math.max(1, img.naturalWidth);
  const sourceHeight = Math.max(1, img.naturalHeight);
  const scale = fit === "cover"
    ? Math.max(width / sourceWidth, height / sourceHeight)
    : Math.min(width / sourceWidth, height / sourceHeight);

  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const maxOffsetX = Math.max(0, (drawWidth - width) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - height) / 2);
  const normalizedX = Math.max(-1, Math.min(1, options.position?.x ?? 0));
  const normalizedY = Math.max(-1, Math.min(1, options.position?.y ?? 0));
  const dx = (width - drawWidth) / 2 + normalizedX * maxOffsetX;
  const dy = (height - drawHeight) / 2 + normalizedY * maxOffsetY;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  ctx.restore();
}

export function imagesToImageData(
  images: HTMLImageElement[],
  width: number,
  height: number,
  fit: FitMode = "cover",
  positions: FramePosition[] = []
): ImageData[] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D недоступен в этом браузере");

  return images.map((img, index) => {
    drawImageToCanvas(ctx, img, { width, height, fit, position: positions[index] });
    return ctx.getImageData(0, 0, width, height);
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Не удалось создать файл"))),
      type,
      quality
    );
  });
}

export async function imageToOptimizedBlob(
  image: HTMLImageElement,
  options: {
    width: number;
    height: number;
    fit?: FitMode;
    quality?: number;
    type: "image/jpeg" | "image/webp";
    background?: string | null;
  }
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D недоступен в этом браузере");

  drawImageToCanvas(ctx, image, options);
  return canvasToBlob(canvas, options.type, options.quality ?? 0.86);
}

export async function imageToJpegBlob(
  image: HTMLImageElement,
  options: {
    width: number;
    height: number;
    fit?: FitMode;
    quality?: number;
    background?: string;
  }
): Promise<Blob> {
  return imageToOptimizedBlob(image, {
    ...options,
    type: "image/jpeg",
    background: options.background ?? "#ffffff",
  });
}
