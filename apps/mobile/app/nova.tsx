import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  useCategories,
  useCreateTransaction,
  useUpdateTransaction,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { fonts } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

type TxType = "EXPENSE" | "INCOME";

// Nova/editar transação num bottom sheet (gorhom). Valor pelo teclado NATIVO
// (number-pad), operando em centavos. Sem params → cria (POST); com `id` →
// edita (PATCH). Ambos invalidam caches.
export default function NovaScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const params = useLocalSearchParams<{
    id?: string;
    cents?: string;
    type?: string;
    categoryId?: string;
    description?: string;
  }>();
  const isEdit = !!params.id;

  const categories = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const pending = create.isPending || update.isPending;

  const [raw, setRaw] = useState(params.cents ?? "");
  const [type, setType] = useState<TxType>(params.type === "INCOME" ? "INCOME" : "EXPENSE");
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId || null);
  // Descrição preservada no modo edição (não editável neste sheet).
  const description = params.description ?? "";

  const cents = Number(raw || "0");
  const amount = cents / 100;
  const canSave = amount > 0 && !!categoryId && !pending;

  const close = () => sheetRef.current?.close();

  function handleSave() {
    if (!canSave || !categoryId) return;
    const onDone = {
      onSuccess: () => close(),
      onError: (err: unknown) =>
        Alert.alert("Não foi possível salvar", (err as Error).message),
    };
    const input = { amount, type, categoryId, description: description.trim() || undefined };
    if (isEdit && params.id) update.mutate({ id: params.id, input }, onDone);
    else create.mutate(input, onDone);
  }

  return (
    <View style={{ flex: 1 }}>
      <BottomSheet
        ref={sheetRef}
        index={0}
        enableDynamicSizing
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onClose={() => router.back()}
        backgroundStyle={{ backgroundColor: palette.bg }}
        handleIndicatorStyle={{ backgroundColor: palette.border, width: 40 }}
        backdropComponent={(p) => (
          <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
        )}
      >
        <BottomSheetView
          style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 20, gap: 8 }}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Txt variant="title">{isEdit ? "Editar" : "Nova transação"}</Txt>
            <Pressable onPress={close} hitSlop={10}>
              <Ionicons name="close" size={26} color={palette.textSecondary} />
            </Pressable>
          </View>

          <SegmentedControl<TxType>
            value={type}
            onChange={setType}
            segments={[
              { key: "EXPENSE", label: "Saída" },
              { key: "INCOME", label: "Entrada" },
            ]}
          />

          {/* Valor — teclado nativo (number-pad). value formatado é rederivado
              de `raw` a cada tecla, então append e ⌫ funcionam corretamente. */}
          <BottomSheetTextInput
            value={formatBRL(amount)}
            onChangeText={(t) => setRaw(t.replace(/\D/g, "").slice(0, 9))}
            keyboardType="number-pad"
            autoFocus
            selectionColor={palette.text}
            style={{
              fontFamily: fonts.outfit,
              fontSize: 46,
              textAlign: "center",
              paddingVertical: 20,
              color: amount > 0 ? palette.text : palette.textTertiary,
            }}
          />

          {/* Categoria */}
          <Txt variant="caption" color={palette.textTertiary} style={{ marginBottom: 8 }}>
            Categoria
          </Txt>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            style={{ marginBottom: 16, maxHeight: 48 }}
          >
            {(categories.data ?? []).map((c) => (
              <Chip
                key={c.id}
                label={`${c.icon ?? ""} ${c.name}`.trim()}
                active={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
          </ScrollView>

          <Button
            label={isEdit ? "Salvar alterações" : type === "EXPENSE" ? "Salvar saída" : "Salvar entrada"}
            onPress={handleSave}
            loading={pending}
            disabled={!canSave}
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
