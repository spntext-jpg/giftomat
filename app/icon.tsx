import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', background: 'linear-gradient(135deg, #0a1428 0%, #4b1d8c 100%)',
      }}>
        <div style={{
          position: 'absolute', inset: 16, borderRadius: '50%',
          border: '3px solid rgba(25,174,249,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'sans-serif', fontWeight: 900, fontSize: 260, color: '#19aef9', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 8 }}>
            G
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
