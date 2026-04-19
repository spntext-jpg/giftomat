/**
 * Loads a File or data URL into an HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Важно для внешней загрузки
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Computes the strictly based on the FIRST image dimensions.
 * Capped at 1200px.
 */
export function computeDimensions(
  images: HTMLImageElement[],
  maxWidth: number = 1200
): { width: number; height: number } {
  if (!images.length) return { width: 800, height: 800 };
  const first = images[0];
  let width = first.naturalWidth;
  let height = first.naturalHeight;
  if (width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }
  return { width, height };
}
