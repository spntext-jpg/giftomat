"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { loadImage, computeDimensions, imagesToImageData } from "./lib/images";
import { encodeGif } from "./lib/encoder";

export default function GiftomatPage() {
  const [images, setImages] = useState<{id: string, url: string}[]>([]);
  const [stage, setStage] = useState<"idle" | "encoding" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [frameDuration, setFrameDuration] = useState(0.5);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    try {
      const loaded = await Promise.all(images.map(img => loadImage(img.url)));
      const { width, height } = computeDimensions(loaded, 1000);
      const framesData = imagesToImageData(loaded, width, height);
      
      const blob = await encodeGif(framesData, frameDuration * 1000, width, height, (pct) => setProgress(pct));
      setGifUrl(URL.createObjectURL(blob));
      setStage("done");
    } catch (e) {
      setStage("error");
    }
  };

  const addFiles = (fileList: FileList) => {
    const newImgs = Array.from(fileList)
      .filter(f => f.type.startsWith("image/"))
      .map(f => ({ id: Math.random().toString(), url: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...newImgs]);
    setGifUrl(null);
    setStage("idle");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0C] text-black dark:text-white flex justify-center">
      <Script src="/gif.js" strategy="beforeInteractive" />
      
      {/* Custom Slider CSS (BitGroqs Standard) */}
      <style dangerouslySetInnerHTML={{__html: `
        .bit-slider { -webkit-appearance: none; width: 100%; height: 12px; background: #eee; border-radius: 6px; outline: none; }
        .dark .bit-slider { background: #1A1A1E; }
        .bit-slider::-webkit-slider-thumb { 
          -webkit-appearance: none; width: 28px; height: 28px; background: #A169F7; 
          border-radius: 8px; cursor: pointer; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(161,105,247,0.4);
        }
        .dark .bit-slider::-webkit-slider-thumb { border-color: #0A0A0C; }
      `}} />

      <main className="w-full max-w-xl px-6 py-16 flex flex-col">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center mb-12">
          <div className="w-16 h-16 rounded-[22px] bg-black flex items-center justify-center mb-6 shadow-2xl border border-white/5 shadow-purple-500/10">
            <span className="font-unbounded font-black text-2xl" style={{ color: "#A169F7" }}>G</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2 font-unbounded">Генератор GIF</h1>
          <p className="text-slate-400 text-sm font-medium">Professional Production Suite</p>
        </header>

        {/* Dropzone Area */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
          className={`
            relative w-full min-h-[320px] rounded-[48px] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-8
            ${isDragging ? "border-[#FF6B00] bg-[#FF6B00]/5" : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"}
          `}
        >
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.25rem 3.5rem', borderRadius: '9999px', backgroundColor: '#FF6B00', color: '#FFFFFF',
              cursor: 'pointer', border: 'none', outline: 'none', fontSize: '1.125rem', fontWeight: 900,
              fontFamily: '"Unbounded", sans-serif', transition: 'all 0.3s ease', zIndex: 10
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Загрузить фото ✨
            <div style={{ position: 'absolute', inset: 0, borderRadius: '9999px', boxShadow: '0 15px 35px rgba(255,107,0,0.4)', zIndex: -1 }} />
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          
          <div className="flex flex-col items-center">
            <p className="font-unbounded font-bold text-sm mb-1">Или просто перетащите сюда</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">RAW · JPG · PNG · WEBP</p>
          </div>
        </div>

        {/* Gallery */}
        {images.length > 0 && (
          <div className="mt-8 p-6 rounded-[32px] bg-slate-50 dark:bg-[#111114] border border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-unbounded font-bold uppercase tracking-widest text-slate-400">Кадры: {images.length}</span>
              <button 
                onClick={() => setImages([])} 
                className="px-4 py-2 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
              >
                Удалить всё
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 group">
                  <img src={img.url} className="w-full h-full object-cover" alt="" />
                  <button onClick={() => setImages(p => p.filter(i => i.id !== img.id))} className="absolute top-1 right-1 w-6 h-6 bg-black text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-300 text-xl">+</button>
            </div>
          </div>
        )}

        {/* Speed Slider (The Core Request) */}
        {images.length > 0 && (
          <div className="mt-6 p-8 rounded-[32px] bg-white dark:bg-[#111114] border border-slate-100 dark:border-white/5 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <label className="font-unbounded font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">Скорость задержки</label>
              <div className="px-4 py-1 bg-[#A169F7]/10 rounded-lg">
                <span className="font-unbounded font-black text-lg text-[#A169F7]">{frameDuration.toFixed(1)}с</span>
              </div>
            </div>
            <input
              type="range" min={0.1} max={3} step={0.1}
              value={frameDuration} onChange={(e) => setFrameDuration(Number(e.target.value))}
              className="bit-slider"
              style={{
                background: `linear-gradient(to right, #A169F7 0%, #A169F7 ${(frameDuration/3)*100}%, #eee ${(frameDuration/3)*100}%, #eee 100%)`
              }}
            />
          </div>
        )}

        {/* Final Action / Progress / Result */}
        <div className="mt-10">
          {stage === "encoding" && (
            <div className="p-10 rounded-[40px] bg-black text-white text-center shadow-2xl">
              <p className="font-unbounded font-black mb-6">Рендеринг потока данных...</p>
              <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#A169F7] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-4 font-unbounded text-2xl font-black text-[#A169F7]">{progress}%</p>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div className="p-8 rounded-[40px] bg-white dark:bg-[#111114] border border-slate-100 dark:border-white/5 shadow-2xl text-center">
              <img src={gifUrl} className="w-full rounded-2xl mb-8 border border-slate-200 dark:border-white/10 shadow-lg" alt="Result" />
              <div className="flex flex-col gap-4">
                <a 
                  href={gifUrl} download="giftomat.gif"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem',
                    borderRadius: '9999px', backgroundColor: '#000', color: '#fff',
                    fontFamily: '"Unbounded", sans-serif', fontWeight: 900, textDecoration: 'none',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                  }}
                >
                  Скачать готовую GIF
                </a>
                <button onClick={() => setStage("idle")} className="text-[10px] font-unbounded font-bold text-slate-400 uppercase tracking-widest">Создать новую</button>
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
                border: 'none', cursor: images.length >= 2 ? 'pointer' : 'not-allowed',
                backgroundColor: images.length >= 2 ? '#000' : '#F1F5F9',
                color: images.length >= 2 ? '#fff' : '#CBD5E1',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { if(images.length >= 2) e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {images.length < 2 ? "Нужно минимум 2 фото" : "Сгенерировать GIF"}
            </button>
          )}
        </div>

      </main>
    </div>
  );
}
