"use client";

import { useState, useRef } from "react";
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
  const [frameDuration, setFrameDuration] = useState(2.5);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setGifUrl(URL.createObjectURL(blob));
      setStage("done");
    } catch (e) {
      console.error(e);
      setStage("error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0A0A0C",
        color: "#FFFFFF",
        display: "flex",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        overflowX: "hidden",
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
          background: #1A1A1E;
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
          background: #A169F7;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid #0A0A0C;
          box-shadow: 0 0 16px rgba(161,105,247,0.5);
          transition: transform 0.15s;
        }
        .bit-range::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .bit-range::-moz-range-thumb {
          width: 28px;
          height: 28px;
          background: #A169F7;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid #0A0A0C;
          box-shadow: 0 0 16px rgba(161,105,247,0.5);
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
          .main-container {
            padding: 60px 40px;
          }
        }

        .upload-btn {
          padding: 1.4rem 4rem;
          border-radius: 100px;
          background-color: #FF6B00;
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 20px;
          font-weight: 900;
          box-shadow: 0 20px 40px rgba(255,107,0,0.3);
          transition: transform 0.2s ease;
        }
        .upload-btn:hover { transform: translateY(-4px); }
        .upload-btn:active { transform: translateY(0); }

        .generate-btn {
          width: 100%;
          padding: 1.8rem;
          border-radius: 100px;
          border: none;
          font-weight: 900;
          font-size: 22px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .generate-btn:hover { transform: scale(1.02); }
        .generate-btn:active { transform: scale(0.98); }
        .generate-btn:disabled { cursor: not-allowed; }
        .generate-btn:disabled:hover { transform: none; }

        .download-link {
          display: block;
          padding: 1.4rem;
          border-radius: 100px;
          background-color: #fff;
          color: #000;
          font-weight: 900;
          font-size: 18px;
          text-decoration: none;
          text-align: center;
          box-shadow: 0 15px 30px rgba(255,255,255,0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .download-link:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(255,255,255,0.15);
        }
      ` }} />

      <main className="main-container">

        {/* ── Header ── */}
        <header style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              backgroundColor: "#000",
              borderRadius: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 10px 40px rgba(161,105,247,0.2)",
            }}
          >
            <span style={{ color: "#A169F7", fontSize: "32px", fontWeight: 900 }}>
              G
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              margin: "0 0 12px 0",
              lineHeight: 1.1,
            }}
          >
            Генератор GIF
          </h1>

          <p
            style={{
              color: "#555",
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              margin: 0,
            }}
          >
            С привкусом Балтики и приветом от Павлика
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
            position: "relative",
            width: "100%",
            minHeight: "320px",
            borderRadius: "48px",
            border: "2px dashed",
            borderColor: isDragging ? "#FF6B00" : "rgba(255,255,255,0.1)",
            backgroundColor: isDragging
              ? "rgba(255,107,0,0.05)"
              : "rgba(255,255,255,0.01)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            transition: "all 0.4s ease",
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

          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#333",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              margin: 0,
            }}
          >
            или перетащите файлы сюда
          </p>
        </div>

        {/* ── Gallery ── */}
        {images.length > 0 && (
          <div
            style={{
              marginTop: "32px",
              padding: "32px",
              borderRadius: "40px",
              backgroundColor: "#111114",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "#444",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Кадров: {images.length}
              </span>
              <button
                onClick={() => { setImages([]); setStage("idle"); setGifUrl(null); }}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "none",
                  color: "#EF4444",
                  padding: "8px 16px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Очистить всё
              </button>
            </div>

            <div className="gallery-grid">
              {images.map((img) => (
                <div
                  key={img.id}
                  style={{
                    position: "relative",
                    aspectRatio: "1/1",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.08)",
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
                      top: "6px",
                      right: "6px",
                      width: "24px",
                      height: "24px",
                      background: "rgba(0,0,0,0.75)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      fontSize: "11px",
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

        {/* ── Слайдер задержки ── */}
        {images.length > 0 && (
          <div
            style={{
              marginTop: "24px",
              padding: "32px 40px",
              borderRadius: "40px",
              backgroundColor: "#111114",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Задержка кадра
              </span>
              <span style={{ fontSize: "24px", fontWeight: 900, color: "#A169F7" }}>
                {frameDuration.toFixed(1)}s
              </span>
            </div>
            <input
              className="bit-range"
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={frameDuration}
              onChange={(e) => setFrameDuration(Number(e.target.value))}
            />
          </div>
        )}

        {/* ── Прогресс / Результат / Кнопка ── */}
        <div style={{ marginTop: "32px", marginBottom: "60px" }}>

          {/* Encoding */}
          {stage === "encoding" && (
            <div
              style={{
                padding: "48px",
                borderRadius: "48px",
                background: "#000",
                textAlign: "center",
                border: "1px solid rgba(161,105,247,0.3)",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              }}
            >
              <p
                style={{
                  fontWeight: 900,
                  fontSize: "18px",
                  marginBottom: "24px",
                  color: "#A169F7",
                  letterSpacing: "0.08em",
                  margin: "0 0 24px 0",
                }}
              >
                РЕНДЕРИНГ {progress}%
              </p>
              <div
                style={{
                  width: "100%",
                  height: "10px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "100px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #7c3aed, #A169F7)",
                    width: `${progress}%`,
                    borderRadius: "100px",
                    transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {stage === "error" && (
            <div
              style={{
                padding: "32px",
                borderRadius: "24px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                textAlign: "center",
                color: "#EF4444",
                fontWeight: 700,
                fontSize: "15px",
              }}
            >
              Ошибка генерации. Проверьте консоль и попробуйте ещё раз.
              <br />
              <button
                onClick={() => setStage("idle")}
                style={{
                  marginTop: "16px",
                  background: "none",
                  border: "none",
                  color: "#EF4444",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "14px",
                  fontWeight: 700,
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
                padding: "40px",
                borderRadius: "48px",
                background: "#111114",
                border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
              }}
            >
              <img
                src={gifUrl}
                style={{
                  width: "100%",
                  maxHeight: "500px",
                  objectFit: "contain",
                  borderRadius: "24px",
                  marginBottom: "32px",
                  backgroundColor: "#000",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
                alt="Результат"
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  maxWidth: "400px",
                  margin: "0 auto",
                }}
              >
                <a href={gifUrl} download="giftomat.gif" className="download-link">
                  СКАЧАТЬ GIF ↓
                </a>
                <button
                  onClick={() => { setStage("idle"); setGifUrl(null); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#444",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Создать ещё одну
                </button>
              </div>
            </div>
          )}

          {/* Idle — кнопка генерации */}
          {stage === "idle" && (
            <button
              className="generate-btn"
              onClick={generateGif}
              disabled={images.length < 2}
              style={{
                color: images.length >= 2 ? "#000" : "#555",
                backgroundColor: images.length >= 2 ? "#FFF" : "#1A1A1E",
                boxShadow: images.length >= 2
                  ? "0 20px 40px rgba(255,255,255,0.1)"
                  : "none",
              }}
            >
              {images.length === 0
                ? "ЗАГРУЗИТЕ ФОТО"
                : images.length === 1
                ? "НУЖНО ЕЩЁ ФОТО"
                : "СГЕНЕРИРОВАТЬ GIF →"}
            </button>
          )}

        </div>
      </main>
    </div>
  );
}
