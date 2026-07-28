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
import { downloadBlob } from "../lib/download";
import {
  clampCropValue,
  cropImageToBlob,
  drawCrop,
  getCropPreviewSize,
} from "../lib/crop";
import { loadImage } from "../lib/images";
import { formatBytes, safeBaseName } from "../lib/presets";

interface CropSource {
  url: string;
  file: File;
}

interface CropWorkspaceProps {
  image: CropSource | null;
  disabled?: boolean;
  onAddFiles: (files: FileList | File[]) => void;
}

type CropFormat = "jpeg" | "png";

// GIFTOMAT_CROP_RATIO_CLEANUP_V1_CROP_START
const MIN_CROP_DIMENSION = 64;
const MAX_CROP_DIMENSION = 8000;

function normalizeCropDimension(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(clampCropValue(parsed, MIN_CROP_DIMENSION, MAX_CROP_DIMENSION));
}
// GIFTOMAT_CROP_RATIO_CLEANUP_V1_CROP_END

export default function CropWorkspace({
  image,
  disabled = false,
  onAddFiles,
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
  const [result, setResult] = useState<{ name: string; size: number } | null>(null);
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
  }, []);

  useEffect(() => {
    resetPosition();
    setError(null);
  }, [image?.url, resetPosition]);

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
      setResult({ name, size: blob.size });
      downloadBlob(blob, name);
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Не удалось обрезать изображение");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <section className="canvas-panel crop-canvas-panel glass-panel">
        <div className="canvas-toolbar">

          {image && (
            <button className="secondary-button compact" onClick={resetPosition} disabled={working || disabled}>
              По центру
            </button>
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
          <div className="crop-size-grid">
            <label>
              <span>Ширина, px</span>
              <input
                type="number"
                min={MIN_CROP_DIMENSION}
                max={MAX_CROP_DIMENSION}
                value={widthInput}
                disabled={working || disabled}
                onChange={(event) => updateSizeInput("width", event.target.value)}
                onBlur={() => commitSizeInput("width")}
              />
            </label>
            <label>
              <span>Высота, px</span>
              <input
                type="number"
                min={MIN_CROP_DIMENSION}
                max={MAX_CROP_DIMENSION}
                value={heightInput}
                disabled={working || disabled}
                onChange={(event) => updateSizeInput("height", event.target.value)}
                onBlur={() => commitSizeInput("height")}
              />
            </label>
          </div>

          <button
            type="button"
            className={`crop-ratio-toggle ${keepAspectRatio ? "active" : ""}`}
            role="switch"
            aria-checked={keepAspectRatio}
            disabled={working || disabled}
            onClick={toggleAspectRatio}
          >
            <span className="crop-ratio-copy">
              <strong>Сохранять пропорции</strong>
              <small>Ширина и высота будут меняться вместе</small>
            </span>
            <span className="crop-ratio-track" aria-hidden="true">
              <span className="crop-ratio-thumb" />
            </span>
          </button>

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

          <div className="info-card crop-info-card">
            <strong>Точный размер</strong>
            <p>Результат будет строго {width} × {height} px.</p>
          </div>

          {error && <div className="error-card" role="alert">{error}</div>}
          {result && (
            <div className="result-card crop-result-card">
              <div className="result-check">✓</div>
              <div>
                <strong>Баннер готов</strong>
                <div className="result-meta"><span>{result.name}</span><span>{formatBytes(result.size)}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="control-footer">
          <button className="primary-button" onClick={exportCrop} disabled={!image || working || disabled}>
            {working ? <span className="button-spinner" /> : null}
            {working ? "Обрезаем…" : image ? "Обрезать и скачать" : "Добавьте изображение"}
          </button>
          <span>Файл обрабатывается локально</span>
        </div>
      </aside>
    </>
  );
}
