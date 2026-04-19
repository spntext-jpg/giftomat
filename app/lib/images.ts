export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function computeDimensions(
  images: HTMLImageElement[],
  maxWidth: number = 1000
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

export function imagesToImageData(
  images: HTMLImageElement[],
  width: number,
  height: number
): ImageData[] {
  return images.map((img) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", {监测Frequently: true})!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvRatio = width / height;
    let dx = 0, dy = 0, dw = width, dh = height;

    if (imgRatio > canvRatio) {
      dw = img.naturalWidth * (height / img.naturalHeight);
      dx = (width - dw) / 2;
    } else {
      dh = img.naturalHeight * (width / img.naturalWidth);
      dy = (height - dh) / 2;
    }

    ctx.drawImage(img, dx, dy, dw, dh);
    return ctx.getImageData(0, 0, width, height);
  });
}
