import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { StackHeader } from "@/components/ui/stack-header";
import { Txt } from "@/components/ui/text";
import { type Category, useCategories } from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { accent, categoryColors, fonts, radii } from "@/theme/tokens";

function CategoryPill({ cat }: { cat: Category }) {
  const { scheme } = useTheme();
  const c = categoryColors(scheme, cat.colorBg, cat.colorText);
  return (
    <View
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
      <Txt style={{ fontSize: 16 }} color={c.fg}>{cat.icon ?? "•"}</Txt>
      <Txt style={{ fontFamily: fonts.sansMedium, fontSize: 14 }} color={c.fg} numberOfLines={1}>
        {cat.name}
      </Txt>
    </View>
  );
}

function Section({ title, items }: { title: string; items: Category[] }) {
  const { palette } = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <Txt variant="caption" color={palette.textTertiary}>{title}</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((c) => <CategoryPill key={c.id} cat={c} />)}
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

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StackHeader title="Categorias" />
      {isLoading ? (
        <ActivityIndicator color={palette.text} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={accent.primary} />}
        >
          <Section title="Minhas categorias" items={mine} />
          <Section title="Padrão" items={system} />
          {mine.length === 0 && (
            <Txt variant="small" color={palette.textTertiary}>
              Você ainda não criou categorias próprias. Crie no app web.
            </Txt>
          )}
        </ScrollView>
      )}
    </View>
  );
}
