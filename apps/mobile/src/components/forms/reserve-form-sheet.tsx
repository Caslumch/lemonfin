import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { FormSheet } from "@/components/ui/form-sheet";
import { SheetField } from "@/components/ui/sheet-field";
import { AmountInput } from "@/components/ui/amount-input";
import { Chip } from "@/components/ui/chip";
import { Txt } from "@/components/ui/text";
import {
  type Reserve,
  useCreateReserve,
  useDeleteReserve,
  useUpdateReserve,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { formatDateBR } from "@/lib/format";

const OPTIONS = [
  { label: "3 meses", months: 3 },
  { label: "6 meses", months: 6 },
  { label: "1 ano", months: 12 },
  { label: "2 anos", months: 24 },
];

function deadlineFromMonths(months: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function ReserveFormSheet({
  editing,
  onClose,
}: {
  editing: Reserve | "new" | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const create = useCreateReserve();
  const update = useUpdateReserve();
  const del = useDeleteReserve();
  const isEdit = editing !== null && editing !== "new";

  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [deadline, setDeadline] = useState(() => deadlineFromMonths(6));
  const [months, setMonths] = useState<number | null>(6);

  useEffect(() => {
    if (editing && editing !== "new") {
      setName(editing.name);
      setRaw(String(Math.round(editing.targetAmount * 100)));
      setDeadline(editing.deadline);
      setMonths(null);
    } else if (editing === "new") {
      setName("");
      setRaw("");
      setDeadline(deadlineFromMonths(6));
      setMonths(6);
    }
  }, [editing]);

  const targetAmount = Number(raw || "0") / 100;
  const valid = name.trim().length > 0 && targetAmount > 0;

  function submit() {
    const done = { onSuccess: onClose, onError: (e: unknown) => Alert.alert("Erro", (e as Error).message) };
    if (isEdit) {
      update.mutate({ id: editing.id, input: { name: name.trim(), targetAmount, deadline } }, done);
    } else {
      create.mutate({ name: name.trim(), targetAmount, deadline }, done);
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
      title={isEdit ? "Editar reserva" : "Nova reserva"}
      onSubmit={submit}
      submitDisabled={!valid || create.isPending || update.isPending}
      submitLoading={create.isPending || update.isPending}
      onDelete={isEdit ? remove : undefined}
      deleteLoading={del.isPending}
    >
      <SheetField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Viagem" />
      <Txt variant="small" color={palette.textSecondary}>Valor-alvo</Txt>
      <AmountInput raw={raw} onChange={setRaw} />
      <Txt variant="small" color={palette.textSecondary}>Prazo — até {formatDateBR(deadline)}</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {OPTIONS.map((o) => (
          <Chip
            key={o.months}
            label={o.label}
            active={months === o.months}
            onPress={() => {
              setMonths(o.months);
              setDeadline(deadlineFromMonths(o.months));
            }}
          />
        ))}
      </View>
    </FormSheet>
  );
}
