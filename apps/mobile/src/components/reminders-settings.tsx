import { Pressable, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import {
  useReminderSettings,
  useUpdateReminderSettings,
} from "@/hooks/use-financial-data";
import { ApiError } from "@/lib/api";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  first,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: palette.border,
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="bodyMedium">{label}</Txt>
        {hint ? (
          <Txt variant="small" color={palette.textTertiary}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: accent.primary, false: palette.muted }}
        thumbColor="#FFFFFF"
        style={{ transform: [{ scale: 0.85 }] }}
      />
    </View>
  );
}

export function RemindersSettings() {
  const { palette } = useTheme();
  const { data, isLoading, error } = useReminderSettings();
  const update = useUpdateReminderSettings();

  const premiumLocked = error instanceof ApiError && error.status === 402;

  function clampDays(n: number) {
    return Math.max(1, Math.min(7, n));
  }

  return (
    <View>
      <Txt variant="caption" color={palette.textTertiary} style={{ marginBottom: 8 }}>
        Lembretes e notificações
      </Txt>
      <Card style={{ paddingVertical: 6 }}>
        {premiumLocked ? (
          <Txt variant="small" color={palette.textSecondary}>
            Disponível no plano premium. Gerencie sua assinatura no site do LemonFin.
          </Txt>
        ) : isLoading || !data ? (
          <Txt variant="small" color={palette.textTertiary}>
            Carregando…
          </Txt>
        ) : (
          <>
            <ToggleRow
              label="Lembretes de vencimento"
              hint="Aviso antes de contas e faturas vencerem"
              value={data.billsEnabled}
              onChange={(v) => update.mutate({ billsEnabled: v })}
              first
            />
            {data.billsEnabled && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: palette.border,
                }}
              >
                <Txt variant="small" color={palette.textSecondary}>
                  Avisar com antecedência
                </Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Pressable
                    onPress={() => update.mutate({ daysBefore: clampDays(data.daysBefore - 1) })}
                    hitSlop={8}
                    disabled={data.daysBefore <= 1}
                    style={{ padding: 4, opacity: data.daysBefore <= 1 ? 0.3 : 1 }}
                  >
                    <Ionicons name="remove-circle-outline" size={22} color={palette.text} />
                  </Pressable>
                  <Txt variant="bodyMedium" style={{ minWidth: 62, textAlign: "center" }}>
                    {data.daysBefore} {data.daysBefore === 1 ? "dia" : "dias"}
                  </Txt>
                  <Pressable
                    onPress={() => update.mutate({ daysBefore: clampDays(data.daysBefore + 1) })}
                    hitSlop={8}
                    disabled={data.daysBefore >= 7}
                    style={{ padding: 4, opacity: data.daysBefore >= 7 ? 0.3 : 1 }}
                  >
                    <Ionicons name="add-circle-outline" size={22} color={palette.text} />
                  </Pressable>
                </View>
              </View>
            )}
            <ToggleRow
              label="Alertas de gastos"
              hint="Avisos proativos quando você gasta muito"
              value={data.alertsEnabled}
              onChange={(v) => update.mutate({ alertsEnabled: v })}
            />
            <ToggleRow
              label="Resumo diário"
              hint="Bom-dia com o consumo de ontem e do mês"
              value={data.dailySummaryEnabled}
              onChange={(v) => update.mutate({ dailySummaryEnabled: v })}
            />
          </>
        )}
      </Card>
    </View>
  );
}
