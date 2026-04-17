"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Script from "next/script";
import { generateCrossfadeFrames, loadImage, computeDimensions } from "./lib/crossfade";
import { encodeGif } from "./lib/encoder";

type Stage = "idle" | "encoding" | "done" | "error";

interface UploadedImage {
  id: string;
  url: string;
  name: string;
}

export default function GiftomatPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [crossfadeSteps, setCrossfadeSteps] = useState(10);
  const [frameDelay, setFrameDelay] = useState(120);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const newImages: UploadedImage[] = imageFiles.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(f),
      name: f.name,
    }));
    setImages((prev) => [...prev, ...newImages]);
    setGifUrl(null);
    setStage("idle");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
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

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    setErrorMsg("");

    try {
      const htmlImages = await Promise.all(images.map((img) => loadImage(img.url)));
      const { width, height } = computeDimensions(htmlImages);

      let allFrames: ImageData[] = [];
      for (let i = 0; i < htmlImages.length; i++) {
        const a = htmlImages[i];
        const b = htmlImages[(i + 1) % htmlImages.length];
        const frames = generateCrossfadeFrames(a, b, width, height, crossfadeSteps);
        allFrames = [...allFrames, ...frames];
      }

      setProgress(10);

      const blob = await encodeGif(allFrames, frameDelay, width, height, (pct) => {
        setProgress(10 + Math.round(pct * 0.9));
      });

      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      setStage("done");
      setProgress(100);
    } catch (e) {
      setStage("error");
      setErrorMsg(e instanceof Error ? e.message : "Неизвестная ошибка");
    }
  };

  const canGenerate = images.length >= 2 && stage !== "encoding";

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />

      <main className="min-h-screen bg-[#121212] px-4 pb-32">
        {/* Header */}
        <header className="flex items-center justify-between py-8 max-w-4xl mx-auto">
          <div>
            <h1 className="text-4xl md:text-5xl font-unbounded font-black tracking-tighter" style={{ color: "#D4FF00" }}>
              Гифтомат
            </h1>
            <p className="text-sm font-inter text-white/40 mt-1 tracking-wide">
              GIF с кроссфейдом — прямо в браузере
            </p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: "#7000FF" }}>
            🎞
          </div>
        </header>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 p-10 text-center ${isDragging ? "border-[#7000FF] bg-[#7000FF]/10" : "border-white/15 hover:border-[#7000FF]/60 hover:bg-white/[0.02]"}`}
            style={{ background: isDragging ? undefined : "#1E1B24" }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl" style={{ background: "rgba(112,0,255,0.15)" }}>
                🖼
              </div>
              <div>
                <p className="font-unbounded font-bold text-xl text-white">Перетащите изображения сюда</p>
                <p className="font-inter text-white/40 text-sm mt-2">или нажмите для выбора файлов · PNG, JPG, WEBP</p>
              </div>
              <div className="px-5 py-2 rounded-full text-sm font-inter font-medium" style={{ background: "rgba(112,0,255,0.2)", color: "#B47AFF" }}>
                Минимум 2 изображения
              </div>
            </div>
          </div>

          {/* Image Gallery */}
          {images.length > 0 && (
            <div className="rounded-3xl p-6" style={{ background: "#1E1B24" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-unbounded font-bold text-sm text-white/60 uppercase tracking-wider">
                  Изображения · {images.length} шт.
                </p>
                <button onClick={() => { images.forEach((img) => URL.revokeObjectURL(img.url)); setImages([]); setGifUrl(null); setStage("idle"); }} className="text-xs font-inter text-white/30 hover:text-red-400 transition-colors">
                  Очистить всё
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative group">
                    <div className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-unbounded font-black" style={{ background: "#7000FF", color: "#D4FF00" }}>
                      {idx + 1}
                    </div>
                    <button onClick={() => removeImage(img.id)} className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/70 text-white text-xs hidden group-hover:flex items-center justify-center hover:bg-red-500 transition-colors">
                      ×
                    </button>
                    <div className="absolute bottom-1.5 left-0 right-0 z-10 hidden group-hover:flex justify-center gap-1">
                      {idx > 0 && (
                        <button onClick={() => moveImage(idx, idx - 1)} className="w-5 h-5 rounded bg-black/70 text-white text-xs flex items-center justify-center hover:bg-[#7000FF] transition-colors">←</button>
                      )}
                      {idx < images.length - 1 && (
                        <button onClick={() => moveImage(idx, idx + 1)} className="w-5 h-5 rounded bg-black/70 text-white text-xs flex items-center justify-center hover:bg-[#7000FF] transition-colors">→</button>
                      )}
                    </div>
                    <img src={img.url} alt={img.name} className="w-full aspect-square object-cover rounded-2xl border border-white/10" />
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-1 hover:border-[#7000FF]/60 transition-colors text-white/30 hover:text-[#7000FF]">
                  <span className="text-2xl">+</span>
                  <span className="text-[10px] font-inter">Добавить</span>
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="rounded-3xl p-6 space-y-6" style={{ background: "#1E1B24" }}>
            <p className="font-unbounded font-bold text-sm text-white/60 uppercase tracking-wider">Настройки анимации</p>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="font-inter text-white/80 text-sm">Плавность кроссфейда</label>
                <span className="font-unbounded font-black text-lg" style={{ color: "#D4FF00" }}>{crossfadeSteps}</span>
              </div>
              <input type="range" min={3} max={20} value={crossfadeSteps} onChange={(e) => setCrossfadeSteps(Number(e.target.value))} className="w-full" style={{ background: `linear-gradient(to right, #7000FF ${((crossfadeSteps - 3) / 17) * 100}%, #2D2A38 ${((crossfadeSteps - 3) / 17) * 100}%)` }} />
              <div className="flex justify-between text-xs text-white/25 font-inter mt-1"><span>Быстро</span><span>Очень плавно</span></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="font-inter text-white/80 text-sm">Задержка кадра</label>
                <span className="font-unbounded font-black text-lg" style={{ color: "#D4FF00" }}>{frameDelay}мс</span>
              </div>
              <input type="range" min={40} max={500} step={10} value={frameDelay} onChange={(e) => setFrameDelay(Number(e.target.value))} className="w-full" style={{ background: `linear-gradient(to right, #7000FF ${((frameDelay - 40) / 460) * 100}%, #2D2A38 ${((frameDelay - 40) / 460) * 100}%)` }} />
              <div className="flex justify-between text-xs text-white/25 font-inter mt-1"><span>Быстрее</span><span>Медленнее</span></div>
            </div>

            {images.length >= 2 && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(112,0,255,0.1)" }}>
                <span className="text-xl">📊</span>
                <p className="font-inter text-sm text-white/60">
                  Итого кадров: <span className="text-white font-medium">{images.length * (crossfadeSteps + 1)}</span> · Длительность ~<span className="text-white font-medium">{((images.length * (crossfadeSteps + 1) * frameDelay) / 1000).toFixed(1)}с</span>
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {stage === "error" && (
            <div className="rounded-3xl px-6 py-4 bg-red-500/10 border border-red-500/30">
              <p className="font-inter text-red-400 text-sm">⚠️ {errorMsg}</p>
            </div>
          )}

          {/* Progress */}
          {stage === "encoding" && (
            <div className="rounded-3xl p-6" style={{ background: "#1E1B24" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent spin-slow" style={{ borderColor: "#7000FF", borderTopColor: "transparent" }} />
                <p className="font-inter text-white/70 text-sm">Кодирование GIF... {progress}%</p>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #7000FF, #D4FF00)" }} />
              </div>
            </div>
          )}

          {/* Result */}
          {stage === "done" && gifUrl && (
            <div className="rounded-3xl p-6 space-y-4" style={{ background: "#1E1B24" }}>
              <p className="font-unbounded font-bold text-sm text-white/60 uppercase tracking-wider">Ваш GIF готов!</p>
              <img src={gifUrl} alt="Результат GIF" className="w-full rounded-2xl border border-white/10" style={{ maxHeight: "400px", objectFit: "contain" }} />
              <a href={gifUrl} download="giftomat.gif" className="flex items-center justify-center gap-3 w-full py-4 rounded-full font-unbounded font-black text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ background: "#D4FF00", color: "#121212" }}>
                ⬇ Скачать GIF
              </a>
              <button onClick={() => { setStage("idle"); setGifUrl(null); }} className="w-full py-3 rounded-full font-inter text-sm text-white/40 hover:text-white/70 transition-colors border border-white/10">
                Создать новый
              </button>
            </div>
          )}
        </div>

        {/* Floating CTA */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <button
            onClick={generateGif}
            disabled={!canGenerate}
            className={`pointer-events-auto px-10 py-5 rounded-full font-unbounded font-black text-lg shadow-2xl transition-all duration-300 ${canGenerate ? "hover:scale-105 active:scale-95 cursor-pointer" : "opacity-30 cursor-not-allowed"}`}
            style={{
              background: canGenerate ? "#D4FF00" : "#444",
              color: "#121212",
              boxShadow: canGenerate ? "0 8px 40px rgba(212,255,0,0.35)" : "none",
            }}
          >
            {stage === "encoding" ? (
              <span className="flex items-center gap-3">
                <span className="inline-block w-5 h-5 border-2 border-[#121212] border-t-transparent rounded-full spin-slow" />
                Генерация...
              </span>
            ) : "✨ Создать GIF"}
          </button>
        </div>
      </main>
    </>
  );
}
