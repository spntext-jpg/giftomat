declare const GIF: any;

export function encodeGif(
  frames: ImageData[],
  delay: number,
  width: number,
  height: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Проверяем загрузку gif.js
    const GIFConstructor = (window as any).GIF || GIF;
    if (!GIFConstructor) {
      return reject(new Error("GIF.js not loaded"));
    }

    const gif = new GIFConstructor({
      workers: 4,
      quality: 10,
      width,
      height,
      repeat: 0,
      workerScript: "/gif.worker.js",
      background: "#ffffff",
    });

    // Создаём один canvas для рендеринга кадров
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      return reject(new Error("Canvas context failed"));
    }

    for (const frame of frames) {
      ctx.putImageData(frame, 0, 0);
      
      // copy: true — КРИТИЧНО! Без него gif.js переиспользует canvas,
      // что вызывает "залипание" первого кадра на больших delay.
      // dispose: 1 (Do Not Dispose) — предотвращает артефакты фона.
      gif.addFrame(canvas, {
        delay: Math.round(delay),
        copy: true,
        dispose: 1,
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Aborted")));

    gif.render();
  });
}
