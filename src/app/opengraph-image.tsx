import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "radial-gradient(circle at top left, rgba(212, 184, 114, 0.22), transparent 34%), linear-gradient(135deg, #fdfdfc 0%, #f4f3f0 100%)",
          color: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "56px 64px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 18,
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "linear-gradient(145deg, #2a3b4c, #3a5068)",
              borderRadius: 20,
              color: "#ffffff",
              display: "flex",
              fontFamily: "Playfair Display, serif",
              fontSize: 40,
              height: 72,
              justifyContent: "center",
              width: 72,
            }}
          >
            F
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 24, letterSpacing: 3, textTransform: "uppercase" }}>
              FYRK
            </span>
            <span style={{ color: "#5e6266", fontSize: 20 }}>
              Shared household planning with calmer weekly clarity
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 860 }}>
          <span style={{ color: "#2a3b4c", fontSize: 18, letterSpacing: 2, textTransform: "uppercase" }}>
            Private early access for Swedish households
          </span>
          <div
            style={{
              display: "flex",
              fontFamily: "Playfair Display, serif",
              fontSize: 72,
              lineHeight: 1.04,
            }}
          >
            Household money planning that feels calm, clear, and workable for both partners.
          </div>
          <div style={{ color: "#5e6266", display: "flex", fontSize: 26, lineHeight: 1.35 }}>
            Shared balances, weekly context, and upcoming decisions in one place.
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 18,
          }}
        >
          {["Shared overview", "Weekly context", "Major decisions"].map((label) => (
            <div
              key={label}
              style={{
                background: "#ffffff",
                border: "1px solid #eaeaea",
                borderRadius: 999,
                color: "#2a3b4c",
                display: "flex",
                fontSize: 22,
                padding: "14px 20px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
