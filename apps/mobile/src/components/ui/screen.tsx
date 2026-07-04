import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Container base de tela: aplica safe-area no topo e o fundo cinza do design
// system. Uso: <Screen>...</Screen>.
export function Screen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-gray-50 ${className ?? ""}`}
      style={{ paddingTop: insets.top }}
    >
      {children}
    </View>
  );
}
