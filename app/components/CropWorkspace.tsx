"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import ResultCard from "./ResultCard";
import { createDownloadUrl, revokeDownloadUrl, triggerDownload } from "../lib/download";
import {
  CROP_MAX_ZOOM,
  CROP_MIN_ZOOM,
  clampCropValue,
  renderCropFile,
  drawCrop,
  getCropPreviewSize,
  getCropTransform,
  nudgeCropOffset,
  stepCropZoom,
} from "../lib/crop";
import { loadImage } from "../lib/images";
import { CROP_PRESETS, formatBytes, type FixedPreset } from "../lib/presets";
import { buildStoredZip, type ZipEntry } from "../lib/zip";

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
  onSelectImage: (id: string) => void;
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

const NUDGE_STEP_PX = 1;
const NUDGE_STEP_FAST_PX = 10;
const ZOOM_BUTTON_STEP = 0.05;
const ZOOM_WHEEL_STEP = 0.08;
const HOLD_REPEAT_DELAY_MS = 400;
const HOLD_REPEAT_INTERVAL_MS = 45;

const CONTROL_ICON_PATHS = {
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  zoomIn: "M12 5v14M5 12h14",
  zoomOut: "M5 12h14",
} as const;

type ControlIconName = keyof typeof CONTROL_ICON_PATHS;

interface HoldButtonProps {
  label: string;
  icon: ControlIconName;
  disabled: boolean;
  onStep: () => void;
}

/** Icon button that fires once on press and keeps repeating while it is held. */
function HoldButton({ label, icon, disabled, onStep }: HoldButtonProps) {
  const stepRef = useRef(onStep);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    stepRef.current = onStep;
  }, [onStep]);

  const stop = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  useEffect(() => stop, [stop]);

  const start = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    stop();
    stepRef.current();
    const repeat = () => {
      stepRef.current();
      timerRef.current = window.setTimeout(repeat, HOLD_REPEAT_INTERVAL_MS);
    };
    timerRef.current = window.setTimeout(repeat, HOLD_REPEAT_DELAY_MS);
  };

  // Keyboard activation produces a click without pointer events (detail === 0).
  const handleClick = (event: { detail: number }) => {
    if (event.detail === 0) onStep();
  };

  return (
    <button
      type="button"
      className="crop-nudge-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onClick={handleClick}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={CONTROL_ICON_PATHS[icon]} />
      </svg>
    </button>
  );
}

export default function CropWorkspace({
  image,
  disabled = false,
  onAddFiles,
  onRemoveImage,
  batchImages,
  onReplaceImages,
  onSelectImage,
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
  const [result, setResult] = useState<{ name: string; size: number; downloadUrl: string; file: File } | null>(null);
  const [usedAsSource, setUsedAsSource] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchWorking, setBatchWorking] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResult, setBatchResult] = useState<{ count: number; name: string; size: number; downloadUrl: string } | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const cropPositionsRef = useRef<Record<string, { zoom: number; offsetX: number; offsetY: number }>>({});
  const activePositionImageIdRef = useRef<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const width = normalizeCropDimension(widthInput, 1200);
  const height = normalizeCropDimension(heightInput, 628);
  const transform = naturalSize
    ? getCropTransform(naturalSize.width, naturalSize.height, width, height, zoom, offsetX, offsetY)
    : null;
  const controlsLocked = disabled || working || batchWorking;
  const canMoveX = transform !== null && transform.maxOffsetX > 0;
  const canMoveY = transform !== null && transform.maxOffsetY > 0;

  const resetPosition = useCallback(() => {
    const next = { zoom: 1, offsetX: 0, offsetY: 0 };
    setZoom(next.zoom);
    setOffsetX(next.offsetX);
    setOffsetY(next.offsetY);
    if (image) cropPositionsRef.current[image.id] = next;
    setResult(null);
    setUsedAsSource(false);
  }, [image]);

  useEffect(() => {
    const previousId = activePositionImageIdRef.current;
    if (previousId) cropPositionsRef.current[previousId] = { zoom, offsetX, offsetY };

    const nextId = image?.id ?? null;
    const next = nextId ? cropPositionsRef.current[nextId] ?? { zoom: 1, offsetX: 0, offsetY: 0 } : { zoom: 1, offsetX: 0, offsetY: 0 };
    activePositionImageIdRef.current = nextId;
    setZoom(next.zoom);
    setOffsetX(next.offsetX);
    setOffsetY(next.offsetY);
    loadedImageRef.current = null;
    setNaturalSize(null);
    setResult(null);
    setUsedAsSource(false);
    setError(null);
  }, [image?.id, image?.url]);

  useEffect(() => () => revokeDownloadUrl(result?.downloadUrl), [result?.downloadUrl]);
  useEffect(() => () => revokeDownloadUrl(batchResult?.downloadUrl), [batchResult?.downloadUrl]);

  const paintPreview = useCallback(async () => {
    if (!image || !canvasRef.current) return;
    try {
      const loaded = loadedImageRef.current?.src === image.url
        ? loadedImageRef.current
        : await loadImage(image.url);
      loadedImageRef.current = loaded;
      setNaturalSize((current) =>
        current && current.width === loaded.naturalWidth && current.height === loaded.naturalHeight
          ? current
          : { width: loaded.naturalWidth, height: loaded.naturalHeight }
      );
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

  const nudge = (axis: "x" | "y", direction: -1 | 1, pixels: number = NUDGE_STEP_PX) => {
    if (!transform) return;
    if (axis === "x") {
      const range = transform.maxOffsetX;
      setOffsetX((current) => nudgeCropOffset(current, range, direction * pixels));
    } else {
      const range = transform.maxOffsetY;
      setOffsetY((current) => nudgeCropOffset(current, range, direction * pixels));
    }
    setResult(null);
  };

  const changeZoom = (delta: number) => {
    setZoom((current) => stepCropZoom(current, delta));
    setResult(null);
  };

  const handleCanvasKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (controlsLocked) return;
    const step = event.shiftKey ? NUDGE_STEP_FAST_PX : NUDGE_STEP_PX;
    switch (event.key) {
      case "ArrowLeft":
        nudge("x", -1, step);
        break;
      case "ArrowRight":
        nudge("x", 1, step);
        break;
      case "ArrowUp":
        nudge("y", -1, step);
        break;
      case "ArrowDown":
        nudge("y", 1, step);
        break;
      case "+":
      case "=":
        changeZoom(ZOOM_BUTTON_STEP);
        break;
      case "-":
      case "_":
        changeZoom(-ZOOM_BUTTON_STEP);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // React registers onWheel as a passive listener, so preventDefault() there
    // is ignored and the page scrolls while zooming. A native listener is needed.
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => stepCropZoom(current, event.deltaY > 0 ? -ZOOM_WHEEL_STEP : ZOOM_WHEEL_STEP));
      setResult(null);
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [image?.url]);

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    // Always cancel the default: dropping a file on the page would otherwise navigate away from the app.
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled && event.dataTransfer.files.length) onAddFiles(event.dataTransfer.files);
  };

  const currentSettings = (position = { zoom, offsetX, offsetY }) => ({
    width,
    height,
    zoom: position.zoom,
    offsetX: position.offsetX,
    offsetY: position.offsetY,
    format,
    quality: quality / 100,
  });

  const exportCrop = async () => {
    if (!image || working) return;
    setWorking(true);
    setError(null);
    try {
      const loaded = loadedImageRef.current?.src === image.url ? loadedImageRef.current : await loadImage(image.url);
      loadedImageRef.current = loaded;
      const file = await renderCropFile(loaded, image.file.name, currentSettings());
      const downloadUrl = createDownloadUrl(file);
      setUsedAsSource(false);
      setResult({ name: file.name, size: file.size, downloadUrl, file });
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Не удалось обрезать изображение");
    } finally {
      setWorking(false);
    }
  };

  const useCropAsSource = () => {
    if (!result || !image) return;
    onReplaceImages([{ id: image.id, file: result.file }]);
    setUsedAsSource(true);
  };

  const exportCropBatch = async () => {
    if (!batchImages.length || batchWorking) return;
    setBatchWorking(true);
    setError(null);
    setBatchResult(null);
    setBatchProgress(0);
    try {
      if (image) cropPositionsRef.current[image.id] = { zoom, offsetX, offsetY };
      const updates: { id: string; file: File }[] = [];
      const entries: ZipEntry[] = [];
      for (let index = 0; index < batchImages.length; index += 1) {
        const source = batchImages[index];
        const loaded = await loadImage(source.url);
        const position = cropPositionsRef.current[source.id] ?? { zoom: 1, offsetX: 0, offsetY: 0 };
        const file = await renderCropFile(loaded, source.file.name, currentSettings(position));
        updates.push({ id: source.id, file });
        entries.push({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) });
        setBatchProgress(Math.round(((index + 1) / batchImages.length) * 100));
      }
      const zip = buildStoredZip(entries);
      const name = `giftomat-crop-${width}x${height}.zip`;
      const downloadUrl = createDownloadUrl(zip);
      onReplaceImages(updates);
      setBatchResult({ count: updates.length, name, size: zip.size, downloadUrl });
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : "Не удалось обрезать пачку изображений");
    } finally {
      setBatchWorking(false);
    }
  };

  return (
    <>
      <section
        className={`canvas-panel crop-canvas-panel glass-panel ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
                className="secondary-button compact"
                onClick={() => inputRef.current?.click()}
                disabled={working || batchWorking || disabled}
              >
                Добавить
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
            <span>Перетащите файл сюда или нажмите, затем задайте размер и подвиньте нужную область</span>
            <em>PNG, JPG, WEBP, AVIF, HEIC · можно выбрать несколько файлов</em>
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
                onKeyDown={handleCanvasKeyDown}
                tabIndex={0}
                aria-label="Область обрезки. Перетаскивайте изображение мышью или сдвигайте стрелками клавиатуры."
              />
              <span className="crop-frame-size">{width} × {height} px</span>
            </div>
            <div className="crop-nudge-bar">
              <div className="crop-nudge-group" role="group" aria-label="Сдвиг кадра на 1 px">
                <HoldButton label="Сдвинуть влево на 1 px" icon="left" disabled={controlsLocked || !canMoveX || offsetX <= -1} onStep={() => nudge("x", -1)} />
                <HoldButton label="Сдвинуть вверх на 1 px" icon="up" disabled={controlsLocked || !canMoveY || offsetY <= -1} onStep={() => nudge("y", -1)} />
                <HoldButton label="Сдвинуть вниз на 1 px" icon="down" disabled={controlsLocked || !canMoveY || offsetY >= 1} onStep={() => nudge("y", 1)} />
                <HoldButton label="Сдвинуть вправо на 1 px" icon="right" disabled={controlsLocked || !canMoveX || offsetX >= 1} onStep={() => nudge("x", 1)} />
              </div>
              <div className="crop-nudge-group" role="group" aria-label="Масштаб">
                <HoldButton label="Уменьшить масштаб" icon="zoomOut" disabled={controlsLocked || zoom <= CROP_MIN_ZOOM} onStep={() => changeZoom(-ZOOM_BUTTON_STEP)} />
                <output className="crop-zoom-value">{Math.round(zoom * 100)}%</output>
                <HoldButton label="Увеличить масштаб" icon="zoomIn" disabled={controlsLocked || zoom >= CROP_MAX_ZOOM} onStep={() => changeZoom(ZOOM_BUTTON_STEP)} />
              </div>
            </div>
            <div className="crop-editor-hint">
              Перетаскивайте кадр · колесо мыши — масштаб · стрелки клавиатуры — 1 px (Shift — 10 px)
            </div>
            {batchImages.length > 1 && (
              <div className="crop-batch-strip" aria-label="Изображения для пакетной обрезки">
                {batchImages.map((source, index) => (
                  <button
                    key={source.id}
                    type="button"
                    className={`crop-batch-thumb ${source.id === image.id ? "active" : ""}`}
                    onClick={() => onSelectImage(source.id)}
                    disabled={controlsLocked}
                    aria-label={`Редактировать изображение ${index + 1}: ${source.file.name}`}
                    aria-current={source.id === image.id ? "true" : undefined}
                  >
                    <img src={source.url} alt="" />
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
          multiple
          hidden
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (event.target.files?.length) onAddFiles(event.target.files);
            event.currentTarget.value = "";
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
            <div className="preset-select">
              <svg className="preset-select-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2h8l4 4v16H6Z" />
                <path d="M14 2v5h5" />
              </svg>
              <select
                id="crop-preset"
                className="preset-select-control"
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
              <svg className="preset-select-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                <span>Пакетно обработать все изображения ({batchImages.length})</span>
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
              <input id="crop-quality" className="range-input" type="range" min="70" max="100" value={quality} disabled={working || disabled} onChange={(event) => setQuality(Number(event.target.value))} />
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
            <ResultCard
              className="crop-result-card"
              title="Баннер готов"
              meta={<><span>{result.name}</span><span>{formatBytes(result.size)}</span></>}
              actionLabel="Скачать файл"
              onAction={() => triggerDownload(result.downloadUrl, result.name)}
            >
              <button type="button" className="secondary-button result-inline-action" onClick={useCropAsSource}>
                {usedAsSource ? "✓ Добавлено в общий список" : "Использовать в GIF / PDF / Compress"}
              </button>
            </ResultCard>
          )}
          {batchMode && batchResult && (
            <ResultCard
              className="crop-result-card"
              title={`Готово: обработано кадров — ${batchResult.count}`}
              meta={<span>{formatBytes(batchResult.size)}</span>}
              actionLabel="Скачать ZIP"
              onAction={() => triggerDownload(batchResult.downloadUrl, batchResult.name)}
            >
              <p className="crop-batch-note">Индивидуальное позиционирование сохранено. Обрезанные версии уже доступны в GIF, PDF и Compress.</p>
            </ResultCard>
          )}
        </div>

      </aside>
    </>
  );
}
