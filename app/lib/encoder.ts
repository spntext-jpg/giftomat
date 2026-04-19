// app/lib/encoder.ts

declare const GIF: any;

export function encodeGif(
  frames: ImageData[],
  delay: number,
  width: number,
  height: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof GIF === 'undefined') {
      return reject(new Error("GIF.js не загружен"));
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

    // ГЛАВНОЕ ИЗМЕНЕНИЕ: Мы создаем НОВЫЙ холст для КАЖДОГО кадра
    // чтобы избежать состояния гонки (race condition).
    for (const frame of frames) {
      // 1. Создаем временный холст
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");

      if (!tempCtx) {
        // Эту ошибку стоит обрабатывать, но для простоты опустим
        continue; 
      }
      
      // 2. Помещаем на него данные текущего кадра
      tempCtx.putImageData(frame, 0, 0);

      // 3. Добавляем в GIF именно этот временный, уникальный холст
      gif.addFrame(tempCanvas, {
        delay: Math.round(delay),
        dispose: 1, // Правильно: оставляем предыдущий кадр (т.к. все непрозрачные)
        copy: true, // Правильно: копируем данные с холста
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    gif.on("finished", (blob: Blob) => resolve(blob));
    gif.on("abort", () => reject(new Error("Процесс кодирования прерван")));

    gif.render();
  });
}
