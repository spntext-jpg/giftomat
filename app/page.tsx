"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { loadImage } from "./lib/crossfade";
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

function DownloadButton({ gifUrl, ios }: { gifUrl: string; ios: boolean }) {
  const cls = "cta-btn inline-flex items-center justify-center px-12 py-5 rounded-full font-unbounded font-black text-lg text-white";
  const btnStyle = { background: "#FF6163", boxShadow: "0 8px 28px -6px rgba(255,97,99,0.45)" };

  if (ios) {
    return (
      <div className="flex flex-col items-center gap-3">
        <a href={gifUrl} target="_blank" rel="noopener noreferrer" className={cls} style={btnStyle}>
          Открыть GIF
        </a>
        <p className="text-xs font-inter text-slate-500 dark:text-slate-400 text-center">
          Удерживайте изображение и выберите «Сохранить»
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <a href={gifUrl} download="giftomat.gif" className={cls} style={btnStyle}>
        Скачать GIF
      </a>
    </div>
  );
}

export default function GiftomatPage() {
  const [images, setImages]               = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging]       = useState(false);
  const [frameDuration, setFrameDuration] = useState(3.0);
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
    setImages((prev) => [
      ...prev,
      ...valid.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        name: f.name,
        url: URL.createObjectURL(f),
      })),
    ]);
    setGifUrl(null);
    setStage("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
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
      const first = htmlImages[0];
      const width = Math.min(first.naturalWidth, 800);
      const height = Math.round(width * (first.naturalHeight / first.naturalWidth));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const canvRatio = width / height;

      const frames: ImageData[] = htmlImages.map((img) => {
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
        return ctx.getImageData(0, 0, width, height);
      });

      setProgress(20);
      const delayMs = Math.round(frameDuration * 1000);
      const blob = await encodeGif(frames, delayMs, width, height, (pct) =>
        setProgress(20 + Math.round(pct * 0.8))
      );
      setGifUrl(URL.createObjectURL(blob));
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

  const ctaLabel =
    images.length === 0 ? "Загрузите фото" :
    images.length === 1 ? "Добавьте ещё 1 фото" :
    "Создать GIF";

  const card    = "bg-white dark:bg-[#18171F] border border-slate-100 dark:border-slate-800 shadow-sm";
  const cardSub = "bg-slate-50 dark:bg-[#111018]";
  const txt     = "text-slate-900 dark:text-slate-100";
  const muted   = "text-slate-500 dark:text-slate-400";
  const hint    = "text-slate-400 dark:text-slate-500";
  const borderC = "border-slate-200 dark:border-slate-700";

  const dropzoneBg = isDragging ? { background: "rgba(112,0,255,0.08)" } : undefined;

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />

      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-20">
        <div className="w-full max-w-lg">

          <header className="flex flex-col items-center text-center mb-12">
            <div className="w-14 h-14 mb-5 rounded-2xl flex items-center justify-center text-2xl bg-[#7000FF]/10">
              🎞
            </div>
            <h1 className="text-4xl md:text-5xl font-unbounded font-black tracking-tight text-[#7000FF] mb-2">
              Гифтомат
            </h1>
            <p className={`text-sm font-inter ${muted}`}>
              Генератор GIF прямо в браузере
            </p>
          </header>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "cursor-pointer rounded-3xl border-2 border-dashed mb-8",
              "flex flex-col items-center justify-center gap-4",
              "w-full h-52 px-8 text-center",
              isDragging
                ? "border-[#7000FF] scale-[1.01]"
                : `dropzone-idle ${borderC}`,
            ].join(" ")}
            style={dropzoneBg}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#7000FF]/10 pointer-events-none">
              🖼
            </div>
            <div className="pointer-events-none">
              <p className={`font-unbounded font-bold text-base mb-1 ${txt}`}>
                Выберите фотографии
              </p>
              <p className={`font-inter text-sm ${muted}`}>
                Перетащите или нажмите · PNG, JPG, WEBP · от 2 штук
              </p>
            </div>
          </div>

          {images.length > 0 && (
            <div className={`rounded-3xl p-6 mb-6 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest ${muted}`}>
                  Галерея · {images.length}
                </p>
                <button
                  onClick={clearAll}
                  className="text-xs font-inter font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  Очистить всё
                </button>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative group">
                    <div
                      className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold pointer-events-none shadow"
                      style={{ background: "#7000FF", color: "#fff" }}
                    >
                      {idx + 1}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-500 transition-all duration-150"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-1 left-0 right-0 z-10 hidden group-hover:flex justify-center gap-1">
                      {idx > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx - 1); }}
                          className="w-5 h-5 rounded bg-black/70 text-white text-[9px] flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >
                          &lt;
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveImage(idx, idx + 1); }}
                          className="w-5 h-5 rounded bg-black/70 text-white text-[9px] flex items-center justify-center hover:bg-[#7000FF] transition-colors"
                        >
                          &gt;
                        </button>
                      )}
                    </div>
                    <img
                      src={img.url}
                      alt={img.name}
                      className={`w-full aspect-square object-cover rounded-xl border ${borderC}`}
                    />
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center text-xl transition-all duration-200 ${borderC} ${hint} hover:border-[#7000FF]/50 hover:text-[#7000FF] hover:bg-[#7000FF]/5`}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className={`rounded-3xl p-6 mb-8 ${card}`}>
            <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest mb-5 ${muted}`}>
              Настройки
            </p>
            <div className="flex justify-between items-center mb-3">
              <label className={`font-inter font-medium text-sm ${txt}`}>Длительность кадра</label>
              <span className="font-unbounded font-black text-sm text-[#7000FF]">
                {frameDuration.toFixed(1)} сек
              </span>
            </div>
            <input
              type="range"
              min={0.1} max={10} step={0.1}
              value={frameDuration}
              onChange={(e) => setFrameDuration(Number(e.target.value))}
              className="w-full"
              style={{ background: sliderBg(frameDuration, 0.1, 10) }}
            />
            <div className={`flex justify-between text-[11px] font-inter mt-2 ${hint}`}>
              <span>0.1с — быстро</span>
              <span>10с — медленно</span>
            </div>
            {images.length >= 2 && (
              <div className={`rounded-2xl px-4 py-3 flex items-center justify-between mt-5 ${cardSub}`}>
                <p className={`font-inter text-sm ${muted}`}>Итоговое время:</p>
                <span className="font-unbounded font-bold text-sm text-[#7000FF]">
                  {(images.length * frameDuration).toFixed(1)} сек
                </span>
              </div>
            )}
          </div>

          {stage === "error" && (
            <div className="rounded-2xl px-5 py-4 mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
              <p className="font-inter text-red-600 dark:text-red-400 text-sm text-center">{errorMsg}</p>
            </div>
          )}

          {stage === "encoding" && (
            <div className={`rounded-3xl px-8 py-10 mb-8 text-center ${card}`}>
              <p className={`font-unbounded font-bold text-base mb-6 ${txt}`}>
                Собираем магию воедино…
              </p>
              <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #7000FF, #FF6163)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <p className="font-unbounded font-black text-2xl text-[#7000FF] mt-4">{progress}%</p>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div className={`rounded-3xl p-6 mb-8 ${card}`}>
              <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest text-center mb-5 ${muted}`}>
                Готово 🎉
              </p>
              <div className={`rounded-2xl overflow-hidden border mb-6 bg-slate-50 dark:bg-[#0D0D10] ${borderC}`}>
                <img
                  src={gifUrl}
                  alt="Результат GIF"
                  className="w-full block"
                  style={{ maxHeight: "380px", objectFit: "contain" }}
                />
              </div>
              <DownloadButton gifUrl={gifUrl} ios={ios} />
              <div className="text-center mt-5">
                <button
                  onClick={resetToIdle}
                  className={`font-inter text-sm transition-colors ${muted} hover:text-[#7000FF] underline underline-offset-4`}
                >
                  Создать новый GIF
                </button>
              </div>
            </div>
          )}

          {stage !== "encoding" && stage !== "done" && (
            <div className="flex justify-center mt-2 pb-8">
              <button
                onClick={generateGif}
                disabled={!canGenerate}
                className={[
                  "cta-btn px-14 py-5 rounded-full font-unbounded font-black text-xl",
                  canGenerate
                    ? "text-white cursor-pointer"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed",
                ].join(" ")}
                style={canGenerate ? {
                  background: "#FF6163",
                  boxShadow: "0 8px 28px -6px rgba(255,97,99,0.45)",
                } : undefined}
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
