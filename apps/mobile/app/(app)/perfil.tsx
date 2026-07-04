import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/theme/use-theme";
import { accent, radii } from "@/theme/tokens";

type ThemeMode = "system" | "light" | "dark";

const MENU: { label: string; icon: keyof typeof Ionicons.glyphMap; href: string; tint: string }[] = [
  { label: "Metas", icon: "flag-outline", href: "/metas", tint: accent.primary },
  { label: "Reservas", icon: "wallet-outline", href: "/reservas", tint: accent.uva },
  { label: "Recorrentes", icon: "repeat-outline", href: "/recorrentes", tint: accent.uva },
  { label: "Insights", icon: "bulb-outline", href: "/insights", tint: accent.warning },
];

function MenuRow({
  label,
  icon,
  tint,
  onPress,
  first,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  onPress: () => void;
  first?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: palette.border,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radii.chip, backgroundColor: `${tint}22`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Txt variant="bodyMedium" style={{ flex: 1 }}>{label}</Txt>
      <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
    </Pressable>
  );
}

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const { palette, setScheme } = useTheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  const changeTheme = (m: ThemeMode) => {
    setMode(m);
    setScheme(m);
  };

  return (
    <Screen padded>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, gap: 20 }}
      >
        <Txt variant="title">Perfil</Txt>

        <Card>
          <Txt variant="bodyMedium">{user?.name}</Txt>
          <Txt variant="small" color={palette.textSecondary} style={{ marginTop: 2 }}>
            {user?.email}
          </Txt>
        </Card>

        {/* Menu de seções */}
        <Card style={{ paddingVertical: 6 }}>
          {MENU.map((m, i) => (
            <MenuRow
              key={m.href}
              label={m.label}
              icon={m.icon}
              tint={m.tint}
              first={i === 0}
              onPress={() => router.push(m.href as never)}
            />
          ))}
        </Card>

        <View style={{ gap: 10 }}>
          <Txt variant="caption" color={palette.textTertiary}>Aparência</Txt>
          <SegmentedControl<ThemeMode>
            value={mode}
            onChange={changeTheme}
            segments={[
              { key: "system", label: "Sistema" },
              { key: "light", label: "Claro" },
              { key: "dark", label: "Escuro" },
            ]}
          />
        </View>

        {/* READER-MODE (iOS): sem preço/compra — assinatura no site. */}
        <View style={{ gap: 10 }}>
          <Txt variant="caption" color={palette.textTertiary}>Assinatura</Txt>
          <Card>
            <Txt variant="small" color={palette.textSecondary}>
              Gerencie seu plano pela sua conta no site do LemonFin.
            </Txt>
          </Card>
        </View>

        <Button label="Sair" variant="outline" onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}
