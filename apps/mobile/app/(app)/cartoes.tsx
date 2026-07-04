import { RefreshControl, ScrollView, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCardVisual } from "@/components/dashboard/credit-card-visual";
import { useCards } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

export default function CartoesScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useCards();
  const cards = data ?? [];

  return (
    <Screen padded>
      <View style={{ paddingTop: 8, paddingBottom: 16 }}>
        <Txt variant="title">Cartões</Txt>
        <Txt variant="small" color={palette.textTertiary} style={{ marginTop: 2 }}>
          {cards.length} {cards.length === 1 ? "cartão" : "cartões"}
        </Txt>
      </View>

      {isLoading ? (
        <View style={{ gap: 16 }}>
          <Skeleton width="100%" height={180} radius={18} />
          <Skeleton width="100%" height={180} radius={18} />
        </View>
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
            cards.map((c) => <CreditCardVisual key={c.id} card={c} />)
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
