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
  // --- Дизайн Токены (Strict B2B Modern) ---
  const surfaceCls = "bg-white dark:bg-[#1C1A22] border border-slate-100 dark:border-white/5 shadow-sm";
  const surfaceSubCls = "bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5";
  const mutedCls = "text-slate-500 dark:text-slate-400";
  const borderCol = "border-slate-200 dark:border-white/10";
  const txtCls = "text-[#000000] dark:text-white";
  const hintCls = "text-slate-400 dark:text-slate-500";
  
  const accentA = "#00AAFF"; // azure
  const accentP = "#A169F7"; // punk
  const accentO = "#FF6B00"; // vivid orange

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

      setProgress(15);
      const blob = await encodeGif(framesData, frameDuration * 1000, width, height, (pct) => {
        setProgress(15 + Math.round(pct * 0.85));
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
    const pct = ((val - 0.1) / (10 - 0.1)) * 100;
    const trackColor = ios ? '#2D2A38' : '#DDD6F5';
    return `linear-gradient(to right, ${accentP} ${pct}%, ${trackColor} ${pct}%)`;
  };

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />
      <div className="w-full max-w-xl font-inter mt-16 md:mt-24 px-6 pb-20">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center mb-16">
          <div 
            className="w-16 h-16 rounded-[40px] flex items-center justify-center mb-6 shadow-sm"
            style={{ background: '#000000' }}
          >
            <span className="font-unbounded font-black text-white text-3xl" style={{color: accentP}}>G</span>
          </div>
          <h1 className="text-4xl font-blacktracking-tight mb-2">Генератор GIF</h1>
          <p className={`${mutedCls}`}>Профессиональный инструмент для четких анимаций</p>
        </header>

        {/* Upload Container (Minimal Dropzone) */}
        <div 
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          onDragOver={(e) => e.preventDefault()}
          className={`
            w-full py-16 px-10 rounded-[2.5rem] ${surfaceSubCls} ${borderCol} border-2 border-dashed
            flex flex-col items-center gap-6 text-center shadow-inner
          `}
        >
          {/* Пухлая, оранжевая, парящая кнопка. Vivid Orange #FF6B00. */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`
              inline-block px-12 py-5 rounded-full 
              font-unbounded font-black text-white text-lg 
              transition-all duration-300 active:scale-95
              hover:-translate-y-1 hover:scale-[1.03]
              shadow-[0_8px_32px_-6px_rgba(255,107,0,0.5)]
              hover:shadow-[0_12px_48px_-10px_rgba(255,107,0,0.85)]
            `}
            style={{ background: accentO }}
          >
            Загрузить фото ✨
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <div>
            <p className={`font-unbounded font-bold text-base mb-1 ${txtCls}`}>Или перетащите сюда</p>
            <p className={`text-xs ${mutedCls}`}>PNG, JPG, WEBP до 1000px · минимум 2</p>
          </div>
        </div>

        {/* Gallery */}
        {images.length > 0 && (
          <div className={`mt-8 p-6 rounded-3xl ${surfaceCls}`}>
            <div className="flex items-center justify-between mb-5">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${mutedCls}`}>Галерея · {images.length}</span>
              <button onClick={() => setImages([])} className="text-xs font-bold text-[#FF6163] hover:opacity-70">Очистить</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <div key={img.id} className={`relative aspect-square rounded-xl overflow-hidden shadow-sm ${surfaceSubCls}`}>
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                  <button onClick={() => setImages(p=>p.filter(i=>i.id!==img.id))} className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/40 rounded text-[9px] text-white font-bold">{idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {images.length > 0 && (
          <div className={`mt-6 p-8 rounded-3xl ${surfaceCls}`}>
            <div className="flex justify-between items-center mb-6">
              <label className="font-bold text-sm tracking-wider uppercase">Скорость</label>
              <span className="font-black text-lg" style={{ color: accentP }}>{frameDuration.toFixed(1)}с</span>
            </div>
            <input
              type="range" min={0.1} max={5} step={0.1}
              value={frameDuration} onChange={(e)=>setFrameDuration(Number(e.target.value))}
              className="w-full accent-[#A169F7] cursor-pointer"
              style={{ background: sliderBg(frameDuration) }}
            />
          </div>
        )}

        {/* Processing Stages */}
        <div className="mt-8 flex flex-col gap-6">
          {stage === "encoding" && (
            <div className={`p-10 text-center rounded-3xl ${surfaceCls} shadow-lg`}>
              <p className="font-bold mb-6">Обработка изображений...</p>
              <div className={`w-full h-3 rounded-full overflow-hidden ${surfaceSubCls}`}>
                <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: accentA }} />
              </div>
              <p className="font-unbounded font-black text-2xl mt-4" style={{ color: accentA }}>{progress}%</p>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div className={`p-8 text-center rounded-3xl ${surfaceCls} shadow-xl`}>
              <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-6">Результат 🎉</p>
              <img src={gifUrl} alt="Result" className={`max-h-[360px] rounded-lg shadow-lg border ${borderCol} mb-8`} />
              <div className="flex flex-col gap-3">
                <a href={gifUrl} download="giftomat.gif" className="flex items-center justify-center py-5 rounded-full bg-[#000000] text-white font-unbounded font-black text-lg hover:bg-slate-800 active:scale-95 shadow-lg">
                  Скачать GIF
                </a>
                <button onClick={() => setStage("idle")} className={`text-sm font-bold ${mutedCls} hover:${txtCls} underline`}>Создать еще</button>
              </div>
            </div>
          )}

          {stage === "error" && (
            <div className="p-6 rounded-xl bg-red-50 border border-red-100 text-[#FF6163] text-center font-bold">
              {errorMsg}
            </div>
          )}

          {/* CTA */}
          {stage !== "encoding" && stage !== "done" && (
            <button
              onClick={generateGif} disabled={images.length < 2}
              className={`
                flex items-center justify-center w-full py-5 rounded-full font-unbounded font-black text-xl tracking-tight
                ${images.length>=2 ? "bg-black text-white hover:bg-slate-800 shadow-xl shadow-black/10 active:scale-95 transition-transform" : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"}
              `}
            >
              {ctaLabel}
            </button>
          )}
        </div>

      </div>
    </>
  );
}
