/** @type {import('tailwindcss').Config} */
// NativeWind v4 usa Tailwind CSS v3. darkMode 'class' → NativeWind sincroniza
// com o Appearance do sistema e permite override via setColorScheme.
// Só acentos INVARIANTES + fontes + raios ficam aqui; as cores de superfície/
// texto (que mudam por tema) vêm do hook useTheme (src/theme/tokens.ts).
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#D4F400", hover: "#BDD900", muted: "#D4F40020" },
        success: { DEFAULT: "#22C55E", muted: "#22C55E15" },
        danger: { DEFAULT: "#EF4444", muted: "#EF444415" },
        warning: { DEFAULT: "#F59E0B", muted: "#F59E0B15" },
        ink: "#0D0D0D", // preto do DS (card de saldo no tema claro)
      },
      fontFamily: {
        outfit: ["Outfit_700Bold"],
        "outfit-semi": ["Outfit_600SemiBold"],
        sans: ["DMSans_400Regular"],
        "sans-medium": ["DMSans_500Medium"],
        "sans-semi": ["DMSans_700Bold"],
        mono: ["JetBrainsMono_500Medium"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        sheet: "28px",
      },
    },
  },
  plugins: [],
};
