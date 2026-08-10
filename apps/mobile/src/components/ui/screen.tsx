import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/use-theme";

// Container base de tela: safe-area no topo + fundo `bg` do tema.
export function Screen({
  children,
  padded = false,
  bottomInset = false,
}: {
  children: React.ReactNode;
  padded?: boolean; // padding horizontal padrão de tela (20px)
  bottomInset?: boolean; // aplica safe-area inferior (telas sem tab bar)
}) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        paddingTop: insets.top,
        paddingBottom: bottomInset ? insets.bottom : 0,
        paddingHorizontal: padded ? 20 : 0,
      }}
    >
      {children}
    </View>
  );
}
