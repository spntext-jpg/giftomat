export type HtmlCaptureRequest = { type: "GIFTOMAT_CAPTURE_REQUEST"; pixelRatio: number };
export type HtmlCaptureMessage =
  | { type: "GIFTOMAT_READY" }
  | { type: "GIFTOMAT_CAPTURE_RESULT"; dataUrl: string; width: number; height: number }
  | { type: "GIFTOMAT_CAPTURE_ERROR"; message: string };

export function isHtmlCaptureMessage(value: unknown): value is HtmlCaptureMessage {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const message = value as Record<string, unknown>;
  if (message.type === "GIFTOMAT_READY") return true;
  if (message.type === "GIFTOMAT_CAPTURE_ERROR") return typeof message.message === "string";
  return message.type === "GIFTOMAT_CAPTURE_RESULT"
    && typeof message.dataUrl === "string"
    && typeof message.width === "number"
    && typeof message.height === "number";
}

export interface HtmlPdfPagePreset {
  id: string;
  label: string;
  widthPt: number;
  heightPt: number;
}

// Units are real PDF points (72 per inch), unlike the carousel's "1px = 1pt".
// These are true print formats, so any PDF reader shows an ordinary document
// rather than a square social card.
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
 * Cuts a tall "master canvas" (the whole captured document) into pages of a
 * fixed height `pageHeightPx`. The last page may be shorter: the caller must
 * paint the remainder with the page background instead of stretching it.
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

/** CSS pixels (96 per inch) for a page width; used as the iframe width while rendering. */
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
 * Injects the capture script (html-to-image + postMessage protocol) into the
 * user's HTML without touching the rest of the markup. A pure string function,
 * so it is testable without a browser.
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
