import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 320,
          background: '#000000', // African Turquoise
          color: '#A169F7', // Violet Punk
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '128px',
          fontFamily: 'sans-serif',
          fontWeight: 900,
          letterSpacing: '-0.05em',
        }}
      >
        G
      </div>
    ),
    { ...size }
  );
}
