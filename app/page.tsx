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
  // --- UI Tokens ---
  const surfaceCls = "bg-white dark:bg-[#111114] border border-slate-100 dark:border-white/5 shadow-sm";
  const surfaceSubCls = "bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5";
  const mutedCls = "text-slate-400 dark:text-slate-500";
  const txtCls = "text-black dark:text-white";
  
  const accentP = "#A169F7"; // Punk Violet
  const accentO = "#FF6B00"; // Vivid Orange (The "Puffy" Button)
  const accentA = "#00AAFF"; // Progress Azure

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [frameDuration, setFrameDuration] = useState(0.5);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Label для кнопки
  const ctaLabel = images.length === 0 ? "Загрузите фото" : images.length === 1 ? "Нужно еще одно" : "Создать GIF";

  const addFiles = useCallback((fileList: FileList) => {
    const valid = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const newImgs = valid.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...newImgs]);
    setStage("idle");
    setGifUrl(null);
  }, []);

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    setErrorMsg("");

    try {
      // 1. Загружаем все изображения
      const loaded = await Promise.all(images.map((img) => loadImage(img.url)));
      
      // 2. Вычисляем общие размеры (Center Cover)
      const { width, height } = computeDimensions(loaded, 1000);
      
      // 3. Создаем массив временных холстов (Canvas) для энкодера
      // Это решает проблему качества и зависания первого кадра
      const processedCanvases = loaded.map((img) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        
        // Настройки качества
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // Фон
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Расчет Center Cover
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
        return canvas;
      });

      // 4. Склеиваем
      const blob = await encodeGif(processedCanvases, frameDuration * 1000, (pct) => {
        setProgress(pct);
      });

      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      setStage("done");
      setProgress(100);
    } catch (e) {
      console.error(e);
      setStage("error");
      setErrorMsg("Ошибка при сборке. Попробуйте другие фото.");
    }
  };

  const sliderBg = (val: number) => {
    const pct = ((val - 0.1) / (5 - 0.1)) * 100;
    return `linear-gradient(to right, ${accentP} ${pct}%, #E2D9F3 ${pct}%)`;
  };

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />
      
      <main className="w-full max-w-xl px-6 py-16 md:py-24 font-inter">
        
        {/* Header Section */}
        <header className="flex flex-col items-center text-center mb-16">
          <div className="w-16 h-16 rounded-[22px] bg-black flex items-center justify-center mb-6 shadow-2xl border border-white/5 shadow-purple-500/10">
            <span className="font-unbounded font-black text-2xl" style={{ color: accentP }}>G</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Генератор GIF</h1>
          <p className={`${mutedCls} text-sm`}>Профессиональный стандарт качества</p>
        </header>

        {/* Upload Box (Drop Zone) */}
        <div 
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
          className={`w-full py-14 px-8 rounded-[44px] ${surfaceSubCls} ${borderCol} border-2 border-dashed flex flex-col items-center gap-10 text-center transition-all`}
        >
          {/* Пухлая оранжевая кнопка (Puffy & Glowing) */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group relative inline-flex items-center justify-center px-14 py-5 rounded-full font-unbounded font-black text-white text-lg transition-all duration-300 active:scale-95 hover:-translate-y-2"
          >
            {/* Слой Glow */}
            <div 
              className="absolute inset-0 rounded-full blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-300"
              style={{ background: accentO }}
            />
            {/* Тело кнопки */}
            <span className="relative z-10">Загрузить фото ✨</span>
            <div 
              className="absolute inset-0 rounded-full shadow-[0_12px_44px_-8px_rgba(255,107,0,0.6)]" 
              style={{ background: accentO }} 
            />
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          
          <div>
            <p className={`font-unbounded font-bold text-sm mb-1 ${txtCls}`}>Или перетащите файлы</p>
            <p className={`text-[10px] uppercase tracking-[0.15em] font-bold ${mutedCls}`}>JPG · PNG · WEBP</p>
          </div>
        </div>

        {/* Gallery Preview */}
        {images.length > 0 && (
          <div className={`mt-10 p-7 rounded-[32px] ${surfaceCls}`}>
            <div className="flex items-center justify-between mb-6">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${mutedCls}`}>Кадры · {images.length}</span>
              <button onClick={() => setImages([])} className="text-[10px] font-bold text-red-500 hover:opacity-70 uppercase">Удалить всё</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-black/5 bg-slate-50 shadow-sm">
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded text-[9px] text-white font-bold">{idx + 1}</div>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className={`aspect-square rounded-2xl flex items-center justify-center border-2 border-dashed ${borderCol} ${mutedCls} text-2xl hover:bg-slate-50 transition-colors`}>+</button>
            </div>
          </div>
        )}

        {/* Speed Settings */}
        {images.length > 0 && (
          <div className={`mt-6 p-8 rounded-[32px] ${surfaceCls}`}>
            <div className="flex justify-between items-center mb-6">
              <label className={`font-unbounded font-bold text-[10px] uppercase tracking-widest ${mutedCls}`}>Скорость смены</label>
              <span className="font-unbounded font-black text-lg" style={{ color: accentP }}>{frameDuration.toFixed(1)}с</span>
            </div>
            <input
              type="range" min={0.1} max={5} step={0.1}
              value={frameDuration} onChange={(e)=>setFrameDuration(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: sliderBg(frameDuration) }}
            />
          </div>
        )}

        {/* Action Button & Results */}
        <div className="mt-10">
          {stage === "encoding" && (
            <div className={`p-10 text-center rounded-[40px] ${surfaceCls} border-2 border-dashed`}>
              <p className="font-unbounded font-bold mb-6 text-sm">Склеиваем кадры высокого качества...</p>
              <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: accentA }} />
              </div>
              <p className="font-unbounded font-black text-2xl mt-5" style={{ color: accentA }}>{progress}%</p>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div className={`p-8 text-center rounded-[40px] ${surfaceCls} shadow-2xl`}>
              <div className={`rounded-3xl overflow-hidden mb-8 border ${borderCol} bg-slate-50 dark:bg-black/20`}>
                <img src={gifUrl} alt="Result" className="w-full max-h-[420px] object-contain mx-auto" />
              </div>
              <div className="flex flex-col gap-4">
                <a href={gifUrl} download="giftomat.gif" className="flex items-center justify-center py-5 rounded-full bg-black text-white font-unbounded font-black text-lg hover:bg-slate-800 transition-all active:scale-95 shadow-xl">
                  Скачать GIF
                </a>
                <button onClick={() => setStage("idle")} className={`text-[10px] font-bold uppercase tracking-[0.2em] ${mutedCls} hover:text-black transition-colors`}>Создать новый</button>
              </div>
            </div>
          )}

          {stage === "idle" && (
            <button
              onClick={generateGif} 
              disabled={images.length < 2}
              className={`
                w-full py-6 rounded-full font-unbounded font-black text-xl transition-all duration-500
                ${images.length >= 2 
                  ? "bg-black text-white shadow-2xl hover:-translate-y-1 active:scale-95" 
                  : "bg-slate-100 dark:bg-white/5 text-slate-300 cursor-not-allowed"}
              `}
            >
              {ctaLabel}
            </button>
          )}

          {stage === "error" && (
            <div className="p-6 rounded-3xl bg-red-50 text-red-500 text-center font-bold border border-red-100">
              {errorMsg}
            </div>
          )}
        </div>

      </main>
    </>
  );
}
