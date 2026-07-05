import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FormSheet } from "@/components/ui/form-sheet";
import { SheetField } from "@/components/ui/sheet-field";
import { Txt } from "@/components/ui/text";
import {
  type Category,
  type CategoryColorPreset,
  CATEGORY_COLOR_PRESETS,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { categoryIonicon } from "@/lib/category-icon";

const PRESETS: Record<CategoryColorPreset, { bg: string; fg: string }> = {
  laranja: { bg: "#FFF3E0", fg: "#E65100" },
  azul: { bg: "#E3F2FD", fg: "#1565C0" },
  roxo: { bg: "#F3E5F5", fg: "#7B1FA2" },
  vermelho: { bg: "#FBE9E7", fg: "#BF360C" },
  verde: { bg: "#E8F5E9", fg: "#2E7D32" },
  ciano: { bg: "#E0F7FA", fg: "#00838F" },
  amarelo: { bg: "#FFF8E1", fg: "#F57F17" },
  indigo: { bg: "#EDE7F6", fg: "#4527A0" },
  teal: { bg: "#E0F2F1", fg: "#00695C" },
  cinza: { bg: "#F5F5F5", fg: "#6B6B6B" },
};

function presetOf(cat: Category): CategoryColorPreset {
  const match = CATEGORY_COLOR_PRESETS.find((p) => PRESETS[p].fg === cat.colorText);
  return match ?? "azul";
}

export function CategoryFormSheet({
  editing,
  onClose,
}: {
  editing: Category | "new" | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();
  const isEdit = editing !== null && editing !== "new";

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏷️");
  const [preset, setPreset] = useState<CategoryColorPreset>("azul");

  useEffect(() => {
    if (editing && editing !== "new") {
      setName(editing.name);
      setIcon(editing.icon ?? "🏷️");
      setPreset(presetOf(editing));
    } else if (editing === "new") {
      setName("");
      setIcon("🏷️");
      setPreset("azul");
    }
  }, [editing]);

  const valid = name.trim().length > 0;

  function submit() {
    const input = { name: name.trim(), icon: icon.trim(), colorPreset: preset };
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
      title={isEdit ? "Editar categoria" : "Nova categoria"}
      onSubmit={submit}
      submitDisabled={!valid || create.isPending || update.isPending}
      submitLoading={create.isPending || update.isPending}
      onDelete={isEdit ? remove : undefined}
      deleteLoading={del.isPending}
    >
      <SheetField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Pets" />
      {/* Preview do ícone (derivado do nome) na cor escolhida. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: PRESETS[preset].bg, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={categoryIonicon(name, icon)} size={20} color={PRESETS[preset].fg} />
        </View>
        <Txt variant="small" color={palette.textTertiary} style={{ flex: 1 }}>
          O ícone é escolhido automaticamente pelo nome.
        </Txt>
      </View>
      <Txt variant="small" color={palette.textSecondary}>Cor</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CATEGORY_COLOR_PRESETS.map((p) => {
          const active = preset === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPreset(p)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: PRESETS[p].bg,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: active ? 2 : 1,
                borderColor: active ? PRESETS[p].fg : palette.border,
              }}
            >
              {active && <Ionicons name="checkmark" size={18} color={PRESETS[p].fg} />}
            </Pressable>
          );
        })}
      </View>
    </FormSheet>
  );
}
