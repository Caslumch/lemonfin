import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FormSheet } from "@/components/ui/form-sheet";
import { SheetField } from "@/components/ui/sheet-field";
import { AmountInput } from "@/components/ui/amount-input";
import { Txt } from "@/components/ui/text";
import {
  type Card,
  useCreateCard,
  useDeleteCard,
  useUpdateCard,
} from "@/hooks/use-financial-data";
import { CARD_PRESET_KEYS, themeFor } from "@/theme/card-themes";
import { accent } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export function CardFormSheet({
  editing,
  onClose,
}: {
  editing: Card | "new" | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const create = useCreateCard();
  const update = useUpdateCard();
  const del = useDeleteCard();
  const isEdit = editing !== null && editing !== "new";

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [limitRaw, setLimitRaw] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [preset, setPreset] = useState<string>("azul");

  useEffect(() => {
    if (editing && editing !== "new") {
      setName(editing.name);
      setBrand(editing.brand ?? "");
      setLimitRaw(editing.limit != null ? String(Math.round(Number(editing.limit) * 100)) : "");
      setClosingDay(String(editing.closingDay));
      setDueDay(editing.dueDay != null ? String(editing.dueDay) : "");
      setPreset(editing.colorPreset ?? "azul");
    } else if (editing === "new") {
      setName("");
      setBrand("");
      setLimitRaw("");
      setClosingDay("");
      setDueDay("");
      setPreset("azul");
    }
  }, [editing]);

  const closing = Math.min(Math.max(Number(closingDay || "0"), 0), 31);
  const due = dueDay ? Math.min(Math.max(Number(dueDay), 1), 31) : undefined;
  const limit = limitRaw ? Number(limitRaw) / 100 : undefined;
  const valid = name.trim().length > 0 && closing >= 1;

  function submit() {
    const input = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      limit,
      closingDay: closing,
      dueDay: due,
      colorPreset: preset,
    };
    const done = { onSuccess: onClose, onError: (e: unknown) => Alert.alert("Erro", (e as Error).message) };
    if (isEdit) update.mutate({ id: editing.id, input }, done);
    else create.mutate(input, done);
  }

  function remove() {
    if (!isEdit) return;
    del.mutate(editing.id, { onSuccess: onClose, onError: (e) => Alert.alert("Erro", (e as Error).message) });
  }

  return (
    <FormSheet
      open={editing !== null}
      onClose={onClose}
      title={isEdit ? "Editar cartão" : "Novo cartão"}
      onSubmit={submit}
      submitDisabled={!valid || create.isPending || update.isPending}
      submitLoading={create.isPending || update.isPending}
      onDelete={isEdit ? remove : undefined}
      deleteLoading={del.isPending}
    >
      <SheetField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Nubank" />
      <SheetField label="Bandeira (opcional)" value={brand} onChangeText={setBrand} placeholder="Visa, Mastercard…" autoCapitalize="words" />
      <Txt variant="small" color={palette.textSecondary}>Limite (opcional)</Txt>
      <AmountInput raw={limitRaw} onChange={setLimitRaw} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <SheetField label="Fechamento (dia)" value={closingDay} onChangeText={(t) => setClosingDay(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="25" />
        </View>
        <View style={{ flex: 1 }}>
          <SheetField label="Vencimento (dia)" value={dueDay} onChangeText={(t) => setDueDay(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="5" />
        </View>
      </View>
      <Txt variant="small" color={palette.textSecondary}>Cor</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CARD_PRESET_KEYS.map((key) => {
          const t = themeFor({ colorPreset: key });
          const active = preset === key;
          return (
            <Pressable
              key={key}
              onPress={() => setPreset(key)}
              style={{
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: active ? 2 : 1,
                borderColor: active ? accent.uva : palette.border,
              }}
            >
              <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 34 }} />
            </Pressable>
          );
        })}
      </View>
    </FormSheet>
  );
}
