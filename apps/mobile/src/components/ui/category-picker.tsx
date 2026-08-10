import { ScrollView } from "react-native";
import { Chip } from "./chip";
import { Txt } from "./text";
import { useCategories } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";

// Seletor de categoria (chips horizontais). Para uso em formulários.
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  const { palette } = useTheme();
  const { data } = useCategories();
  const cats = data ?? [];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {cats.length === 0 ? (
        <Txt variant="small" color={palette.textTertiary}>Carregando…</Txt>
      ) : (
        cats.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            active={value === c.id}
            onPress={() => onChange(c.id)}
          />
        ))
      )}
    </ScrollView>
  );
}
