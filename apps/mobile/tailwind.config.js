/** @type {import('tailwindcss').Config} */
// NativeWind v4 usa Tailwind CSS v3 (o web usa v4 — são configs separadas de
// propósito). Tokens espelham design-system.md (LemonFin v1.0).
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#D4F400",
          hover: "#BDD900",
        },
        dark: {
          DEFAULT: "#1A1A1A",
          deep: "#0D0D0D",
          soft: "#2D2D2D",
        },
        gray: {
          50: "#F9F9F9",
          100: "#F2F2F2",
          200: "#E5E5E5",
          400: "#9E9E9E",
          500: "#6B6B6B",
        },
        success: { DEFAULT: "#22C55E" },
        danger: { DEFAULT: "#EF4444" },
        warning: { DEFAULT: "#F59E0B" },
      },
      fontFamily: {
        // Carregadas em app/_layout.tsx via @expo-google-fonts.
        heading: ["Outfit_600SemiBold"],
        "heading-bold": ["Outfit_700Bold"],
        sans: ["DMSans_400Regular"],
        "sans-medium": ["DMSans_500Medium"],
        mono: ["JetBrainsMono_500Medium"],
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};
