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

function sliderBg(value: number, min: number, max: number) {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, #7000FF ${pct}%, var(--slider-track) ${pct}%)`;
}

/** Detect iOS Safari — blob download via <a> doesn't work there */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export default function GiftomatPage() {
  const [images, setImages]                   = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging]           = useState(false);
  const [crossfadeSteps, setCrossfadeSteps]   = useState(10);
  const [frameDelay, setFrameDelay]           = useState(150);
  const [stage, setStage]                     = useState<Stage>("idle");
  const [progress, setProgress]               = useState(0);
  const [gifUrl, setGifUrl]                   = useState<string | null>(null);
  const [errorMsg, setErrorMsg]               = useState("");
  const [ios, setIos]                         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIos(isIOS());
    return () => {
      // Cleanup blob URLs on unmount
      images.forEach((img) => URL.revokeObjectURL(img.url));
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── File helpers ── */
  const addFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!valid.length) return;
    const next: UploadedImage[] = valid.map((f) => ({
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
      const found = prev.find((i) => i.id === id);
      if (found) URL.revokeObjectURL(found.url);
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

  /* ── GIF generation ── */
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
      setProgress(15);

      const blob = await encodeGif(allFrames, frameDelay, width, height, (pct) =>
        setProgress(15 + Math.round(pct * 0.85))
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

  const resetToIdle = () => {
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setGifUrl(null);
    setStage("idle");
    setProgress(0);
  };

  const canGenerate = images.length >= 2 && stage !== "encoding";

  /* ── Colour tokens ── */
  const surface    = "bg-[#F0EAF8] dark:bg-[#1C1929]";
  const surfaceSub = "bg-[#E8DFF5] dark:bg-[#252233]";
  const muted      = "text-[#121212]/50 dark:text-white/50";
  const label      = "text-[#121212]/70 dark:text-white/70";
  const hint       = "text-[#121212]/30 dark:text-white/30";
  const border     = "border-[#121212]/10 dark:border-white/10";

  /* ── CTA label logic ── */
  const ctaLabel = (() => {
    if (stage === "encoding") return null; // spinner shown instead
    if (images.length === 0) return "Загрузите фото";
    if (images.length === 1) return "Добавьте ещё 1 фото";
    return "✨ Создать GIF";
  })();

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />

      <main className="min-h-screen py-14 md:py-20 pb-36 flex flex-col items-center">
        {/* ── Centred narrow column ── */}
        <div className="w-full max-w-md px-5 md:px-0">

          {/* ── Header ── */}
          <header className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl md:text-4xl font-unbounded font-black tracking-tight text-[#7000FF]">
                Гифтомат
              </h1>
              <p className={`text-xs font-inter mt-1 tracking-wide ${muted}`}>
                Генератор GIF прямо в браузере
              </p>
            </div>
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-[#7000FF]/10">
              🎞
            </div>
          </header>

          {/* ── Drop Zone — compact horizontal pill ── */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "cursor-pointer rounded-2xl border-2 border-dashed",
              "transition-all duration-200 mb-5",
              "flex items-center gap-4 px-6 py-5",
              isDragging
                ? "border-[#7000FF] bg-[#7000FF]/10"
                : `${surface} border-[#121212]/12 dark:border-white/12 hover:border-[#7000FF]/50 hover:bg-[#7000FF]/5`,
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
            {/* Icon */}
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-[#7000FF]/10">
              🖼
            </div>
            {/* Text */}
            <div className="min-w-0">
              <p className="font-unbounded font-bold text-sm leading-snug">
                Перетащите изображения
              </p>
              <p className={`font-inter text-xs mt-0.5 ${muted}`}>
                или нажмите · PNG, JPG, WEBP
              </p>
            </div>
            {/* Pill badge */}
            <div
              className="ml-auto flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-inter font-medium whitespace-nowrap"
              style={{ background: "rgba(112,0,255,0.1)", color: "#7000FF" }}
            >
              мин. 2 фото
            </div>
          </div>

          {/* ── Gallery ── */}
          {images.length > 0 && (
            <div className={`rounded-2xl p-4 mb-5 ${surface}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest ${muted}`}>
                  Галерея · {images.length}
                </p>
                <button
                  onClick={clearAll}
                  className="text-[11px] font-inter text-red-400/50 hover:text-red-400 transition-colors"
                >
                  Очистить
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative group">
                    {/* Order badge */}
                    <div
                      className="absolute top-1 left-1 z-10 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-unbounded font-black pointer-events-none shadow-sm"
                      style={{ background: "#7000FF", color: "#fff" }}
                    >
                      {idx + 1}
                    </div>
                    {/* Remove */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-black/50 text-white text-[10px] hidden group-hover:flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      ×
                    </button>
                    {/* Reorder arrows */}
                    <div className="absolute bottom-1 left-0 right-0 z-10 hidden group-hover:flex justify-center gap-0.5">
                      {idx > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx - 1); }}
                          className="w-4 h-4 rounded bg-black/50 text-white text-[9px] flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >←</button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx + 1); }}
                          className="w-4 h-4 rounded bg-black/50 text-white text-[9px] flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >→</button>
                      )}
                    </div>
                    <img
                      src={img.url}
                      alt={img.name}
                      className={`w-full aspect-square object-cover rounded-xl border ${border}`}
                    />
                  </div>
                ))}

                {/* Add more */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${border} ${hint} hover:border-[#7000FF]/50 hover:text-[#7000FF]`}
                >
                  <span className="text-lg leading-none">+</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Settings ── */}
          <div className={`rounded-2xl p-5 mb-5 space-y-5 ${surface}`}>
            <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest ${muted}`}>
              Настройки
            </p>

            {/* Crossfade smoothness */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className={`font-inter text-sm ${label}`}>Плавность перехода</label>
                <span className="font-unbounded font-black text-base text-[#7000FF]">{crossfadeSteps}</span>
              </div>
              <input
                type="range" min={3} max={20} value={crossfadeSteps}
                onChange={(e) => setCrossfadeSteps(Number(e.target.value))}
                style={{ background: sliderBg(crossfadeSteps, 3, 20) }}
              />
              <div className={`flex justify-between text-[10px] font-inter mt-1 ${hint}`}>
                <span>Быстро</span><span>Плавно</span>
              </div>
            </div>

            {/* Frame delay */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className={`font-inter text-sm ${label}`}>Задержка кадра</label>
                <span className="font-unbounded font-black text-base text-[#7000FF]">{frameDelay}мс</span>
              </div>
              <input
                type="range" min={40} max={600} step={10} value={frameDelay}
                onChange={(e) => setFrameDelay(Number(e.target.value))}
                style={{ background: sliderBg(frameDelay, 40, 600) }}
              />
              <div className={`flex justify-between text-[10px] font-inter mt-1 ${hint}`}>
                <span>Быстрее</span><span>Медленнее</span>
              </div>
            </div>

            {/* Stats */}
            {images.length >= 2 && (
              <div className={`rounded-xl px-4 py-2.5 flex items-center gap-2.5 ${surfaceSub}`}>
                <span className="text-base">📊</span>
                <p className={`font-inter text-xs ${muted}`}>
                  Кадров:{" "}
                  <span className="font-semibold text-[#7000FF]">{images.length * (crossfadeSteps + 1)}</span>
                  {"  ·  "}Длительность:{" "}
                  <span className="font-semibold text-[#7000FF]">
                    {((images.length * (crossfadeSteps + 1) * frameDelay) / 1000).toFixed(1)}с
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {stage === "error" && (
            <div className="rounded-2xl px-5 py-3.5 mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50">
              <p className="font-inter text-red-600 dark:text-red-400 text-sm">⚠️ {errorMsg}</p>
            </div>
          )}

          {/* ── Encoding progress (inline, no fixed button during encoding) ── */}
          {stage === "encoding" && (
            <div className={`rounded-2xl p-6 mb-5 text-center ${surface}`}>
              <div
                className="w-10 h-10 mx-auto mb-4 rounded-full border-[3px] spin-slow"
                style={{ borderColor: "rgba(112,0,255,0.15)", borderTopColor: "#7000FF" }}
              />
              <p className="font-unbounded font-bold text-sm mb-5 text-[#7000FF]">
                Генерация магии...
              </p>
              <div className={`w-full h-2 rounded-full overflow-hidden bg-[#121212]/8 dark:bg-white/10`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7000FF,#D4FF00)" }}
                />
              </div>
              <p className="mt-2 font-unbounded font-black text-xs text-[#7000FF]">{progress}%</p>
            </div>
          )}

          {/* ── Result ── */}
          {stage === "done" && gifUrl && (
            <div className={`rounded-2xl p-5 mb-5 space-y-4 ${surface}`}>
              <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest text-center ${muted}`}>
                Ваш GIF готов 🎉
              </p>

              {/* GIF preview */}
              <div className={`rounded-xl overflow-hidden border ${border} bg-[#FAFAFA] dark:bg-[#0E0C14]`}>
                <img
                  src={gifUrl}
                  alt="Результат GIF"
                  className="w-full block"
                  style={{ maxHeight: "340px", objectFit: "contain" }}
                />
              </div>

              <div className="flex flex-col gap-2.5">
                {ios ? (
                  /* iOS: blob download doesn't work — open in new tab, user long-presses to save */
                  <>
                    <a
                      href={gifUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-unbounded font-black text-sm transition-opacity hover:opacity-90"
                      style={{ background: "#D4FF00", color: "#121212" }}
                    >
                      🔗 Открыть GIF
                    </a>
                    <p className={`text-center text-[11px] font-inter ${muted}`}>
                      Удерживайте GIF → «Сохранить изображение»
                    </p>
                  </>
                ) : (
                  <a
                    href={gifUrl}
                    download="giftomat.gif"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-unbounded font-black text-sm transition-opacity hover:opacity-90"
                    style={{ background: "#D4FF00", color: "#121212" }}
                  >
                    ⬇ Скачать GIF
                  </a>
                )}
                <button
                  onClick={resetToIdle}
                  className={`w-full py-3 rounded-full font-inter text-sm border transition-colors ${border} ${muted} hover:border-[#7000FF]/40 hover:text-[#7000FF]`}
                >
                  Создать новый
                </button>
              </div>
            </div>
          )}

        </div>{/* /column */}

        {/* ── Fixed CTA — hidden during encoding (progress shown inline) and done ── */}
        {stage !== "encoding" && stage !== "done" && (
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-8 pt-6 cta-fade pointer-events-none">
            <button
              onClick={generateGif}
              disabled={!canGenerate}
              className={[
                "pointer-events-auto px-10 py-4 rounded-full font-unbounded font-black text-base",
                "transition-all duration-200",
                canGenerate
                  ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(212,255,0,0.35)] active:scale-95"
                  : "opacity-35 cursor-not-allowed",
              ].join(" ")}
              style={{
                background: canGenerate ? "#D4FF00" : "#aaa",
                color: "#121212",
                boxShadow: canGenerate ? "0 6px 32px rgba(212,255,0,0.28)" : "none",
              }}
            >
              {ctaLabel}
            </button>
          </div>
        )}

      </main>
    </>
  );
}
