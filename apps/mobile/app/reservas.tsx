import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { StackHeader } from "@/components/ui/stack-header";
import { SkeletonList } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ReserveContributeSheet } from "@/components/reserve-contribute-sheet";
import { type Reserve, useReserves } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";
import { formatBRL, formatDateBR } from "@/lib/format";

function ReserveCard({ reserve, onGuardar }: { reserve: Reserve; onGuardar?: () => void }) {
  const { palette } = useTheme();
  const done = reserve.progress.percentage >= 100;
  const color = done ? accent.success : accent.primary;
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Txt variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
          {reserve.name}
        </Txt>
        <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }} color={color}>
          {Math.round(reserve.progress.percentage)}%
        </Txt>
      </View>
      <ProgressBar percentage={reserve.progress.percentage} color={color} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Txt variant="small" color={palette.textSecondary}>
          {formatBRL(reserve.savedAmount)} de {formatBRL(reserve.targetAmount)}
        </Txt>
        <Txt variant="small" color={palette.textTertiary}>
          até {formatDateBR(reserve.deadline)}
        </Txt>
      </View>
      {!done && reserve.progress.suggestedMonthly > 0 && (
        <Txt variant="small" color={palette.textTertiary}>
          Guarde {formatBRL(reserve.progress.suggestedMonthly)}/mês para chegar lá.
        </Txt>
      )}
      {!done && onGuardar && (
        <Button label="Guardar" variant="outline" fullWidth onPress={onGuardar} />
      )}
    </Card>
  );
}

export default function ReservasScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useReserves();
  const reserves = data ?? [];
  const active = reserves.filter((r) => r.active);
  const done = reserves.filter((r) => !r.active);
  const [contributing, setContributing] = useState<Reserve | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StackHeader title="Reservas" />
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
          {reserves.length === 0 ? (
            <Txt variant="small" color={palette.textTertiary}>
              Nenhuma reserva ainda. Crie objetivos de poupança no app web.
            </Txt>
          ) : (
            <>
              {active.map((r) => (
                <ReserveCard key={r.id} reserve={r} onGuardar={() => setContributing(r)} />
              ))}
              {done.length > 0 && (
                <>
                  <Txt variant="caption" color={palette.textTertiary} style={{ marginTop: 8 }}>
                    Concluídas
                  </Txt>
                  {done.map((r) => <ReserveCard key={r.id} reserve={r} />)}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
      <ReserveContributeSheet reserve={contributing} onClose={() => setContributing(null)} />
    </View>
  );
}
