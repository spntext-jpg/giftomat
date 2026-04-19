"use client";

import { useState, useRef, useEffect } from "react";
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
  const [isDesktop, setIsDesktop] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkSize = () => setIsDesktop(window.innerWidth >= 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

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
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0C', color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: '"Unbounded", sans-serif', overflowX: 'hidden' }}>
      <Script src="/gif.js" strategy="beforeInteractive" />
      
      <style dangerouslySetInnerHTML={{__html: `
        .bit-range { -webkit-appearance: none; width: 100%; height: 12px; background: #1A1A1E !important; border-radius: 6px; outline: none; margin: 20px 0; }
        .bit-range::-webkit-slider-thumb { 
          -webkit-appearance: none; width: 36px; height: 36px; background: #A169F7 !important; 
          border-radius: 12px; cursor: pointer; border: 4px solid #0A0A0C !important; 
          box-shadow: 0 0 25px rgba(161,105,247,0.4);
        }
      `}} />

      {/* Header Container */}
      <header style={{ width: '100%', maxWidth: '1200px', padding: '40px 24px', textAlign: isDesktop ? 'left' : 'center' }}>
        <div style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', alignItems: 'center', gap: '24px' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: '#000', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(161,105,247,0.3)' }}>
            <span style={{ color: '#A169F7', fontSize: '36px', fontWeight: 900 }}>G</span>
          </div>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: 900, margin: 0 }}>Генератор GIF</h1>
            <p style={{ color: '#555', fontSize: '13px', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              С привкусом Балтики и приветом от Павлика
            </p>
          </div>
        </div>
      </header>

      {/* Main Content: Две колонки на десктопе */}
      <main style={{ 
        width: '100%', 
        maxWidth: '1200px', 
        padding: '0 24px 100px', 
        display: 'flex', 
        flexDirection: isDesktop ? 'row' : 'column', 
        gap: '40px',
        alignItems: 'flex-start'
      }}>
        
        {/* Левая колонка: Управление */}
        <div style={{ flex: '1', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Dropzone */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
            style={{
              width: '100%', minHeight: '300px', borderRadius: '48px', border: '2px dashed',
              borderColor: isDragging ? '#FF6B00' : 'rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px'
            }}
          >
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '1.5rem 3.5rem', borderRadius: '100px', backgroundColor: '#FF6B00', color: '#FFF',
                border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 900, boxShadow: '0 20px 40px rgba(255,107,0,0.3)'
              }}
            >
              Выбрать фото ✨
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && addFiles(e.target.files)} />
            <p style={{ fontSize: '12px', color: '#444', fontWeight: 700 }}>ИЛИ ПЕРЕТАЩИТЕ СЮДА</p>
          </div>

          {/* Settings */}
          {images.length > 0 && (
            <div style={{ padding: '40px', borderRadius: '40px', backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Скорость смены</span>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#A169F7' }}>{frameDuration.toFixed(1)}s</span>
              </div>
              <input
                type="range" min={0.1} max={4} step={0.1}
                value={frameDuration} onChange={(e) => setFrameDuration(Number(e.target.value))}
                className="bit-range"
              />
              <button
                onClick={generateGif}
                disabled={images.length < 2 || stage === "encoding"}
                style={{
                  width: '100%', padding: '1.5rem', borderRadius: '100px', border: 'none', fontWeight: 900, fontSize: '20px',
                  cursor: images.length >= 2 ? 'pointer' : 'not-allowed',
                  backgroundColor: images.length >= 2 ? '#FFF' : '#1A1A1E',
                  color: images.length >= 2 ? '#000' : '#444',
                  marginTop: '20px'
                }}
              >
                {stage === "encoding" ? `РЕНДЕРИНГ ${progress}%` : "СОЗДАТЬ GIF"}
              </button>
            </div>
          )}
        </div>

        {/* Правая колонка: Галерея и Результат */}
        <div style={{ flex: '1.5', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Result View */}
          {stage === "done" && gifUrl && (
            <div style={{ padding: '32px', borderRadius: '48px', background: '#111114', border: '1px solid #A169F7', textAlign: 'center' }}>
              <img 
                src={gifUrl} 
                style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '24px', marginBottom: '32px', backgroundColor: '#000' }} 
                alt="Result" 
              />
              <a 
                href={gifUrl} download="giftomat.gif"
                style={{ display: 'block', padding: '1.4rem', borderRadius: '100px', backgroundColor: '#A169F7', color: '#FFF', fontWeight: 900, textDecoration: 'none' }}
              >
                СКАЧАТЬ ГИФКУ 🚀
              </a>
            </div>
          )}

          {/* Gallery View */}
          {images.length > 0 && (
            <div style={{ padding: '32px', borderRadius: '48px', backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#444', textTransform: 'uppercase' }}>Выбрано кадров: {images.length}</span>
                <button onClick={() => setImages([])} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 900, cursor: 'pointer' }}>ОЧИСТИТЬ</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '12px' }}>
                {images.map((img) => (
                  <div key={img.id} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <button onClick={() => setImages(p => p.filter(i => i.id !== img.id))} style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', background: 'rgba(0,0,0,0.8)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length === 0 && (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222', border: '2px solid #111', borderRadius: '48px' }}>
              <p style={{ fontWeight: 900, fontSize: '24px' }}>ЖДЕМ ФОТОГРАФИИ...</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
