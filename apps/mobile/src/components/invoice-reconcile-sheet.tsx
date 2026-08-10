import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import {
  type ReconcileResult,
  useReconcileInvoice,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { formatBRL } from "@/lib/format";

export interface ReconcileConfig {
  cardId: string;
  cycle: string;
  appTotalCents: number;
}

function resultAlert(r: ReconcileResult): [string, string] {
  if (r.status === "matched") {
    return ["Tudo certo ✅", `O total bate com o banco (${formatBRL(r.appTotal)}).`];
  }
  if (r.status === "adjusted") {
    return [
      "Ajuste lançado",
      `Faltavam ${formatBRL(r.difference ?? 0)}. Lançamos um ajuste na fatura pra bater com o banco.`,
    ];
  }
  return [
    "Confira duplicatas",
    `O app tem ${formatBRL(r.difference ?? 0)} a mais que o banco. Veja se algum lançamento está duplicado.`,
  ];
}

export function InvoiceReconcileSheet({
  config,
  onClose,
}: {
  config: ReconcileConfig | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const reconcile = useReconcileInvoice();
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (config) {
      setRaw(String(config.appTotalCents));
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [config]);

  const amount = Number(raw || "0") / 100;

  function submit() {
    if (!config || amount <= 0) return;
    reconcile.mutate(
      { cardId: config.cardId, cycle: config.cycle, informedTotal: amount },
      {
        onSuccess: (r) => {
          sheetRef.current?.close();
          Alert.alert(...resultAlert(r));
        },
        onError: (e) => Alert.alert("Não foi possível", (e as Error).message),
      },
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onClose={onClose}
      backgroundStyle={{ backgroundColor: palette.bg }}
      handleIndicatorStyle={{ backgroundColor: palette.border, width: 40 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
      )}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 20, gap: 12 }}>
        {config && (
          <>
            <Txt variant="title">Conferir fatura</Txt>
            <Txt variant="small" color={palette.textSecondary}>
              Digite o total da fatura como aparece no app do seu banco. Se faltar
              algum lançamento, criamos o ajuste automaticamente.
            </Txt>
            <AmountInput raw={raw} onChange={setRaw} autoFocus />
            <Button
              label="Conferir"
              onPress={submit}
              loading={reconcile.isPending}
              disabled={amount <= 0 || reconcile.isPending}
            />
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
