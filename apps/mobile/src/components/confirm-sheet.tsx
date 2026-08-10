import { useEffect, useRef } from "react";
import { View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme/use-theme";

export interface ConfirmConfig {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

// Sheet de confirmação (substitui Alert.alert por algo consistente com o resto).
// Fica montado; abre quando `config` é setado.
export function ConfirmSheet({
  config,
  onClose,
}: {
  config: ConfirmConfig | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (config) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [config]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: palette.bg }}
      handleIndicatorStyle={{ backgroundColor: palette.border, width: 40 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
      )}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 20, gap: 12 }}>
        <Txt variant="title">{config?.title}</Txt>
        {config?.message ? (
          <Txt variant="body" color={palette.textSecondary}>
            {config.message}
          </Txt>
        ) : null}
        <View style={{ gap: 8, marginTop: 4 }}>
          <Button
            label={config?.confirmLabel ?? "Confirmar"}
            variant={config?.destructive ? "danger" : "primary"}
            onPress={() => {
              config?.onConfirm();
              sheetRef.current?.close();
            }}
          />
          <Button label="Cancelar" variant="outline" onPress={() => sheetRef.current?.close()} />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
