import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #081a2d 0%, #0d2741 100%)",
          borderRadius: 18,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 44,
              height: 44,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              border: "2px solid rgba(255,255,255,0.88)",
              background: "linear-gradient(180deg, #9be2ff 0%, #ffe0c6 37%, #ff9348 55%, #1e6a9c 56%, #123f62 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 9,
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "radial-gradient(circle at 35% 35%, #fff4df 0%, #ffc486 45%, #ff9f43 78%)",
                boxShadow: "0 0 16px rgba(255,159,67,0.55)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 18,
                background: "linear-gradient(180deg, #2e80b4 0%, #154b71 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 11,
                width: 20,
                height: 8,
                borderRadius: 999,
                background: "linear-gradient(180deg, rgba(255,230,202,0.7) 0%, rgba(255,255,255,0.08) 100%)",
                opacity: 0.75,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 13,
                width: 34,
                height: 1,
                background: "rgba(255,255,255,0.55)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 10,
                width: 10,
                height: 5,
                borderTop: "1.5px solid rgba(8,26,45,0.58)",
                borderRadius: 999,
                transform: "rotate(-9deg)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 6,
                width: 10,
                height: 5,
                borderTop: "1.5px solid rgba(8,26,45,0.58)",
                borderRadius: 999,
                transform: "rotate(9deg)",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
