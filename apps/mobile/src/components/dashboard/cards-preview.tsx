import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Txt } from "@/components/ui/text";
import { type Card } from "@/hooks/use-financial-data";
import { accent, fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { CardStack } from "./card-stack";

// Container escuro "Meus Cartões" da Home (espelha o web): título + botão "+" em
// uva + pilha de cartões + "Ver todos".
export function CardsPreview({ cards }: { cards: Card[] }) {
  const { palette } = useTheme();

  return (
    <View style={{ backgroundColor: palette.surfaceAccent, borderRadius: radii.xl, padding: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <View>
          <Txt style={{ fontFamily: fonts.outfit, fontSize: 18 }} color={palette.onDark}>
            Meus Cartões
          </Txt>
          <Txt variant="small" color={palette.onDarkMuted}>
            {cards.length} {cards.length === 1 ? "cartão" : "cartões"}
          </Txt>
        </View>
        <Pressable
          onPress={() => router.navigate("/cartoes")}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: accent.uva, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {cards.length === 0 ? (
        <Pressable
          onPress={() => router.navigate("/cartoes")}
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            borderStyle: "dashed",
            borderRadius: 16,
            paddingVertical: 24,
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="card-outline" size={26} color={palette.onDarkMuted} />
          <Txt variant="small" color={palette.onDarkMuted}>
            Adicionar cartão
          </Txt>
        </Pressable>
      ) : (
        <CardStack cards={cards} />
      )}

      {cards.length > 1 && (
        <Pressable onPress={() => router.navigate("/cartoes")} style={{ alignItems: "center", marginTop: 14 }}>
          <Txt variant="small" color={palette.onDarkMuted}>
            Ver todos os cartões
          </Txt>
        </Pressable>
      )}
    </View>
  );
}
