/**
 * Generates `steps` intermediate frames between imageA and imageB
 * using HTML5 Canvas globalAlpha blending.
 * Returns an array of ImageData objects ready for gif.js.
 */
export function generateCrossfadeFrames(
  imgA: HTMLImageElement,
  imgB: HTMLImageElement,
  width: number,
  height: number,
  steps: number = 10
): ImageData[] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const frames: ImageData[] = [];

  // Hold frame for imgA (alpha=0 for B means pure A)
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.drawImage(imgA, 0, 0, width, height);
  frames.push(ctx.getImageData(0, 0, width, height));

  // Crossfade frames: alpha goes from 0→1 for imgB
  for (let i = 1; i <= steps; i++) {
    const alpha = i / steps;
    ctx.clearRect(0, 0, width, height);
    // Draw A fully
    ctx.globalAlpha = 1;
    ctx.drawImage(imgA, 0, 0, width, height);
    // Draw B on top with increasing opacity
    ctx.globalAlpha = alpha;
    ctx.drawImage(imgB, 0, 0, width, height);
    frames.push(ctx.getImageData(0, 0, width, height));
  }

  ctx.globalAlpha = 1;
  return frames;
}

/**
 * Loads a File or data URL into an HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Computes the output dimensions: uses the first image's size,
 * capped at 800px wide to keep GIF sizes reasonable.
 */
export function computeDimensions(
  images: HTMLImageElement[],
  maxWidth: number = 800
): { width: number; height: number } {
  const first = images[0];
  const ratio = first.naturalHeight / first.naturalWidth;
  const width = Math.min(first.naturalWidth, maxWidth);
  const height = Math.round(width * ratio);
  return { width, height };
}
