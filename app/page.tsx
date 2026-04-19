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
  // --- Константы стилей ---
  const surfaceCls = "bg-white dark:bg-[#1C1A22] border border-slate-100 dark:border-white/5 shadow-sm";
  const surfaceSubCls = "bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5";
  const mutedCls = "text-slate-500 dark:text-slate-400";
  const borderCol = "border-slate-200 dark:border-white/10";
  const txtCls = "text-[#000000] dark:text-white";
  
  const accentA = "#00AAFF"; // Azure
  const accentP = "#A169F7"; // Violet Punk
  const accentO = "#FF6B00"; // Vivid Orange

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [frameDuration, setFrameDuration] = useState(0.5);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [ios, setIos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, []);

  // Тот самый ctaLabel, который вызывал ошибку
  const ctaLabel = images.length === 0 
    ? "Загрузите фото" 
    : images.length === 1 
      ? "Нужно еще одно" 
      : "Создать GIF";

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
    setGifUrl(null);
    setStage("idle");
  }, []);

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

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const framesData = loaded.map((img) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvRatio = width / height;
        let dx = 0, dy = 0, dw = width, dh = height;
        
        if (imgRatio > canvRatio) {
          dw = img.naturalWidth * (height / img.naturalHeight);
          dx = (width - dw) / 2;
        } else {
          dh = img.naturalHeight * (width / img.naturalWidth);
          dy = (height - dh) / 2;
        }

        ctx.drawImage(img, dx, dy, dw, dh);
        return ctx.getImageData(0, 0, width, height);
      });

      const blob = await encodeGif(framesData, frameDuration * 1000, width, height, (pct) => {
        setProgress(Math.round(pct));
      });

      setGifUrl(URL.createObjectURL(blob));
      setStage("done");
      setProgress(100);
    } catch (e) {
      setStage("error");
      setErrorMsg("Ошибка при генерации GIF");
    }
  };

  const sliderBg = (val: number) => {
    const pct = ((val - 0.1) / (5 - 0.1)) * 100;
    return `linear-gradient(to right, ${accentP} ${pct}%, #E2D9F3 ${pct}%)`;
  };

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />
      <div className="w-full max-w-xl font-inter mt-16 md:mt-24 px-6 pb-20">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center mb-16">
          <div className="w-16 h-16 rounded-[22px] bg-black flex items-center justify-center mb-6 shadow-xl shadow-purple-500/10 border border-white/5">
            <span className="font-unbounded font-black text-2xl" style={{ color: accentP }}>G</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Генератор GIF</h1>
          <p className={`${mutedCls} text-sm`}>Профессиональный инструмент для ваших анимаций</p>
        </header>

        {/* Upload Area */}
        <div 
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
          className={`w-full py-14 px-10 rounded-[40px] ${surfaceSubCls} ${borderCol} border-2 border-dashed flex flex-col items-center gap-8 text-center`}
        >
          {/* Пухлая оранжевая кнопка с Glow-эффектом */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group relative inline-flex items-center justify-center px-12 py-5 rounded-full font-unbounded font-black text-white text-lg transition-all duration-300 active:scale-95 hover:-translate-y-1.5"
          >
            {/* Слой свечения (Glow) */}
            <div 
              className="absolute inset-0 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity"
              style={{ background: accentO }}
            />
            {/* Сама кнопка */}
            <span className="relative z-10">Загрузить фото ✨</span>
            <div className="absolute inset-0 rounded-full shadow-[0_10px_40px_-6px_rgba(255,107,0,0.5)]" style={{ background: accentO }} />
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          
          <div className="flex flex-col gap-1">
            <p className={`font-unbounded font-bold text-base ${txtCls}`}>Или перетащите сюда</p>
            <p className={`text-[11px] uppercase tracking-wider font-bold ${mutedCls}`}>PNG, JPG, WEBP · от 2 штук</p>
          </div>
        </div>

        {/* Gallery */}
        {images.length > 0 && (
          <div className={`mt-10 p-7 rounded-[32px] ${surfaceCls}`}>
            <div className="flex items-center justify-between mb-6">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${mutedCls}`}>Галерея · {images.length}</span>
              <button onClick={() => setImages([])} className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Очистить всё</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <div key={img.id} className={`relative aspect-square rounded-2xl overflow-hidden shadow-sm border ${borderCol}`}>
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                  <button onClick={() => setImages(p=>p.filter(i=>i.id!==img.id))} className="absolute top-1 right-1 w-5 h-5 bg-black/50 backdrop-blur-md text-white rounded-full text-[10px] flex items-center justify-center hover:bg-black/80 transition-colors">✕</button>
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded text-[9px] text-white font-bold">{idx + 1}</div>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className={`aspect-square rounded-2xl flex items-center justify-center border-2 border-dashed ${borderCol} text-xl ${mutedCls} hover:bg-slate-50 transition-colors`}>+</button>
            </div>
          </div>
        )}

        {/* Settings */}
        {images.length > 0 && (
          <div className={`mt-6 p-8 rounded-[32px] ${surfaceCls}`}>
            <div className="flex justify-between items-center mb-6">
              <label className={`font-unbounded font-bold text-[10px] uppercase tracking-widest ${mutedCls}`}>Скорость</label>
              <span className="font-unbounded font-black text-lg" style={{ color: accentP }}>{frameDuration.toFixed(1)}с</span>
            </div>
            <input
              type="range" min={0.1} max={5} step={0.1}
              value={frameDuration} onChange={(e)=>setFrameDuration(Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ background: sliderBg(frameDuration) }}
            />
          </div>
        )}

        {/* Action / Result */}
        <div className="mt-8">
          {stage === "encoding" && (
            <div className={`p-10 text-center rounded-[32px] ${surfaceCls}`}>
              <p className="font-unbounded font-bold mb-6">Создаем анимацию...</p>
              <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: accentA }} />
              </div>
              <p className="font-unbounded font-black text-2xl mt-5" style={{ color: accentA }}>{progress}%</p>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div className={`p-8 text-center rounded-[32px] ${surfaceCls}`}>
              <div className={`rounded-2xl overflow-hidden mb-8 border ${borderCol} bg-slate-50 dark:bg-black/20`}>
                <img src={gifUrl} alt="Result" className="w-full max-h-[400px] object-contain" />
              </div>
              <div className="flex flex-col gap-4">
                <a href={gifUrl} download="giftomat.gif" className="flex items-center justify-center py-5 rounded-full bg-black text-white font-unbounded font-black text-lg hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-black/10">
                  Скачать GIF
                </a>
                <button onClick={() => setStage("idle")} className={`text-xs font-bold uppercase tracking-widest ${mutedCls} hover:${txtCls} transition-colors`}>Создать новый</button>
              </div>
            </div>
          )}

          {stage === "idle" && (
            <button
              onClick={generateGif} 
              disabled={images.length < 2}
              className={`
                w-full py-6 rounded-full font-unbounded font-black text-xl transition-all duration-300
                ${images.length >= 2 
                  ? "bg-black text-white shadow-2xl shadow-black/20 hover:-translate-y-1 active:scale-95" 
                  : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"}
              `}
            >
              {ctaLabel}
            </button>
          )}

          {stage === "error" && (
            <div className="p-6 rounded-2xl bg-red-50 text-red-500 text-center font-bold border border-red-100">
              {errorMsg}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
