import { Fragment } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { accent, fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// Tab bar customizada — Opção B do DS: 4 abas + FAB central (nova transação).
// Recebe o mínimo de BottomTabBarProps que usamos.
interface Props {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

const META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: "Início", icon: "home" },
  extrato: { label: "Extrato", icon: "receipt" },
  cartoes: { label: "Cartões", icon: "card" },
  perfil: { label: "Perfil", icon: "person" },
};

export function TabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  const tab = (routeName: string, active: boolean) => {
    const m = META[routeName];
    if (!m) return null;
    const color = active ? palette.text : palette.textTertiary;
    return (
      <Pressable
        key={routeName}
        onPress={() => navigation.navigate(routeName)}
        style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 }}
      >
        <Ionicons
          name={active ? m.icon : (`${m.icon}-outline` as never)}
          size={23}
          color={color}
        />
        <Text style={{ fontFamily: active ? fonts.sansSemi : fonts.sansMedium, fontSize: 10, color }}>
          {m.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-around",
        backgroundColor: palette.surface,
        borderTopWidth: 1,
        borderTopColor: palette.border,
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
      }}
    >
      {state.routes.map((route, i) => {
        const active = state.index === i;
        return (
          <Fragment key={route.key}>
            {tab(route.name, active)}
            {i === 1 && (
              <View style={{ width: 56, alignItems: "center" }}>
                <Pressable
                  onPress={() => router.push("/nova")}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 17,
                    marginTop: -26,
                    backgroundColor: accent.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: accent.primary,
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 6,
                  }}
                >
                  <Ionicons name="add" size={28} color="#0D0D0D" />
                </Pressable>
              </View>
            )}
          </Fragment>
        );
      })}
    </View>
  );
}
