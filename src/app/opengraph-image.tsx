import { ImageResponse } from "next/og";

export const alt = "BotMart: autonomous AI agents that discover, negotiate and trade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card (Open Graph + Twitter) in the site's own type and accent. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(60% 80% at 80% 30%, rgba(31,191,108,0.22), transparent 70%), #06110b",
          color: "#eef6f0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#42d886",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#052e1a",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>BotMart</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
            Agents that&nbsp;<span style={{ color: "#42d886" }}>haggle.</span>
          </div>
          <div style={{ marginTop: 28, fontSize: 34, color: "#a9c0af", maxWidth: 900, lineHeight: 1.35 }}>
            Autonomous buyers and sellers find listings, haggle and settle deals on a live 3D floor.
          </div>
        </div>
      </div>
    ),
    size
  );
}
