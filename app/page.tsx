"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { generateCrossfadeFrames, loadImage, computeDimensions } from "./lib/crossfade";
import { encodeGif } from "./lib/encoder";

type Stage = "idle" | "encoding" | "done" | "error";

interface UploadedImage {
  id: string;
  url: string;
  name: string;
}

// Slider fill: purple left, adaptive grey right
function sliderBg(value: number, min: number, max: number) {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, #7000FF ${pct}%, var(--slider-track) ${pct}%)`;
}

export default function GiftomatPage() {
  const [images, setImages]           = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging]   = useState(false);
  const [crossfadeSteps, setCrossfadeSteps] = useState(10);
  const [frameDelay, setFrameDelay]   = useState(120);
  const [stage, setStage]             = useState<Stage>("idle");
  const [progress, setProgress]       = useState(0);
  const [gifUrl, setGifUrl]           = useState<string | null>(null);
  const [errorMsg, setErrorMsg]       = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const next: UploadedImage[] = imageFiles.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(f),
      name: f.name,
    }));
    setImages((prev) => [...prev, ...next]);
    setGifUrl(null);
    setStage("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter((i) => i.id !== id);
    });
    setGifUrl(null);
    setStage("idle");
  };

  const moveImage = (from: number, to: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setImages([]);
    setGifUrl(null);
    setStage("idle");
  };

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    setErrorMsg("");
    try {
      const htmlImages = await Promise.all(images.map((img) => loadImage(img.url)));
      const { width, height } = computeDimensions(htmlImages);

      let allFrames: ImageData[] = [];
      for (let i = 0; i < htmlImages.length; i++) {
        const a = htmlImages[i];
        const b = htmlImages[(i + 1) % htmlImages.length];
        allFrames = [...allFrames, ...generateCrossfadeFrames(a, b, width, height, crossfadeSteps)];
      }
      setProgress(10);

      const blob = await encodeGif(allFrames, frameDelay, width, height, (pct) =>
        setProgress(10 + Math.round(pct * 0.9))
      );

      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      setStage("done");
      setProgress(100);
    } catch (e) {
      setStage("error");
      setErrorMsg(e instanceof Error ? e.message : "Неизвестная ошибка");
    }
  };

  const canGenerate = images.length >= 2 && stage !== "encoding";

  /* ─── Adaptive colour tokens ─── */
  // Surface card: light = #F3EDF7, dark = #1E1B24
  const surfaceCls = "bg-[#F3EDF7] dark:bg-[#1E1B24]";
  // Subtle text
  const mutedCls   = "text-[#121212]/50 dark:text-white/50";
  // Label text in settings
  const labelCls   = "text-[#121212]/75 dark:text-white/75";
  // Hint text (slider ends)
  const hintCls    = "text-[#121212]/30 dark:text-white/30";
  // Divider / border
  const borderMuted = "border-[#121212]/10 dark:border-white/10";

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />

      {/* Inject the CSS variable for slider track colour per theme */}
      <style>{`
        :root { --slider-track: #D1C4E9; }
        @media (prefers-color-scheme: dark) { :root { --slider-track: #2D2A38; } }
      `}</style>

      {/* Extra bottom padding so fixed CTA never covers content */}
      <main className="min-h-screen pb-36">

        {/* ── Centred container ── */}
        <div className="max-w-2xl mx-auto px-6">

          {/* ── Header ── */}
          <header className="flex items-center justify-between py-10">
            <div>
              <h1
                className="text-4xl md:text-5xl font-unbounded font-black tracking-tighter"
                style={{ color: "#7000FF" }}
              >
                Гифтомат
              </h1>
              <p className={`text-sm font-inter mt-1 tracking-wide ${mutedCls}`}>
                GIF с кроссфейдом — прямо в браузере
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "#7000FF" }}
            >
              🎞
            </div>
          </header>

          {/* ── Drop Zone ── */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "relative cursor-pointer rounded-3xl border-2 border-dashed",
              "transition-all duration-300 p-10 text-center mb-5",
              isDragging
                ? "border-[#7000FF] bg-[#7000FF]/10"
                : `${surfaceCls} border-[#121212]/15 dark:border-white/15 hover:border-[#7000FF]/60`,
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                style={{ background: "rgba(112,0,255,0.12)" }}
              >
                🖼
              </div>
              <div>
                <p className="font-unbounded font-bold text-xl">Перетащите изображения сюда</p>
                <p className={`font-inter text-sm mt-2 ${mutedCls}`}>
                  или нажмите для выбора файлов · PNG, JPG, WEBP
                </p>
              </div>
              <div
                className="px-5 py-2 rounded-full text-sm font-inter font-medium"
                style={{ background: "rgba(112,0,255,0.15)", color: "#7000FF" }}
              >
                Минимум 2 изображения
              </div>
            </div>
          </div>

          {/* ── Image Gallery ── */}
          {images.length > 0 && (
            <div className={`rounded-3xl p-6 mb-5 ${surfaceCls}`}>
              <div className="flex items-center justify-between mb-4">
                <p className={`font-unbounded font-bold text-xs uppercase tracking-wider ${mutedCls}`}>
                  Изображения · {images.length} шт.
                </p>
                <button
                  onClick={clearAll}
                  className="text-xs font-inter text-red-400/60 hover:text-red-400 transition-colors"
                >
                  Очистить всё
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative group">
                    {/* Order badge */}
                    <div
                      className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-unbounded font-black pointer-events-none"
                      style={{ background: "#7000FF", color: "#D4FF00" }}
                    >
                      {idx + 1}
                    </div>
                    {/* Remove */}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/60 text-white text-xs hidden group-hover:flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      ×
                    </button>
                    {/* Reorder */}
                    <div className="absolute bottom-1.5 left-0 right-0 z-10 hidden group-hover:flex justify-center gap-1">
                      {idx > 0 && (
                        <button
                          onClick={() => moveImage(idx, idx - 1)}
                          className="w-5 h-5 rounded bg-black/60 text-white text-xs flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >←</button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          onClick={() => moveImage(idx, idx + 1)}
                          className="w-5 h-5 rounded bg-black/60 text-white text-xs flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >→</button>
                      )}
                    </div>
                    <img
                      src={img.url}
                      alt={img.name}
                      className={`w-full aspect-square object-cover rounded-2xl border ${borderMuted}`}
                    />
                  </div>
                ))}

                {/* Add more */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${borderMuted} ${hintCls} hover:border-[#7000FF]/60 hover:text-[#7000FF]`}
                >
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-[10px] font-inter">Добавить</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Settings Card ── */}
          <div className={`rounded-3xl p-6 mb-5 space-y-6 ${surfaceCls}`}>
            <p className={`font-unbounded font-bold text-xs uppercase tracking-wider ${mutedCls}`}>
              Настройки анимации
            </p>

            {/* Crossfade steps */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className={`font-inter text-sm ${labelCls}`}>Плавность кроссфейда</label>
                <span className="font-unbounded font-black text-lg" style={{ color: "#7000FF" }}>
                  {crossfadeSteps}
                </span>
              </div>
              <input
                type="range" min={3} max={20} value={crossfadeSteps}
                onChange={(e) => setCrossfadeSteps(Number(e.target.value))}
                className="w-full"
                style={{ background: sliderBg(crossfadeSteps, 3, 20) }}
              />
              <div className={`flex justify-between text-xs font-inter mt-1 ${hintCls}`}>
                <span>Быстро</span><span>Очень плавно</span>
              </div>
            </div>

            {/* Frame delay */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className={`font-inter text-sm ${labelCls}`}>Задержка кадра</label>
                <span className="font-unbounded font-black text-lg" style={{ color: "#7000FF" }}>
                  {frameDelay}мс
                </span>
              </div>
              <input
                type="range" min={40} max={500} step={10} value={frameDelay}
                onChange={(e) => setFrameDelay(Number(e.target.value))}
                className="w-full"
                style={{ background: sliderBg(frameDelay, 40, 500) }}
              />
              <div className={`flex justify-between text-xs font-inter mt-1 ${hintCls}`}>
                <span>Быстрее</span><span>Медленнее</span>
              </div>
            </div>

            {/* Frame count info */}
            {images.length >= 2 && (
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(112,0,255,0.08)" }}
              >
                <span className="text-lg">📊</span>
                <p className={`font-inter text-sm ${mutedCls}`}>
                  Итого кадров:{" "}
                  <span className="font-medium text-[#7000FF]">
                    {images.length * (crossfadeSteps + 1)}
                  </span>
                  {" "}· Длительность ~
                  <span className="font-medium text-[#7000FF]">
                    {((images.length * (crossfadeSteps + 1) * frameDelay) / 1000).toFixed(1)}с
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {stage === "error" && (
            <div className="rounded-3xl px-6 py-4 mb-5 bg-red-500/10 border border-red-400/30">
              <p className="font-inter text-red-500 dark:text-red-400 text-sm">⚠️ {errorMsg}</p>
            </div>
          )}

          {/* ── Progress ── */}
          {stage === "encoding" && (
            <div className={`rounded-3xl p-6 mb-5 ${surfaceCls}`}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-5 h-5 rounded-full border-2 spin-slow flex-shrink-0"
                  style={{ borderColor: "#7000FF", borderTopColor: "transparent" }}
                />
                <p className={`font-inter text-sm ${mutedCls}`}>
                  Кодирование GIF... {progress}%
                </p>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden bg-[#121212]/10 dark:bg-white/10`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7000FF,#D4FF00)" }}
                />
              </div>
            </div>
          )}

          {/* ── Result ── */}
          {stage === "done" && gifUrl && (
            <div className={`rounded-3xl p-6 mb-5 space-y-4 ${surfaceCls}`}>
              <p className={`font-unbounded font-bold text-xs uppercase tracking-wider ${mutedCls}`}>
                Ваш GIF готов!
              </p>
              <img
                src={gifUrl}
                alt="Результат GIF"
                className={`w-full rounded-2xl border ${borderMuted}`}
                style={{ maxHeight: "400px", objectFit: "contain" }}
              />
              <a
                href={gifUrl}
                download="giftomat.gif"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-full font-unbounded font-black text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#D4FF00", color: "#121212" }}
              >
                ⬇ Скачать GIF
              </a>
              <button
                onClick={() => { setStage("idle"); setGifUrl(null); }}
                className={`w-full py-3 rounded-full font-inter text-sm border transition-colors ${borderMuted} ${mutedCls} hover:border-[#7000FF]/50 hover:text-[#7000FF]`}
              >
                Создать новый
              </button>
            </div>
          )}

        </div>{/* /centred container */}

        {/* ── Fixed CTA button ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-8 pt-4"
          style={{
            background: "linear-gradient(to top, var(--cta-fade-from) 60%, transparent)",
          }}
        >
          {/* Inline style for the fade gradient per theme */}
          <style>{`
            :root { --cta-fade-from: #FAFAFA; }
            @media (prefers-color-scheme: dark) { :root { --cta-fade-from: #121212; } }
          `}</style>

          <button
            onClick={generateGif}
            disabled={!canGenerate}
            className={[
              "px-12 py-5 rounded-full font-unbounded font-black text-lg",
              "transition-all duration-200",
              canGenerate
                ? "cursor-pointer hover:scale-105 active:scale-95"
                : "opacity-40 cursor-not-allowed",
            ].join(" ")}
            style={{
              background: canGenerate ? "#D4FF00" : "#999",
              color: "#121212",
              boxShadow: canGenerate ? "0 8px 48px rgba(212,255,0,0.40)" : "none",
            }}
          >
            {stage === "encoding" ? (
              <span className="flex items-center gap-3">
                <span
                  className="inline-block w-5 h-5 rounded-full border-2 border-t-transparent spin-slow"
                  style={{ borderColor: "#121212", borderTopColor: "transparent" }}
                />
                Генерация...
              </span>
            ) : (
              "✨ Создать GIF"
            )}
          </button>
        </div>

      </main>
    </>
  );
}
