"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { loadImage, computeDimensions } from "./lib/crossfade";
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

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Отдельный компонент — обходит баг Turbopack с JSX-переменными внутри тела компонента
function DownloadButton({ gifUrl, ios, muted }: { gifUrl: string; ios: boolean; muted: string }) {
  if (ios) {
    return (
      <div>
        
          href={gifUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full py-3.5 rounded-full font-unbounded font-black text-sm mb-2"
          style={{ background: "#FF6B00", color: "#fff" }}
        >
          Открыть GIF
        </a>
        <p className={`text-center text-xs font-inter ${muted}`}>
          Удерживайте изображение и выберите «Сохранить»
        </p>
      </div>
    );
  }
  return (
    
      href={gifUrl}
      download="giftomat.gif"
      className="flex items-center justify-center w-full py-3.5 rounded-full font-unbounded font-black text-sm"
      style={{ background: "#FF6B00", color: "#fff" }}
    >
      Скачать GIF
    </a>
  );
}

export default function GiftomatPage() {
  const [images, setImages]               = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging]       = useState(false);
  const [frameDuration, setFrameDuration] = useState(3);
  const [stage, setStage]                 = useState<Stage>("idle");
  const [progress, setProgress]           = useState(0);
  const [gifUrl, setGifUrl]               = useState<string | null>(null);
  const [errorMsg, setErrorMsg]           = useState("");
  const [ios, setIos]                     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIos(detectIOS());
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    setErrorMsg("");
    try {
      const htmlImages = await Promise.all(images.map((img) => loadImage(img.url)));
      const { width, height } = computeDimensions(htmlImages);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      const frames: ImageData[] = htmlImages.map((img) => {
        ctx.clearRect(0, 0, width, height);
        const imgRatio  = img.naturalWidth / img.naturalHeight;
        const canvRatio = width / height;
        let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
        if (imgRatio > canvRatio) {
          sw = img.naturalHeight * canvRatio;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = img.naturalWidth / canvRatio;
          sy = (img.naturalHeight - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height);
      });

      setProgress(20);
      const delayMs = Math.round(frameDuration * 1000);
      const blob = await encodeGif(frames, delayMs, width, height, (pct) =>
        setProgress(20 + Math.round(pct * 0.8))
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

  const surface    = "bg-[#F0EAF8] dark:bg-[#1C1929]";
  const surfaceSub = "bg-[#E5DCF5] dark:bg-[#252233]";
  const muted      = "text-[#121212]/50 dark:text-white/50";
  const labelCls   = "text-[#121212]/70 dark:text-white/70";
  const hint       = "text-[#121212]/30 dark:text-white/30";
  const border     = "border-[#121212]/10 dark:border-white/10";

  const ctaLabel =
    images.length === 0 ? "Загрузите фото" :
    images.length === 1 ? "Добавьте ещё 1 фото" :
    "Создать GIF";

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />

      <main className="min-h-screen flex flex-col items-center px-5 py-16 md:py-24">
        <div className="w-full max-w-sm">

          <header className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-unbounded font-black tracking-tight text-[#7000FF]">
                Гифтомат
              </h1>
              <p className={`text-xs font-inter mt-1 ${muted}`}>
                Генератор GIF прямо в браузере
              </p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base bg-[#7000FF]/10 flex-shrink-0">
              🎞
            </div>
          </header>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 mb-4",
              "flex items-center gap-3 px-5 py-4",
              isDragging
                ? "border-[#7000FF] bg-[#7000FF]/10"
                : `${surface} border-[#121212]/12 dark:border-white/12 hover:border-[#7000FF]/50`,
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl bg-[#7000FF]/10 flex-shrink-0">
              🖼
            </div>
            <div className="min-w-0">
              <p className="font-unbounded font-bold text-sm">Выберите фотографии</p>
              <p className={`font-inter text-xs mt-0.5 ${muted}`}>PNG, JPG, WEBP · минимум 2</p>
            </div>
            <div
              className="ml-auto flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-inter font-semibold"
              style={{ background: "rgba(112,0,255,0.1)", color: "#7000FF" }}
            >
              + фото
            </div>
          </div>

          {images.length > 0 && (
            <div className={`rounded-2xl p-4 mb-4 ${surface}`}>
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
              <div className="grid grid-cols-5 gap-1.5">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative group">
                    <div
                      className="absolute top-1 left-1 z-10 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-unbounded font-black pointer-events-none"
                      style={{ background: "#7000FF", color: "#fff" }}
                    >
                      {idx + 1}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-black/50 text-white text-[10px] hidden group-hover:flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      x
                    </button>
                    <div className="absolute bottom-1 left-0 right-0 z-10 hidden group-hover:flex justify-center gap-0.5">
                      {idx > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx - 1); }}
                          className="w-4 h-4 rounded bg-black/50 text-white text-[9px] flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >
                          &lt;
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx + 1); }}
                          className="w-4 h-4 rounded bg-black/50 text-white text-[9px] flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >
                          &gt;
                        </button>
                      )}
                    </div>
                    <img
                      src={img.url}
                      alt={img.name}
                      className={`w-full aspect-square object-cover rounded-xl border ${border}`}
                    />
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center text-lg transition-colors ${border} ${hint} hover:border-[#7000FF]/50 hover:text-[#7000FF]`}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className={`rounded-2xl p-5 mb-4 ${surface}`}>
            <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest mb-4 ${muted}`}>
              Настройки
            </p>
            <div className="flex justify-between items-center mb-2">
              <label className={`font-inter text-sm ${labelCls}`}>Длительность кадра</label>
              <span className="font-unbounded font-black text-sm text-[#7000FF]">
                {frameDuration.toFixed(1)} сек
              </span>
            </div>
            <input
              type="range"
              min={0.1} max={10} step={0.1}
              value={frameDuration}
              onChange={(e) => setFrameDuration(Number(e.target.value))}
              style={{ background: sliderBg(frameDuration, 0.1, 10) }}
            />
            <div className={`flex justify-between text-[10px] font-inter mt-1 ${hint}`}>
              <span>0.1с — быстро</span>
              <span>10с — медленно</span>
            </div>
            {images.length >= 2 && (
              <div className={`rounded-xl px-3.5 py-2.5 flex items-center gap-2 mt-4 ${surfaceSub}`}>
                <p className={`font-inter text-xs ${muted}`}>
                  {images.length} кадров · итого{" "}
                  <span className="font-semibold text-[#7000FF]">
                    {(images.length * frameDuration).toFixed(1)} сек
                  </span>
                </p>
              </div>
            )}
          </div>

          {stage === "error" && (
            <div className="rounded-2xl px-4 py-3 mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40">
              <p className="font-inter text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>
            </div>
          )}

          {stage === "encoding" && (
            <div className={`rounded-2xl px-5 py-5 mb-4 ${surface}`}>
              <div className="flex justify-between items-center mb-3">
                <p className={`font-inter text-sm font-medium ${labelCls}`}>Генерация GIF…</p>
                <p className="font-unbounded font-black text-sm text-[#7000FF]">{progress}%</p>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${surfaceSub}`}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #7000FF, #FF6B00)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div className={`rounded-2xl p-4 mb-4 ${surface}`}>
              <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest text-center mb-3 ${muted}`}>
                Готово
              </p>
              <div className={`rounded-xl overflow-hidden border mb-4 bg-white dark:bg-[#0E0C14] ${border}`}>
                <img
                  src={gifUrl}
                  alt="Результат GIF"
                  className="w-full block"
                  style={{ maxHeight: "320px", objectFit: "contain" }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <DownloadButton gifUrl={gifUrl} ios={ios} muted={muted} />
                <button
                  onClick={resetToIdle}
                  className={`w-full py-3 rounded-full font-inter text-sm border transition-colors ${border} ${muted} hover:border-[#7000FF]/40 hover:text-[#7000FF]`}
                >
                  Создать новый
                </button>
              </div>
            </div>
          )}

          {stage !== "encoding" && stage !== "done" && (
            <button
              onClick={generateGif}
              disabled={!canGenerate}
              className={[
                "w-full py-4 rounded-full font-unbounded font-black text-base mt-2",
                "transition-opacity duration-150",
                canGenerate
                  ? "cursor-pointer hover:opacity-90 active:opacity-75"
                  : "opacity-30 cursor-not-allowed",
              ].join(" ")}
              style={{ background: "#FF6B00", color: "#fff" }}
            >
              {ctaLabel}
            </button>
          )}

        </div>
      </main>
    </>
  );
}
