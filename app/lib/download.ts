export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeDownloadUrl(url?: string): void {
  if (!url) return;
  URL.revokeObjectURL(url);
}

export function triggerDownload(url: string, fileName: string): void {
  // Встроенный предпросмотр Bitrix24 открывает приложение в iframe. В таком
  // контексте браузер игнорирует атрибут `download` у blob: URL (защита от
  // неявного скачивания во вложенных фреймах), и link.click() молча не делает
  // ничего. Рабочий обход — открыть blob в новой вкладке через window.open:
  // это пользовательский жест с кнопки, popup разрешён, а в новой вкладке
  // (top-level) браузер уже скачает/покажет файл.
  // В обычном окне оставляем чистый link.download + click — сохраняет имя файла.
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true; // cross-origin iframe: доступа к top нет — считаем вложенным
  }

  if (inIframe) {
    const opened = window.open(url, "_blank");
    // Если браузер задушил popup (редкость при жесте с кнопки) — fallback на
    // обычный линк с download: во многих средах он всё же срабатывает.
    if (!opened) {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
