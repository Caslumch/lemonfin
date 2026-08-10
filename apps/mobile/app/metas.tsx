import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackHeader } from "@/components/ui/stack-header";
import { SkeletonList } from "@/components/ui/skeleton";
import { AddButton } from "@/components/ui/add-button";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import { ProgressBar } from "@/components/ui/progress-bar";
import { GoalFormSheet } from "@/components/forms/goal-form-sheet";
import { type Goal, useGoals } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";
import { categoryIonicon } from "@/lib/category-icon";
import { formatBRL } from "@/lib/format";

function GoalCard({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const { palette } = useTheme();
  const p = goal.progress;
  const color = p.exceeded ? accent.danger : p.percentage >= 80 ? accent.warning : accent.primary;
  return (
    <Pressable onPress={onPress}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Ionicons name={categoryIonicon(goal.category?.name, goal.category?.icon)} size={18} color={palette.textSecondary} />
            <Txt variant="bodyMedium" numberOfLines={1}>
              {goal.category?.name ?? goal.name}
            </Txt>
          </View>
          <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }} color={color}>
            {Math.round(p.percentage)}%
          </Txt>
        </View>
        <ProgressBar percentage={p.percentage} color={color} />
        <Txt variant="small" color={palette.textSecondary}>
          {formatBRL(p.spent)} de {formatBRL(p.limit)}
        </Txt>
      </Card>
    </Pressable>
  );
}

export default function MetasScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useGoals();
  const goals = data ?? [];
  const [editing, setEditing] = useState<Goal | "new" | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StackHeader title="Metas" right={<AddButton onPress={() => setEditing("new")} />} />
      {isLoading ? (
        <View style={{ padding: 20, paddingTop: 4 }}>
          <SkeletonList />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent.primary} />}
        >
          <Txt variant="small" color={palette.textSecondary} style={{ marginBottom: 4 }}>
            Um teto de gasto por categoria pra não estourar o orçamento.
          </Txt>
          {goals.length === 0 ? (
            <Txt variant="small" color={palette.textTertiary}>
              Nenhuma meta ainda. Toque em + para criar.
            </Txt>
          ) : (
            goals.map((g) => <GoalCard key={g.id} goal={g} onPress={() => setEditing(g)} />)
          )}
        </ScrollView>
      )}
      <GoalFormSheet editing={editing} onClose={() => setEditing(null)} />
    </View>
  );
}
