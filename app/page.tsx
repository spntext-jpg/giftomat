"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type ReactNode } from "react";
import CropWorkspace from "./components/CropWorkspace";
import { createDownloadUrl, revokeDownloadUrl } from "./lib/download";
import { encodeGif } from "./lib/encoder";
import {
  computeDimensions,
  imageToJpegBlob,
  imageToOptimizedBlob,
  imagesToImageData,
  loadImage,
} from "./lib/images";
import { buildImagePdf, type JpegPdfPage } from "./lib/pdf";
import {
  formatBytes,
  LINKEDIN_PDF_MAX_BYTES,
  LINKEDIN_PDF_TARGET_BYTES,
  PDF_PRESETS,
  type PdfPresetId,
  safeBaseName,
  type ToolMode,
  type WebOutputFormat,
  X_GIF_MOBILE_MAX_BYTES,
  X_GIF_WEB_MAX_BYTES,
  X_GIF_WEB_TARGET_BYTES,
  buildGifAttempts,
  GIF_MOBILE_MAX_BYTES,
  GIF_WEB_MAX_BYTES,
} from "./lib/presets";
import { buildStoredZip, type ZipEntry } from "./lib/zip";

interface ImageItem {
  id: string;
  url: string;
  file: File;
}

type Stage = "idle" | "working" | "done" | "error";
type PreviewMode = "source" | "result";

interface ExportResult {
  kind: ToolMode;
  blob: Blob;
  fileName: string;
  title: string;
  details: string[];
  downloadUrl: string;
  previewUrl?: string;
  warning?: string;
  aspectHint?: string;
}

const MAX_FILES = 60;
const MAX_FILE_BYTES = 40 * 1024 * 1024;

function getGifXAspectHint(width: number, height: number): string | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
  const ratio = width / height;
  if (ratio < 0.95) {
    return `GIF ${width} × ${height} слишком вертикальный для поста в X. В ленте могут появиться полосы справа и слева. Лучше слегка подрезать кадры до 1:1 или 16:9.`;
  }
  if (ratio > 2.05) {
    return `GIF ${width} × ${height} слишком широкий для поста в X. Для более аккуратного вида лучше слегка подрезать кадры до 16:9 или 1:1.`;
  }
  return undefined;
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

const TOOL_COPY: Record<ToolMode, { title: string; description: string }> = {
  gif: {
    title: "GIF-анимация",
    description: "Соберите GIF прямо в браузере.",
  },
  pdf: {
    title: "LinkedIn-карусель",
    description: "Соберите баннеры в PDF-карусель.",
  },
  compress: {
    title: "Сжатие баннеров",
    description: "Экспортируйте лёгкие JPG или WebP для сайтов, блогов и публикаций.",
  },
  crop: {
    title: "Обрезка баннера",
    description: "Задайте точный размер и выберите нужную область.",
  },
};

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ToolIcon({ name }: { name: ToolMode | "upload" | "download" | "trash" | "privacy" }) {
  const paths: Record<string, ReactNode> = {
    gif: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m9 9 6 3-6 3Z"/></>,
    pdf: <><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h5"/></>,
    compress: <><path d="m8 3-5 5m0-5v5h5M16 21l5-5m0 5v-5h-5"/><rect x="7" y="7" width="10" height="10" rx="2"/></>,
    crop: <><path d="M7 3v13a5 5 0 0 0 5 5h9"/><path d="M3 7h13a5 5 0 0 1 5 5v9"/><path d="M7 7h10v10H7Z"/></>,
    upload: <><path d="M12 16V3m0 0L7 8m5-5 5 5"/><path d="M4 15v5h16v-5"/></>,
    download: <><path d="M12 3v13m0 0 5-5m-5 5-5-5"/><path d="M4 19v2h16v-2"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
    privacy: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z"/><path d="m9 12 2 2 4-4"/></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

// GIFTOMAT_CROP_RATIO_CLEANUP_V1_PAGE
// GIFTOMAT_CJM_POLISH_V2_PAGE
// GIFTOMAT_PDF_DROPDOWN_V1_PAGE
export default function GiftomatPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolMode>("gif");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("source");
  const [frameDuration, setFrameDuration] = useState(2);
  const [pdfPreset, setPdfPreset] = useState<PdfPresetId>("linkedin-portrait");
  const [pdfFit, setPdfFit] = useState<"contain" | "cover">("contain");
  const [jpegQuality, setJpegQuality] = useState(82);
  const [webOutputFormat, setWebOutputFormat] = useState<WebOutputFormat>("jpeg");
  // GIFTOMAT_SPRINT1_V1_COMPARE
  const [comparePreview, setComparePreview] = useState<{ url: string; size: number } | null>(null);
  const [showCompressPreview, setShowCompressPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<ImageItem[]>([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = (isLight: boolean) => {
      document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
    };
    applyTheme(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => applyTheme(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.url);
    };
  }, []);

  useEffect(() => {
    return () => {
      revokeDownloadUrl(result?.downloadUrl);
      if (result?.previewUrl && result.previewUrl !== result.downloadUrl) {
        revokeDownloadUrl(result.previewUrl);
      }
    };
  }, [result?.downloadUrl, result?.previewUrl]);

  useEffect(() => {
    return () => revokeDownloadUrl(comparePreview?.url);
  }, [comparePreview?.url]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images[0] ?? null,
    [images, selectedId]
  );

  useEffect(() => {
    if (activeTool !== "compress" || !selectedImage) {
      setComparePreview(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const sourceImage = await loadImage(selectedImage.url);
        if (cancelled) return;
        const mimeType = webOutputFormat === "webp" ? "image/webp" : "image/jpeg";
        const blob = await imageToOptimizedBlob(sourceImage, {
          width: sourceImage.naturalWidth,
          height: sourceImage.naturalHeight,
          fit: "contain",
          quality: jpegQuality / 100,
          type: mimeType,
          background: webOutputFormat === "webp" ? null : "#ffffff",
        });
        if (cancelled) return;
        setComparePreview({ url: createDownloadUrl(blob), size: blob.size });
      } catch {
        if (!cancelled) setComparePreview(null);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTool, selectedImage, webOutputFormat, jpegQuality]);

  const minimumFiles = activeTool === "gif" ? 2 : 1;
  const canGenerate = images.length >= minimumFiles && stage !== "working";

  const invalidateResult = () => {
    setResult(null);
    setPreviewMode("source");
    setStage("idle");
    setProgress(0);
    setStatusText("");
    setErrorMessage(null);
  };

  const addFiles = (incoming: FileList | File[]) => {
    if (stage === "working") return;
    invalidateResult();
    const availableSlots = Math.max(0, MAX_FILES - images.length);
    const accepted = Array.from(incoming)
      .filter((file) => file.type.startsWith("image/") && file.size <= MAX_FILE_BYTES)
      .slice(0, availableSlots);

    const rejectedCount = Array.from(incoming).length - accepted.length;
    const nextImages = accepted.map((file) => ({
      id: createId(),
      url: URL.createObjectURL(file),
      file,
    }));

    if (nextImages.length) {
      setImages((current) => [...current, ...nextImages]);
      setSelectedId((current) => current ?? nextImages[0].id);
    }

    if (rejectedCount > 0) {
      setErrorMessage(
        `Пропущено файлов: ${rejectedCount}. Поддерживаются изображения до 40 МБ, максимум ${MAX_FILES} кадров.`
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // GIFTOMAT_SPRINT1_V1_PASTE
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const files = Array.from(items)
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (files.length > 0) {
        event.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles]);

  const removeImage = (id: string) => {
    if (stage === "working") return;
    const removed = images.find((image) => image.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    const next = images.filter((image) => image.id !== id);
    setImages(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    invalidateResult();
  };

  // GIFTOMAT_SPRINT2_V1_REPLACE
  const replaceImages = (updates: { id: string; file: File }[]) => {
    if (!updates.length) return;
    setImages((current) =>
      current.map((image) => {
        const update = updates.find((item) => item.id === image.id);
        if (!update) return image;
        URL.revokeObjectURL(image.url);
        return { id: image.id, url: URL.createObjectURL(update.file), file: update.file };
      })
    );
    invalidateResult();
  };

  const clearImages = () => {
    if (stage === "working") return;
    for (const image of images) URL.revokeObjectURL(image.url);
    setImages([]);
    setSelectedId(null);
    invalidateResult();
  };

  const switchTool = (tool: ToolMode) => {
    if (stage === "working" || tool === activeTool) return;
    setActiveTool(tool);
    invalidateResult();
  };

  const generateGif = async () => {
    const loaded = await Promise.all(images.map((image) => loadImage(image.url)));
    const firstFrame = loaded[0];
    const attempts = buildGifAttempts(firstFrame.naturalWidth, firstFrame.naturalHeight);

    let finalBlob: Blob | null = null;
    let finalSize = attempts[0];
    let warning: string | undefined;

    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      finalSize = attempt;
      setStatusText(index === 0 ? "Собираем GIF" : "Пропорционально уменьшаем GIF");
      setProgress(0);

      // The first frame defines the canvas. Every following frame uses cover,
      // preventing artificial white or transparent side bars.
      const frames = imagesToImageData(loaded, attempt.width, attempt.height, "cover");
      finalBlob = await encodeGif(
        frames,
        frameDuration * 1000,
        attempt.width,
        attempt.height,
        setProgress,
        attempt.quality
      );

      if (finalBlob.size <= GIF_WEB_MAX_BYTES) break;
    }

    if (!finalBlob) throw new Error("Не удалось создать GIF");
    if (finalBlob.size > GIF_WEB_MAX_BYTES) {
      warning = "Файл превышает 15 МБ. Сократите количество кадров или длительность анимации перед публикацией в X.";
    } else if (finalBlob.size > GIF_MOBILE_MAX_BYTES) {
      warning = "GIF готов для загрузки через x.com. Для мобильного приложения X нужен файл до 5 МБ.";
    }

    const aspectHint = getGifXAspectHint(finalSize.width, finalSize.height);
    const downloadUrl = createDownloadUrl(finalBlob);
    const previewUrl = downloadUrl;
    setResult({
      kind: "gif",
      blob: finalBlob,
      downloadUrl,
      fileName: "giftomat.gif",
      title: "GIF готов",
      details: [
        `${finalSize.width} × ${finalSize.height} px`,
        finalSize.width > finalSize.height ? "Landscape" : finalSize.height > finalSize.width ? "Portrait" : "Square",
        formatBytes(finalBlob.size),
        `${images.length} кадров · ${frameDuration.toFixed(1)} с`,
      ],
      previewUrl,
      warning,
      aspectHint,
    });
    setPreviewMode("result");
  };


  const generatePdf = async () => {
    const preset = PDF_PRESETS[pdfPreset];
    const qualityAttempts = [0.92, 0.86, 0.8];
    let pdf: Blob | null = null;
    let usedQuality = qualityAttempts[0];

    for (let attemptIndex = 0; attemptIndex < qualityAttempts.length; attemptIndex += 1) {
      const quality = qualityAttempts[attemptIndex];
      const pages: JpegPdfPage[] = [];
      usedQuality = quality;

      for (let index = 0; index < images.length; index += 1) {
        setStatusText(
          attemptIndex === 0
            ? `Готовим страницу ${index + 1} из ${images.length}`
            : `Оптимизируем PDF · страница ${index + 1} из ${images.length}`
        );
        setProgress(Math.round(((attemptIndex + index / images.length) / qualityAttempts.length) * 90));
        const image = await loadImage(images[index].url);
        const jpeg = await imageToJpegBlob(image, {
          width: preset.width,
          height: preset.height,
          fit: pdfFit,
          quality,
        });
        pages.push({
          bytes: new Uint8Array(await jpeg.arrayBuffer()),
          pixelWidth: preset.width,
          pixelHeight: preset.height,
        });
      }

      pdf = buildImagePdf(pages, preset.width, preset.height);
      if (pdf.size <= LINKEDIN_PDF_TARGET_BYTES) break;
    }

    if (!pdf) throw new Error("Не удалось создать PDF");
    setProgress(100);
    const downloadUrl = createDownloadUrl(pdf);
    setResult({
      kind: "pdf",
      blob: pdf,
      downloadUrl,
      fileName: pdfPreset === "linkedin-portrait" ? "giftomat-linkedin-carousel.pdf" : "giftomat-carousel.pdf",
      title: "PDF-карусель готова",
      details: [
        `${images.length} страниц`,
        `${preset.width} × ${preset.height} px`,
        formatBytes(pdf.size),
        `качество ${Math.round(usedQuality * 100)}%`,
      ],
      warning: pdf.size > LINKEDIN_PDF_MAX_BYTES
        ? "PDF превышает лимит LinkedIn 100 МБ. Уменьшите число страниц или размер исходников."
        : undefined,
    });
  };

  const compressImages = async () => {
    const entries: ZipEntry[] = [];
    let originalBytes = 0;
    let compressedBytes = 0;
    const mimeType = webOutputFormat === "webp" ? "image/webp" : "image/jpeg";
    const extension = webOutputFormat === "webp" ? "webp" : "jpg";

    for (let index = 0; index < images.length; index += 1) {
      const item = images[index];
      setStatusText(`Оптимизируем ${index + 1} из ${images.length}`);
      setProgress(Math.round((index / images.length) * 90));
      const image = await loadImage(item.url);
      const optimized = await imageToOptimizedBlob(image, {
        width: image.naturalWidth,
        height: image.naturalHeight,
        fit: "contain",
        quality: jpegQuality / 100,
        type: mimeType,
        background: webOutputFormat === "webp" ? null : "#ffffff",
      });
      const name = `${String(index + 1).padStart(2, "0")}-${safeBaseName(item.file.name)}.${extension}`;
      const data = new Uint8Array(await optimized.arrayBuffer());
      entries.push({ name, data });
      originalBytes += item.file.size;
      compressedBytes += optimized.size;
    }

    const output = entries.length === 1
      ? new Blob([copyToArrayBuffer(entries[0].data)], { type: mimeType })
      : buildStoredZip(entries);
    const savedPercent = originalBytes > 0
      ? Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100))
      : 0;

    setProgress(100);
    const downloadUrl = createDownloadUrl(output);
    setResult({
      kind: "compress",
      blob: output,
      downloadUrl,
      fileName: entries.length === 1
        ? entries[0].name
        : `giftomat-web-${webOutputFormat}.zip`,
      title: "Баннеры оптимизированы",
      details: [
        `${formatBytes(originalBytes)} → ${formatBytes(compressedBytes)}`,
        `Экономия ${savedPercent}%`,
        `${entries.length} ${entries.length === 1 ? "файл" : "файлов"}`,
        webOutputFormat.toUpperCase(),
      ],
    });
  };

  const runExport = async () => {
    if (!canGenerate) return;
    setStage("working");
    setProgress(0);
    setErrorMessage(null);
    setResult(null);
    try {
      if (activeTool === "gif") await generateGif();
      if (activeTool === "pdf") await generatePdf();
      if (activeTool === "compress") await compressImages();
      setStage("done");
    } catch (error) {
      console.error(error);
      setStage("error");
      setErrorMessage(error instanceof Error ? error.message : "Неизвестная ошибка обработки");
    }
  };

  const buttonLabel = stage === "working"
    ? `${statusText || "Обработка"} · ${progress}%`
    : activeTool === "gif"
      ? images.length < 2 ? "Добавьте минимум 2 кадра" : "Создать GIF"
      : activeTool === "pdf"
        ? images.length < 1 ? "Добавьте изображения" : "Создать PDF"
        : images.length < 1 ? "Добавьте изображения" : `Оптимизировать в ${webOutputFormat.toUpperCase()}`;

  const toolInfo = TOOL_COPY[activeTool];

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar glass-panel">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <img className="brand-mark-image" src="/giftomat-favicon-stack-v4.png?v=20260728-v4" alt="" />
          </div>
          <div>
            <strong>Гифтомат</strong>
            <span>От Павлика с Прибалтики</span>
          </div>
        </div>
        <div className="privacy-pill">
          <ToolIcon name="privacy" />
          <span>Обработка локально</span>
        </div>
      </header>

      <div className="app-body">
                        <aside className="tool-sidebar glass-panel giftomat-nav" aria-label="Инструменты">
          <button
            type="button"
            className={`tool-button giftomat-nav-button ${activeTool === "gif" ? "active" : ""}`}
            onClick={() => switchTool("gif")}
            aria-pressed={activeTool === "gif"}
            aria-label="GIF — Анимация"
            disabled={stage === "working"}
          >
            <span className="tool-icon giftomat-nav-icon" aria-hidden="true">
              <ToolIcon name="gif" />
            </span>
            <div className="giftomat-nav-copy">
              <div className="giftomat-nav-title">GIF</div>
              <div className="giftomat-nav-note">Анимация</div>
            </div>
          </button>

          <button
            type="button"
            className={`tool-button giftomat-nav-button ${activeTool === "pdf" ? "active" : ""}`}
            onClick={() => switchTool("pdf")}
            aria-pressed={activeTool === "pdf"}
            aria-label="PDF — Карусель"
            disabled={stage === "working"}
          >
            <span className="tool-icon giftomat-nav-icon" aria-hidden="true">
              <ToolIcon name="pdf" />
            </span>
            <div className="giftomat-nav-copy">
              <div className="giftomat-nav-title">PDF</div>
              <div className="giftomat-nav-note">Карусель</div>
            </div>
          </button>

          <button
            type="button"
            className={`tool-button giftomat-nav-button ${activeTool === "compress" ? "active" : ""}`}
            onClick={() => switchTool("compress")}
            aria-pressed={activeTool === "compress"}
            aria-label="Сжатие — JPG и WebP"
            disabled={stage === "working"}
          >
            <span className="tool-icon giftomat-nav-icon" aria-hidden="true">
              <ToolIcon name="compress" />
            </span>
            <div className="giftomat-nav-copy">
              <div className="giftomat-nav-title">Сжатие</div>
              <div className="giftomat-nav-note">JPG · WebP</div>
            </div>
          </button>

          <button
            type="button"
            className={`tool-button giftomat-nav-button ${activeTool === "crop" ? "active" : ""}`}
            onClick={() => switchTool("crop")}
            aria-pressed={activeTool === "crop"}
            aria-label="Обрезка — Точный размер"
            disabled={stage === "working"}
          >
            <span className="tool-icon giftomat-nav-icon" aria-hidden="true">
              <ToolIcon name="crop" />
            </span>
            <div className="giftomat-nav-copy">
              <div className="giftomat-nav-title">Обрезка</div>
              <div className="giftomat-nav-note">Точный размер</div>
            </div>
          </button>
        </aside>

        <main className="studio-layout">
          {activeTool === "crop" ? (
            <CropWorkspace
              image={selectedImage}
              disabled={stage === "working"}
              onAddFiles={addFiles}
              batchImages={images}
              onReplaceImages={replaceImages}
            />
          ) : (
            <>
          <section
            className={`canvas-panel glass-panel ${isDragging ? "dragging" : ""}`}
            onDragOver={(event: DragEvent<HTMLElement>) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={(event: DragEvent<HTMLElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
            }}
            onDrop={(event: DragEvent<HTMLElement>) => {
              event.preventDefault();
              setIsDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <div className="canvas-toolbar">
              <div className="toolbar-actions">
                {result?.kind === "gif" && (
                  <button className="secondary-button compact" onClick={() => setPreviewMode((mode) => mode === "result" ? "source" : "result") }>
                    {previewMode === "result" ? "Показать кадр" : "Показать GIF"}
                  </button>
                )}
                {activeTool === "compress" && comparePreview && (
                  <button className="secondary-button compact" onClick={() => setShowCompressPreview((value) => !value)}>
                    {showCompressPreview ? "Показать оригинал" : "Показать сжатое"}
                  </button>
                )}
                {images.length > 0 && (
                  <button className="icon-button danger" onClick={clearImages} disabled={stage === "working"} aria-label="Удалить все изображения" title="Очистить всё">
                    <ToolIcon name="trash" />
                  </button>
                )}
              </div>
            </div>

            {images.length === 0 ? (
              <button className="empty-dropzone" onClick={() => fileInputRef.current?.click()} disabled={stage === "working"}>
<strong>Перетащите изображения сюда</strong>
                <span>или выберите файлы с компьютера</span>
                <em>PNG, JPG, WEBP · до 40 МБ · Ctrl+V, чтобы вставить из буфера</em>
              </button>
            ) : (
              <div className={`preview-workspace ${previewMode === "result" ? "result-mode" : ""}`}>
                <div className={`preview-stage ${previewMode === "result" ? "result-mode" : ""}`}>
                  <div className="preview-media-shell">
                    {previewMode === "result" && result?.previewUrl ? (
                      <img src={result.previewUrl} alt="Готовая GIF-анимация" className="preview-image contain result-media" />
                    ) : activeTool === "compress" && showCompressPreview && comparePreview ? (
                      <img src={comparePreview.url} alt="Сжатая версия" className="preview-image contain compare-media" />
                    ) : selectedImage ? (
                      <img src={selectedImage.url} alt={selectedImage.file.name} className="preview-image contain source-media" />
                    ) : null}
                  </div>

                  {stage === "working" && (
                    <div className="processing-overlay" role="status" aria-live="polite">
                      <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}>
                        <span>{progress}%</span>
                      </div>
                      <strong>{statusText || "Обработка"}</strong>
                      <small>Не закрывайте вкладку</small>
                    </div>
                  )}

                  <div className="preview-badge">
                    {previewMode === "result"
                      ? "Результат · полный просмотр"
                      : activeTool === "compress" && showCompressPreview && comparePreview
                        ? `${formatBytes(selectedImage?.file.size ?? 0)} → ${formatBytes(comparePreview.size)}${
                            selectedImage && selectedImage.file.size > 0
                              ? ` · −${Math.max(0, Math.round((1 - comparePreview.size / selectedImage.file.size) * 100))}%`
                              : ""
                          }`
                        : selectedImage?.file.name}
                  </div>
                </div>

                <div className="frame-strip" aria-label="Загруженные изображения">
                  {images.map((image, index) => (
                    <div key={image.id} className={`frame-card ${selectedImage?.id === image.id ? "selected" : ""}`}>
                      <button className="frame-select" disabled={stage === "working"} onClick={() => { setSelectedId(image.id); setPreviewMode("source"); }} aria-label={`Выбрать кадр ${index + 1}`}>
                        <img src={image.url} alt="" />
                        <span>{index + 1}</span>
                      </button>
                      <button className="frame-delete" disabled={stage === "working"} onClick={() => removeImage(image.id)} aria-label={`Удалить кадр ${index + 1}`}>×</button>
                    </div>
                  ))}
                  <button className="add-frame-card" disabled={stage === "working"} onClick={() => fileInputRef.current?.click()} aria-label="Добавить изображения">
                    <ToolIcon name="upload" />
                    <span>Добавить</span>
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              multiple
              hidden
              onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && addFiles(event.target.files)}
            />
          </section>

          <aside className="control-panel glass-panel">
            <div className="control-heading">
              <span className="eyebrow">Настройки экспорта</span>
              <h1>{toolInfo.title}</h1>
              <p>{toolInfo.description}</p>
            </div>

            <div className="settings-scroll">
              {activeTool === "gif" && (
                <>
                                    <div className="info-card">
                    <strong>Автоматический формат без рамок</strong>
                    <p>Размер и ориентация — по первому кадру. Без пустых полей.</p>
                  </div>
                  <div className="setting-group">
                    <div className="setting-row">
                      <label htmlFor="frame-duration">Задержка кадра</label>
                      <output>{frameDuration.toFixed(1)} с</output>
                    </div>
                    <input
                      id="frame-duration"
                      className="zephyr-range"
                      type="range"
                      min="0.3"
                      max="5"
                      step="0.1"
                      value={frameDuration}
                      disabled={stage === "working"}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => { setFrameDuration(Number(event.target.value)); invalidateResult(); }}
                    />
                    <div className="range-labels"><span>Быстро</span><span>Медленно</span></div>
                  </div>
                                    <div className="info-card">
                    <strong>Лучше для X — 1:1 или 16:9</strong>
                    <p>Если GIF получается слишком узким или очень широким, Гифтомат подскажет слегка подрезать кадры.</p>
                  </div>
                </>
              )}

              {activeTool === "pdf" && (
                <>
                  <div className="setting-group pdf-page-size-group">
                    <label htmlFor="pdf-page-size">Размер страницы</label>
                    <div className="pdf-preset-select">
                      <svg className="pdf-preset-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2h8l4 4v16H6Z" />
                        <path d="M14 2v5h5" />
                      </svg>
                      <select
                        id="pdf-page-size"
                        className="pdf-preset-control"
                        value={pdfPreset}
                        disabled={stage === "working"}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                          setPdfPreset(event.target.value as PdfPresetId);
                          invalidateResult();
                        }}
                      >
                        {(Object.keys(PDF_PRESETS) as PdfPresetId[]).map((id) => (
                          <option key={id} value={id}>
                            {PDF_PRESETS[id].label} · {PDF_PRESETS[id].width} × {PDF_PRESETS[id].height} px
                          </option>
                        ))}
                      </select>
                      <svg className="pdf-preset-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 8 4 4 4-4" />
                      </svg>
                    </div>
                  </div>
                  <div className="setting-group">
                    <label>Размещение изображения</label>
                    <div className="segmented-control">
                      <button disabled={stage === "working"} aria-pressed={pdfFit === "contain"} className={pdfFit === "contain" ? "active" : ""} onClick={() => { setPdfFit("contain"); invalidateResult(); }}>Без обрезки</button>
                      <button disabled={stage === "working"} aria-pressed={pdfFit === "cover"} className={pdfFit === "cover" ? "active" : ""} onClick={() => { setPdfFit("cover"); invalidateResult(); }}>На весь лист</button>
                    </div>
                  </div>
                  <div className="info-card">
                    <strong>LinkedIn Document Post</strong>
                    <p>Один PDF, одинаковый размер страниц и mobile-first профиль 1080 × 1350. Автооптимизация удерживает файл ниже 100 МБ.</p>
                  </div>
                </>
              )}

              {activeTool === "compress" && (
                <>
                  <div className="setting-group">
                    <label>Формат для сайта</label>
                    <div className="segmented-control">
                      <button disabled={stage === "working"} aria-pressed={webOutputFormat === "jpeg"} className={webOutputFormat === "jpeg" ? "active" : ""} onClick={() => { setWebOutputFormat("jpeg"); invalidateResult(); }}>JPG</button>
                      <button disabled={stage === "working"} aria-pressed={webOutputFormat === "webp"} className={webOutputFormat === "webp" ? "active" : ""} onClick={() => { setWebOutputFormat("webp"); invalidateResult(); }}>WebP</button>
                    </div>
                  </div>
                  <div className="setting-group">
                    <div className="setting-row">
                      <label htmlFor="jpeg-quality">Качество {webOutputFormat.toUpperCase()}</label>
                      <output>{jpegQuality}%</output>
                    </div>
                    <input
                      id="jpeg-quality"
                      className="zephyr-range"
                      type="range"
                      min="55"
                      max="95"
                      step="1"
                      value={jpegQuality}
                      disabled={stage === "working"}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => { setJpegQuality(Number(event.target.value)); invalidateResult(); }}
                    />
                    <div className="range-labels"><span>Меньше файл</span><span>Выше качество</span></div>
                  </div>
                  <div className="info-card compression-info-card">
                    <strong>{webOutputFormat === "webp" ? "WebP · меньше вес" : "JPG · открывается везде"}</strong>
                    <p>{webOutputFormat === "webp" ? "Прозрачность сохраняется. Ширина и высота остаются как в исходнике." : "Прозрачные области станут белыми. Ширина и высота остаются как в исходнике."}</p>
                  </div>
                </>
              )}

              {errorMessage && <div className="error-card" role="alert">{errorMessage}</div>}

              {result && (
                <div className="result-card">
                  <div className="result-check">✓</div>
                  <div>
                    <strong>{result.title}</strong>
                    <div className="result-meta">{result.details.map((detail) => <span key={detail}>{detail}</span>)}</div>
                    {result.warning && <p className="result-warning">{result.warning}</p>}
                    {result.aspectHint && (
                      <div className="result-tip">
                        <p>{result.aspectHint}</p>
                        {result.kind === "gif" && (
                          <button
                            className="secondary-button result-inline-action"
                            onClick={() => {
                              if (images[0]) setSelectedId(images[0].id);
                              switchTool("crop");
                            }}
                          >
                            Подрезать в Crop
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <a
                    className="download-button"
                    href={result.downloadUrl}
                    download={result.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ToolIcon name="download" />
                    Скачать
                  </a>
                </div>
              )}
            </div>

            <div className="control-footer">
              <button className="primary-button" onClick={runExport} disabled={!canGenerate}>
                {stage === "working" ? <span className="button-spinner" /> : null}
                {buttonLabel}
              </button>
              <span>{activeTool === "gif" ? "Минимум 2 изображения" : "Порядок файлов сохраняется"}</span>
            </div>
          </aside>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
