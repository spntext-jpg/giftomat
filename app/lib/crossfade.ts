export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function computeDimensions(images: HTMLImageElement[], maxWidth = 1000) {
  if (!images.length) return { width: 800, height: 600 };
  const first = images[0];
  const w = Math.min(first.naturalWidth, maxWidth);
  const h = Math.round(w * (first.naturalHeight / first.naturalWidth));
  return { width: w, height: h };
}

// object-fit: cover — без letterbox-полос
export function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) {
  const canvRatio = width / height;
  const imgRatio  = img.naturalWidth / img.naturalHeight;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgRatio > canvRatio) {
    sw = img.naturalHeight * canvRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / canvRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
}
