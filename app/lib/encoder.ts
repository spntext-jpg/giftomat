/**
 * Encodes an array of ImageData frames into a GIF Blob using gif.js.
 * gif.js is loaded from /gif.js (copied to public/).
 * 
 * @param frames - Array of ImageData objects
 * @param delay  - Delay per frame in milliseconds
 * @param width  - Frame width
 * @param height - Frame height
 */
export function encodeGif(
  frames: ImageData[],
  delay: number,
  width: number,
  height: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // gif.js is loaded as a global script via <Script> tag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GIF = (window as any).GIF;
    if (!GIF) {
      reject(new Error("gif.js не загружен"));
      return;
    }

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width,
      height,
      workerScript: "/gif.worker.js",
    });

    // Create a canvas to pass frames into gif.js
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    for (const frame of frames) {
      ctx.putImageData(frame, 0, 0);
      gif.addFrame(canvas, { delay, copy: true });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Кодирование прервано")));

    gif.render();
  });
}
