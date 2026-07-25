"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { downloadBlob } from "./lib/download";
import { encodeGif } from "./lib/encoder";
import {
  computeDimensions,
  fitWithin,
  imageToJpegBlob,
  imagesToImageData,
  loadImage,
} from "./lib/images";
import { buildImagePdf, type JpegPdfPage } from "./lib/pdf";
import {
  formatBytes,
  GIF_PRESETS,
  type GifPresetId,
  LINKEDIN_PDF_MAX_BYTES,
  PDF_PRESETS,
  type PdfPresetId,
  safeBaseName,
  type ToolMode,
  X_GIF_MAX_BYTES,
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
  previewUrl?: string;
  warning?: string;
}

const MAX_FILES = 60;
const MAX_FILE_BYTES = 40 * 1024 * 1024;

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

const TOOL_COPY: Record<ToolMode, { title: string; description: string }> = {
  gif: {
    title: "GIF-анимация",
    description: "Соберите кадры в зацикленную анимацию прямо в браузере.",
  },
  pdf: {
    title: "LinkedIn-карусель",
    description: "Объедините баннеры в многостраничный PDF без потери порядка.",
  },
  compress: {
    title: "Сжатие баннеров",
    description: "Конвертируйте PNG в лёгкие JPG для сайта и публикаций.",
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
  const [gifPreset, setGifPreset] = useState<GifPresetId>("original");
  const [pdfPreset, setPdfPreset] = useState<PdfPresetId>("linkedin-portrait");
  const [pdfFit, setPdfFit] = useState<"contain" | "cover">("contain");
  const [jpegQuality, setJpegQuality] = useState(82);
  const [jpegMaxEdge, setJpegMaxEdge] = useState<number | null>(null);
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
      if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    };
  }, [result?.previewUrl]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images[0] ?? null,
    [images, selectedId]
  );

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

  const removeImage = (id: string) => {
    if (stage === "working") return;
    const removed = images.find((image) => image.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    const next = images.filter((image) => image.id !== id);
    setImages(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
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
    const preset = GIF_PRESETS[gifPreset];
    const attempts = preset.fixed
      ? [
          { width: 1200, height: 675, quality: 18 },
          { width: 960, height: 540, quality: 24 },
          { width: 720, height: 405, quality: 30 },
          { width: 640, height: 360, quality: 36 },
        ]
      : [{ ...computeDimensions(loaded, 800, 1200), quality: 15 }];

    let finalBlob: Blob | null = null;
    let finalSize = attempts[0];
    let warning: string | undefined;

    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      finalSize = attempt;
      setStatusText(index === 0 ? "Собираем GIF" : "Оптимизируем для лимита X");
      setProgress(0);
      const frames = imagesToImageData(loaded, attempt.width, attempt.height, "cover");
      finalBlob = await encodeGif(
        frames,
        frameDuration * 1000,
        attempt.width,
        attempt.height,
        setProgress,
        attempt.quality
      );

      if (!preset.fixed || finalBlob.size <= X_GIF_MAX_BYTES) break;
    }

    if (!finalBlob) throw new Error("Не удалось создать GIF");
    if (preset.fixed && finalBlob.size > X_GIF_MAX_BYTES) {
      warning = "Файл всё ещё превышает 15 МБ. Уменьшите количество кадров или используйте более короткий набор.";
    }

    const previewUrl = URL.createObjectURL(finalBlob);
    setResult({
      kind: "gif",
      blob: finalBlob,
      fileName: gifPreset === "x-landscape" ? `giftomat-x-${finalSize.width}x${finalSize.height}.gif` : "giftomat.gif",
      title: "GIF готов",
      details: [
        `${finalSize.width} × ${finalSize.height} px`,
        formatBytes(finalBlob.size),
        `${images.length} кадров · ${frameDuration.toFixed(1)} с`,
      ],
      previewUrl,
      warning,
    });
    setPreviewMode("result");
  };

  const generatePdf = async () => {
    const preset = PDF_PRESETS[pdfPreset];
    const pages: JpegPdfPage[] = [];

    for (let index = 0; index < images.length; index += 1) {
      setStatusText(`Готовим страницу ${index + 1} из ${images.length}`);
      setProgress(Math.round((index / images.length) * 90));
      const image = await loadImage(images[index].url);
      const jpeg = await imageToJpegBlob(image, {
        width: preset.width,
        height: preset.height,
        fit: pdfFit,
        quality: 0.94,
      });
      pages.push({
        bytes: new Uint8Array(await jpeg.arrayBuffer()),
        pixelWidth: preset.width,
        pixelHeight: preset.height,
      });
    }

    const pdf = buildImagePdf(pages, preset.width, preset.height);
    setProgress(100);
    setResult({
      kind: "pdf",
      blob: pdf,
      fileName: pdfPreset === "linkedin-portrait" ? "giftomat-linkedin-carousel.pdf" : "giftomat-carousel.pdf",
      title: "PDF-карусель готова",
      details: [
        `${images.length} страниц`,
        `${preset.width} × ${preset.height} px`,
        formatBytes(pdf.size),
      ],
      warning: pdf.size > LINKEDIN_PDF_MAX_BYTES
        ? "PDF превышает лимит LinkedIn 100 МБ. Уменьшите число страниц или используйте более компактные исходники."
        : undefined,
    });
  };

  const compressImages = async () => {
    const entries: ZipEntry[] = [];
    let originalBytes = 0;
    let compressedBytes = 0;

    for (let index = 0; index < images.length; index += 1) {
      const item = images[index];
      setStatusText(`Сжимаем ${index + 1} из ${images.length}`);
      setProgress(Math.round((index / images.length) * 90));
      const image = await loadImage(item.url);
      const dimensions = fitWithin(image.naturalWidth, image.naturalHeight, jpegMaxEdge);
      const jpeg = await imageToJpegBlob(image, {
        ...dimensions,
        fit: "contain",
        quality: jpegQuality / 100,
      });
      const name = `${String(index + 1).padStart(2, "0")}-${safeBaseName(item.file.name)}.jpg`;
      const data = new Uint8Array(await jpeg.arrayBuffer());
      entries.push({ name, data });
      originalBytes += item.file.size;
      compressedBytes += jpeg.size;
    }

    const output = entries.length === 1
      ? new Blob([copyToArrayBuffer(entries[0].data)], { type: "image/jpeg" })
      : buildStoredZip(entries);
    const savedPercent = originalBytes > 0
      ? Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100))
      : 0;

    setProgress(100);
    setResult({
      kind: "compress",
      blob: output,
      fileName: entries.length === 1 ? entries[0].name : "giftomat-compressed-jpg.zip",
      title: "Баннеры оптимизированы",
      details: [
        `${formatBytes(originalBytes)} → ${formatBytes(compressedBytes)}`,
        `Экономия ${savedPercent}%`,
        `${entries.length} ${entries.length === 1 ? "файл" : "файлов"}`,
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
        : images.length < 1 ? "Добавьте изображения" : "Сжать в JPG";

  const toolInfo = TOOL_COPY[activeTool];

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar glass-panel">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-art" />
            <span className="brand-gulls" />
          </div>
          <div>
            <strong>Гифтомат</strong>
            <span>От Павлика и с приветом с Прибалтики</span>
          </div>
        </div>
        <div className="privacy-pill">
          <ToolIcon name="privacy" />
          <span>Обработка локально · файлы не загружаются</span>
        </div>
      </header>

      <div className="app-body">
        <aside className="tool-sidebar glass-panel" aria-label="Инструменты">
          <div className="sidebar-label">Инструменты</div>
          {(["gif", "pdf", "compress"] as ToolMode[]).map((tool) => (
            <button
              key={tool}
              className={`tool-button ${activeTool === tool ? "active" : ""}`}
              onClick={() => switchTool(tool)}
              aria-pressed={activeTool === tool}
              disabled={stage === "working"}
            >
              <span className="tool-icon"><ToolIcon name={tool} /></span>
              <span>
                <strong>{tool === "gif" ? "GIF" : tool === "pdf" ? "PDF" : "JPG"}</strong>
                <small>{tool === "gif" ? "Анимация" : tool === "pdf" ? "Карусель" : "Компрессор"}</small>
              </span>
            </button>
          ))}
          <div className="sidebar-spacer" />
          <div className="sidebar-note">
            <span className="status-dot" />
            <span>Готово к работе</span>
          </div>
        </aside>

        <main className="studio-layout">
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
              <div>
                <span className="eyebrow">Рабочая область</span>
                <strong>{images.length ? `${images.length} ${images.length === 1 ? "изображение" : "изображений"}` : "Новый проект"}</strong>
              </div>
              <div className="toolbar-actions">
                {result?.kind === "gif" && (
                  <button className="secondary-button compact" onClick={() => setPreviewMode((mode) => mode === "result" ? "source" : "result") }>
                    {previewMode === "result" ? "Показать кадр" : "Показать GIF"}
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
                <span className="upload-orb"><ToolIcon name="upload" /></span>
                <strong>Перетащите изображения сюда</strong>
                <span>или выберите файлы с компьютера</span>
                <em>PNG, JPG, WEBP · до 40 МБ</em>
              </button>
            ) : (
              <div className={`preview-workspace ${previewMode === "result" ? "result-mode" : ""}`}>
                <div className={`preview-stage ${previewMode === "result" ? "result-mode" : ""}`}>
                  <div className="preview-media-shell">
                    {previewMode === "result" && result?.previewUrl ? (
                      <img src={result.previewUrl} alt="Готовая GIF-анимация" className="preview-image contain result-media" />
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
                    {previewMode === "result" ? "Результат · полный просмотр" : selectedImage?.file.name}
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
                  <div className="setting-group">
                    <label>Формат публикации</label>
                    <div className="option-stack">
                      {(Object.keys(GIF_PRESETS) as GifPresetId[]).map((id) => (
                        <button key={id} className={`option-card ${gifPreset === id ? "selected" : ""}`} disabled={stage === "working"} aria-pressed={gifPreset === id} onClick={() => { setGifPreset(id); invalidateResult(); }}>
                          <span><strong>{GIF_PRESETS[id].label}</strong><small>{GIF_PRESETS[id].description}</small></span>
                          <i />
                        </button>
                      ))}
                    </div>
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
                    <strong>Профиль X</strong>
                    <p>Экспортирует 16:9 и автоматически снижает разрешение, только если файл превышает лимит 15 МБ.</p>
                  </div>
                </>
              )}

              {activeTool === "pdf" && (
                <>
                  <div className="setting-group">
                    <label>Размер страницы</label>
                    <div className="option-stack">
                      {(Object.keys(PDF_PRESETS) as PdfPresetId[]).map((id) => (
                        <button key={id} className={`option-card ${pdfPreset === id ? "selected" : ""}`} disabled={stage === "working"} aria-pressed={pdfPreset === id} onClick={() => { setPdfPreset(id); invalidateResult(); }}>
                          <span><strong>{PDF_PRESETS[id].label}</strong><small>{PDF_PRESETS[id].description}</small></span>
                          <i />
                        </button>
                      ))}
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
                    <p>Один PDF, одинаковый размер всех страниц, портретный профиль 1080 × 1350 для мобильной ленты.</p>
                  </div>
                </>
              )}

              {activeTool === "compress" && (
                <>
                  <div className="setting-group">
                    <div className="setting-row">
                      <label htmlFor="jpeg-quality">Качество JPG</label>
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
                  <div className="setting-group">
                    <label htmlFor="max-edge">Максимальная сторона</label>
                    <select id="max-edge" className="zephyr-select" disabled={stage === "working"} value={jpegMaxEdge ?? "original"} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setJpegMaxEdge(event.target.value === "original" ? null : Number(event.target.value)); invalidateResult(); }}>
                      <option value="original">Исходный размер</option>
                      <option value="2400">2400 px</option>
                      <option value="1920">1920 px</option>
                      <option value="1600">1600 px</option>
                      <option value="1200">1200 px</option>
                    </select>
                  </div>
                  <div className="info-card">
                    <strong>Прозрачность PNG</strong>
                    <p>JPG не поддерживает прозрачность, поэтому прозрачные области аккуратно заменяются белым фоном.</p>
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
                  </div>
                  <button className="download-button" onClick={() => downloadBlob(result.blob, result.fileName)}>
                    <ToolIcon name="download" />
                    Скачать
                  </button>
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
        </main>
      </div>
    </div>
  );
}
