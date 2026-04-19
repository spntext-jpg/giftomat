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
    if (!GIF) return reject(new Error("GIF.js not loaded"));

    const gif = new GIF({
      workers: 4, // Увеличиваем для скорости на десктопах
      quality: 10,
      width,
      height,
      repeat: 0,
      workerScript: "/gif.worker.js",
      background: "#ffffff"
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    for (const frame of frames) {
      ctx.putImageData(frame, 0, 0);
      // dispose: 1 (Do Not Dispose) предотвращает "залипание" первого кадра
      // на больших задержках, так как браузеру не нужно восстанавливать фон.
      gif.addFrame(canvas, { 
        delay: Math.round(delay), 
        copy: true,
        dispose: 1 
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Aborted")));
    
    gif.render();
  });
}
