import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { FormSheet } from "@/components/ui/form-sheet";
import { SheetField } from "@/components/ui/sheet-field";
import { AmountInput } from "@/components/ui/amount-input";
import { CategoryPicker } from "@/components/ui/category-picker";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Txt } from "@/components/ui/text";
import {
  type Recurring,
  useCreateRecurring,
  useDeleteRecurring,
  useUpdateRecurring,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";

type TxType = "EXPENSE" | "INCOME";

export function RecurringFormSheet({
  editing,
  onClose,
}: {
  editing: Recurring | "new" | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const create = useCreateRecurring();
  const update = useUpdateRecurring();
  const del = useDeleteRecurring();
  const isEdit = editing !== null && editing !== "new";

  const [description, setDescription] = useState("");
  const [raw, setRaw] = useState("");
  const [type, setType] = useState<TxType>("EXPENSE");
  const [day, setDay] = useState("1");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (editing && editing !== "new") {
      setDescription(editing.description);
      setRaw(String(Math.round(editing.amount * 100)));
      setType(editing.type);
      setDay(String(editing.dayOfMonth));
      setCategoryId(editing.categoryId);
    } else if (editing === "new") {
      setDescription("");
      setRaw("");
      setType("EXPENSE");
      setDay("1");
      setCategoryId(null);
    }
  }, [editing]);

  const amount = Number(raw || "0") / 100;
  const dayNum = Math.min(Math.max(Number(day || "0"), 1), 31);
  const valid = description.trim().length > 0 && amount > 0 && !!categoryId && dayNum >= 1;

  function submit() {
    if (!categoryId) return;
    const input = { description: description.trim(), amount, type, dayOfMonth: dayNum, categoryId };
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
      title={isEdit ? "Editar recorrente" : "Nova recorrente"}
      onSubmit={submit}
      submitDisabled={!valid || create.isPending || update.isPending}
      submitLoading={create.isPending || update.isPending}
      onDelete={isEdit ? remove : undefined}
      deleteLoading={del.isPending}
    >
      <SegmentedControl<TxType>
        value={type}
        onChange={setType}
        segments={[
          { key: "EXPENSE", label: "Saída" },
          { key: "INCOME", label: "Entrada" },
        ]}
      />
      <AmountInput raw={raw} onChange={setRaw} />
      <SheetField label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex: Aluguel" />
      <SheetField
        label="Dia do mês (1–31)"
        value={day}
        onChangeText={(t) => setDay(t.replace(/\D/g, "").slice(0, 2))}
        keyboardType="number-pad"
        placeholder="5"
      />
      <Txt variant="small" color={palette.textSecondary}>Categoria</Txt>
      <CategoryPicker value={categoryId} onChange={setCategoryId} />
    </FormSheet>
  );
}
