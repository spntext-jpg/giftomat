export function encodeGif(
  canvases: HTMLCanvasElement[],
  delay: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GIF = (window as any).GIF;
    
    if (!GIF) {
      reject(new Error("Библиотека gif.js не загружена"));
      return;
    }
    if (!canvases.length) {
      reject(new Error("Нет кадров для склейки"));
      return;
    }

    const gif = new GIF({
      workers: 2, 
      quality: 1,
      repeat: 0, // 0 = бесконечный цикл воспроизведения
      workerScript: "/gif.worker.js",
      background: "#ffffff",
      transparent: null,
      width: canvases[0].width, 
      height: canvases[0].height,
    });

    const safeDelay = Math.max(20, Math.round(delay));

    for (const c of canvases) {
      gif.addFrame(c, { 
        delay: safeDelay, 
        copy: true,
        dispose: 2 // Очистка холста перед следующим кадром (чинит зависание)
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => blob.size ? resolve(blob) : reject(new Error("Пустой файл")));
    gif.on("abort", () => reject(new Error("Кодирование прервано")));
    gif.on("error", (err: unknown) => reject(err));
    
    gif.render();
  });
}
