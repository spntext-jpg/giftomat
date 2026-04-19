"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { loadImage, computeDimensions } from "./lib/crossfade";
import { encodeGif } from "./lib/encoder";

type Stage = "idle" | "encoding" | "done" | "error";

interface UploadedImage {
  id: string;
  name: string;
  url: string;
}

export default function GiftomatPage() {
  // --- Переменные дизайна (ВОССТАНОВЛЕНО) ---
  const card = "bg-white dark:bg-[#111114] border border-slate-200/60 dark:border-white/5 shadow-sm";
  const cardSub = "bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5";
  const txt = "text-slate-900 dark:text-white";
  const muted = "text-slate-500 dark:text-slate-400";
  const borderC = "border-slate-200 dark:border-white/10";
  const hint = "text-slate-400 dark:text-slate-500";

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [frameDuration, setFrameDuration] = useState(0.5);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ios, setIos] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, []);

  const sliderBg = (val: number) => {
    const pct = ((val - 0.1) / (10 - 0.1)) * 100;
    return `linear-gradient(to right, #7000FF ${pct}%, var(--slider-track) ${pct}%)`;
  };

  const addFiles = useCallback((fileList: FileList) => {
    const valid = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [
      ...prev,
      ...valid.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        name: f.name,
        url: URL.createObjectURL(f),
      })),
    ]);
    setStage("idle");
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    try {
      const loaded = await Promise.all(images.map((img) => loadImage(img.url)));
      const { width, height } = computeDimensions(loaded, 1000);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      const framesData = loaded.map((img) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height);
      });

      const blob = await encodeGif(framesData, frameDuration * 1000, width, height, (pct) => {
        setProgress(Math.round(pct));
      });

      setGifUrl(URL.createObjectURL(blob));
      setStage("done");
    } catch (e) {
      setStage("error");
      setErrorMsg("Ошибка при сборке GIF");
    }
  };

  const canGenerate = images.length >= 2;
  const ctaLabel = images.length === 0 ? "Загрузите фото" : images.length === 1 ? "Нужно еще одно" : "Создать GIF";

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />
      <main className="min-h-screen flex flex-col items-center px-5 py-16 md:py-24 font-inter transition-colors duration-300">
        <div className="w-full max-w-lg">
          
          {/* Header */}
          <header className="flex flex-col items-center text-center mb-12">
            <div className="w-14 h-14 mb-6 rounded-2xl flex items-center justify-center text-2xl bg-[#7000FF]/10 text-[#7000FF]">
              🎞
            </div>
            <h1 className={`text-4xl md:text-5xl font-unbounded font-black tracking-tight text-[#7000FF] mb-3`}>
              Гифтомат
            </h1>
            <p className={`text-sm ${muted}`}>Профессиональный инструмент для ваших анимаций</p>
          </header>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`
              cursor-pointer rounded-[32px] border-2 border-dashed mb-8
              flex flex-col items-center justify-center gap-4 w-full h-56 px-8 text-center
              ${isDragging ? "border-[#7000FF] bg-[#7000FF]/5 scale-[1.01]" : `dropzone-idle ${borderC} ${card}`}
            `}
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#7000FF]/10`}>🖼</div>
            <div>
              <p className={`font-unbounded font-bold text-base mb-1 ${txt}`}>Выберите фотографии</p>
              <p className={`text-xs ${muted}`}>Перетащите файлы сюда (PNG, JPG, WEBP)</p>
            </div>
          </div>

          {/* Gallery */}
          {images.length > 0 && (
            <div className={`rounded-[32px] p-6 mb-6 ${card}`}>
              <div className="flex items-center justify-between mb-5">
                <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest ${muted}`}>Галерея · {images.length}</p>
                <button onClick={() => setImages([])} className="text-[10px] font-bold text-red-500 uppercase">Очистить</button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-black/5">
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded text-[9px] text-white font-bold">{idx + 1}</div>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} className={`aspect-square rounded-xl flex items-center justify-center border-2 border-dashed ${borderC} ${muted} hover:bg-slate-50`}>+</button>
              </div>
            </div>
          )}

          {/* Settings */}
          {images.length > 0 && (
            <div className={`rounded-[32px] p-7 mb-8 ${card}`}>
               <p className={`font-unbounded font-bold text-[10px] uppercase tracking-widest mb-6 ${muted}`}>Настройки</p>
               <div className="flex justify-between items-center mb-4">
                 <label className={`font-bold text-sm ${txt}`}>Длительность кадра</label>
                 <span className="font-unbounded font-black text-[#7000FF]">{frameDuration.toFixed(1)}с</span>
               </div>
               <input 
                 type="range" min={0.1} max={10} step={0.1} value={frameDuration} 
                 onChange={(e) => setFrameDuration(Number(e.target.value))}
                 style={{ background: sliderBg(frameDuration) }}
               />
               <div className={`flex justify-between text-[10px] mt-3 font-bold uppercase tracking-tighter ${hint}`}>
                 <span>Быстро</span>
                 <span>Медленно</span>
               </div>
            </div>
          )}

          {/* Rendering Stage */}
          {stage === "encoding" && (
            <div className={`rounded-[32px] p-10 text-center ${card}`}>
              <p className={`font-unbounded font-bold mb-6 ${txt}`}>Склеиваем кадры...</p>
              <div className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-right from-[#7000FF] to-[#FF6163] transition-all duration-300" style={{ width: `${progress}%`, background: '#7000FF' }} />
              </div>
              <p className="mt-4 font-unbounded font-black text-2xl text-[#7000FF]">{progress}%</p>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div className={`rounded-[32px] p-6 text-center ${card}`}>
              <div className={`rounded-2xl overflow-hidden mb-6 border ${borderC}`}>
                <img src={gifUrl} alt="Result" className="w-full max-h-80 object-contain bg-slate-50" />
              </div>
              <a href={gifUrl} download="giftomat.gif" className="block w-full py-5 rounded-full bg-[#FF6163] text-white font-unbounded font-black text-lg shadow-lg shadow-[#FF6163]/30 active:scale-95 transition-transform">
                СКАЧАТЬ GIF
              </a>
              <button onClick={() => setStage("idle")} className={`mt-5 text-sm font-bold ${muted}`}>Создать еще один</button>
            </div>
          )}

          {/* CTA */}
          {stage === "idle" && (
            <button
              onClick={generateGif}
              disabled={!canGenerate}
              className={`
                cta-btn w-full py-5 rounded-full font-unbounded font-black text-xl tracking-tight
                ${canGenerate ? "bg-[#FF6163] text-white shadow-xl shadow-[#FF6163]/25" : "bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed"}
              `}
            >
              {ctaLabel}
            </button>
          )}

        </div>
      </main>
    </>
  );
}
