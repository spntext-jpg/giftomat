declare const GIF: any;

export function encodeGif(
  frames: ImageData[],
  delay: number,
  width: number,
  height: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof GIF === "undefined" || !GIF) {
      return reject(new Error("GIF.js not loaded"));
    }

    const gif = new GIF({
      workers: 4,
      quality: 10,
      width,
      height,
      repeat: 0,
      workerScript: "/gif.worker.js",
      background: "#ffffff",
    });

    for (const frame of frames) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");
      ctx.putImageData(frame, 0, 0);

      // dispose: 1 (Do Not Dispose) — для непрозрачных кадров
      gif.addFrame(canvas, {
        delay: Math.round(delay),
        dispose: 1,
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Aborted")));

    gif.render();
  });
}
