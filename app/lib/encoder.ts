// app/lib/encoder.ts
declare const GIF: any;

export async function encodeGif(
  frames: ImageData[],
  delay: number, // в миллисекундах!
  width: number,
  height: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof GIF === "undefined") {
      return reject(new Error("GIF.js не загружен"));
    }

    const gif = new GIF({
      workers: Math.min(navigator.hardwareConcurrency || 4, 6),
      quality: 10,
      width,
      height,
      workerScript: "/gif.worker.js",
      background: "#ffffff",
      // repeat: 0 — бесконечно (по умолчанию)
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) throw new Error("Не удалось получить 2D контекст");

    for (const frame of frames) {
      ctx.putImageData(frame, 0, 0);

      gif.addFrame(canvas, {
        delay: Math.round(delay), // важно: delay в миллисекундах
        dispose: 1,   // ← КЛЮЧЕВАЯ СТРОКА — убирает залипание первого кадра при delay > 2 сек
        copy: true,   // ← обязательно при dispose: 1
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", reject);

    gif.render();
  });
}
