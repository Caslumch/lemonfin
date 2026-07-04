import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { AddButton } from "@/components/ui/add-button";
import { CreditCardVisual } from "@/components/dashboard/credit-card-visual";
import { CardFormSheet } from "@/components/forms/card-form-sheet";
import { type Card, useCards } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

export default function CartoesScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useCards();
  const cards = data ?? [];
  const [editing, setEditing] = useState<Card | "new" | null>(null);

  return (
    <Screen padded>
      <View style={{ paddingTop: 8, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          <Txt variant="title">Cartões</Txt>
          <Txt variant="small" color={palette.textTertiary} style={{ marginTop: 2 }}>
            {cards.length} {cards.length === 1 ? "cartão" : "cartões"}
          </Txt>
        </View>
        <AddButton onPress={() => setEditing("new")} />
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
              Nenhum cartão cadastrado. Toque em + para adicionar.
            </Txt>
          ) : (
            cards.map((c) => (
              <Pressable key={c.id} onPress={() => setEditing(c)}>
                <CreditCardVisual card={c} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
      <CardFormSheet editing={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
