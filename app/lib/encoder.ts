export function encodeGif(
  framesData: ImageData[],
  delay: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GIF = (window as any).GIF;
    
    if (!GIF) { reject(new Error("Библиотека gif.js не загружена")); return; }
    if (!framesData.length) { reject(new Error("Нет кадров для склейки")); return; }

    const gif = new GIF({
      workers: 2, 
      quality: 1,
      repeat: 0, 
      workerScript: "/gif.worker.js",
      background: "#ffffff",
      width: framesData[0].width, 
      height: framesData[0].height,
    });

    const safeDelay = Math.max(20, Math.round(delay));

    // Передаем ImageData напрямую. copy: true не нужно.
    // dispose: 1 (Do Not Dispose) - идеален для непрозрачных кадров, убирает моргание
    for (const frame of framesData) {
      gif.addFrame(frame, { 
        delay: safeDelay,
        dispose: 1 
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => blob.size ? resolve(blob) : reject(new Error("Пустой файл")));
    gif.on("abort", () => reject(new Error("Кодирование прервано")));
    gif.on("error", (err: unknown) => reject(err));
    
    gif.render();
  });
}
