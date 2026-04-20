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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme === "light" ? "light" : "dark"
    );
  }, [theme]);

  const addFiles = (files: FileList) => {
    const newImgs = Array.from(files)
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
      setStage("error");
    }
  };

  const copyGif = async () => {
    if (!gifBlob) return;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/gif": gifBlob,
        }),
      ]);
      alert("GIF скопирован ✅");
    } catch {
      alert("Браузер не поддерживает копирование GIF напрямую");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <Script src="/gif.js" strategy="beforeInteractive" />

      <main style={{ width: "100%", maxWidth: 900, padding: 40 }}>

        {/* Theme toggle */}
        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "none",
              background: "var(--accent-blue)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </button>
        </div>

        {/* Header */}
        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>
          Самый настоящий гифтомат
        </h1>

        <p style={{ whiteSpace: "pre-line", color: "var(--text-muted)", marginBottom: 40 }}>
          Со вкусом Прибалтики.
          {"\n"}И с приветом от Павлика
        </p>

        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "16px 32px",
            borderRadius: 40,
            border: "none",
            background: "var(--accent-orange)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          Загрузить фото
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        {/* Slider */}
        {images.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <p>Задержка кадра: {frameDuration.toFixed(1)} сек</p>
            <input
              type="range"
              min={1}
              max={5}
              step={0.1}
              value={frameDuration}
              onChange={(e) => setFrameDuration(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {/* Generate */}
        {stage === "idle" && images.length >= 2 && (
          <button
            onClick={generateGif}
            style={{
              marginTop: 30,
              padding: "18px 40px",
              borderRadius: 40,
              border: "none",
              background: "var(--accent-violet)",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Сгенерировать GIF
          </button>
        )}

        {/* Progress */}
        {stage === "encoding" && (
          <p style={{ marginTop: 20 }}>Рендеринг {progress}%</p>
        )}

        {/* Result */}
        {stage === "done" && gifUrl && (
          <div style={{ marginTop: 30 }}>
            <img src={gifUrl} style={{ maxWidth: "100%" }} alt="gif" />

            <div style={{ marginTop: 20, display: "flex", gap: 16 }}>
              <a
                href={gifUrl}
                download="giftomat.gif"
                style={{
                  padding: "12px 24px",
                  borderRadius: 30,
                  background: "var(--accent-green)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700
                }}
              >
                Скачать
              </a>

              <button
                onClick={copyGif}
                style={{
                  padding: "12px 24px",
                  borderRadius: 30,
                  border: "none",
                  background: "var(--accent-blue)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Копировать GIF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
