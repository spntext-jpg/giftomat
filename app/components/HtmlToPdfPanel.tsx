"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createDownloadUrl, revokeDownloadUrl } from "../lib/download";
import {
  buildCapturePreviewDocument,
  computePageSlices,
  HTML_PDF_PAGE_PRESETS,
  pointsToCssPixels,
} from "../lib/htmlPdf";
import { loadImage } from "../lib/images";
import { buildImagePdf, type JpegPdfPage } from "../lib/pdf";
import { formatBytes, safeBaseName } from "../lib/presets";

interface HtmlToPdfPanelProps {
  disabled?: boolean;
}

interface CaptureMessage {
  type: "GIFTOMAT_READY" | "GIFTOMAT_CAPTURE_RESULT" | "GIFTOMAT_CAPTURE_ERROR";
  dataUrl?: string;
  width?: number;
  height?: number;
  message?: string;
}

const DEFAULT_PIXEL_RATIO = 2;
const CAPTURE_TIMEOUT_MS = 20000;

// GIFTOMAT_HTML2PDF_V1_PANEL
export default function HtmlToPdfPanel({ disabled = false }: HtmlToPdfPanelProps) {
  const [htmlSource, setHtmlSource] = useState("");
  const [sourceFileName, setSourceFileName] = useState("document");
  const [pagePresetId, setPagePresetId] = useState(HTML_PDF_PAGE_PRESETS[0].id);
  const [pixelRatio, setPixelRatio] = useState(DEFAULT_PIXEL_RATIO);
  const [iframeReady, setIframeReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; size: number; downloadUrl: string; pageCount: number } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureResolverRef = useRef<((message: CaptureMessage) => void) | null>(null);

  const preset = HTML_PDF_PAGE_PRESETS.find((item) => item.id === pagePresetId) ?? HTML_PDF_PAGE_PRESETS[0];
  const iframeWidthPx = pointsToCssPixels(preset.widthPt);

  const previewSrcDoc = useMemo(
    () => (htmlSource.trim() ? buildCapturePreviewDocument(htmlSource) : ""),
    [htmlSource]
  );

  useEffect(() => {
    setIframeReady(false);
  }, [previewSrcDoc]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as CaptureMessage | undefined;
      if (!data || typeof data !== "object") return;
      if (data.type === "GIFTOMAT_READY") {
        setIframeReady(true);
        return;
      }
      if (data.type === "GIFTOMAT_CAPTURE_RESULT" || data.type === "GIFTOMAT_CAPTURE_ERROR") {
        captureResolverRef.current?.(data);
        captureResolverRef.current = null;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    return () => revokeDownloadUrl(result?.downloadUrl);
  }, [result?.downloadUrl]);

  const requestCapture = (ratio: number): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) {
        reject(new Error("Предпросмотр ещё не готов"));
        return;
      }
      const timeoutId = window.setTimeout(() => {
        captureResolverRef.current = null;
        reject(new Error("Превышено время ожидания рендера. Попробуйте документ короче или меньший масштаб."));
      }, CAPTURE_TIMEOUT_MS);

      captureResolverRef.current = (message) => {
        window.clearTimeout(timeoutId);
        if (message.type === "GIFTOMAT_CAPTURE_ERROR" || !message.dataUrl || !message.width || !message.height) {
          reject(new Error(message.message || "Не удалось отрендерить документ"));
          return;
        }
        resolve({ dataUrl: message.dataUrl, width: message.width, height: message.height });
      };

      iframe.contentWindow.postMessage({ type: "GIFTOMAT_CAPTURE_REQUEST", pixelRatio: ratio }, "*");
    });
  };

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setHtmlSource(text);
      setSourceFileName(file.name);
      setResult(null);
      setError(null);
    } catch {
      setError("Не удалось прочитать файл");
    }
  };

  const exportPdf = async () => {
    if (!htmlSource.trim() || working || disabled) return;
    if (!iframeReady) {
      setError("Предпросмотр ещё загружается — подождите секунду и попробуйте снова.");
      return;
    }

    setWorking(true);
    setError(null);
    setResult(null);
    setProgress(5);

    try {
      const captured = await requestCapture(pixelRatio);
      setProgress(35);

      const sourceImage = await loadImage(captured.dataUrl);
      const masterCanvas = document.createElement("canvas");
      masterCanvas.width = captured.width;
      masterCanvas.height = captured.height;
      const masterCtx = masterCanvas.getContext("2d");
      if (!masterCtx) throw new Error("Canvas недоступен в этом браузере");
      masterCtx.drawImage(sourceImage, 0, 0);

      const pageAspect = preset.heightPt / preset.widthPt;
      const pageHeightPx = Math.round(captured.width * pageAspect);
      const slices = computePageSlices(captured.height, pageHeightPx);
      if (!slices.length) throw new Error("Не удалось определить содержимое документа");

      const pages: JpegPdfPage[] = [];
      for (let index = 0; index < slices.length; index += 1) {
        const slice = slices[index];
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = captured.width;
        pageCanvas.height = pageHeightPx;
        const pageCtx = pageCanvas.getContext("2d");
        if (!pageCtx) throw new Error("Canvas недоступен в этом браузере");
        pageCtx.fillStyle = "#ffffff";
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          masterCanvas,
          0, slice.y, captured.width, slice.height,
          0, 0, captured.width, slice.height
        );

        const blob: Blob = await new Promise((resolve, reject) => {
          pageCanvas.toBlob(
            (blobResult) => (blobResult ? resolve(blobResult) : reject(new Error("Не удалось сохранить страницу"))),
            "image/jpeg",
            0.92
          );
        });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        pages.push({ bytes, pixelWidth: pageCanvas.width, pixelHeight: pageCanvas.height });
        setProgress(35 + Math.round(((index + 1) / slices.length) * 55));
      }

      const pdfBlob = buildImagePdf(pages, preset.widthPt, preset.heightPt);
      const downloadUrl = createDownloadUrl(pdfBlob);
      const name = `${safeBaseName(sourceFileName)}.pdf`;
      setResult({ name, size: pdfBlob.size, downloadUrl, pageCount: slices.length });
      setProgress(100);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Не удалось создать PDF");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <section className="canvas-panel html-canvas-panel glass-panel">
        {!htmlSource.trim() ? (
          <button
            type="button"
            className="empty-dropzone"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <strong>Выберите HTML-файл</strong>
            <span>или вставьте код в поле справа</span>
            <em>Вёрстка, стили и эффекты рендерятся как есть, локально в браузере</em>
          </button>
        ) : (
          <div className="html-import-frame-wrap">
            {/* eslint-disable-next-line react/iframe-missing-sandbox */}
            <iframe
              ref={iframeRef}
              srcDoc={previewSrcDoc}
              sandbox="allow-scripts"
              title="Предпросмотр HTML"
              className="html-import-frame"
              style={{ width: `${iframeWidthPx}px` }}
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,text/html"
          hidden
          onChange={(event) => {
            handleFileSelect(event.target.files?.[0]);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      </section>

      <aside className="control-panel html-control-panel glass-panel">
        <div className="control-heading">
          <span className="eyebrow">Настройки экспорта</span>
          <h1>HTML → PDF</h1>
          <p>Документ рендерится как в браузере и сохраняется постранично.</p>
        </div>

        <div className="settings-scroll">
          <div className="setting-group">
            <label htmlFor="html-source-textarea">HTML-код</label>
            <textarea
              id="html-source-textarea"
              className="html-source-textarea"
              placeholder="<html>...</html>"
              value={htmlSource}
              disabled={working || disabled}
              onChange={(event) => {
                setHtmlSource(event.target.value);
                setSourceFileName((current) => current || "document");
                setResult(null);
                setError(null);
              }}
            />
            <button
              type="button"
              className="secondary-button compact html-file-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={working || disabled}
            >
              Загрузить .html файл
            </button>
          </div>

          <div className="setting-group crop-setting-group">
            <label htmlFor="html-page-preset">Формат страницы</label>
            <div className="pdf-preset-select">
              <svg className="pdf-preset-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2h8l4 4v16H6Z" />
                <path d="M14 2v5h5" />
              </svg>
              <select
                id="html-page-preset"
                className="pdf-preset-control"
                value={pagePresetId}
                disabled={working || disabled}
                onChange={(event) => setPagePresetId(event.target.value)}
              >
                {HTML_PDF_PAGE_PRESETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <svg className="pdf-preset-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 8 4 4 4-4" />
              </svg>
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-row">
              <label htmlFor="html-pixel-ratio">Чёткость рендера</label>
              <output>{pixelRatio}×</output>
            </div>
            <input
              id="html-pixel-ratio"
              className="zephyr-range"
              type="range"
              min="1"
              max="3"
              step="0.5"
              value={pixelRatio}
              disabled={working || disabled}
              onChange={(event) => setPixelRatio(Number(event.target.value))}
            />
            <div className="range-labels"><span>Легче файл</span><span>Печатное качество</span></div>
          </div>

          {error && <div className="error-card" role="alert">{error}</div>}
          {result && (
            <div className="result-card">
              <div className="result-check">✓</div>
              <div>
                <strong>PDF готов</strong>
                <div className="result-meta">
                  <span>{result.pageCount} {result.pageCount === 1 ? "страница" : "страниц"}</span>
                  <span>{formatBytes(result.size)}</span>
                </div>
              </div>
              <a
                className="download-button"
                href={result.downloadUrl}
                download={result.name}
                target="_blank"
                rel="noopener noreferrer"
              >
                Скачать файл
              </a>
            </div>
          )}
        </div>

        <div className="control-footer">
          <button
            type="button"
            className="primary-button"
            onClick={exportPdf}
            disabled={!htmlSource.trim() || working || disabled}
          >
            {working ? <span className="button-spinner" /> : null}
            {working ? `Рендерим… ${progress}%` : "Создать PDF"}
          </button>
          <span>Файл обрабатывается локально</span>
        </div>
      </aside>
    </>
  );
}
