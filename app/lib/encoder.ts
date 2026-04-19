/**
 * Эффективное кодирование GIF.
 * Используем HTMLCanvasElement для сохранения четкости и правильных задержек.
 */
export function encodeGif(
  canvases: HTMLCanvasElement[],
  delay: number,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GIF = (window as any).GIF;
    if (!GIF) {
      reject(new Error("Библиотека gif.js не найдена. Проверьте подключение скрипта."));
      return;
    }

    const gif = new GIF({
      workers: 4, // Увеличиваем количество воркеров для скорости
      quality: 1, // Максимальное качество (1 - лучшее, 10 - дефолт)
      workerScript: "/gif.worker.js",
      background: '#ffffff',
      transparent: null // Убираем прозрачность, чтобы избежать "грязных" краев
    });

    // Важно: гарантируем, что задержка — целое число и не меньше 20мс (стандарт браузеров)
    const safeDelay = Math.max(20, Math.round(delay));

    for (const canvas of canvases) {
      gif.addFrame(canvas, { 
        delay: safeDelay, 
        copy: true // Делаем копию кадра, чтобы избежать мерцания
      });
    }

    gif.on("progress", (p: number) => onProgress?.(Math.round(p * 100)));
    
    gif.on("finished", (blob: Blob) => {
      if (blob.size === 0) reject(new Error("Ошибка: пустой файл"));
      else resolve(blob);
    });

    gif.on("error", (err: any) => reject(err));
    
    gif.render();
  });
}
