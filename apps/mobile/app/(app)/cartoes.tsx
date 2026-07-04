import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { type Card, useCards } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts, radii } from "@/theme/tokens";

// Presets de cor do cartão (chave escolhida pelo usuário no web). Fallback: tom
// escuro neutro. Só cor sólida por enquanto (gradiente entra depois).
const PRESETS: Record<string, string> = {
  azul: "#1565C0",
  roxo: "#6A1B9A",
  verde: "#2E7D32",
  rosa: "#C2185B",
  laranja: "#E65100",
  preto: "#161616",
  grafite: "#2D2D2D",
};

function CardVisual({ card }: { card: Card }) {
  const bg = (card.colorPreset && PRESETS[card.colorPreset]) || "#1A1A1A";
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radii.xl,
        padding: 20,
        height: 180,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Txt style={{ fontFamily: fonts.outfitSemi, fontSize: 18 }} color="#F5F5F5">
          {card.name}
        </Txt>
        <Ionicons name="card" size={26} color="rgba(255,255,255,0.85)" />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Txt variant="caption" color="rgba(255,255,255,0.6)">
            {card.brand || "Cartão"}
          </Txt>
          <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }} color="#F5F5F5">
            Fecha dia {card.closingDay}
          </Txt>
        </View>
        {card.limit != null && (
          <View style={{ alignItems: "flex-end" }}>
            <Txt variant="caption" color="rgba(255,255,255,0.6)">
              Limite
            </Txt>
            <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }} color="#F5F5F5">
              R$ {Number(card.limit).toLocaleString("pt-BR")}
            </Txt>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CartoesScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useCards();
  const cards = data ?? [];

  return (
    <Screen padded>
      <View style={{ paddingTop: 8, paddingBottom: 16 }}>
        <Txt variant="title">Cartões</Txt>
      </View>

      {isLoading ? (
        <ActivityIndicator color={palette.text} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent.primary} />
          }
        >
          {cards.length === 0 ? (
            <Txt variant="small" color={palette.textTertiary}>
              Nenhum cartão cadastrado. Adicione seus cartões no app web.
            </Txt>
          ) : (
            cards.map((c) => <CardVisual key={c.id} card={c} />)
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
