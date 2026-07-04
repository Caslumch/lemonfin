import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { accent, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { Txt } from "./ui/text";

// Input fixo do assistente "Limão" na Home. No web é a bubble flutuante;
// aqui é uma barra com borda lima que abre o chat em tela cheia (§7 do DS).
export function LimaoInput() {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={() => router.push("/chat")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        backgroundColor: palette.surface,
        borderWidth: 1.5,
        borderColor: accent.primary,
        borderRadius: radii.lg,
        paddingVertical: 13,
        paddingHorizontal: 15,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: accent.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="sparkles" size={17} color="#0D0D0D" />
      </View>
      <Txt variant="small" color={palette.textTertiary}>
        Pergunte ao Limão…
      </Txt>
    </Pressable>
  );
}
