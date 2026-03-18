import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 2Bfit Brand Palette
        brand: {
          bg:        "#0A0A0A", // main background
          surface:   "#141414", // cards, sidebar
          elevated:  "#1A1A1A", // elevated surfaces
          border:    "#1F1F1F", // borders
          "border-light": "#2A2A2A",
          accent:    "#00FF87", // neon green — primary CTA
          "accent-dim":  "#00CC6A",
          "accent-glow": "rgba(0, 255, 135, 0.15)",
          text:      "#FFFFFF",
          "text-muted": "#888888",
          "text-dim":   "#555555",
          error:     "#FF4444",
          warning:   "#FFB800",
          info:      "#00C8FF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      animation: {
        "fade-in":  "fadeIn 0.2s ease-in-out",
        "slide-in": "slideIn 0.25s ease-out",
        "pulse-accent": "pulseAccent 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideIn: {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to:   { transform: "translateY(0)",    opacity: "1" },
        },
        pulseAccent: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,255,135,0)" },
          "50%":      { boxShadow: "0 0 16px 4px rgba(0,255,135,0.25)" },
        },
      },
      boxShadow: {
        "accent-sm": "0 0 12px rgba(0, 255, 135, 0.2)",
        "accent-md": "0 0 24px rgba(0, 255, 135, 0.3)",
        "surface":   "0 4px 24px rgba(0, 0, 0, 0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
