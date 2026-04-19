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

function DownloadButton({ gifUrl, ios }: { gifUrl: string; ios: boolean }) {
  const btnClass = "inline-block px-10 py-4 rounded-full font-semibold text-white bg-[#A169F7] hover:bg-[#8e52ec] transition-colors";

  if (ios) {
    return (
      <div className="flex flex-col items-center gap-3">
        <a href={gifUrl} target="_blank" rel="noopener noreferrer" className={btnClass}>
          Открыть GIF
        </a>
        <p className="text-xs text-slate-500 text-center">
          Удерживайте изображение и выберите «Сохранить»
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <a href={gifUrl} download="giftomat.gif" className={btnClass}>
        Скачать GIF
      </a>
    </div>
  );
}

export default function GiftomatPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [frameDuration, setFrameDuration] = useState(1.0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const removeImage = (id: string) => {
    setImages((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((i) => i.id !== id);
    });
    setGifUrl(null);
    setStage("idle");
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
      // 1. Load images
      const loaded = await Promise.all(images.map((img) => loadImage(img.url)));
      const { width, height } = computeDimensions(loaded);

      // 2. Setup Canvas with high-quality rendering
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D context is not available");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // 3. Process each frame (Cover Crop Logic)
      const framesData: ImageData[] = loaded.map((img) => {
        // Fill white background to prevent alpha artifacts
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvRatio = width / height;
        
        let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
        
        if (imgRatio > canvRatio) {
          // Image is wider than canvas
          sw = img.naturalHeight * canvRatio;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          // Image is taller than canvas
          sh = img.naturalWidth / canvRatio;
          sy = (img.naturalHeight - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height);
      });

      setProgress(15);

      // 4. Encode directly (No crossfade)
      const delayMs = frameDuration * 1000;
      const blob = await encodeGif(framesData, delayMs, width, height, (pct) => {
        setProgress(15 + Math.round(pct * 0.85));
      });

      setGifUrl(URL.createObjectURL(blob));
      setStage("done");
      setProgress(100);
    } catch (e) {
      setStage("error");
      setErrorMsg(e instanceof Error ? e.message : "Неизвестная ошибка при создании GIF");
    }
  };

  const resetToIdle = () => {
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setGifUrl(null);
    setStage("idle");
    setProgress(0);
  };

  const canGenerate = images.length >= 2 && stage === "idle";
  const ctaLabel = images.length === 0 ? "Загрузите медиа" : images.length === 1 ? "Добавьте еще 1 файл" : "Создать анимацию";

  return (
    <>
      <Script src="/gif.js" strategy="beforeInteractive" />

      <main className="min-h-screen bg-white text-[#000000] flex flex-col items-center justify-center px-6 py-20 font-sans">
        <div className="w-full max-w-2xl">

          <header className="flex flex-col items-center text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              GIF Generator
            </h1>
            <p className="text-base text-slate-500">
              Профессиональный инструмент для создания плавных анимаций
            </p>
          </header>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`
              cursor-pointer rounded-2xl border-2 mb-10 transition-all duration-200
              flex flex-col items-center justify-center gap-4 w-full h-48 px-8 text-center
              ${isDragging ? "border-[#00AAFF] bg-[#00AAFF]/5 scale-[1.02]" : "border-slate-200 hover:border-slate-300 bg-slate-50"}
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
            <div className="pointer-events-none">
              <p className="font-semibold text-lg mb-1">
                Перетащите файлы сюда
              </p>
              <p className="text-sm text-slate-500">
                или нажмите для выбора (PNG, JPG, WEBP)
              </p>
            </div>
          </div>

          {images.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Очередь кадров ({images.length})
                </p>
                <button onClick={clearAll} className="text-sm text-[#FF6163] hover:text-red-700 font-medium">
                  Очистить
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center z-10 backdrop-blur-sm">
                      {idx + 1}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center shadow-sm hover:bg-slate-200"
                    >
                      ✕
                    </button>
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-8 mb-10 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <label className="font-medium text-slate-700">Длительность кадра (сек)</label>
                <span className="font-bold text-[#A169F7] text-lg">
                  {frameDuration.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={0.1} max={5} step={0.1}
                value={frameDuration}
                onChange={(e) => setFrameDuration(Number(e.target.value))}
                className="w-full accent-[#A169F7] cursor-pointer"
              />
            </div>
          )}

          {stage === "error" && (
            <div className="rounded-xl p-5 mb-8 bg-red-50 border border-[#FF6163]/30 text-center text-[#FF6163]">
              {errorMsg}
            </div>
          )}

          {stage === "encoding" && (
            <div className="rounded-2xl p-10 mb-8 text-center bg-slate-50 border border-slate-100">
              <p className="font-semibold text-lg mb-6">Обработка изображений...</p>
              <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200">
                <div
                  className="h-full bg-[#00AAFF] transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="font-bold text-xl text-[#00AAFF] mt-4">{progress}%</p>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div className="rounded-2xl p-8 mb-8 text-center bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-widest text-[#97CF26] mb-6">
                Рендер завершен
              </p>
              <div className="rounded-xl overflow-hidden border border-slate-200 mb-8 inline-block shadow-sm bg-white">
                <img
                  src={gifUrl}
                  alt="Результат"
                  style={{ maxHeight: "400px" }}
                  className="w-auto object-contain block mx-auto"
                />
              </div>
              <DownloadButton gifUrl={gifUrl} ios={ios} />
              <div className="mt-6">
                <button onClick={resetToIdle} className="text-slate-500 hover:text-[#000000] text-sm font-medium transition-colors">
                  Создать новый проект
                </button>
              </div>
            </div>
          )}

          {stage !== "encoding" && stage !== "done" && (
            <div className="flex justify-center pb-10">
              <button
                onClick={generateGif}
                disabled={!canGenerate}
                className={`
                  px-12 py-4 rounded-full font-bold text-lg transition-all
                  ${canGenerate 
                    ? "bg-[#000000] text-white hover:bg-slate-800 shadow-lg shadow-black/10" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }
                `}
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
