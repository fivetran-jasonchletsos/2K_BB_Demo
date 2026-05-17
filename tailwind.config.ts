import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0B",
        surface: "#14141A",
        surface2: "#1C1C24",
        line: "#26262F",
        ink: "#F5F5F7",
        muted: "#71717A",
        flame: "#FF3D00",
        flameDim: "#CC3000",
        ice: "#00E5FF",
        gold: "#FFD60A",
        lime: "#00E676",
        tierS: "#FFD60A",
        tierA: "#FF3D00",
        tierB: "#00E5FF",
        tierC: "#00E676",
        tierD: "#71717A",
      },
      fontFamily: {
        display: ['"Bebas Neue"', "Impact", "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)",
        glow: "0 0 0 1px rgba(255,61,0,0.4), 0 0 32px rgba(255,61,0,0.25)",
        glowIce: "0 0 0 1px rgba(0,229,255,0.4), 0 0 32px rgba(0,229,255,0.2)",
        glowGold: "0 0 0 1px rgba(255,214,10,0.5), 0 0 32px rgba(255,214,10,0.25)",
      },
      backgroundImage: {
        "court-grid":
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        "fade-bottom": "linear-gradient(180deg, transparent, rgba(10,10,11,1))",
        "flame-grad": "linear-gradient(135deg, #FF3D00 0%, #FFD60A 100%)",
        "ice-grad": "linear-gradient(135deg, #00E5FF 0%, #006BFF 100%)",
      },
      animation: {
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        marquee: "marquee 30s linear infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,61,0,0.5)" },
          "50%": { boxShadow: "0 0 0 12px rgba(255,61,0,0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
