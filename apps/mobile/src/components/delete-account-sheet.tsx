import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SheetField } from "@/components/ui/sheet-field";
import { useDeleteAccount } from "@/hooks/use-financial-data";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/theme/use-theme";

// Exclusão de conta (LGPD): confirma a senha, chama a API e desloga (o gate
// redireciona para o login).
export function DeleteAccountSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const del = useDeleteAccount();
  const sheetRef = useRef<BottomSheet>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  function submit() {
    if (!password) return;
    del.mutate(password, {
      onSuccess: () => {
        sheetRef.current?.close();
        void signOut();
      },
      onError: (e) => Alert.alert("Não foi possível", (e as Error).message),
    });
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
      <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 20, gap: 14 }}>
        <Txt variant="title">Excluir conta</Txt>
        <Txt variant="body" color={palette.textSecondary}>
          Essa ação é permanente. Todos os seus dados — transações, cartões, metas,
          reservas, recorrentes — serão apagados e não poderão ser recuperados.
        </Txt>
        <SheetField
          label="Confirme sua senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <Button
          label="Excluir minha conta"
          variant="danger"
          onPress={submit}
          loading={del.isPending}
          disabled={!password || del.isPending}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}
