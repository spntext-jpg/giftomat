// GIFTOMAT_VIDEO_GIF_V1_LIB
export function fitWithinMaxDimension(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension };
  }
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function computeExtractionTimestamps(start: number, end: number, frameCount: number): number[] {
  if (frameCount <= 0) return [];
  if (frameCount === 1) return [start];
  const step = (end - start) / (frameCount - 1);
  return Array.from({ length: frameCount }, (_, index) => Math.min(end, start + step * index));
}
