/**
 * Encodes an array of ImageData frames into a GIF Blob using gif.js.
 */
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
      reject(new Error("Библиотека gif.js не загружена"));
      return;
    }
    const gif = new GIF({
      workers: 2,
      quality: 1, // 1 = Best quality, slower. Default is 10.
      width,
      height,
      workerScript: "/gif.worker.js",
      background: '#ffffff'
    });
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

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
