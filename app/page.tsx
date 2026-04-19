"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { loadImage } from "./lib/crossfade"; // computeDimensions убран, если не используется
import { encodeGif } from "./lib/encoder";

type Stage = "idle" | "encoding" | "done" | "error";

interface UploadedImage {
  id: string;
  name: string;
  url: string;
}

function sliderBg(value: number, min: number, max: number) {
  const pct = ((value - min) / (max - min)) * 100;
  return `linear-gradient(to right, #7000FF ${pct}%, var(--slider-track) ${pct}%)`;
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function DownloadButton({ gifUrl, ios, muted }: { gifUrl: string; ios: boolean; muted: string }) {
  const baseBtnClass = "inline-flex items-center justify-center px-10 py-4 mt-4 rounded-full font-unbounded font-black text-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_12px_30px_-10px_rgba(255,107,0,0.8)] active:scale-95";
  
  if (ios) {
    return (
      <div className="flex flex-col items-center w-full mt-4">
        <a
          className={baseBtnClass}
          href={gifUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: "#FF6B00", color: "#fff" }}
        >
          Открыть GIF
        </a>
        <p className={`text-center text-xs font-inter mt-3 ${muted}`}>
          Удерживайте изображение и выберите «Сохранить»
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center w-full mt-4">
      <a
        className={baseBtnClass}
        href={gifUrl}
        download="giftomat.gif"
        style={{ background: "#FF6B00", color: "#fff" }}
      >
        Скачать GIF
      </a>
    </div>
  );
}

export default function GiftomatPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [frameDuration, setFrameDuration] = useState(3.0);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [ios, setIos] = useState(false);
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
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    
    setImages((prev) => [...prev, ...next]);
    setGifUrl(null);
    setStage("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
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
      const width = htmlImages[0].naturalWidth;
      const height = htmlImages[0].naturalHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Не удалось создать Canvas");

      let allFrames: ImageData[] = [];
      const canvRatio = width / height;

      for (const img of htmlImages) {
        ctx.clearRect(0, 0, width, height);
        const imgRatio = img.naturalWidth / img.naturalHeight;
        
        let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
        
        if (imgRatio > canvRatio) {
          sw = img.naturalHeight * canvRatio;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = img.naturalWidth / canvRatio;
          sy = (img.naturalHeight - sh) / 2;
        }
        
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
        allFrames.push(ctx.getImageData(0, 0, width, height));
      }

      setProgress(20);
      const delayMs = Math.round(frameDuration * 1000);

      const blob = await encodeGif(allFrames, delayMs, width, height, (pct) =>
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

  const canGenerate = images.length >= 2;
  const ctaLabel =
    images.length === 0 ? "Загрузите фото" :
    images.length === 1 ? "Добавьте ещё 1 фото" :
    "Создать GIF ✨";

  // Визуальные токены
  const surface = "bg-white dark:bg-[#1C1A22] shadow-sm border border-slate-100 dark:border-slate-800";
  const surfaceSub = "bg-slate-50 dark:bg-black/20";
  const muted = "text-slate-500 dark:text-slate-400";
  const labelCls = "text-slate-700 dark:text-slate-300";
  const hint = "text-slate-400 dark:text-slate-500";
  const borderCol = "border-slate-200 dark:border-slate-800";

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />

      {/* Обертка уже не нуждается в жестких цветах текста, так как они заданы в layout.tsx */}
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl">

          {/* Хедер */}
          <header className="flex flex-col items-center text-center mb-16">
            <div className="w-16 h-16 mb-6 rounded-full flex items-center justify-center text-3xl bg-[#7000FF]/10 text-[#7000FF] shadow-sm">
              🎞
            </div>
            <h1 className="text-4xl md:text-5xl font-unbounded font-black tracking-tight text-[#7000FF] mb-3">
              Гифтомат
            </h1>
            <p className={`text-sm md:text-base font-inter ${muted}`}>
              Генератор GIF прямо в браузере. Быстро и приватно.
            </p>
          </header>

          {/* Аккуратная Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "cursor-pointer rounded-[2rem] border-2 border-dashed transition-all duration-300 mb-12",
              "flex flex-col items-center justify-center w-full max-w-md mx-auto aspect-[4/3] p-8 text-center",
              isDragging
                ? "border-[#7000FF] bg-[#7000FF]/10 scale-[1.02]"
                : `${surfaceSub} ${borderCol} hover:border-[#7000FF]/50 hover:shadow-lg hover:-translate-y-1`,
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
            <div className="w-14 h-14 mb-4 rounded-2xl flex items-center justify-center text-3xl bg-[#7000FF]/10 text-[#7000FF]">
              🖼
            </div>
            <p className="font-unbounded font-bold text-lg mb-2">Выберите фото</p>
            <p className={`font-inter text-sm ${muted}`}>Перетащите файлы сюда или нажмите</p>
          </div>

          {/* Галерея изображений */}
          {images.length > 0 && (
            <div className={`rounded-3xl p-6 mb-8 transition-all duration-300 ${surface}`}>
              <div className="flex items-center justify-between mb-5">
                <p className={`font-unbounded font-bold text-xs uppercase tracking-widest ${muted}`}>
                  Галерея · {images.length}
                </p>
                <button
                  onClick={clearAll}
                  className="text-xs font-inter font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  Очистить всё
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative group">
                    <div
                      className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold pointer-events-none shadow-sm"
                      style={{ background: "#7000FF", color: "#fff" }}
                    >
                      {idx + 1}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-500 transition-all duration-200"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-1.5 left-0 right-0 z-10 hidden group-hover:flex justify-center gap-1">
                      {idx > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx - 1); }}
                          className="w-6 h-6 rounded-md bg-black/70 text-white text-[10px] flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >
                          &lt;
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx + 1); }}
                          className="w-6 h-6 rounded-md bg-black/70 text-white text-[10px] flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >
                          &gt;
                        </button>
                      )}
                    </div>
                    <img
                      src={img.url}
                      alt={img.name}
                      className={`w-full aspect-square object-cover rounded-xl border shadow-sm ${borderCol}`}
                    />
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center text-2xl transition-all duration-200 ${borderCol} ${hint} hover:border-[#7000FF]/50 hover:text-[#7000FF] hover:bg-[#7000FF]/5`}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Настройки */}
          <div className={`rounded-3xl p-6 md:p-8 mb-12 transition-all duration-300 ${surface}`}>
            <p className={`font-unbounded font-bold text-xs uppercase tracking-widest mb-6 ${muted}`}>
              Настройки
            </p>
            <div className="flex justify-between items-center mb-4">
              <label className={`font-inter font-medium text-sm md:text-base ${labelCls}`}>Длительность кадра</label>
              <span className="font-unbounded font-black text-base text-[#7000FF]">
                {frameDuration.toFixed(1)} сек
              </span>
            </div>
            <input
              type="range"
              min={0.1} max={10} step={0.1}
              value={frameDuration}
              onChange={(e) => setFrameDuration(Number(e.target.value))}
              className="w-full cursor-pointer mt-2 mb-2"
              style={{ background: sliderBg(frameDuration, 0.1, 10) }}
            />
            <div className={`flex justify-between text-[11px] font-inter mt-2 ${hint}`}>
              <span>0.1с — быстро</span>
              <span>10с — медленно</span>
            </div>

            {images.length >= 2 && (
              <div className={`rounded-2xl px-5 py-4 flex items-center justify-between mt-6 ${surfaceSub}`}>
                <p className={`font-inter text-sm ${muted}`}>Итоговое время GIF:</p>
                <span className="font-unbounded font-bold text-[#7000FF]">
                  {(images.length * frameDuration).toFixed(1)} сек
                </span>
              </div>
            )}
          </div>

          {/* Ошибки */}
          {stage === "error" && (
            <div className="rounded-2xl px-5 py-4 mb-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-center">
              <p className="font-inter text-red-600 dark:text-red-400 text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Загрузка */}
          {stage === "encoding" && (
            <div className={`rounded-3xl px-8 py-10 mb-8 text-center shadow-lg ${surface}`}>
              <p className={`font-unbounded font-bold text-lg mb-6 ${labelCls}`}>Собираем магию воедино...</p>
              <div className={`w-full h-3 rounded-full overflow-hidden ${surfaceSub}`}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #7000FF, #FF6B00)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <p className="font-unbounded font-black text-xl text-[#7000FF] mt-4">{progress}%</p>
            </div>
          )}

          {/* Готовый результат */}
          {stage === "done" && gifUrl && (
            <div className={`rounded-3xl p-6 md:p-8 mb-8 shadow-xl ${surface}`}>
              <p className={`font-unbounded font-bold text-xs uppercase tracking-widest text-center mb-6 ${muted}`}>
                Готово 🎉
              </p>
              <div className={`rounded-2xl overflow-hidden border mb-6 bg-slate-50 dark:bg-[#0A0A0B] ${borderCol} shadow-inner`}>
                <img
                  src={gifUrl}
                  alt="Результат GIF"
                  className="w-full"
                  style={{ maxHeight: "400px", objectFit: "contain" }}
                />
              </div>
              
              <DownloadButton gifUrl={gifUrl} ios={ios} muted={muted} />
              
              <div className="text-center mt-6">
                <button
                  onClick={resetToIdle}
                  className={`font-inter font-medium text-sm transition-colors ${muted} hover:text-[#7000FF] underline underline-offset-4`}
                >
                  Создать новый GIF
                </button>
              </div>
            </div>
          )}

          {/* Кнопка "Создать" (Отображается только в режиме ожидания) */}
          {stage !== "encoding" && stage !== "done" && (
            <div className="flex justify-center mt-4 pb-10">
              <button
                onClick={generateGif}
                disabled={!canGenerate}
                className={[
                  "relative inline-flex items-center justify-center px-12 py-5 rounded-full font-unbounded font-black text-lg w-full max-w-sm",
                  "transition-all duration-300",
                  canGenerate
                    ? "bg-[#FF6B00] text-white cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_12px_30px_-10px_rgba(255,107,0,0.8)] active:scale-95"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed",
                ].join(" ")}
              >
                {ctaLabel}
              </button>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
