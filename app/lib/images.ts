/**
 * Загружает изображение по URL с поддержкой CORS.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Вычисляет итоговые размеры GIF на основе первого кадра.
 */
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

/**
 * Отрисовывает изображение на холсте методом Center Cover (без искажения пропорций).
 */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
) {
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
}

/**
 * Превращает массив загруженных изображений в массив готовых HTMLCanvasElement.
 */
export function imagesToCanvases(
  images: HTMLImageElement[],
  width: number,
  height: number
): HTMLCanvasElement[] {
  return images.map((img) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Белый фон для защиты от прозрачности
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    drawCover(ctx, img, width, height);
    
    return canvas;
  });
}
