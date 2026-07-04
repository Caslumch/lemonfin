import { useEffect, useRef } from "react";
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

// Wrapper de formulário em bottom sheet (criar/editar). Fica montado; abre com
// `open`. Header com título + fechar, conteúdo scrollável, salvar e excluir.
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

  useEffect(() => {
    if (open) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [open]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
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
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 20, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Txt variant="title">{title}</Txt>
          <Pressable onPress={() => sheetRef.current?.close()} hitSlop={10}>
            <Ionicons name="close" size={26} color={palette.textSecondary} />
          </Pressable>
        </View>

        {children}

        <View style={{ gap: 8, marginTop: 4 }}>
          <Button label={submitLabel} onPress={onSubmit} loading={submitLoading} disabled={submitDisabled} />
          {onDelete && (
            <Button label="Excluir" variant="danger" onPress={onDelete} loading={deleteLoading} />
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
