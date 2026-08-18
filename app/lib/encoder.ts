declare const GIF: any;


export function encodeGif(
  frames: ImageData[],
  delaysMs: number[],
  width: number,
  height: number,
  onProgress?: (pct: number) => void,
  quality: number = 15
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!frames.length) {
      reject(new Error("Нет кадров для GIF"));
      return;
    }
    if (typeof GIF === "undefined") {
      reject(new Error("GIF.js не загружен"));
      return;
    }

    const workerCount = Math.min(
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
      8,
      frames.length + 1
    );

    const gif = new GIF({
      workers: Math.max(1, workerCount),
      quality,
      width,
      height,
      workerScript: "/gif.worker.js",
      background: "#ffffff",
      repeat: 0,
      dither: false,
    });

    // Минимальный повтор первого реального кадра сохраняет проверенный фикс
    // начального белого кадра, но без промежуточных canvas-копий.
    gif.addFrame(frames[0], { delay: 1, copy: true });
    frames.forEach((frame, index) => {
      const delayMs = delaysMs[index] ?? delaysMs[0] ?? 1000;
      gif.addFrame(frame, {
        delay: Math.max(10, Math.round(delayMs)),
        copy: true,
      });
    });

    gif.on("progress", (progress: number) => onProgress?.(Math.round(progress * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Кодирование отменено")));
    gif.render();
  });
}
