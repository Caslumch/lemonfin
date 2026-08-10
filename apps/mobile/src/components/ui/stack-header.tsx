import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "./text";
import { useTheme } from "@/theme/use-theme";

// Header de tela empilhada (Metas, Reservas, etc.): seta voltar + título.
export function StackHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 4,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        <Ionicons name="arrow-back" size={20} color={palette.text} />
      </Pressable>
      <Txt variant="title" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Txt>
      {right}
    </View>
  );
}
