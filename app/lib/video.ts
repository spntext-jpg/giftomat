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

// GIFTOMAT_AUGUST_AUDIT_V5: normalize the requested slice before seeking. This guarantees
// 0 <= start <= end <= duration and reserves a small non-zero span when
// duration allows it.
export function normalizeExtractionRange(
  start: number,
  end: number,
  duration: number,
  minSpan: number = 0.1
): { start: number; end: number } {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  if (safeDuration === 0) return { start: 0, end: 0 };

  const requestedSpan = Number.isFinite(minSpan) ? Math.max(0, minSpan) : 0.1;
  const safeSpan = Math.min(safeDuration, requestedSpan);
  const requestedStart = Number.isFinite(start) ? start : 0;
  const maxStart = Math.max(0, safeDuration - safeSpan);
  const normalizedStart = Math.min(maxStart, Math.max(0, requestedStart));
  const requestedEnd = Number.isFinite(end) ? end : safeDuration;
  const normalizedEnd = Math.min(safeDuration, Math.max(normalizedStart + safeSpan, requestedEnd));

  return { start: normalizedStart, end: normalizedEnd };
}

export function computeExtractionTimestamps(start: number, end: number, frameCount: number): number[] {
  if (frameCount <= 0) return [];
  if (frameCount === 1) return [start];
  const step = (end - start) / (frameCount - 1);
  return Array.from({ length: frameCount }, (_, index) => Math.min(end, start + step * index));
}
