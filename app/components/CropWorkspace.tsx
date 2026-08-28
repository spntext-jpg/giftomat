"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import { createDownloadUrl, revokeDownloadUrl, triggerDownload } from "../lib/download";
import {
  clampCropValue,
  cropImageToBlob,
  drawCrop,
  getCropPreviewSize,
} from "../lib/crop";
import { loadImage } from "../lib/images";
import { CROP_PRESETS, formatBytes, safeBaseName, type FixedPreset } from "../lib/presets";

interface CropSource {
  id: string;
  url: string;
  file: File;
}

interface CropWorkspaceProps {
  image: CropSource | null;
  disabled?: boolean;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveImage: (id: string) => void;
  batchImages: CropSource[];
  onReplaceImages: (updates: { id: string; file: File }[]) => void;
}

type CropFormat = "jpeg" | "png";
const MIN_CROP_DIMENSION = 64;
const MAX_CROP_DIMENSION = 8000;

function normalizeCropDimension(value: string, fallback: number): number {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(clampCropValue(parsed, MIN_CROP_DIMENSION, MAX_CROP_DIMENSION));
}
export default function CropWorkspace({
  image,
  disabled = false,
  onAddFiles,
  onRemoveImage,
  batchImages,
  onReplaceImages,
}: CropWorkspaceProps) {
  const [widthInput, setWidthInput] = useState("1200");
  const [heightInput, setHeightInput] = useState("628");
  const [keepAspectRatio, setKeepAspectRatio] = useState(false);
  const [lockedAspectRatio, setLockedAspectRatio] = useState(1200 / 628);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [format, setFormat] = useState<CropFormat>("jpeg");
  const [quality, setQuality] = useState(92);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; size: number; downloadUrl: string; blob: Blob } | null>(null);
  const [usedAsSource, setUsedAsSource] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchWorking, setBatchWorking] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResult, setBatchResult] = useState<{ count: number } | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const width = normalizeCropDimension(widthInput, 1200);
  const height = normalizeCropDimension(heightInput, 628);

  const resetPosition = useCallback(() => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setResult(null);
    setUsedAsSource(false);
  }, []);

  useEffect(() => {
    resetPosition();
    setError(null);
  }, [image?.url, resetPosition]);

  useEffect(() => {
    return () => revokeDownloadUrl(result?.downloadUrl);
  }, [result?.downloadUrl]);

  const paintPreview = useCallback(async () => {
    if (!image || !canvasRef.current) return;
    try {
      const loaded = loadedImageRef.current?.src === image.url
        ? loadedImageRef.current
        : await loadImage(image.url);
      loadedImageRef.current = loaded;
      const preview = getCropPreviewSize(width, height);
      const canvas = canvasRef.current;
      canvas.width = preview.width;
      canvas.height = preview.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawCrop(ctx, loaded, preview.width, preview.height, zoom, offsetX, offsetY);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Не удалось показать изображение");
    }
  }, [height, image, offsetX, offsetY, width, zoom]);

  useEffect(() => {
    void paintPreview();
  }, [paintPreview]);

  const updateSizeInput = (axis: "width" | "height", value: string) => {
    setSelectedPresetId("");
    if (axis === "width") setWidthInput(value);
    else setHeightInput(value);
    setResult(null);

    if (!keepAspectRatio) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < MIN_CROP_DIMENSION || parsed > MAX_CROP_DIMENSION) return;

    if (axis === "width") {
      const nextHeight = Math.round(parsed / lockedAspectRatio);
      if (nextHeight >= MIN_CROP_DIMENSION && nextHeight <= MAX_CROP_DIMENSION) {
        setHeightInput(String(nextHeight));
      }
    } else {
      const nextWidth = Math.round(parsed * lockedAspectRatio);
      if (nextWidth >= MIN_CROP_DIMENSION && nextWidth <= MAX_CROP_DIMENSION) {
        setWidthInput(String(nextWidth));
      }
    }
  };

  const commitSizeInput = (axis: "width" | "height") => {
    const normalized = axis === "width" ? width : height;
    if (axis === "width") setWidthInput(String(normalized));
    else setHeightInput(String(normalized));

    if (!keepAspectRatio) return;
    if (axis === "width") {
      const nextHeight = Math.round(clampCropValue(
        normalized / lockedAspectRatio,
        MIN_CROP_DIMENSION,
        MAX_CROP_DIMENSION
      ));
      setHeightInput(String(nextHeight));
    } else {
      const nextWidth = Math.round(clampCropValue(
        normalized * lockedAspectRatio,
        MIN_CROP_DIMENSION,
        MAX_CROP_DIMENSION
      ));
      setWidthInput(String(nextWidth));
    }
  };

  const toggleAspectRatio = () => {
    const nextValue = !keepAspectRatio;
    if (nextValue) setLockedAspectRatio(width / height);
    setKeepAspectRatio(nextValue);
    setResult(null);
  };

  const applyPreset = (preset: FixedPreset) => {
    setWidthInput(String(preset.width));
    setHeightInput(String(preset.height));
    setLockedAspectRatio(preset.width / preset.height);
    setSelectedPresetId(preset.id);
    setResult(null);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || !image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX,
      offsetY,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const sensitivity = 2 / Math.max(1, zoom);
    setOffsetX(clampCropValue(drag.offsetX + ((event.clientX - drag.startX) / Math.max(1, rect.width)) * sensitivity, -1, 1));
    setOffsetY(clampCropValue(drag.offsetY + ((event.clientY - drag.startY) / Math.max(1, rect.height)) * sensitivity, -1, 1));
    setResult(null);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    if (!image) return;
    event.preventDefault();
    setZoom((current) => clampCropValue(current + (event.deltaY > 0 ? -0.08 : 0.08), 1, 4));
    setResult(null);
  };

  const exportCrop = async () => {
    if (!image || working) return;
    setWorking(true);
    setError(null);
    try {
      const loaded = loadedImageRef.current?.src === image.url
        ? loadedImageRef.current
        : await loadImage(image.url);
      loadedImageRef.current = loaded;
      const blob = await cropImageToBlob(loaded, {
        width,
        height,
        zoom,
        offsetX,
        offsetY,
        format,
        quality: quality / 100,
      });
      const extension = format === "jpeg" ? "jpg" : "png";
      const name = `${safeBaseName(image.file.name)}-${width}x${height}.${extension}`;
      const downloadUrl = createDownloadUrl(blob);
      setUsedAsSource(false);
      setResult({ name, size: blob.size, downloadUrl, blob });
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Не удалось обрезать изображение");
    } finally {
      setWorking(false);
    }
  };

  const useCropAsSource = () => {
    if (!result || !image) return;
    const file = new File([result.blob], result.name, { type: result.blob.type });
    onReplaceImages([{ id: image.id, file }]);
    setUsedAsSource(true);
  };

  const exportCropBatch = async () => {
    if (!batchImages.length || batchWorking) return;
    setBatchWorking(true);
    setError(null);
    setBatchResult(null);
    setBatchProgress(0);
    try {
      const updates: { id: string; file: File }[] = [];
      for (let index = 0; index < batchImages.length; index += 1) {
        const source = batchImages[index];
        const loaded = await loadImage(source.url);
        const blob = await cropImageToBlob(loaded, {
          width,
          height,
          zoom,
          offsetX,
          offsetY,
          format,
          quality: quality / 100,
        });
        const extension = format === "jpeg" ? "jpg" : "png";
        const name = `${safeBaseName(source.file.name)}-${width}x${height}.${extension}`;
        updates.push({ id: source.id, file: new File([blob], name, { type: blob.type }) });
        setBatchProgress(Math.round(((index + 1) / batchImages.length) * 100));
      }
      onReplaceImages(updates);
      setBatchResult({ count: updates.length });
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : "Не удалось обрезать пачку изображений");
    } finally {
      setBatchWorking(false);
    }
  };

  return (
    <>
      <section className="canvas-panel crop-canvas-panel glass-panel">
        <div className="canvas-toolbar">
          {image && (
            <div className="toolbar-actions">
              <button
                type="button"
                className="secondary-button compact"
                onClick={resetPosition}
                disabled={working || batchWorking || disabled}
              >
                По центру
              </button>
              <button
                type="button"
                className="secondary-button compact crop-clear-button"
                onClick={() => onRemoveImage(image.id)}
                disabled={working || batchWorking || disabled}
                aria-label="Убрать текущее изображение из области обрезки"
                title="Очистить область обрезки"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16" />
                  <path d="M9 7V4h6v3" />
                  <path d="m6 7 1 13h10l1-13" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
                <span>Очистить</span>
              </button>
            </div>
          )}
        </div>

        {!image ? (
          <button className="empty-dropzone crop-dropzone" onClick={() => inputRef.current?.click()} disabled={disabled}>
<strong>Добавьте баннер</strong>
            <span>Затем задайте размер и перетащите нужную область</span>
            <em>PNG, JPG, WEBP</em>
          </button>
        ) : (
          <div className="crop-editor-shell">
            <div className="crop-stage" style={{ aspectRatio: `${width} / ${height}` }}>
              <canvas
                ref={canvasRef}
                className="crop-preview-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onWheel={handleWheel}
                aria-label="Область обрезки. Перетаскивайте изображение мышью."
              />
              <span className="crop-frame-size">{width} × {height} px</span>
            </div>
            <div className="crop-editor-hint">
              Перетаскивайте изображение. Колесо мыши меняет масштаб.
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          hidden
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (event.target.files?.length) onAddFiles([event.target.files[0]]);
            event.target.value = "";
          }}
        />
      </section>

      <aside className="control-panel crop-control-panel glass-panel">
        <div className="control-heading">
          <span className="eyebrow">Настройки экспорта</span>
          <h1>Обрезка баннера</h1>
          <p>Задайте размер, выберите нужную область и скачайте готовый файл.</p>
        </div>

        <div className="settings-scroll">
          <div className="setting-group crop-setting-group crop-preset-group">
            <label htmlFor="crop-preset">Пресет размера</label>
            <div className="pdf-preset-select">
              <svg className="pdf-preset-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2h8l4 4v16H6Z" />
                <path d="M14 2v5h5" />
              </svg>
              <select
                id="crop-preset"
                className="pdf-preset-control"
                value={selectedPresetId}
                disabled={working || disabled}
                onChange={(event) => {
                  const preset = CROP_PRESETS.find((item) => item.id === event.target.value);
                  if (preset) applyPreset(preset);
                }}
              >
                <option value="">Свой размер</option>
                {CROP_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} · {preset.width} × {preset.height} px
                  </option>
                ))}
              </select>
              <svg className="pdf-preset-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 8 4 4 4-4" />
              </svg>
            </div>
          </div>
          <div className="crop-size-grid">
            <label>
              <span>Ширина, px</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_CROP_DIMENSION}
                max={MAX_CROP_DIMENSION}
                value={widthInput}
                disabled={working || disabled}
                onChange={(event) => updateSizeInput("width", event.target.value)}
                onBlur={() => commitSizeInput("width")}
                aria-label="Ширина результата в пикселях"
              />
            </label>
            <button
              type="button"
              className={`crop-ratio-link ${keepAspectRatio ? "active" : ""}`}
              role="switch"
              aria-checked={keepAspectRatio}
              aria-label="Сохранять пропорции"
              title={keepAspectRatio ? "Пропорции связаны" : "Связать ширину и высоту"}
              disabled={working || disabled}
              onClick={toggleAspectRatio}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
                <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
              </svg>
            </button>
            <label>
              <span>Высота, px</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_CROP_DIMENSION}
                max={MAX_CROP_DIMENSION}
                value={heightInput}
                disabled={working || disabled}
                onChange={(event) => updateSizeInput("height", event.target.value)}
                onBlur={() => commitSizeInput("height")}
                aria-label="Высота результата в пикселях"
              />
            </label>
          </div>
          <div className={`crop-size-helper ${keepAspectRatio ? "active" : ""}`}>
            {keepAspectRatio ? "Пропорции сохраняются" : "Размеры меняются независимо"}
          </div>

          {batchImages.length > 1 && (
            <div className="setting-group crop-setting-group crop-batch-group">
              <label className="crop-batch-toggle">
                <input
                  type="checkbox"
                  checked={batchMode}
                  disabled={working || batchWorking || disabled}
                  onChange={(event) => {
                    setBatchMode(event.target.checked);
                    setBatchResult(null);
                  }}
                />
                <span>Применить рамку ко всем загруженным кадрам ({batchImages.length})</span>
              </label>
            </div>
          )}

          <div className="setting-group crop-setting-group">
            <label>Формат</label>
            <div className="segmented-control">
              <button className={format === "jpeg" ? "active" : ""} aria-pressed={format === "jpeg"} onClick={() => setFormat("jpeg")} disabled={working || disabled}>JPG</button>
              <button className={format === "png" ? "active" : ""} aria-pressed={format === "png"} onClick={() => setFormat("png")} disabled={working || disabled}>PNG</button>
            </div>
          </div>

          {format === "jpeg" && (
            <div className="setting-group crop-setting-group">
              <div className="setting-row">
                <label htmlFor="crop-quality">Качество JPG</label>
                <output>{quality}%</output>
              </div>
              <input id="crop-quality" className="zephyr-range" type="range" min="70" max="100" value={quality} disabled={working || disabled} onChange={(event) => setQuality(Number(event.target.value))} />
            </div>
          )}

          <div className="settings-action-block">
          <button
            className="primary-button"
            onClick={batchMode ? exportCropBatch : exportCrop}
            disabled={batchMode ? (!batchImages.length || batchWorking || disabled) : (!image || working || disabled)}
          >
            {(working || batchWorking) ? <span className="button-spinner" /> : null}
            {batchMode
              ? batchWorking
                ? `Обрабатываем… ${batchProgress}%`
                : `Обрезать все кадры (${batchImages.length})`
              : working
                ? "Обрезаем…"
                : image
                  ? "Подготовить файл"
                  : "Добавьте изображение"}
          </button>
        </div>

        {error && <div className="error-card" role="alert">{error}</div>}
          {!batchMode && result && (
            <div className="result-card crop-result-card">
              <div className="result-check">✓</div>
              <div>
                <strong>Баннер готов</strong>
                <div className="result-meta"><span>{result.name}</span><span>{formatBytes(result.size)}</span></div>
                <button
                  type="button"
                  className="secondary-button result-inline-action"
                  onClick={useCropAsSource}
                >
                  {usedAsSource ? "✓ Добавлено в общий список" : "Использовать в GIF / PDF / Compress"}
                </button>
              </div>
              <button
                type="button"
                className="download-button"
                onClick={() => triggerDownload(result.downloadUrl, result.name)}
              >
                Скачать файл
              </button>
            </div>
          )}
          {batchMode && batchResult && (
            <div className="result-card crop-result-card">
              <div className="result-check">✓</div>
              <div>
                <strong>Готово: обновлено кадров — {batchResult.count}</strong>
                <p className="crop-batch-note">Кадры заменены обрезанной версией и уже доступны в GIF, PDF и Compress.</p>
              </div>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
