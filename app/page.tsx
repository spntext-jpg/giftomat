"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { loadImage, computeDimensions, imagesToCanvases } from "./lib/images";
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
  const mutedCls = "text-slate-400 dark:text-slate-500";
  const borderCol = "border-slate-200 dark:border-white/10";
  const txtCls = "text-black dark:text-white";
  
  const accentP = "#A169F7"; // Punk Violet
  const accentO = "#FF6B00"; // Vivid Orange
  const accentA = "#00AAFF"; // Progress Azure

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [frameDuration, setFrameDuration] = useState(0.5);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [ios, setIos] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ctaLabel = images.length === 0 ? "Загрузите фото" : images.length === 1 ? "Нужно еще одно" : "Создать GIF";

  useEffect(() => {
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

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
      // 1. Загрузка
      const loaded = await Promise.all(images.map((img) => loadImage(img.url)));
      // 2. Вычисление размеров
      const { width, height } = computeDimensions(loaded, 1000);
      // 3. Создание холстов (теперь это одна строка!)
      const processedCanvases = imagesToCanvases(loaded, width, height);

      // 4. Кодирование
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
      
      <main className="w-full max-w-xl px-6 py-16 md:py-24 font-inter mx-auto">
        
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
          style={{
            width: '100%',
            padding: '3.5rem 2rem',
            borderRadius: '44px',
            border: `2px dashed ${ios ? '#333' : '#E2E8F0'}`,
            backgroundColor: ios ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2.5rem',
            textAlign: 'center'
          }}
        >
          {/* Пухлая оранжевая кнопка (100% Inline Styles) */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem 3.5rem',
              borderRadius: '9999px',
              backgroundColor: accentO,
              color: '#FFFFFF',
              cursor: 'pointer',
              border: 'none',
              outline: 'none',
              fontSize: '1.125rem',
              fontWeight: 900,
              fontFamily: '"Unbounded", sans-serif',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)'; }}
          >
            {/* Glow Layer */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: accentO,
                borderRadius: '9999px',
                filter: 'blur(24px)',
                opacity: 0.6,
                zIndex: -1,
                transition: 'opacity 0.3s ease'
              }}
            />
            <span style={{ position: 'relative', zIndex: 10 }}>Загрузить фото ✨</span>
            {/* Shadow Layer */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: accentO,
                borderRadius: '9999px',
                boxShadow: '0 12px 44px -8px rgba(255,107,0,0.6)',
                zIndex: 1
              }}
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
                <div key={img.id} className={`relative aspect-square rounded-2xl overflow-hidden border ${borderCol} bg-slate-50 shadow-sm`}>
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                  <button onClick={() => setImages(p=>p.filter(i=>i.id!==img.id))} className="absolute top-1 right-1 w-5 h-5 bg-black/50 backdrop-blur-md text-white rounded-full text-[10px] flex items-center justify-center">✕</button>
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
                <a href={gifUrl} download="giftomat.gif" 
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1.25rem', borderRadius: '9999px',
                    backgroundColor: '#000', color: '#fff',
                    fontFamily: '"Unbounded", sans-serif', fontWeight: 900, fontSize: '1.125rem',
                    textDecoration: 'none',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
                  }}
                >
                  Скачать GIF
                </a>
                <button 
                  onClick={() => setStage("idle")} 
                  style={{
                    fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase',
                    letterSpacing: '0.2em', color: '#94A3B8', cursor: 'pointer',
                    background: 'none', border: 'none', padding: '0.5rem'
                  }}
                >
                  Создать новый
                </button>
              </div>
            </div>
          )}

          {stage === "idle" && (
            <button
              onClick={generateGif} 
              disabled={images.length < 2}
              style={{
                width: '100%',
                padding: '1.5rem',
                borderRadius: '9999px',
                fontFamily: '"Unbounded", sans-serif',
                fontWeight: 900,
                fontSize: '1.25rem',
                border: 'none',
                outline: 'none',
                cursor: images.length >= 2 ? 'pointer' : 'not-allowed',
                backgroundColor: images.length >= 2 ? '#000000' : (ios ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                color: images.length >= 2 ? '#FFFFFF' : '#94A3B8',
                boxShadow: images.length >= 2 ? '0 25px 50px -12px rgba(0,0,0,0.25)' : 'none',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { if (images.length >= 2) e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={(e) => { if (images.length >= 2) e.currentTarget.style.transform = 'translateY(0)'; }}
              onMouseDown={(e) => { if (images.length >= 2) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { if (images.length >= 2) e.currentTarget.style.transform = 'translateY(-4px)'; }}
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
