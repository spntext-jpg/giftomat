export function encodeGif(
  frames: ImageData[],
  delay: number,
  width: number,
  height: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GIF = (window as any).GIF;
    if (!GIF) {
      reject(new Error("gif.js не загружен"));
      return;
    }

    const gif = new GIF({
      workers: 2,
      quality: 5, // Баланс между скоростью и качеством
      width,
      height,
      repeat: 0, // Бесконечный цикл
      workerScript: "/gif.worker.js",
    });

    // Создаем один буферный канвас для всех кадров
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    for (const frame of frames) {
      ctx.putImageData(frame, 0, 0);
      // Важно: copy: true создает снимок состояния канваса для воркера
      gif.addFrame(canvas, { delay, copy: true });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Кодирование прервано")));
    
    gif.render();
  });
}
