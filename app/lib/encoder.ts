declare const GIF: any;

export function encodeGif(
  frames: ImageData[],
  delayMs: number,
  width: number,
  height: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof GIF === "undefined") {
      return reject(new Error("GIF.js not loaded"));
    }

    // Максимум воркеров для скорости
    const workerCount = Math.min(
      typeof navigator !== "undefined"
        ? navigator.hardwareConcurrency || 4
        : 4,
      8
    );

    const gif = new GIF({
      workers: workerCount,
      quality: 15,       // чуть хуже качество, но заметно быстрее
      width,
      height,
      workerScript: "/gif.worker.js",
      background: "#ffffff",
      repeat: 0,
      dither: false,     // отключаем дизеринг — +30% скорость
    });

    // ── Hack-кадр для фикса залипания ──────────────────────────────
    // Используем ПЕРВЫЙ реальный кадр с минимальной задержкой,
    // чтобы не было белого кадра в начале
    const firstCanvas = document.createElement("canvas");
    firstCanvas.width = width;
    firstCanvas.height = height;
    const firstCtx = firstCanvas.getContext("2d")!;
    firstCtx.putImageData(frames[0], 0, 0);

    gif.addFrame(firstCanvas, {
      delay: 1,       // 1ms — невидимо для глаза
      dispose: 2,
      copy: true,
    });

    // ── Основные кадры ──────────────────────────────────────────────
    for (const frame of frames) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.putImageData(frame, 0, 0);

      gif.addFrame(canvas, {
        delay: Math.round(delayMs),
        dispose: 2,
        copy: true,
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Encoding aborted")));

    gif.render();
  });
}
