import { useEffect, useMemo, useRef } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "./text";
import { Button } from "./button";
import { useTheme } from "@/theme/use-theme";

// Wrapper de formulário em bottom sheet (criar/editar). Header fixo + campos
// roláveis + RODAPÉ FIXO com os botões (salvar/excluir sempre visíveis).
export function FormSheet({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = "Salvar",
  submitDisabled,
  submitLoading,
  onDelete,
  deleteLoading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  onDelete?: () => void;
  deleteLoading?: boolean;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["90%"], []);

  useEffect(() => {
    if (open) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [open]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onClose={onClose}
      backgroundStyle={{ backgroundColor: palette.bg }}
      handleIndicatorStyle={{ backgroundColor: palette.border, width: 40 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
      )}
    >
      <View style={{ flex: 1 }}>
        {/* Header fixo */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 }}>
          <Txt variant="title">{title}</Txt>
          <Pressable onPress={() => sheetRef.current?.close()} hitSlop={10}>
            <Ionicons name="close" size={26} color={palette.textSecondary} />
          </Pressable>
        </View>

        {/* Campos roláveis */}
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>

        {/* Rodapé fixo com os botões */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: palette.border,
            backgroundColor: palette.bg,
          }}
        >
          <Button label={submitLabel} onPress={onSubmit} loading={submitLoading} disabled={submitDisabled} />
          {onDelete && (
            <Button label="Excluir" variant="danger" onPress={onDelete} loading={deleteLoading} />
          )}
        </View>
      </View>
    </BottomSheet>
  );
}
