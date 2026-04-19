export function encodeGif(
  canvases: HTMLCanvasElement[],
  delay: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GIF = (window as any).GIF;
    if (!GIF) { reject(new Error("gif.js не загружен")); return; }
    if (!canvases.length) { reject(new Error("Нет кадров")); return; }

    const gif = new GIF({
      workers: 4, quality: 1,
      workerScript: "/gif.worker.js",
      background: "#ffffff", transparent: null,
      width: canvases[0].width, height: canvases[0].height,
    });

    const safeDelay = Math.max(20, Math.round(delay));
    for (const c of canvases) gif.addFrame(c, { delay: safeDelay, copy: true });

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => blob.size ? resolve(blob) : reject(new Error("Пустой файл")));
    gif.on("abort", () => reject(new Error("Кодирование прервано")));
    gif.render();
  });
}
