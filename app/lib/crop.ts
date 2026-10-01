export interface CropTransform {
  scale: number;
  drawWidth: number;
  drawHeight: number;
  x: number;
  y: number;
  maxOffsetX: number;
  maxOffsetY: number;
}

export function clampCropValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const CROP_MIN_ZOOM = 1;
export const CROP_MAX_ZOOM = 4;

/**
 * Returns the normalized offset after moving the drawn image by `pixels`
 * output pixels along one axis. `maxOffsetPx` is the axis range in output
 * pixels (`CropTransform.maxOffsetX` / `maxOffsetY`); with no spare room the
 * offset is kept unchanged.
 */
export function nudgeCropOffset(current: number, maxOffsetPx: number, pixels: number): number {
  if (maxOffsetPx <= 0) return current;
  return clampCropValue(current + pixels / maxOffsetPx, -1, 1);
}

/** Applies a zoom delta inside the cover-safe range and rounds away float drift. */
export function stepCropZoom(current: number, delta: number): number {
  return Math.round(clampCropValue(current + delta, CROP_MIN_ZOOM, CROP_MAX_ZOOM) * 100) / 100;
}

export function getCropTransform(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  zoom: number = 1,
  offsetX: number = 0,
  offsetY: number = 0
): CropTransform {
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const safeTargetWidth = Math.max(1, targetWidth);
  const safeTargetHeight = Math.max(1, targetHeight);
  const safeZoom = clampCropValue(zoom, CROP_MIN_ZOOM, CROP_MAX_ZOOM);
  const normalizedX = clampCropValue(offsetX, -1, 1);
  const normalizedY = clampCropValue(offsetY, -1, 1);
  const scale = Math.max(
    safeTargetWidth / safeSourceWidth,
    safeTargetHeight / safeSourceHeight
  ) * safeZoom;
  const drawWidth = safeSourceWidth * scale;
  const drawHeight = safeSourceHeight * scale;
  const maxOffsetX = Math.max(0, (drawWidth - safeTargetWidth) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - safeTargetHeight) / 2);

  return {
    scale,
    drawWidth,
    drawHeight,
    x: (safeTargetWidth - drawWidth) / 2 + normalizedX * maxOffsetX,
    y: (safeTargetHeight - drawHeight) / 2 + normalizedY * maxOffsetY,
    maxOffsetX,
    maxOffsetY,
  };
}

export function getCropPreviewSize(
  width: number,
  height: number,
  maxWidth: number = 1200,
  maxHeight: number = 760
): { width: number; height: number } {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.min(1, maxWidth / safeWidth, maxHeight / safeHeight);
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

export function drawCrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  background: string = "#ffffff"
): void {
  const transform = getCropTransform(
    image.naturalWidth,
    image.naturalHeight,
    width,
    height,
    zoom,
    offsetX,
    offsetY
  );
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    transform.x,
    transform.y,
    transform.drawWidth,
    transform.drawHeight
  );
  ctx.restore();
}

export async function cropImageToBlob(
  image: HTMLImageElement,
  options: {
    width: number;
    height: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
    format: "jpeg" | "png";
    quality?: number;
  }
): Promise<Blob> {
  const width = Math.round(clampCropValue(options.width, 64, 8000));
  const height = Math.round(clampCropValue(options.height, 64, 8000));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D недоступен в этом браузере");

  drawCrop(
    ctx,
    image,
    width,
    height,
    options.zoom,
    options.offsetX,
    options.offsetY,
    options.format === "jpeg" ? "#ffffff" : "rgba(0,0,0,0)"
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Не удалось обрезать изображение")),
      options.format === "jpeg" ? "image/jpeg" : "image/png",
      options.format === "jpeg" ? options.quality ?? 0.92 : undefined
    );
  });
}
