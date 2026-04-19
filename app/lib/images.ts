// app/lib/images.ts

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(); // ← ИСПРАВЛЕНО: Объявление img
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function computeDimensions(
  images: HTMLImageElement[],
  maxWidth: number = 1200
): { width: number; height: number } {
  if (!images.length) return { width: 800, height: 800 };
  
  const first = images[0]; // ← ИСПРАВЛЕНО: Объявление first
  let width = first.naturalWidth;
  let height = first.naturalHeight;
  const ratio = height / width; // ← ИСПРАВЛЕНО: Объявление ratio

  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width * ratio); // ← ИСПРАВЛЕНО: Корректный расчет высоты
  }
  return { width, height };
}

export function imagesToImageData(
  images: HTMLImageElement[],
  width: number,
  height: number
): ImageData[] {
  return images.map((img) => {
    // ← ИСПРАВЛЕНО: Canvas создается для каждого кадра
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Canvas context failed");

    // ← КЛЮЧЕВОЙ МОМЕНТ: Белый фон для каждого кадра. Обязательно для dispose: 1.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvRatio = width / height;

    let dx = 0, dy = 0, dw = width, dh = height;

    // Центрирование и вписывание изображения в кадр
    if (imgRatio > canvRatio) {
      dw = img.naturalWidth * (height / img.naturalHeight);
      dx = (width - dw) / 2;
    } else {
      dh = img.naturalHeight * (width / img.naturalWidth);
      dy = (height - dh) / 2;
    }
    
    ctx.drawImage(img, dx, dy, dw, dh); // ← ИСПРАВЛЕНО: Отрисовка изображения

    return ctx.getImageData(0, 0, width, height);
  });
}
