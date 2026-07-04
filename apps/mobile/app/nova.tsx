import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme/use-theme";

// Nova transação — sobe como modal (FAB central). Neste incremento é um
// placeholder; a próxima fatia traz o form (toggle Saída/Entrada, teclado
// numérico, categoria em sub-sheet) escrevendo via POST /transactions.
export default function NovaScreen() {
  const { palette } = useTheme();
  return (
    <Screen padded bottomInset>
      {/* Grabber */}
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <View
          style={{ width: 40, height: 5, borderRadius: 9999, backgroundColor: palette.border }}
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Txt variant="title">Nova transação</Txt>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={palette.textSecondary} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Ionicons name="construct-outline" size={40} color={palette.textTertiary} />
        <Txt variant="bodyMedium" style={{ textAlign: "center" }}>
          Registro manual em construção
        </Txt>
        <Txt
          variant="small"
          color={palette.textTertiary}
          style={{ textAlign: "center", maxWidth: 260 }}
        >
          Por enquanto, registre seus gastos direto no WhatsApp — eles aparecem
          aqui na hora. O formulário completo chega na próxima atualização.
        </Txt>
      </View>

      <Button label="Fechar" variant="outline" onPress={() => router.back()} />
    </Screen>
  );
}
