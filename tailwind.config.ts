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
        awok: {
          deep: "#0c0d10",
          panel: "#14161c",
          graphite: "#1a1d26",
          ember: "#ff6b2c",
          ember2: "#ff8a3d",
          gold: "#e8c547",
          goldsoft: "#c9a227",
          crimson: "#9b1c1c",
          crimsonglow: "#c42b2b",
          cream: "#f4f0e6",
          muted: "#9aa3b2",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(255, 107, 44, 0.35)",
        gold: "0 0 36px rgba(232, 197, 71, 0.28)",
        lift: "0 24px 48px rgba(0, 0, 0, 0.55)",
      },
      backgroundImage: {
        "fire-radial":
          "radial-gradient(circle at 20% 20%, rgba(255,107,44,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(232,197,71,0.2), transparent 40%)",
      },
    },
  },
  plugins: [],
};
export default config;
