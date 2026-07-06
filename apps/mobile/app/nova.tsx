import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SheetField } from "@/components/ui/sheet-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  type CreateTransactionInput,
  useCards,
  useCategories,
  useCreateTransaction,
  useUpdateTransaction,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

type TxType = "EXPENSE" | "INCOME";

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5, 6, 10, 12];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function dateLabel(d: Date): string {
  const diff = Math.round((startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return `${d.getDate()} ${MESES[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""}`;
}

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
    cardId?: string;
    date?: string;
  }>();
  const isEdit = !!params.id;

  const categories = useCategories();
  const cards = useCards();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const pending = create.isPending || update.isPending;

  const [raw, setRaw] = useState(params.cents ?? "");
  const [type, setType] = useState<TxType>(params.type === "INCOME" ? "INCOME" : "EXPENSE");
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId || null);
  const [description, setDescription] = useState(params.description ?? "");
  const [cardId, setCardId] = useState<string | null>(params.cardId || null);
  const [installments, setInstallments] = useState(1);
  const [date, setDate] = useState<Date>(params.date ? new Date(params.date) : new Date());

  const cents = Number(raw || "0");
  const amount = cents / 100;
  const isExpense = type === "EXPENSE";
  // Parcelamento só faz sentido criando uma saída no cartão.
  const showInstallments = !isEdit && isExpense && !!cardId;
  const parcelado = showInstallments && installments >= 2;
  const canSave = amount > 0 && !!categoryId && !pending;
  const isToday = startOfDay(date).getTime() >= startOfDay(new Date()).getTime();

  const cardList = cards.data ?? [];
  const close = () => sheetRef.current?.close();

  function shiftDate(days: number) {
    setDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + days);
      if (next.getTime() > Date.now()) return d; // não deixa ir pro futuro
      return next;
    });
  }

  function handleSave() {
    if (!canSave || !categoryId) return;
    const input: CreateTransactionInput = {
      amount,
      type,
      categoryId,
      description: description.trim() || undefined,
      date: date.toISOString(),
    };
    if (isExpense && cardId) {
      input.cardId = cardId;
      if (parcelado) input.installments = installments;
    } else if (isEdit) {
      input.cardId = null; // limpa o cartão na edição
    }
    const onDone = {
      onSuccess: () => close(),
      onError: (err: unknown) => Alert.alert("Não foi possível salvar", (err as Error).message),
    };
    if (isEdit && params.id) update.mutate({ id: params.id, input }, onDone);
    else create.mutate(input, onDone);
  }

  const label = useMemo(
    () => (isEdit ? "Salvar alterações" : isExpense ? "Salvar saída" : "Salvar entrada"),
    [isEdit, isExpense],
  );

  return (
    <View style={{ flex: 1 }}>
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={["92%"]}
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
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 2, paddingBottom: 10 }}>
            <Txt variant="title">{isEdit ? "Editar transação" : "Nova transação"}</Txt>
            <Pressable onPress={close} hitSlop={10}>
              <Ionicons name="close" size={26} color={palette.textSecondary} />
            </Pressable>
          </View>

          <BottomSheetScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 14 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SegmentedControl<TxType>
              value={type}
              onChange={setType}
              segments={[
                { key: "EXPENSE", label: "Saída" },
                { key: "INCOME", label: "Entrada" },
              ]}
            />

            {/* Valor */}
            <View>
              <Txt variant="caption" color={palette.textTertiary}>
                {parcelado ? "Valor total" : "Valor"}
              </Txt>
              <BottomSheetTextInput
                value={formatBRL(amount)}
                onChangeText={(t) => setRaw(t.replace(/\D/g, "").slice(0, 9))}
                keyboardType="number-pad"
                autoFocus
                selectionColor={palette.text}
                style={{
                  fontFamily: fonts.outfit,
                  fontSize: 40,
                  textAlign: "center",
                  paddingVertical: 12,
                  color: amount > 0 ? palette.text : palette.textTertiary,
                }}
              />
              {parcelado && amount > 0 && (
                <Txt variant="small" color={palette.textSecondary} style={{ textAlign: "center" }}>
                  {installments}x de {formatBRL(amount / installments)}
                </Txt>
              )}
            </View>

            <SheetField
              label="Descrição"
              value={description}
              onChangeText={setDescription}
              placeholder="Opcional (ex: mercado)"
            />

            {/* Categoria */}
            <View style={{ gap: 8 }}>
              <Txt variant="caption" color={palette.textTertiary}>Categoria</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(categories.data ?? []).map((c) => (
                  <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
                ))}
              </View>
            </View>

            {/* Cartão (só saída) */}
            {isExpense && (
              <View style={{ gap: 8 }}>
                <Txt variant="caption" color={palette.textTertiary}>Cartão</Txt>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Chip
                    label="Sem cartão"
                    active={!cardId}
                    onPress={() => {
                      setCardId(null);
                      setInstallments(1);
                    }}
                  />
                  {cardList.map((c) => (
                    <Chip key={c.id} label={c.name} active={cardId === c.id} onPress={() => setCardId(c.id)} />
                  ))}
                </View>
              </View>
            )}

            {/* Parcelas (só criando saída no cartão) */}
            {showInstallments && (
              <View style={{ gap: 8 }}>
                <Txt variant="caption" color={palette.textTertiary}>Parcelas</Txt>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {INSTALLMENT_OPTIONS.map((n) => (
                    <Chip
                      key={n}
                      label={n === 1 ? "À vista" : `${n}x`}
                      active={installments === n}
                      onPress={() => setInstallments(n)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Data */}
            <View style={{ gap: 8 }}>
              <Txt variant="caption" color={palette.textTertiary}>Data</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 6 }}>
                <Pressable onPress={() => shiftDate(-1)} hitSlop={8} style={{ padding: 8 }}>
                  <Ionicons name="chevron-back" size={20} color={palette.text} />
                </Pressable>
                <Txt variant="bodyMedium">{dateLabel(date)}</Txt>
                <Pressable onPress={() => shiftDate(1)} hitSlop={8} disabled={isToday} style={{ padding: 8, opacity: isToday ? 0.3 : 1 }}>
                  <Ionicons name="chevron-forward" size={20} color={palette.text} />
                </Pressable>
              </View>
            </View>
          </BottomSheetScrollView>

          {/* Rodapé fixo */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.bg }}>
            <Button label={label} onPress={handleSave} loading={pending} disabled={!canSave} />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
