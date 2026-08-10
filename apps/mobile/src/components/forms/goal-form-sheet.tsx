import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { FormSheet } from "@/components/ui/form-sheet";
import { SheetField } from "@/components/ui/sheet-field";
import { AmountInput } from "@/components/ui/amount-input";
import { CategoryPicker } from "@/components/ui/category-picker";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Txt } from "@/components/ui/text";
import {
  type Goal,
  useCreateGoal,
  useDeleteGoal,
  useUpdateGoal,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";

type Period = "MONTHLY" | "WEEKLY";

export function GoalFormSheet({
  editing,
  onClose,
}: {
  editing: Goal | "new" | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const del = useDeleteGoal();
  const isEdit = editing !== null && editing !== "new";

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [name, setName] = useState("");
  const [period, setPeriod] = useState<Period>("MONTHLY");

  useEffect(() => {
    if (editing && editing !== "new") {
      setCategoryId(editing.categoryId);
      setRaw(String(Math.round(editing.amount * 100)));
      setName(editing.name);
      setPeriod("MONTHLY");
    } else if (editing === "new") {
      setCategoryId(null);
      setRaw("");
      setName("");
      setPeriod("MONTHLY");
    }
  }, [editing]);

  const amount = Number(raw || "0") / 100;
  const valid = !!categoryId && amount > 0 && name.trim().length > 0;

  function submit() {
    if (!categoryId) return;
    const done = { onSuccess: onClose, onError: (e: unknown) => Alert.alert("Erro", (e as Error).message) };
    if (isEdit) {
      update.mutate({ id: editing.id, input: { name: name.trim(), amount, period } }, done);
    } else {
      create.mutate({ name: name.trim(), amount, period, categoryId }, done);
    }
  }

  function remove() {
    if (!isEdit) return;
    del.mutate(editing.id, { onSuccess: onClose, onError: (e) => Alert.alert("Erro", (e as Error).message) });
  }

  return (
    <FormSheet
      open={editing !== null}
      onClose={onClose}
      title={isEdit ? "Editar meta" : "Nova meta"}
      onSubmit={submit}
      submitDisabled={!valid || create.isPending || update.isPending}
      submitLoading={create.isPending || update.isPending}
      onDelete={isEdit ? remove : undefined}
      deleteLoading={del.isPending}
    >
      <Txt variant="small" color={palette.textSecondary}>Categoria</Txt>
      <CategoryPicker
        value={categoryId}
        onChange={(id) => {
          setCategoryId(id);
          if (!name.trim()) setName("Meta");
        }}
      />
      <AmountInput raw={raw} onChange={setRaw} />
      <SheetField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Teto de alimentação" />
      <Txt variant="small" color={palette.textSecondary}>Período</Txt>
      <SegmentedControl<Period>
        value={period}
        onChange={setPeriod}
        segments={[
          { key: "MONTHLY", label: "Mensal" },
          { key: "WEEKLY", label: "Semanal" },
        ]}
      />
    </FormSheet>
  );
}
