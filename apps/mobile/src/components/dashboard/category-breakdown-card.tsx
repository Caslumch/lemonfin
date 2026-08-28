import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import { ProgressBar } from "@/components/ui/progress-bar";
import { type CategoryBreakdown } from "@/hooks/use-financial-data";
import { categoryIonicon } from "@/lib/category-icon";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts, radii } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

const COLLAPSED = 5;

// "Gastos por categoria" do mês (PRD 6.5): barras horizontais ordenadas por
// valor, cada uma proporcional ao maior gasto. Ícone neutro (estilo Nubank).
export function CategoryBreakdownCard({ data }: { data: CategoryBreakdown[] }) {
  const { palette } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const items = data.filter((d) => d.total > 0);
  if (items.length === 0) return null;

  const max = items[0].total; // já vem ordenado desc
  const shown = expanded ? items : items.slice(0, COLLAPSED);

  return (
    <Card style={{ gap: 14 }}>
      <Txt variant="section" style={{ fontSize: 16 }}>
        Gastos por categoria
      </Txt>

      {shown.map((it) => (
        <View key={it.categoryId} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radii.md,
                backgroundColor: palette.muted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={categoryIonicon(it.category?.name, it.category?.icon)}
                size={16}
                color={palette.text}
              />
            </View>
            <Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>
              {it.category?.name ?? "Outros"}
            </Txt>
            <Txt style={{ fontFamily: fonts.mono, fontSize: 13 }} color={palette.text}>
              {formatBRL(it.total)}
            </Txt>
          </View>
          <ProgressBar percentage={(it.total / max) * 100} color={accent.uva} />
        </View>
      ))}

      {items.length > COLLAPSED && (
        <Pressable onPress={() => setExpanded((e) => !e)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <Txt variant="small" color={palette.textTertiary}>
            {expanded ? "Ver menos" : `Ver todas (${items.length})`}
          </Txt>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={palette.textTertiary} />
        </Pressable>
      )}
    </Card>
  );
}
