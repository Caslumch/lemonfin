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
import { usePayInvoice } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";

export interface PayConfig {
  cardId: string;
  cycle: string;
  defaultCents: number;
}

export function InvoicePaySheet({
  config,
  onClose,
}: {
  config: PayConfig | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const pay = usePayInvoice();
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (config) {
      setRaw(String(config.defaultCents));
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [config]);

  const amount = Number(raw || "0") / 100;

  function submit() {
    if (!config || amount <= 0) return;
    pay.mutate(
      { cardId: config.cardId, cycle: config.cycle, amount },
      {
        onSuccess: () => sheetRef.current?.close(),
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
        <Txt variant="title">Pagar fatura</Txt>
        <AmountInput raw={raw} onChange={setRaw} autoFocus />
        <Button label="Pagar" onPress={submit} loading={pay.isPending} disabled={amount <= 0 || pay.isPending} />
      </BottomSheetView>
    </BottomSheet>
  );
}
