// app/lib/encoder.ts

declare const GIF: any;

export function encodeGif(
  frames: ImageData[],
  delay: number,
  width: number,
  height: number,
  onProgress?: (pct: number) => void
): Promise<Blob> { // ← ИСПРАВЛЕНО: Добавлен тип Promise<Blob>
  return new Promise((resolve, reject) => {
    if (typeof GIF === 'undefined') { // ← ИСПРАВЛЕНО: Корректная проверка
      return reject(new Error("GIF.js not loaded"));
    }

    const gif = new GIF({ // ← ИСПРАВЛЕНО: Объявление gif
      workers: 4,
      quality: 10,
      width,
      height,
      repeat: 0,
      workerScript: "/gif.worker.js",
      background: "#ffffff",
    });

    // ← ИСПРАВЛЕНО: Создаем один canvas, который будем переиспользовать
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return reject(new Error("Canvas context failed"));
    }

    for (const frame of frames) {
      // ← ИСПРАВЛЕНО: Помещаем данные кадра на canvas
      ctx.putImageData(frame, 0, 0);

      gif.addFrame(canvas, {
        delay: Math.round(delay),
        dispose: 1,
        copy: true, // ← КЛЮЧЕВОЙ МОМЕНТ: Решает проблему "залипания"
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Aborted")));

    gif.render();
  });
}
