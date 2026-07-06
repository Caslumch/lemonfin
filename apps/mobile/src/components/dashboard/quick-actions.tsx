import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Txt } from "@/components/ui/text";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";
import { haptic } from "@/lib/haptics";

type Action = { label: string; icon: keyof typeof Ionicons.glyphMap; href: string; tint: string };

// Atalhos rápidos da Home (estilo Nubank): dá acesso na primeira tela às seções
// que antes só ficavam no Perfil. Rola horizontal e sangra até a borda.
const ACTIONS: Action[] = [
  { label: "Metas", icon: "flag-outline", href: "/metas", tint: accent.primary },
  { label: "Reservas", icon: "wallet-outline", href: "/reservas", tint: accent.uva },
  { label: "Recorrentes", icon: "repeat-outline", href: "/recorrentes", tint: accent.uva },
  { label: "Insights", icon: "bulb-outline", href: "/insights", tint: accent.warning },
  { label: "Categorias", icon: "pricetags-outline", href: "/categorias", tint: accent.success },
  { label: "Ajustes", icon: "settings-outline", href: "/configuracoes", tint: accent.primary },
];

export function QuickActions() {
  const { palette } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -20 }}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
    >
      {ACTIONS.map((a) => (
        <Pressable
          key={a.href}
          onPress={() => {
            haptic.light();
            router.push(a.href as never);
          }}
          style={{ width: 62, alignItems: "center", gap: 6 }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: `${a.tint}20`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={a.icon} size={24} color={a.tint} />
          </View>
          <Txt
            numberOfLines={1}
            style={{ fontSize: 11, lineHeight: 14, textAlign: "center" }}
            color={palette.textSecondary}
          >
            {a.label}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}
