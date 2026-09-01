import { useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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
  useUpdateInstallmentGroup,
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
  const { palette, isDark } = useTheme();
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
    installments?: string; // presente (>=2) → edição de grupo de parcelas
  }>();
  const isEdit = !!params.id;
  const groupInstallments = Number(params.installments ?? "0");
  const isGroupEdit = isEdit && groupInstallments >= 2;

  const categories = useCategories();
  const cards = useCards();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const updateGroup = useUpdateInstallmentGroup();
  const pending = create.isPending || update.isPending || updateGroup.isPending;

  const [raw, setRaw] = useState(params.cents ?? "");
  const [type, setType] = useState<TxType>(params.type === "INCOME" ? "INCOME" : "EXPENSE");
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId || null);
  const [description, setDescription] = useState(params.description ?? "");
  const [cardId, setCardId] = useState<string | null>(params.cardId || null);
  const [installments, setInstallments] = useState(isGroupEdit ? groupInstallments : 1);
  const [date, setDate] = useState<Date>(params.date ? new Date(params.date) : new Date());

  const cents = Number(raw || "0");
  const amount = cents / 100;
  const isExpense = type === "EXPENSE";
  // Parcelamento: ao criar saída no cartão, ou editando um grupo de parcelas.
  const showInstallments = isGroupEdit || (!isEdit && isExpense && !!cardId);
  const parcelado = showInstallments && installments >= 2;
  const canSave = amount > 0 && !!categoryId && !pending;
  const [showPicker, setShowPicker] = useState(false);

  const cardList = cards.data ?? [];
  const close = () => sheetRef.current?.close();

  // No Android o picker é um diálogo (fecha sozinho); no iOS é inline (fica até
  // o usuário tocar em "Pronto"). event.type === "dismissed" = cancelou.
  function onDateChange(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "set" && picked) setDate(picked);
  }

  function handleSave() {
    if (!canSave || !categoryId) return;
    const onDone = {
      onSuccess: () => close(),
      onError: (err: unknown) => Alert.alert("Não foi possível salvar", (err as Error).message),
    };

    // Edição de grupo de parcelas: recria as N parcelas com o total redividido.
    if (isGroupEdit && params.id) {
      if (installments < 2) {
        Alert.alert("Parcelas inválidas", "Uma compra parcelada precisa de 2 ou mais parcelas.");
        return;
      }
      updateGroup.mutate(
        {
          id: params.id,
          input: {
            amount, // total
            description: description.trim() || undefined,
            date: date.toISOString(),
            categoryId,
            cardId: cardId ?? null,
            installments,
          },
        },
        onDone,
      );
      return;
    }

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
            <Txt variant="title">
              {isGroupEdit ? "Editar parcelamento" : isEdit ? "Editar transação" : "Nova transação"}
            </Txt>
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
            {/* Grupo de parcelas é sempre saída — sem seletor de tipo. */}
            {!isGroupEdit && (
              <SegmentedControl<TxType>
                value={type}
                onChange={setType}
                segments={[
                  { key: "EXPENSE", label: "Saída" },
                  { key: "INCOME", label: "Entrada" },
                ]}
              />
            )}

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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                {(categories.data ?? []).map((c) => (
                  <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
                ))}
              </ScrollView>
            </View>

            {/* Cartão (só saída) */}
            {isExpense && (
              <View style={{ gap: 8 }}>
                <Txt variant="caption" color={palette.textTertiary}>Cartão</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
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
                </ScrollView>
              </View>
            )}

            {/* Parcelas (só criando saída no cartão) */}
            {showInstallments && (
              <View style={{ gap: 8 }}>
                <Txt variant="caption" color={palette.textTertiary}>Parcelas</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                  {/* Editando um grupo: mantém parcelado (sem "À vista"/1x). */}
                  {INSTALLMENT_OPTIONS.filter((n) => !isGroupEdit || n >= 2).map((n) => (
                    <Chip
                      key={n}
                      label={n === 1 ? "À vista" : `${n}x`}
                      active={installments === n}
                      onPress={() => setInstallments(n)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Data */}
            <View style={{ gap: 8 }}>
              <Txt variant="caption" color={palette.textTertiary}>Data</Txt>
              <Pressable
                onPress={() => setShowPicker((s) => !s)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }}
              >
                <Txt variant="bodyMedium">{dateLabel(date)}</Txt>
                <Ionicons name="calendar-outline" size={18} color={palette.textSecondary} />
              </Pressable>
              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  maximumDate={new Date()}
                  onChange={onDateChange}
                  themeVariant={isDark ? "dark" : "light"}
                />
              )}
              {showPicker && Platform.OS === "ios" && (
                <Pressable onPress={() => setShowPicker(false)} style={{ alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 12 }}>
                  <Txt variant="small" color={accent.uva} style={{ fontFamily: fonts.sansSemi }}>Pronto</Txt>
                </Pressable>
              )}
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
