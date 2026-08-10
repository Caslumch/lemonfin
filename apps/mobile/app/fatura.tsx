import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { StackHeader } from "@/components/ui/stack-header";
import { SkeletonList } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TransactionRow } from "@/components/transaction-row";
import { InvoicePaySheet, type PayConfig } from "@/components/invoice-pay-sheet";
import { InvoiceReconcileSheet, type ReconcileConfig } from "@/components/invoice-reconcile-sheet";
import {
  type CardInvoice,
  useCardInvoice,
  useUndoInvoicePayment,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts, radii } from "@/theme/tokens";
import { formatBRL, formatDateBR } from "@/lib/format";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function cycleLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_PT[m - 1] ?? ""} ${y}`;
}
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function statusMeta(inv: CardInvoice, tertiary: string) {
  if (inv.paymentStatus === "paid") return { label: "Paga", color: accent.success };
  if (inv.paymentStatus === "partial") return { label: "Parcial", color: accent.warning };
  if (inv.cycleState === "open") return { label: "Aberta", color: accent.uva };
  if (inv.cycleState === "closed") return { label: "Fechada", color: accent.danger };
  return { label: "Futura", color: tertiary };
}

export default function FaturaScreen() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const cardId = params.id;
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data: inv, isLoading } = useCardInvoice(cardId, month);
  const undo = useUndoInvoicePayment();
  const [pay, setPay] = useState<PayConfig | null>(null);
  const [reconcileCfg, setReconcileCfg] = useState<ReconcileConfig | null>(null);

  const outstanding = inv ? Math.max(0, inv.total - inv.paid) : 0;
  const canPay = !!inv && inv.cycleState !== "future" && outstanding > 0;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StackHeader title={params.name || "Fatura"} />
      {isLoading || !inv ? (
        <View style={{ padding: 20, paddingTop: 4 }}>
          <SkeletonList />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Navegação de mês */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => setMonth(shiftMonth(inv.month, -1))} hitSlop={8} style={{ padding: 6 }}>
              <Ionicons name="chevron-back" size={22} color={palette.text} />
            </Pressable>
            <Txt variant="section" style={{ fontSize: 16 }}>{cycleLabel(inv.month)}</Txt>
            <Pressable onPress={() => setMonth(shiftMonth(inv.month, 1))} hitSlop={8} style={{ padding: 6 }}>
              <Ionicons name="chevron-forward" size={22} color={palette.text} />
            </Pressable>
          </View>

          {/* Resumo */}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <Txt variant="caption" color={palette.textTertiary}>Fatura</Txt>
                <Txt style={{ fontFamily: fonts.outfit, fontSize: 28 }}>{formatBRL(inv.total)}</Txt>
              </View>
              {(() => {
                const s = statusMeta(inv, palette.textTertiary);
                return (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full, backgroundColor: `${s.color}22` }}>
                    <Txt style={{ fontFamily: fonts.sansSemi, fontSize: 12 }} color={s.color}>{s.label}</Txt>
                  </View>
                );
              })()}
            </View>

            {inv.paid > 0 && (
              <>
                <ProgressBar percentage={(inv.paid / (inv.total || 1)) * 100} color={accent.success} />
                <Txt variant="small" color={palette.textSecondary}>
                  Pago {formatBRL(inv.paid)} de {formatBRL(inv.total)}
                </Txt>
              </>
            )}

            <View style={{ flexDirection: "row", gap: 20 }}>
              <View>
                <Txt variant="caption" color={palette.textTertiary}>Fechamento</Txt>
                <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }}>{formatDateBR(inv.closeDate)}</Txt>
              </View>
              {inv.dueDate && (
                <View>
                  <Txt variant="caption" color={palette.textTertiary}>Vencimento</Txt>
                  <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }}>{formatDateBR(inv.dueDate)}</Txt>
                </View>
              )}
            </View>

            {canPay && (
              <Button
                label="Pagar fatura"
                onPress={() => setPay({ cardId, cycle: inv.month, defaultCents: Math.round(outstanding * 100) })}
              />
            )}
            {inv.cycleState !== "future" && (
              <Button
                label="Conferir com o banco"
                variant="outline"
                onPress={() => setReconcileCfg({ cardId, cycle: inv.month, appTotalCents: Math.round(inv.total * 100) })}
              />
            )}
          </Card>

          {/* Pagamentos feitos (com desfazer) */}
          {inv.payments.length > 0 && (
            <Card style={{ gap: 4 }}>
              <Txt variant="caption" color={palette.textTertiary} style={{ marginBottom: 4 }}>Pagamentos</Txt>
              {inv.payments.map((p) => (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
                  <Txt variant="small">{formatDateBR(p.paidAt)}</Txt>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }} color={accent.success}>{formatBRL(p.amount)}</Txt>
                    <Pressable onPress={() => undo.mutate(p.id)} hitSlop={6} disabled={undo.isPending}>
                      <Txt variant="small" color={accent.danger}>Desfazer</Txt>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Transações do ciclo */}
          <Card>
            <Txt variant="section" style={{ fontSize: 16, marginBottom: 8 }}>Transações</Txt>
            {inv.transactions.length === 0 ? (
              <Txt variant="small" color={palette.textTertiary}>Nenhuma transação neste ciclo.</Txt>
            ) : (
              inv.transactions.map((tx, i) => (
                <TransactionRow key={tx.id} tx={tx} showDivider={i > 0} />
              ))
            )}
          </Card>
        </ScrollView>
      )}
      <InvoicePaySheet config={pay} onClose={() => setPay(null)} />
      <InvoiceReconcileSheet config={reconcileCfg} onClose={() => setReconcileCfg(null)} />
    </View>
  );
}
