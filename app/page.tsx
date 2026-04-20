"use client";

import { useState, useRef, useEffect } from "react";
import Script from "next/script";
import { loadImage, computeDimensions, imagesToImageData } from "./lib/images";
import { encodeGif } from "./lib/encoder";

interface ImageItem {
  id: string;
  url: string;
  file: File;
}

type Stage = "idle" | "encoding" | "done" | "error";

export default function GiftomatPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [frameDuration, setFrameDuration] = useState(2);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Автоопределение темы по системным настройкам ──
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");

    const apply = (isLight: boolean) => {
      document.documentElement.setAttribute(
        "data-theme",
        isLight ? "light" : "dark"
      );
    };

    // Установить при загрузке
    apply(mediaQuery.matches);

    // Слушать изменения системной темы
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const addFiles = (files: FileList) => {
    const newImgs: ImageItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: Math.random().toString(36).slice(2),
        url: URL.createObjectURL(f),
        file: f,
      }));
    setImages((prev) => [...prev, ...newImgs]);
    setGifUrl(null);
    setGifBlob(null);
    setStage("idle");
  };

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    try {
      const loaded = await Promise.all(images.map((i) => loadImage(i.url)));
      const { width, height } = computeDimensions(loaded);
      const frames = imagesToImageData(loaded, width, height);
      const blob = await encodeGif(
        frames,
        frameDuration * 1000,
        width,
        height,
        setProgress
      );
      setGifBlob(blob);
      setGifUrl(URL.createObjectURL(blob));
      setStage("done");
    } catch (e) {
      console.error(e);
      setStage("error");
    }
  };

  // ── Скачать и сразу открыть папку невозможно в браузере ──
  // Поэтому даём две кнопки: скачать + честная инструкция
  const handleDownload = () => {
    if (!gifUrl) return;
    const a = document.createElement("a");
    a.href = gifUrl;
    a.download = "giftomat.gif";
    a.click();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-page)",
        color: "var(--text-primary)",
        display: "flex",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        overflowX: "hidden",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <Script src="/gif.js" strategy="beforeInteractive" />

      <style dangerouslySetInnerHTML={{ __html: `
        *,
        *::before,
        *::after { box-sizing: border-box; }

        .bit-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          background: var(--bg-surface-sub);
          border-radius: 99px;
          outline: none;
          margin: 20px 0;
          cursor: pointer;
        }
        .bit-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          background: var(--accent-violet);
          border-radius: 50%;
          border: 3px solid var(--bg-page);
          box-shadow: 0 0 16px rgba(161,105,247,0.4);
          transition: transform 0.15s;
        }
        .bit-range::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .bit-range::-moz-range-thumb {
          width: 28px;
          height: 28px;
          background: var(--accent-violet);
          border-radius: 50%;
          border: 3px solid var(--bg-page);
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .gallery-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1024px) {
          .gallery-grid { grid-template-columns: repeat(6, 1fr); }
        }

        .main-container {
          width: 100%;
          max-width: 900px;
          padding: 60px 24px;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 900px) {
          .main-container { padding: 60px 40px; }
        }

        .upload-btn {
          padding: 1.4rem 4rem;
          border-radius: 100px;
          background-color: var(--accent-orange);
          color: #fff;
          border: none;
          font-size: 20px;
          font-weight: 900;
          box-shadow: 0 20px 40px rgba(255,107,0,0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .upload-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 48px rgba(255,107,0,0.35);
        }

        .generate-btn {
          width: 100%;
          padding: 1.6rem;
          border-radius: 100px;
          border: none;
          font-weight: 900;
          font-size: 20px;
          color: #fff;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .generate-btn:not(:disabled):hover {
          transform: scale(1.02);
        }
        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-btn {
          padding: 14px 28px;
          border-radius: 100px;
          border: none;
          font-weight: 700;
          font-size: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #fff;
          cursor: pointer;
        }
        .action-btn:hover {
          transform: translateY(-2px);
        }

        .hint-box {
          margin-top: 20px;
          padding: 16px 20px;
          border-radius: 16px;
          background: var(--bg-surface-sub);
          border: 1px solid var(--border-color);
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-muted);
          text-align: left;
        }
        .hint-box strong {
          color: var(--text-primary);
        }
      ` }} />

      <main className="main-container">

        {/* ── Header ── */}
        <header style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: "linear-gradient(135deg, var(--accent-violet), var(--accent-blue))",
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 10px 40px rgba(161,105,247,0.3)",
            }}
          >
            <span style={{ color: "#fff", fontSize: 32, fontWeight: 900 }}>G</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(26px, 5vw, 38px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 16px 0",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Самый настоящий гифтомат
          </h1>

          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.6,
              margin: 0,
              color: "var(--text-muted)",
            }}
          >
            Со вкусом Прибалтики.
            <br />
            И с приветом от Павлика
          </p>
        </header>

        {/* ── Dropzone ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          style={{
            width: "100%",
            minHeight: 280,
            borderRadius: 40,
            border: "2px dashed",
            borderColor: isDragging ? "var(--accent-orange)" : "var(--border-color)",
            backgroundColor: isDragging ? "rgba(255,107,0,0.05)" : "var(--bg-surface)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            transition: "all 0.3s ease",
          }}
        >
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Загрузить фото ✨
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          <p style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            margin: 0,
          }}>
            или перетащите сюда
          </p>
        </div>

        {/* ── Gallery ── */}
        {images.length > 0 && (
          <div
            style={{
              marginTop: 32,
              padding: 28,
              borderRadius: 32,
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}>
                Кадров: {images.length}
              </span>
              <button
                onClick={() => {
                  setImages([]);
                  setStage("idle");
                  setGifUrl(null);
                  setGifBlob(null);
                }}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "none",
                  color: "#EF4444",
                  padding: "8px 16px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Очистить
              </button>
            </div>

            <div className="gallery-grid">
              {images.map((img) => (
                <div
                  key={img.id}
                  style={{
                    position: "relative",
                    aspectRatio: "1/1",
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <img
                    src={img.url}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    alt=""
                  />
                  <button
                    onClick={() => setImages((p) => p.filter((i) => i.id !== img.id))}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      background: "rgba(0,0,0,0.7)",
                      border: "none",
                      borderRadius: "50%",
                      fontSize: 11,
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Slider ── */}
        {images.length > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: "28px 32px",
              borderRadius: 32,
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}>
                Задержка кадра
              </span>
              <span style={{ fontSize: 24, fontWeight: 900, color: "var(--accent-violet)" }}>
                {frameDuration.toFixed(1)}s
              </span>
            </div>
            <input
              className="bit-range"
              type="range"
              min={1}
              max={5}
              step={0.1}
              value={frameDuration}
              onChange={(e) => setFrameDuration(Number(e.target.value))}
            />
          </div>
        )}

        {/* ── Progress / Result / Generate ── */}
        <div style={{ marginTop: 32, marginBottom: 60 }}>

          {/* Encoding */}
          {stage === "encoding" && (
            <div
              style={{
                padding: 40,
                borderRadius: 32,
                background: "var(--bg-surface)",
                textAlign: "center",
                border: "1px solid var(--border-color)",
              }}
            >
              <p style={{
                fontWeight: 800,
                fontSize: 18,
                marginBottom: 20,
                color: "var(--accent-violet)",
              }}>
                РЕНДЕРИНГ {progress}%
              </p>
              <div style={{
                width: "100%",
                height: 10,
                background: "var(--bg-surface-sub)",
                borderRadius: 100,
                overflow: "hidden",
              }}>
                <div
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, var(--accent-violet), var(--accent-blue))",
                    width: `${progress}%`,
                    borderRadius: 100,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {stage === "error" && (
            <div
              style={{
                padding: 28,
                borderRadius: 24,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                textAlign: "center",
                fontWeight: 700,
                color: "#EF4444",
              }}
            >
              Ошибка генерации.
              <button
                onClick={() => setStage("idle")}
                style={{
                  marginLeft: 12,
                  background: "none",
                  border: "none",
                  color: "#EF4444",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Попробовать снова
              </button>
            </div>
          )}

          {/* Done */}
          {stage === "done" && gifUrl && (
            <div
              style={{
                padding: 32,
                borderRadius: 32,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                textAlign: "center",
              }}
            >
              {/* Превью GIF */}
              <img
                src={gifUrl}
                style={{
                  width: "100%",
                  maxHeight: 500,
                  objectFit: "contain",
                  borderRadius: 20,
                  marginBottom: 28,
                  backgroundColor: "var(--bg-surface-sub)",
                }}
                alt="Result"
              />

              {/* Кнопки */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
              }}>
                {/* Скачать — основной способ получить GIF */}
                <button
                  onClick={handleDownload}
                  className="action-btn"
                  style={{ background: "var(--accent-green)" }}
                >
                  ⬇ Скачать GIF
                </button>

                {/* Создать ещё */}
                <button
                  onClick={() => {
                    setStage("idle");
                    setGifUrl(null);
                    setGifBlob(null);
                  }}
                  className="action-btn"
                  style={{
                    background: "var(--bg-surface-sub)",
                    color: "var(--text-primary)",
                  }}
                >
                  ↩ Создать ещё
                </button>
              </div>

              {/* Честная инструкция по копированию */}
              <div className="hint-box">
                <strong>Как скопировать GIF?</strong><br />
                Браузеры не позволяют копировать GIF-анимацию напрямую в буфер обмена —
                это техническое ограничение.<br /><br />
                <strong>Способ 1 (рекомендуем):</strong> Скачайте GIF → вставьте файл куда нужно.<br />
                <strong>Способ 2:</strong> Скачайте GIF → откройте файл → ПКМ → «Копировать».
              </div>
            </div>
          )}

          {/* Idle */}
          {stage === "idle" && (
            <button
              onClick={generateGif}
              disabled={images.length < 2}
              className="generate-btn"
              style={{
                backgroundColor: images.length >= 2
                  ? "var(--accent-violet)"
                  : "var(--bg-surface-sub)",
                boxShadow: images.length >= 2
                  ? "0 20px 40px rgba(161,105,247,0.3)"
                  : "none",
              }}
            >
              {images.length === 0
                ? "Загрузите фото"
                : images.length === 1
                ? "Нужно ещё фото"
                : "Сгенерировать GIF →"}
            </button>
          )}

        </div>
      </main>
    </div>
  );
}
