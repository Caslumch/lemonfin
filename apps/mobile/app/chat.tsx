import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { useTheme } from "@/theme/use-theme";
import { accent, radii } from "@/theme/tokens";

// Chat do "Limão" — tela empilhada sobre a Home (§7 do DS). Chrome visual
// pronto; o streaming SSE contra /chat/completions entra no próximo incremento.
function Bubble({ me, children }: { me?: boolean; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        alignSelf: me ? "flex-end" : "flex-start",
        maxWidth: "82%",
        backgroundColor: me ? accent.primary : palette.surface,
        borderWidth: me ? 0 : 1,
        borderColor: palette.border,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: me ? 18 : 5,
        borderBottomRightRadius: me ? 5 : 18,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <Txt variant="small" color={me ? "#0D0D0D" : palette.text}>
        {children}
      </Txt>
    </View>
  );
}

export default function ChatScreen() {
  const { palette } = useTheme();

  return (
    <Screen bottomInset>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
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
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: accent.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles" size={18} color="#0D0D0D" />
        </View>
        <View>
          <Txt variant="bodyMedium">Limão</Txt>
          <Txt variant="small" color={accent.success}>
            ● Online
          </Txt>
        </View>
      </View>

      {/* Mensagens */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Bubble>Oi! 🍋 Sou o Limão. Em breve vou responder suas perguntas sobre gastos, metas e registrar transações por aqui.</Bubble>
      </ScrollView>

      {/* Input (desabilitado neste incremento) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          paddingHorizontal: 14,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: palette.border,
          backgroundColor: palette.surface,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: palette.surfaceElevated,
            borderRadius: radii.full,
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        >
          <Txt variant="small" color={palette.textTertiary}>
            Chat em breve…
          </Txt>
        </View>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: accent.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.5,
          }}
        >
          <Ionicons name="send" size={18} color="#0D0D0D" />
        </View>
      </View>
    </Screen>
  );
}
