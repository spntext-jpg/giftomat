"use client";

import { useEffect, useRef, useState } from "react";
import { safeBaseName } from "../lib/presets";
import { computeExtractionTimestamps, fitWithinMaxDimension, normalizeExtractionRange } from "../lib/video";

interface VideoImportPanelProps {
  disabled?: boolean;
  maxFrames: number;
  onExtracted: (files: File[]) => void;
  onClose: () => void;
}

const DEFAULT_FRAME_COUNT = 12;
const MIN_FRAME_COUNT = 2;
const MAX_EXTRACT_DIMENSION = 1600;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      resolve();
    };
    const handleError = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      reject(new Error("Ошибка чтения видео при перемотке"));
    };
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
    video.currentTime = time;
  });
}
export default function VideoImportPanel({ disabled = false, maxFrames, onExtracted, onClose }: VideoImportPanelProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [startInput, setStartInput] = useState("0");
  const [endInput, setEndInput] = useState("0");
  const [frameCountInput, setFrameCountInput] = useState(String(Math.min(DEFAULT_FRAME_COUNT, Math.max(MIN_FRAME_COUNT, maxFrames))));
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const clampedMaxFrames = Math.max(0, maxFrames);
  const effectiveFrameCount = Math.max(
    MIN_FRAME_COUNT,
    Math.min(clampedMaxFrames || MIN_FRAME_COUNT, Math.round(Number(frameCountInput) || DEFAULT_FRAME_COUNT))
  );

  const getNormalizedRange = () =>
    normalizeExtractionRange(
      startInput.trim() === "" ? 0 : Number(startInput),
      endInput.trim() === "" ? duration : Number(endInput),
      duration
    );

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Выберите видеофайл (MP4, WebM или MOV).");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Видео должно быть не больше 200 МБ.");
      return;
    }
    setError(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoFile(file);
    setDuration(0);
    setStartInput("0");
    setEndInput("0");
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
    setDuration(nextDuration);
    setStartInput("0");
    setEndInput(nextDuration.toFixed(1));
  };

  const commitStart = () => {
    const range = getNormalizedRange();
    setStartInput(range.start.toFixed(1));
  };

  const commitEnd = () => {
    const range = getNormalizedRange();
    setEndInput(range.end.toFixed(1));
  };

  const commitFrameCount = () => {
    setFrameCountInput(String(effectiveFrameCount));
  };

  const extractFrames = async () => {
    const video = videoRef.current;
    if (!video || !videoFile || working || disabled) return;

    const { start, end } = getNormalizedRange();
    const frameCount = effectiveFrameCount;

    if (clampedMaxFrames < MIN_FRAME_COUNT) {
      setError("Недостаточно свободных слотов для новых кадров (лимит на количество изображений уже почти исчерпан).");
      return;
    }

    setWorking(true);
    setError(null);
    setProgress(0);

    try {
      const { width, height } = fitWithinMaxDimension(video.videoWidth, video.videoHeight, MAX_EXTRACT_DIMENSION);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas недоступен в этом браузере");

      const files: File[] = [];
      const timestamps = computeExtractionTimestamps(start, end, frameCount);
      const baseName = safeBaseName(videoFile.name) || "video";

      for (let index = 0; index < timestamps.length; index += 1) {
        const time = timestamps[index];
        await seekVideo(video, time);
        ctx.drawImage(video, 0, 0, width, height);
        const blob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (result) => (result ? resolve(result) : reject(new Error("Не удалось создать кадр из видео"))),
            "image/jpeg",
            0.9
          );
        });
        const fileName = `${baseName}-frame-${String(index + 1).padStart(2, "0")}.jpg`;
        files.push(new File([blob], fileName, { type: "image/jpeg" }));
        setProgress(Math.round(((index + 1) / timestamps.length) * 100));
      }

      onExtracted(files);
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Не удалось извлечь кадры из видео");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <section className="canvas-panel video-canvas-panel glass-panel">
        {!videoUrl ? (
          <button
            type="button"
            className="empty-dropzone"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <strong>Выберите видео</strong>
            <span>MP4, WebM или MOV — до 200 МБ</span>
            <em>Кадры извлекаются локально, видео не загружается на сервер</em>
          </button>
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="video-import-preview"
            onLoadedMetadata={handleLoadedMetadata}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(event) => {
            handleFileSelect(event.target.files?.[0]);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      </section>

      <aside className="control-panel video-control-panel glass-panel">
        <div className="video-import-header">
          <div>
            <h1>Кадры из видео</h1>
            <p>Выберите отрезок и количество кадров — они добавятся в общий список рядом с остальными.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="settings-scroll">
          {videoUrl && (
            <>
              <div className="video-import-grid">
                <label>
                  Начало, с
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={startInput}
                    disabled={working || disabled}
                    onChange={(event) => setStartInput(event.target.value)}
                    onBlur={commitStart}
                  />
                </label>
                <label>
                  Конец, с
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={endInput}
                    disabled={working || disabled}
                    onChange={(event) => setEndInput(event.target.value)}
                    onBlur={commitEnd}
                  />
                </label>
                <label>
                  Кадров
                  <input
                    type="number"
                    min={MIN_FRAME_COUNT}
                    max={Math.max(MIN_FRAME_COUNT, clampedMaxFrames)}
                    step={1}
                    value={frameCountInput}
                    disabled={working || disabled}
                    onChange={(event) => setFrameCountInput(event.target.value)}
                    onBlur={commitFrameCount}
                  />
                </label>
              </div>
              <p className="setting-hint">
                Свободно слотов для новых кадров: {clampedMaxFrames} из общего лимита в 60 изображений.
              </p>
            </>
          )}

          {error && (
            <div className="error-card" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="control-footer">
          <button
            type="button"
            className="primary-button"
            onClick={extractFrames}
            disabled={!videoUrl || working || disabled || clampedMaxFrames < MIN_FRAME_COUNT}
          >
            {working ? <span className="button-spinner" /> : null}
            {working ? `Извлекаем… ${progress}%` : `Извлечь кадры (${videoUrl ? effectiveFrameCount : 0})`}
          </button>
          <span>Файл обрабатывается локально</span>
        </div>
      </aside>
    </>
  );
}
