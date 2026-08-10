import { useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { type Reserve, useContributeReserve } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { fonts } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

// Sheet de aporte numa reserva ("Guardar"). Fica montado; abre quando `reserve`
// é setado. Valor pelo teclado nativo (centavos).
export function ReserveContributeSheet({
  reserve,
  onClose,
}: {
  reserve: Reserve | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const contribute = useContributeReserve();
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (reserve) {
      setRaw("");
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [reserve]);

  const cents = Number(raw || "0");
  const amount = cents / 100;

  function save() {
    if (!reserve || amount <= 0) return;
    contribute.mutate(
      { id: reserve.id, amount },
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
        {/* Só monta o conteúdo quando aberto — senão o autoFocus abriria o
            teclado ao entrar na tela (o sheet fica montado, fechado). */}
        {reserve && (
          <>
            <Txt variant="title">Guardar</Txt>
            <Txt variant="small" color={palette.textSecondary}>
              {reserve.name}
            </Txt>
            <BottomSheetTextInput
              value={formatBRL(amount)}
              onChangeText={(t) => setRaw(t.replace(/\D/g, "").slice(0, 9))}
              keyboardType="number-pad"
              autoFocus
              style={{
                fontFamily: fonts.outfit,
                fontSize: 44,
                textAlign: "center",
                paddingVertical: 16,
                color: amount > 0 ? palette.text : palette.textTertiary,
              }}
            />
            <Button label="Guardar" onPress={save} loading={contribute.isPending} disabled={amount <= 0 || contribute.isPending} />
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
