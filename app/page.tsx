"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { loadImage, computeDimensions, imagesToImageData } from "./lib/images";
import { encodeGif } from "./lib/encoder";

type Stage = "idle" | "encoding" | "done" | "error";

interface UploadedImage {
  id: string;
  name: string;
  url: string;
}

export default function GiftomatPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [frameDuration, setFrameDuration] = useState(0.5);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  
  // Состояния для UI
  const [ios, setIos] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
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
      const loaded = await Promise.all(images.map((img) => loadImage(img.url)));
      const { width, height } = computeDimensions(loaded, 1000);
      
      // Получаем сырые пиксели (ImageData) вместо холстов
      const framesData = imagesToImageData(loaded, width, height);
      const blob = await encodeGif(framesData, frameDuration * 1000, (pct) => setProgress(pct));

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

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />
      
      {/* Стили для кастомного ползунка (BitGroqs Style) */}
      <style dangerouslySetInnerHTML={{__html: `
        .bg-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; outline: none; }
        .bg-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #A169F7; cursor: pointer; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: transform 0.1s; }
        .bg-slider::-webkit-slider-thumb:active { transform: scale(1.15); }
        .dark .bg-slider::-webkit-slider-thumb { border-color: #111114; }
      `}} />

      {/* Обертка с гарантированным темным/светлым фоном */}
      <div className="min-h-screen bg-white dark:bg-[#0A0A0C] text-black dark:text-white transition-colors duration-300">
        <main className="w-full max-w-xl px-6 py-16 md:py-24 font-inter mx-auto">
          
          <header className="flex flex-col items-center text-center mb-16">
            <div className="w-16 h-16 rounded-[22px] bg-black flex items-center justify-center mb-6 shadow-xl border border-white/5 shadow-purple-500/10">
              <span className="font-unbounded font-black text-2xl" style={{ color: "#A169F7" }}>G</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Генератор GIF</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Профессиональный стандарт качества</p>
          </header>

          {/* Drop Zone: Теперь реагирует на drag и корректно работает в темной теме */}
          <div 
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            className={`
              w-full py-16 px-8 rounded-[44px] flex flex-col items-center gap-8 text-center transition-all duration-300 border-2 border-dashed
              ${isDragging 
                ? "border-[#FF6B00] bg-[#FF6B00]/5 scale-[1.02]" 
                : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
              }
            `}
          >
            {isDragging ? (
              <div className="w-20 h-20 rounded-full bg-[#FF6B00]/20 flex items-center justify-center animate-pulse">
                <svg className="w-10 h-10 text-[#FF6B00]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1.25rem 3.5rem', borderRadius: '9999px', backgroundColor: '#FF6B00', color: '#FFFFFF',
                  cursor: 'pointer', border: 'none', outline: 'none', fontSize: '1.125rem', fontWeight: 900,
                  fontFamily: '"Unbounded", sans-serif', transition: 'transform 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)'; }}
              >
                <div style={{ position: 'absolute', inset: 0, background: '#FF6B00', borderRadius: '9999px', filter: 'blur(24px)', opacity: 0.6, zIndex: -1 }} />
                <span style={{ position: 'relative', zIndex: 10 }}>Загрузить фото ✨</span>
                <div style={{ position: 'absolute', inset: 0, background: '#FF6B00', borderRadius: '9999px', boxShadow: '0 12px 44px -8px rgba(255,107,0,0.6)', zIndex: 1 }} />
              </button>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
            
            <div className={isDragging ? "opacity-0" : "opacity-100 transition-opacity"}>
              <p className="font-unbounded font-bold text-sm mb-1 text-black dark:text-white">Или перетащите файлы</p>
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400 dark:text-slate-500">JPG · PNG · WEBP</p>
            </div>
          </div>

          {/* Gallery Preview */}
          {images.length > 0 && (
            <div className="mt-10 p-7 rounded-[32px] bg-white dark:bg-[#111114] border border-slate-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Кадры · {images.length}</span>
                {/* Исправленная кнопка "Удалить всё" */}
                <button 
                  onClick={() => setImages([])} 
                  className="px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider text-[10px] rounded-full hover:bg-red-500/20 transition-colors"
                >
                  Удалить всё
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 shadow-sm group">
                    <img src={img.url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt="" />
                    <button onClick={() => setImages(p=>p.filter(i=>i.id!==img.id))} className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-md text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">✕</button>
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[9px] text-white font-bold">{idx + 1}</div>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 text-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">+</button>
              </div>
            </div>
          )}

          {/* Speed Settings (BitGroqs Style Slider) */}
          {images.length > 0 && (
            <div className="mt-6 p-8 rounded-[32px] bg-white dark:bg-[#111114] border border-slate-100 dark:border-white/5 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <label className="font-unbounded font-bold text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">Скорость смены</label>
                <span className="font-unbounded font-black text-xl" style={{ color: "#A169F7" }}>{frameDuration.toFixed(1)}с</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="range" min={0.1} max={5} step={0.1}
                  value={frameDuration} onChange={(e)=>setFrameDuration(Number(e.target.value))}
                  className="bg-slider bg-slate-100 dark:bg-white/10"
                  style={{
                    background: `linear-gradient(to right, #A169F7 ${((frameDuration - 0.1) / 4.9) * 100}%, transparent ${((frameDuration - 0.1) / 4.9) * 100}%)`
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Button & Results */}
          <div className="mt-10">
            {stage === "encoding" && (
              <div className="p-10 text-center rounded-[40px] bg-white dark:bg-[#111114] border-2 border-dashed border-slate-200 dark:border-white/10">
                <p className="font-unbounded font-bold mb-6 text-sm text-black dark:text-white">Сборка сырых пикселей...</p>
                <div className="w-full h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                  <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: "#00AAFF" }} />
                </div>
                <p className="font-unbounded font-black text-2xl mt-5" style={{ color: "#00AAFF" }}>{progress}%</p>
              </div>
            )}

            {stage === "done" && gifUrl && (
              <div className="p-8 text-center rounded-[40px] bg-white dark:bg-[#111114] shadow-2xl border border-slate-100 dark:border-white/5">
                <div className="rounded-3xl overflow-hidden mb-8 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40">
                  <img src={gifUrl} alt="Result" className="w-full max-h-[420px] object-contain mx-auto" />
                </div>
                <div className="flex flex-col gap-4">
                  <a href={gifUrl} download="giftomat.gif" 
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '1.25rem', borderRadius: '9999px',
                      backgroundColor: '#A169F7', color: '#fff',
                      fontFamily: '"Unbounded", sans-serif', fontWeight: 900, fontSize: '1.125rem',
                      textDecoration: 'none',
                      boxShadow: '0 10px 25px -5px rgba(161,105,247,0.4)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Скачать GIF
                  </a>
                  <button 
                    onClick={() => setStage("idle")} 
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-black dark:hover:text-white transition-colors py-2"
                  >
                    Собрать новый
                  </button>
                </div>
              </div>
            )}

            {stage === "idle" && (
              <button
                onClick={generateGif} 
                disabled={images.length < 2}
                style={{
                  width: '100%', padding: '1.5rem', borderRadius: '9999px',
                  fontFamily: '"Unbounded", sans-serif', fontWeight: 900, fontSize: '1.25rem',
                  border: 'none', outline: 'none',
                  cursor: images.length >= 2 ? 'pointer' : 'not-allowed',
                  backgroundColor: images.length >= 2 ? '#111114' : (ios ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                  color: images.length >= 2 ? '#FFFFFF' : '#94A3B8',
                  boxShadow: images.length >= 2 ? '0 20px 40px -10px rgba(0,0,0,0.3)' : 'none',
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
              <div className="p-6 rounded-3xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-center font-bold border border-red-100 dark:border-red-500/20">
                {errorMsg}
              </div>
            )}
          </div>

        </main>
      </div>
    </>
  );
}
