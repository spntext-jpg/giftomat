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
      const { width, height } = computeDimensions(loaded, 1000);
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
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0C', color: '#FFFFFF', display: 'flex', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <Script src="/gif.js" strategy="beforeInteractive" />
      
      {/* Принудительная стилизация тумблера BitGroqs */}
      <style dangerouslySetInnerHTML={{__html: `
        .bit-range { -webkit-appearance: none; width: 100%; height: 12px; background: #1A1A1E !important; border-radius: 6px; outline: none; margin: 20px 0; }
        .bit-range::-webkit-slider-thumb { 
          -webkit-appearance: none; width: 34px; height: 34px; background: #A169F7 !important; 
          border-radius: 12px; cursor: pointer; border: 4px solid #0A0A0C !important; 
          box-shadow: 0 0 20px rgba(161,105,247,0.5); transition: transform 0.2s;
        }
        .bit-range::-webkit-slider-thumb:hover { transform: scale(1.1); }
      `}} />

      {/* Фиксированный Layout для Desktop */}
      <main style={{ width: '100%', maxWidth: '560px', padding: '60px 24px', display: 'flex', flexDirection: 'column' }}>
        
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#000', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(161,105,247,0.2)' }}>
            <span style={{ color: '#A169F7', fontSize: '28px', fontWeight: 900 }}>G</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '8px' }}>Генератор GIF</h1>
          <p style={{ color: '#666', fontSize: '14px', fontWeight: 500 }}>BitGroqs Production Standards</p>
        </header>

        {/* Dropzone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
          style={{
            position: 'relative', width: '100%', minHeight: '280px', borderRadius: '40px', border: '2px dashed',
            borderColor: isDragging ? '#FF6B00' : 'rgba(255,255,255,0.1)',
            backgroundColor: isDragging ? 'rgba(255,107,0,0.05)' : 'rgba(255,255,255,0.02)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', transition: 'all 0.4s ease'
          }}
        >
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '1.2rem 3rem', borderRadius: '100px', backgroundColor: '#FF6B00', color: '#FFF',
              border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 900, boxShadow: '0 15px 30px rgba(255,107,0,0.3)', transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Загрузить фото ✨
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && addFiles(e.target.files)} />
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Или перетащите файлы</p>
        </div>

        {/* Gallery */}
        {images.length > 0 && (
          <div style={{ marginTop: '32px', padding: '24px', borderRadius: '32px', backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Кадры: {images.length}</span>
              <button onClick={() => setImages([])} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#EF4444', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>УДАЛИТЬ ВСЁ</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {images.map((img) => (
                <div key={img.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <button onClick={() => setImages(p => p.filter(i => i.id !== img.id))} style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', fontSize: '10px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Слайдер в стиле BitGroqs */}
        {images.length > 0 && (
          <div style={{ marginTop: '24px', padding: '32px', borderRadius: '32px', backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Скорость задержки</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#A169F7' }}>{frameDuration.toFixed(1)}s</span>
            </div>
            <input
              type="range" min={0.1} max={4} step={0.1}
              value={frameDuration} onChange={(e) => setFrameDuration(Number(e.target.value))}
              className="bit-range"
            />
          </div>
        )}

        {/* Actions & Result */}
        <div style={{ marginTop: '40px', marginBottom: '80px' }}>
          {stage === "encoding" && (
            <div style={{ padding: '40px', borderRadius: '40px', background: '#000', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
              <p style={{ fontWeight: 900, marginBottom: '20px', color: '#A169F7' }}>РЕНДЕРИНГ...</p>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#A169F7', width: `${progress}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {stage === "done" && gifUrl && (
            <div style={{ padding: '32px', borderRadius: '40px', background: '#111114', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <img 
                src={gifUrl} 
                style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '20px', marginBottom: '32px', backgroundColor: '#000' }} 
                alt="Result" 
              />
              <a 
                href={gifUrl} download="bitgroqs.gif"
                style={{ display: 'block', padding: '1.2rem', borderRadius: '100px', backgroundColor: '#FFF', color: '#000', fontWeight: 900, textDecoration: 'none', marginBottom: '16px' }}
              >
                СКАЧАТЬ GIF
              </a>
              <button onClick={() => setStage("idle")} style={{ background: 'none', border: 'none', color: '#444', fontWeight: 800, fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>Создать новую</button>
            </div>
          )}

          {stage === "idle" && (
            <button
              onClick={generateGif}
              disabled={images.length < 2}
              style={{
                width: '100%', padding: '1.5rem', borderRadius: '100px', border: 'none', fontWeight: 900, fontSize: '20px',
                cursor: images.length >= 2 ? 'pointer' : 'not-allowed',
                backgroundColor: images.length >= 2 ? '#FFF' : '#1A1A1E',
                color: images.length >= 2 ? '#000' : '#444',
                transition: 'all 0.3s ease'
              }}
            >
              СГЕНЕРИРОВАТЬ GIF
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
