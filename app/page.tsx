"use client";

import { useState, useRef } from "react";
import Script from "next/script";
import { loadImage, computeDimensions, imagesToImageData } from "./lib/images";
import { encodeGif } from "./lib/encoder";

export default function GiftomatPage() {
  const [images, setImages] = useState<{id: string, url: string}[]>([]);
  const [stage, setStage] = useState<"idle" | "encoding" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [frameDuration, setFrameDuration] = useState(1.0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateGif = async () => {
    if (images.length < 2) return;
    setStage("encoding");
    setProgress(0);
    try {
      const loaded = await Promise.all(images.map(img => loadImage(img.url)));
      const { width, height } = computeDimensions(loaded, 1200);
      const framesData = imagesToImageData(loaded, width, height);
      const blob = await encodeGif(framesData, frameDuration * 1000, width, height, (pct) => setProgress(pct));
      setGifUrl(URL.createObjectURL(blob));
      setStage("done");
    } catch (e) { setStage("error"); }
  };

  const addFiles = (fileList: FileList) => {
    const newImgs = Array.from(fileList).filter(f => f.type.startsWith("image/")).map(f => ({ id: Math.random().toString(), url: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...newImgs]);
    setGifUrl(null);
    setStage("idle");
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0C', color: '#FFFFFF', display: 'flex', justifyContent: 'center', fontFamily: 'sans-serif', overflowX: 'hidden' }}>
      <Script src="/gif.js" strategy="beforeInteractive" />
      
      {/* Стили для тумблера и отзывчивой сетки */}
      <style dangerouslySetInnerHTML={{__html: `
        .bit-range { -webkit-appearance: none; width: 100%; height: 12px; background: #1A1A1E !important; border-radius: 6px; outline: none; margin: 20px 0; }
        .bit-range::-webkit-slider-thumb { 
          -webkit-appearance: none; width: 34px; height: 34px; background: #A169F7 !important; 
          border-radius: 12px; cursor: pointer; border: 4px solid #0A0A0C !important; 
          box-shadow: 0 0 20px rgba(161,105,247,0.5);
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .gallery-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1024px) {
          .gallery-grid { grid-template-columns: repeat(6, 1fr); }
        }
      `}} />

      {/* Main Layout Container - Теперь адаптивный */}
      <main style={{ width: '100%', maxWidth: '900px', padding: '60px 24px', display: 'flex', flexDirection: 'column' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ width: '72px', height: '72px', backgroundColor: '#000', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(161,105,247,0.2)' }}>
            <span style={{ color: '#A169F7', fontSize: '32px', fontWeight: 900 }}>G</span>
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '10px' }}>Генератор GIF</h1>
          <p style={{ color: '#555', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Giftomat Pro Engine</p>
        </header>

        {/* Dropzone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
          style={{
            position: 'relative', width: '100%', minHeight: '320px', borderRadius: '48px', border: '2px dashed',
            borderColor: isDragging ? '#FF6B00' : 'rgba(255,255,255,0.1)',
            backgroundColor: isDragging ? 'rgba(255,107,0,0.05)' : 'rgba(255,255,255,0.01)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', transition: 'all 0.4s ease'
          }}
        >
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '1.4rem 4rem', borderRadius: '100px', backgroundColor: '#FF6B00', color: '#FFF',
              border: 'none', cursor: 'pointer', fontSize: '20px', fontWeight: 900, boxShadow: '0 20px 40px rgba(255,107,0,0.3)', transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Загрузить фото ✨
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <p style={{ fontSize: '13px', fontWeight: 800, color: '#333', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Перетащите файлы в эту область</p>
        </div>

        {/* Gallery - Адаптивная сетка */}
        {images.length > 0 && (
          <div style={{ marginTop: '40px', padding: '32px', borderRadius: '40px', backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Количество кадров: {images.length}</span>
              <button onClick={() => setImages([])} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#EF4444', padding: '8px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, cursor: 'pointer' }}>Очистить всё</button>
            </div>
            <div className="gallery-grid">
              {images.map((img) => (
                <div key={img.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <button onClick={() => setImages(p => p.filter(i => i.id !== img.id))} style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', background: 'rgba(0,0,0,0.8)', color: '#fff', border: 'none', borderRadius: '50%', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Настройки (Слайдер) */}
        {images.length > 0 && (
          <div style={{ marginTop: '24px', padding: '40px', borderRadius: '40px', backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#555', textTransform: 'uppercase' }}>Задержка кадра</span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#A169F7' }}>{frameDuration.toFixed(1)}s</span>
            </div>
            <input
              type="range" min={0.1} max={4} step={0.1}
              value={frameDuration} onChange={(e) => setFrameDuration(Number(e.target.value))}
              className="bit-range"
            />
          </div>
        )}

        {/* Индикатор прогресса и результат */}
        <div style={{ marginTop: '48px', marginBottom: '100px' }}>
          {stage === "encoding" && (
            <div style={{ padding: '50px', borderRadius: '48px', background: '#000', textAlign: 'center', border: '1px solid rgba(161,105,247,0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
              <p style={{ fontWeight: 900, fontSize: '20px', marginBottom: '24px', color: '#A169F7', letterSpacing: '0.05em' }}>РЕНДЕРИНГ {progress}%</p>
              <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#A169F7', width: `${progress}%`, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div style={{ padding: '40px', borderRadius: '48px', background: '#111114', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
              <img 
                src={gifUrl} 
                style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '24px', marginBottom: '40px', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.05)' }} 
                alt="Result" 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
                <a 
                  href={gifUrl} download="giftomat.gif"
                  style={{ display: 'block', padding: '1.4rem', borderRadius: '100px', backgroundColor: '#FFF', color: '#000', fontWeight: 900, fontSize: '18px', textDecoration: 'none', boxShadow: '0 15px 30px rgba(255,255,255,0.1)' }}
                >
                  СКАЧАТЬ GIF
                </a>
                <button onClick={() => setStage("idle")} style={{ background: 'none', border: 'none', color: '#444', fontWeight: 800, fontSize: '13px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Создать ещё одну</button>
              </div>
            </div>
          )}

          {stage === "idle" && (
            <button
              onClick={generateGif}
              disabled={images.length < 2}
              style={{
                width: '100%', padding: '1.8rem', borderRadius: '100px', border: 'none', fontWeight: 900, fontSize: '22px',
                cursor: images.length >= 2 ? 'pointer' : 'not-allowed',
                backgroundColor: images.length >= 2 ? '#FFF' : '#1A1A1E',
                color: images.length >= 2 ? '#000' : '#333',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: images.length >= 2 ? '0 20px 40px rgba(255,255,255,0.1)' : 'none'
              }}
              onMouseEnter={(e) => { if(images.length >= 2) e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {images.length < 2 ? "ДОБАВЬТЕ ФОТО" : "СГЕНЕРИРОВАТЬ GIF"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
