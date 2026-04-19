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

    const gif = new GIF({
      workers: 4,
      quality: 10,
      width,
      height,
      workerScript: "/gif.worker.js",
      background: "#ffffff",
      repeat: 0,
    });

    // --- 1️⃣ ДОБАВЛЯЕМ ТЕХНИЧЕСКИЙ КАДР ---
    const hackCanvas = document.createElement("canvas");
    hackCanvas.width = width;
    hackCanvas.height = height;
    const hackCtx = hackCanvas.getContext("2d")!;
    hackCtx.fillStyle = "#ffffff";
    hackCtx.fillRect(0, 0, width, height);

    gif.addFrame(hackCanvas, {
      delay: 20,          // 20ms
      dispose: 2,
      copy: true,
    });

    // --- 2️⃣ ДОБАВЛЯЕМ РЕАЛЬНЫЕ КАДРЫ ---
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

    gif.on("progress", (p: number) => {
      onProgress?.(Math.round(p * 100));
    });

    gif.on("finished", (blob: Blob) => {
      resolve(blob);
    });

    gif.on("abort", () => reject(new Error("Encoding aborted")));

    gif.render();
  });
}
