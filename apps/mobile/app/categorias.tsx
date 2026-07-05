import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackHeader } from "@/components/ui/stack-header";
import { SkeletonList } from "@/components/ui/skeleton";
import { AddButton } from "@/components/ui/add-button";
import { Txt } from "@/components/ui/text";
import { CategoryFormSheet } from "@/components/forms/category-form-sheet";
import { type Category, useCategories } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, categoryColors, fonts, radii } from "@/theme/tokens";
import { categoryIonicon } from "@/lib/category-icon";

function CategoryPill({ cat, onPress }: { cat: Category; onPress?: () => void }) {
  const { scheme } = useTheme();
  const c = categoryColors(scheme, cat.colorBg, cat.colorText);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: c.bg,
        borderRadius: radii.chip,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <Ionicons name={categoryIonicon(cat.name, cat.icon)} size={15} color={c.fg} />
      <Txt style={{ fontFamily: fonts.sansMedium, fontSize: 14 }} color={c.fg} numberOfLines={1}>
        {cat.name}
      </Txt>
    </Pressable>
  );
}

function Section({ title, items, onPick }: { title: string; items: Category[]; onPick?: (c: Category) => void }) {
  const { palette } = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <Txt variant="caption" color={palette.textTertiary}>{title}</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((c) => (
          <CategoryPill key={c.id} cat={c} onPress={onPick ? () => onPick(c) : undefined} />
        ))}
      </View>
    </View>
  );
}

export default function CategoriasScreen() {
  const { palette } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useCategories();
  const cats = data ?? [];
  const mine = cats.filter((c) => c.editable);
  const system = cats.filter((c) => !c.editable);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StackHeader title="Categorias" right={<AddButton onPress={() => setEditing("new")} />} />
      {isLoading ? (
        <View style={{ padding: 20, paddingTop: 4 }}>
          <SkeletonList />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent.primary} />}
        >
          <Section title="Minhas categorias" items={mine} onPick={setEditing} />
          <Section title="Padrão" items={system} />
          {mine.length === 0 && (
            <Txt variant="small" color={palette.textTertiary}>
              Você ainda não criou categorias próprias. Toque em + para criar.
            </Txt>
          )}
        </ScrollView>
      )}
      <CategoryFormSheet editing={editing} onClose={() => setEditing(null)} />
    </View>
  );
}
