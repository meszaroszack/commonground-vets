import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1C2826",
          color: "#FBF9F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          letterSpacing: -0.5,
        }}
      >
        CG
      </div>
    ),
    size,
  );
}
