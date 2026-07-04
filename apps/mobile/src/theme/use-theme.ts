import { useColorScheme } from "nativewind";
import { type ColorScheme, type Palette, palettes } from "./tokens";

// Fonte única do tema em runtime. Segue a preferência do SISTEMA por padrão
// (NativeWind lê o Appearance). O override manual (Perfil) chama setColorScheme.
// Cores que MUDAM entre temas (surface/text/border) vêm daqui via `palette`;
// acentos invariantes (primary/success/danger) usam classes Tailwind.
export function useTheme(): {
  scheme: ColorScheme;
  palette: Palette;
  isDark: boolean;
  setScheme: (s: ColorScheme | "system") => void;
  toggle: () => void;
} {
  const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme();
  const scheme: ColorScheme = colorScheme === "dark" ? "dark" : "light";
  return {
    scheme,
    palette: palettes[scheme],
    isDark: scheme === "dark",
    setScheme: setColorScheme,
    toggle: toggleColorScheme,
  };
}
