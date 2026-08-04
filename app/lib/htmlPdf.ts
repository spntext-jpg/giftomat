// GIFTOMAT_HTML2PDF_V1_LIB
export interface HtmlPdfPagePreset {
  id: string;
  label: string;
  widthPt: number;
  heightPt: number;
}

// Точки — настоящие PDF-пункты (72 на дюйм), не "1px = 1pt" как у карусели.
// Это реальные печатные форматы, поэтому просмотр в любом PDF-ридере выглядит
// как обычный документ, а не квадратная карточка для соцсетей.
export const HTML_PDF_PAGE_PRESETS: HtmlPdfPagePreset[] = [
  { id: "a4-portrait", label: "A4 · портрет", widthPt: 595, heightPt: 842 },
  { id: "a4-landscape", label: "A4 · альбом", widthPt: 842, heightPt: 595 },
  { id: "letter-portrait", label: "Letter · портрет", widthPt: 612, heightPt: 792 },
  { id: "letter-landscape", label: "Letter · альбом", widthPt: 792, heightPt: 612 },
];

export interface PageSlice {
  y: number;
  height: number;
}

/**
 * Режет высокий "мастер-канвас" (весь захваченный документ целиком) на
 * страницы фиксированной высоты pageHeightPx. Последняя страница может быть
 * короче — вызывающий код должен дорисовать остаток фоном, а не растягивать.
 */
export function computePageSlices(totalHeightPx: number, pageHeightPx: number): PageSlice[] {
  if (totalHeightPx <= 0 || pageHeightPx <= 0) return [];
  const pageCount = Math.max(1, Math.ceil(totalHeightPx / pageHeightPx));
  return Array.from({ length: pageCount }, (_, index) => {
    const y = index * pageHeightPx;
    const height = Math.min(pageHeightPx, totalHeightPx - y);
    return { y, height };
  });
}

/** CSS-пиксели (96/дюйм) для ширины страницы — используется как ширина iframe при рендере. */
export function pointsToCssPixels(points: number): number {
  return Math.round((points / 72) * 96);
}

const CAPTURE_SCRIPT = `
<script src="/html-to-image.js"></script>
<script>
(function () {
  function respond(message) {
    window.parent.postMessage(message, "*");
  }
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "GIFTOMAT_CAPTURE_REQUEST") return;
    var pixelRatio = event.data.pixelRatio || 2;
    if (typeof htmlToImage === "undefined") {
      respond({ type: "GIFTOMAT_CAPTURE_ERROR", message: "Библиотека рендеринга не загрузилась" });
      return;
    }
    htmlToImage
      .toCanvas(document.body, { pixelRatio: pixelRatio, backgroundColor: "#ffffff" })
      .then(function (canvas) {
        respond({
          type: "GIFTOMAT_CAPTURE_RESULT",
          dataUrl: canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height,
        });
      })
      .catch(function (err) {
        respond({ type: "GIFTOMAT_CAPTURE_ERROR", message: String((err && err.message) || err) });
      });
  });
  window.addEventListener("load", function () {
    respond({ type: "GIFTOMAT_READY" });
  });
})();
</script>`;

/**
 * Вставляет скрипт захвата (html-to-image + postMessage-протокол) в HTML
 * пользователя, не трогая остальную разметку. Чистая строковая функция —
 * поэтому тестируема без браузера.
 */
export function buildCapturePreviewDocument(userHtml: string): string {
  if (/<\/body>/i.test(userHtml)) {
    return userHtml.replace(/<\/body>/i, `${CAPTURE_SCRIPT}\n</body>`);
  }
  if (/<\/html>/i.test(userHtml)) {
    return userHtml.replace(/<\/html>/i, `${CAPTURE_SCRIPT}\n</html>`);
  }
  return `${userHtml}\n${CAPTURE_SCRIPT}`;
}
