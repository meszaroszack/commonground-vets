import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        alabaster: "#FBF9F5",
        forest: "#1C2826",
        terracotta: "#D96B43",
        sage: "#4A7C59",
        sand: "#E6E1D6",
        clay: {
          DEFAULT: "#D96B43",
          deep: "#B8542F",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 40, 38, 0.04), 0 16px 40px rgba(28, 40, 38, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
