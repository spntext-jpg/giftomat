"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import CropWorkspace from "./components/CropWorkspace";
import ResultCard from "./components/ResultCard";
import ToolIcon from "./components/ToolIcon";
import ToolNav from "./components/ToolNav";
import VideoImportPanel from "./components/VideoImportPanel";
import HtmlToPdfPanel from "./components/HtmlToPdfPanel";
import { copyToArrayBuffer } from "./lib/binary";
import { createDownloadUrl, revokeDownloadUrl, triggerDownload } from "./lib/download";
import { encodeGif } from "./lib/encoder";
import {
  imageToJpegBlob,
  imageToOptimizedBlob,
  imagesToImageData,
  type FramePosition,
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
  buildGifAttempts,
  GIF_MOBILE_MAX_BYTES,
  GIF_PRESETS,
  type GifPresetId,
  GIF_WEB_MAX_BYTES,
} from "./lib/presets";
import { buildStoredZip, type ZipEntry } from "./lib/zip";
import { MAX_FILES, useImageLibrary } from "./hooks/useImageLibrary";
import { useGifEditor } from "./hooks/useGifEditor";

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
  html2pdf: {
    title: "HTML в PDF",
    description: "Сохраните HTML-документ в PDF с исходной вёрсткой.",
  },
};

export default function GiftomatPage() {
  const [activeTool, setActiveTool] = useState<ToolMode>("gif");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("source");
  const [pdfPreset, setPdfPreset] = useState<PdfPresetId>("linkedin-portrait");
  const [pdfFit, setPdfFit] = useState<"contain" | "cover">("contain");
  const [jpegQuality, setJpegQuality] = useState(82);
  const [webOutputFormat, setWebOutputFormat] = useState<WebOutputFormat>("jpeg");
  const [comparePreview, setComparePreview] = useState<{ url: string; size: number } | null>(null);
  const [showCompressPreview, setShowCompressPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [videoImportOpen, setVideoImportOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const gifPositionDragRef = useRef<{
    pointerId: number;
    frameId: string;
    startX: number;
    startY: number;
    startPosition: FramePosition;
  } | null>(null);

  const invalidateResult = () => {
    setResult(null);
    setPreviewMode("source");
    setStage("idle");
    setProgress(0);
    setStatusText("");
    setErrorMessage(null);
  };

  const {
    images,
    selectedImage,
    selectedId,
    setSelectedId,
    addFiles,
    removeImage: removeLibraryImage,
    replaceImages,
    clearImages: clearLibraryImages,
    reorderImages,
    moveImage,
  } = useImageLibrary({
    locked: stage === "working",
    onMutation: invalidateResult,
    onNotice: setErrorMessage,
  });

  const {
    frameDuration,
    setFrameDuration,
    frameDurationOverrides,
    gifPresetId,
    setGifPresetId,
    gifFramePositions,
    selectedGifPreset,
    selectedGifPosition,
    draggedFrameId,
    setDraggedFrameId,
    cycleFrameDuration,
    reorderFrames,
    setFramePosition,
    clearFrameState,
    clearAllFrameState,
  } = useGifEditor({
    selectedImageId: selectedImage?.id ?? null,
    onMutation: invalidateResult,
    reorderImages,
  });

  const removeImage = (id: string) => {
    clearFrameState(id);
    removeLibraryImage(id);
  };

  const clearImages = () => {
    clearAllFrameState();
    clearLibraryImages();
  };

  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    return () => {
      revokeDownloadUrl(result?.downloadUrl);
      if (result?.previewUrl && result.previewUrl !== result.downloadUrl) revokeDownloadUrl(result.previewUrl);
    };
  }, [result?.downloadUrl, result?.previewUrl]);

  useEffect(() => {
    return () => revokeDownloadUrl(comparePreview?.url);
  }, [comparePreview?.url]);

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

  const switchTool = (tool: ToolMode) => {
    setMobileNavOpen(false);
    if (stage === "working" || tool === activeTool) return;
    setActiveTool(tool);
    invalidateResult();
    window.requestAnimationFrame(() => workspaceRef.current?.focus({ preventScroll: true }));
  };

  const handleFrameDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedFrameId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleFrameDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = draggedFrameId || event.dataTransfer.getData("text/plain");
    if (sourceId) reorderFrames(sourceId, targetId);
    setDraggedFrameId(null);
  };

  const handleGifPositionPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activeTool !== "gif" || gifPresetId === "source" || previewMode === "result" || !selectedImage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gifPositionDragRef.current = {
      pointerId: event.pointerId,
      frameId: selectedImage.id,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: gifFramePositions[selectedImage.id] ?? { x: 0, y: 0 },
    };
  };

  const handleGifPositionPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = gifPositionDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = {
      x: Math.max(-1, Math.min(1, drag.startPosition.x + ((event.clientX - drag.startX) / Math.max(1, rect.width)) * 2)),
      y: Math.max(-1, Math.min(1, drag.startPosition.y + ((event.clientY - drag.startY) / Math.max(1, rect.height)) * 2)),
    };
    setFramePosition(drag.frameId, next);
  };

  const handleGifPositionPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gifPositionDragRef.current?.pointerId === event.pointerId) gifPositionDragRef.current = null;
  };

  const generateGif = async () => {
    const loaded = await Promise.all(images.map((image) => loadImage(image.url)));
    const firstFrame = loaded[0];
    const sourceWidth = selectedGifPreset.width ?? firstFrame.naturalWidth;
    const sourceHeight = selectedGifPreset.height ?? firstFrame.naturalHeight;
    const attempts = buildGifAttempts(sourceWidth, sourceHeight);
    const delaysMs = images.map((image) => (frameDurationOverrides[image.id] ?? frameDuration) * 1000);
    const positions = images.map((image) => gifFramePositions[image.id] ?? { x: 0, y: 0 });
    const hasCustomDurations = images.some((image) => frameDurationOverrides[image.id] !== undefined);

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
      const frames = imagesToImageData(loaded, attempt.width, attempt.height, "cover", positions);
      finalBlob = await encodeGif(
        frames,
        delaysMs,
        attempt.width,
        attempt.height,
        setProgress,
        attempt.quality
      );

      if (finalBlob.size <= GIF_WEB_MAX_BYTES) break;
    }

    if (!finalBlob) throw new Error("Не удалось создать GIF");
    if (finalBlob.size > GIF_WEB_MAX_BYTES) {
      warning = gifPresetId === "x-16-9"
        ? "Файл превышает 15 МБ. Сократите количество кадров или длительность перед публикацией в X."
        : "GIF больше 15 МБ. Для публикации в соцсетях лучше уменьшить размер или количество кадров.";
    } else if (gifPresetId === "x-16-9" && finalBlob.size > GIF_MOBILE_MAX_BYTES) {
      warning = "GIF подходит для загрузки через x.com; для мобильного приложения X нужен файл до 5 МБ.";
    }

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
        hasCustomDurations
          ? `${images.length} кадров · разная длительность`
          : `${images.length} кадров · ${frameDuration.toFixed(1)} с`,
      ],
      previewUrl,
      warning,
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
            <img className="brand-mark-image" src="/giftomat-icon.png?v=20260828-v8" alt="" />
          </div>
          <div>
            <strong>Гифтомат</strong>
            <span>Я — гифтомат, ты мой фанат, бриллиант на тысячу карат</span>
          </div>
        </div>
        <div className="privacy-pill">
          <ToolIcon name="privacy" />
          <span>Обработка локально</span>
        </div>
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMobileNavOpen(true)}
          aria-expanded={mobileNavOpen}
          aria-controls="giftomat-tool-nav"
          aria-label="Открыть меню инструментов"
        >
          <span className="mobile-nav-toggle-icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </header>

      <div
        className={`mobile-nav-backdrop ${mobileNavOpen ? "visible" : ""}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      <div className="app-body">
        <ToolNav
          activeTool={activeTool}
          disabled={stage === "working"}
          open={mobileNavOpen}
          onSelect={switchTool}
        />

        <main ref={workspaceRef} className="studio-layout" tabIndex={-1} aria-label="Рабочая область">
          {activeTool === "crop" ? (
            <CropWorkspace
              image={selectedImage}
              disabled={stage === "working"}
              onAddFiles={addFiles}
              onRemoveImage={removeImage}
              batchImages={images}
              onReplaceImages={replaceImages}
              onSelectImage={setSelectedId}
            />
          ) : activeTool === "gif" && videoImportOpen ? (
            <VideoImportPanel
              disabled={stage === "working"}
              maxFrames={Math.max(0, MAX_FILES - images.length)}
              onExtracted={(files) => {
                addFiles(files);
                setVideoImportOpen(false);
              }}
              onClose={() => setVideoImportOpen(false)}
            />
          ) : activeTool === "html2pdf" ? (
            <HtmlToPdfPanel disabled={stage === "working"} />
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
              if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
            }}
          >
            <div className="canvas-toolbar">
              <div className="toolbar-actions">
                {activeTool === "gif" && selectedImage && images.length > 1 && (
                  <div className="frame-reorder-actions" role="group" aria-label="Порядок выбранного кадра">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => moveImage(selectedImage.id, -1)}
                      disabled={stage === "working" || images[0]?.id === selectedImage.id}
                      aria-label="Переместить выбранный кадр влево"
                      title="Переместить кадр влево"
                    >
                      <ToolIcon name="left" />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => moveImage(selectedImage.id, 1)}
                      disabled={stage === "working" || images[images.length - 1]?.id === selectedImage.id}
                      aria-label="Переместить выбранный кадр вправо"
                      title="Переместить кадр вправо"
                    >
                      <ToolIcon name="right" />
                    </button>
                  </div>
                )}
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
                <em>PNG, JPG, WEBP, HEIC · до 40 МБ · Ctrl+V, чтобы вставить из буфера</em>
              </button>
            ) : (
              <div className={`preview-workspace ${previewMode === "result" ? "result-mode" : ""}`}>
                <div className={`preview-stage ${previewMode === "result" ? "result-mode" : ""}`}>
                  <div
                    className={`preview-media-shell ${activeTool === "gif" && gifPresetId !== "source" && previewMode !== "result" ? "gif-positionable" : ""}`}
                    onPointerDown={handleGifPositionPointerDown}
                    onPointerMove={handleGifPositionPointerMove}
                    onPointerUp={handleGifPositionPointerEnd}
                    onPointerCancel={handleGifPositionPointerEnd}
                  >
                    {previewMode === "result" && result?.previewUrl ? (
                      <img src={result.previewUrl} alt="Готовая GIF-анимация" className="preview-image contain result-media" />
                    ) : activeTool === "compress" && showCompressPreview && comparePreview ? (
                      <img src={comparePreview.url} alt="Сжатая версия" className="preview-image contain compare-media" />
                    ) : selectedImage ? (
                      <img
                        src={selectedImage.url}
                        alt={selectedImage.file.name}
                        className={`preview-image source-media ${activeTool === "gif" && gifPresetId !== "source" ? "gif-framed-preview" : "contain"}`}
                        style={activeTool === "gif" && gifPresetId !== "source" ? {
                          aspectRatio: `${selectedGifPreset.width} / ${selectedGifPreset.height}`,
                          objectPosition: `${50 - selectedGifPosition.x * 50}% ${50 - selectedGifPosition.y * 50}%`,
                        } : undefined}
                      />
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
                    <div
                      key={image.id}
                      className={`frame-card ${selectedImage?.id === image.id ? "selected" : ""} ${draggedFrameId === image.id ? "dragging-frame" : ""}`}
                      draggable={stage !== "working"}
                      onDragStart={(event) => handleFrameDragStart(event, image.id)}
                      onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); }}
                      onDrop={(event) => handleFrameDrop(event, image.id)}
                      onDragEnd={() => setDraggedFrameId(null)}
                    >
                      <button className="frame-select" disabled={stage === "working"} onClick={() => { setSelectedId(image.id); setPreviewMode("source"); }} aria-label={`Выбрать кадр ${index + 1}`}>
                        <img src={image.url} alt="" />
                        <span>{index + 1}</span>
                      </button>
                      {activeTool === "gif" && (
                        <button
                          type="button"
                          className={`frame-duration-badge ${frameDurationOverrides[image.id] !== undefined ? "custom" : ""}`}
                          disabled={stage === "working"}
                          onClick={() => cycleFrameDuration(image.id)}
                          aria-label={`Задержка кадра ${index + 1}: ${(frameDurationOverrides[image.id] ?? frameDuration).toFixed(1)} секунд. Нажмите, чтобы изменить.`}
                          title="Нажмите, чтобы изменить задержку этого кадра"
                        >
                          {frameDurationOverrides[image.id] !== undefined ? `${frameDurationOverrides[image.id].toFixed(1)}с` : "Авто"}
                        </button>
                      )}
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
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif"
              multiple
              hidden
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (event.target.files) void addFiles(event.target.files);
                event.currentTarget.value = "";
              }}
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
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setVideoImportOpen(true)}
                    disabled={stage === "working" || images.length >= MAX_FILES}
                  >
                    Кадры из видео
                  </button>
                  <div className="setting-group">
                    <label htmlFor="gif-preset">Формат GIF</label>
                    <div className="preset-select">
                      <select
                        id="gif-preset"
                        className="preset-select-control"
                        value={gifPresetId}
                        disabled={stage === "working"}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                          setGifPresetId(event.target.value as GifPresetId);
                          invalidateResult();
                        }}
                      >
                        {GIF_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}{preset.width && preset.height ? ` · ${preset.width} × ${preset.height} px` : ""}
                          </option>
                        ))}
                      </select>
                      <svg className="preset-select-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 8 4 4 4-4" />
                      </svg>
                    </div>
                    {gifPresetId !== "source" && <p className="setting-hint">Перетаскивайте активный кадр в предпросмотре, чтобы выбрать область внутри формата.</p>}
                  </div>
                  <div className="setting-group">
                    <div className="setting-row">
                      <label htmlFor="frame-duration">Задержка кадра</label>
                      <output>{frameDuration.toFixed(1)} с</output>
                    </div>
                    <input
                      id="frame-duration"
                      className="range-input"
                      type="range"
                      min="0.3"
                      max="5"
                      step="0.1"
                      value={frameDuration}
                      disabled={stage === "working"}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => { setFrameDuration(Number(event.target.value)); invalidateResult(); }}
                    />
                    <div className="range-labels"><span>Быстро</span><span>Медленно</span></div>
                    <p className="setting-hint">Это значение по умолчанию. Задержку отдельного кадра можно настроить на его миниатюре ниже.</p>
                  </div>
                </>
              )}

              {activeTool === "pdf" && (
                <>
                  <div className="setting-group pdf-page-size-group">
                    <label htmlFor="pdf-page-size">Размер страницы</label>
                    <div className="preset-select">
                      <svg className="preset-select-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2h8l4 4v16H6Z" />
                        <path d="M14 2v5h5" />
                      </svg>
                      <select
                        id="pdf-page-size"
                        className="preset-select-control"
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
                      <svg className="preset-select-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                      className="range-input"
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
                </>
              )}

              <div className="settings-action-block">
                <button className="primary-button" onClick={runExport} disabled={!canGenerate}>
                  {stage === "working" ? <span className="button-spinner" /> : null}
                  {buttonLabel}
                </button>
                <span>{activeTool === "gif" ? "Минимум 2 изображения" : "Порядок файлов сохраняется"}</span>
              </div>

              {errorMessage && <div className="error-card" role="alert">{errorMessage}</div>}

              {result && (
                <ResultCard
                  title={result.title}
                  meta={result.details.map((detail) => <span key={detail}>{detail}</span>)}
                  warning={result.warning}
                  actionLabel="Скачать"
                  actionIcon={<ToolIcon name="download" />}
                  onAction={() => triggerDownload(result.downloadUrl, result.fileName)}
                />
              )}
            </div>


          </aside>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
