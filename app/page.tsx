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

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function GiftomatPage() {
  // --- UI Стили (Professional Theme) ---
  const theme = {
    bg: "bg-[#F8FAFC]", // Очень легкий серый фон страницы
    card: "bg-white border border-slate-200 shadow-sm rounded-3xl",
    cardSub: "bg-slate-50 border border-slate-100 rounded-2xl",
    txt: "text-[#000000]", // African Turquoise (как основной текст)
    muted: "text-slate-500",
    accent: "#A169F7", // Violet Punk
    azure: "#00AAFF", // Bright Azure
    green: "#97CF26", // Atlantis Green
    red: "#FF6163",   // Light Red
  };

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
    setIos(detectIOS());
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
  }, []);

  const addFiles = useCallback((fileList: FileList) => {
    const valid = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
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

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    setErrorMsg("");

    try {
      const loaded = await Promise.all(images.map((img) => loadImage(img.url)));
      const { width, height } = computeDimensions(loaded, 1000); // 1000px max для четкости

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D context error");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const framesData: ImageData[] = loaded.map((img) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        const imgRatio = img.naturalWidth / img.naturalHeight;
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

      const blob = await encodeGif(framesData, frameDuration * 1000, width, height, (pct) => {
        setProgress(15 + Math.round(pct * 0.85));
      });

      setGifUrl(URL.createObjectURL(blob));
      setStage("done");
      setProgress(100);
    } catch (e) {
      setStage("error");
      setErrorMsg(e instanceof Error ? e.message : "Ошибка генерации");
    }
  };

  const ctaLabel = images.length === 0 ? "Загрузите фото" : images.length === 1 ? "Нужно еще одно" : "Создать GIF";

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />

      <main className={`min-h-screen ${theme.bg} ${theme.txt} flex flex-col items-center px-6 py-12 md:py-20 font-sans transition-colors duration-500`}>
        <div className="w-full max-w-xl">
          
          {/* Header */}
          <header className="flex flex-col items-center text-center mb-12">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
              style={{ background: theme.accent, color: 'white' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7h4"/><path d="M3 12h4"/><path d="M3 17h4"/><path d="M17 7h4"/><path d="M17 12h4"/><path d="M17 17h4"/>
              </svg>
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Генератор GIF</h1>
            <p className={theme.muted}>Профессиональное создание анимаций без потери качества</p>
          </header>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`
              cursor-pointer transition-all duration-300
              flex flex-col items-center justify-center gap-4 w-full h-56 px-8 text-center
              ${theme.card} border-dashed border-2
              ${isDragging ? "border-[#00AAFF] bg-[#00AAFF]/5 scale-[1.01]" : "border-slate-300 hover:border-slate-400"}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
               </svg>
            </div>
            <div>
              <p className="font-bold text-lg">Нажмите или перетащите</p>
              <p className={`text-sm ${theme.muted}`}>PNG, JPG, WEBP до 1000px</p>
            </div>
          </div>

          {/* Gallery */}
          {images.length > 0 && (
            <div className={`mt-8 p-6 ${theme.card}`}>
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Галерея ({images.length})</span>
                <button onClick={() => setImages([])} className="text-xs font-bold text-[#FF6163] hover:opacity-70 transition-opacity">Очистить</button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter(i => i.id !== img.id)); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/30 backdrop-blur-md rounded text-[9px] text-white font-bold">{idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {images.length > 0 && (
            <div className={`mt-6 p-8 ${theme.card}`}>
              <div className="flex justify-between items-center mb-6">
                <label className="font-bold text-sm uppercase tracking-wider">Скорость кадров</label>
                <span className="font-black text-xl" style={{ color: theme.accent }}>{frameDuration.toFixed(1)}с</span>
              </div>
              <input
                type="range" min={0.1} max={3} step={0.1}
                value={frameDuration}
                onChange={(e) => setFrameDuration(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#A169F7]"
              />
              <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase">
                <span>Быстро</span>
                <span>Медленно</span>
              </div>
            </div>
          )}

          {/* Stages (Encoding / Done / Error) */}
          <div className="mt-8">
            {stage === "encoding" && (
              <div className={`p-10 text-center ${theme.card}`}>
                <p className="font-bold mb-6">Создаем магию...</p>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-[#00AAFF] transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-2xl font-black text-[#00AAFF]">{progress}%</span>
              </div>
            )}

            {stage === "done" && gifUrl && (
              <div className={`p-8 text-center ${theme.card}`}>
                <div className={`inline-block p-4 ${theme.cardSub} mb-8`}>
                  <img src={gifUrl} alt="Result" className="max-h-[350px] rounded-lg shadow-lg" />
                </div>
                <div className="flex flex-col gap-4">
                  <a href={gifUrl} download="result.gif" className="w-full py-4 rounded-2xl font-bold text-white shadow-xl transition-transform active:scale-95" style={{ background: theme.accent }}>
                    Скачать GIF
                  </a>
                  <button onClick={() => setStage("idle")} className="text-sm font-bold text-slate-400 hover:text-black transition-colors">Создать заново</button>
                </div>
              </div>
            )}

            {stage === "error" && (
              <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-[#FF6163] text-center font-bold">
                {errorMsg}
              </div>
            )}

            {/* CTA Button */}
            {stage !== "encoding" && stage !== "done" && (
              <div className="flex flex-col items-center gap-4 mt-8">
                <button
                  onClick={generateGif}
                  disabled={images.length < 2}
                  className={`
                    w-full py-5 rounded-3xl font-black text-xl tracking-tight transition-all
                    ${images.length >= 2 
                      ? "bg-black text-white shadow-2xl shadow-black/20 hover:-translate-y-1 active:scale-95" 
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"}
                  `}
                >
                  {ctaLabel}
                </button>
                {images.length < 2 && <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Минимум 2 фотографии</p>}
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  );
}
