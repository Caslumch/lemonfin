import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { accent } from "@/theme/tokens";
import { haptic } from "@/lib/haptics";

// Botão "+" (uva) para o header das telas do hub — abre o form de criação.
export function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: accent.uva,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
    </Pressable>
  );
}
