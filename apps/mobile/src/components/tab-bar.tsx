import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { accent } from "@/theme/tokens";

// Tab bar flutuante estilo Nubank: pill escura flutuando sobre o conteúdo, item
// ativo num círculo uva, ícones sem label + FAB lima central (nova transação).
interface Props {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

const ORDER = ["index", "extrato", "cartoes", "perfil"] as const;
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  extrato: "receipt",
  cartoes: "card",
  perfil: "person",
};
const PILL = "#1C1C1E";

export function TabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  const tab = (name: string) => {
    const active = name === activeName;
    const icon = ICONS[name];
    return (
      <Pressable
        key={name}
        onPress={() => navigation.navigate(name)}
        style={{ width: 52, height: 48, alignItems: "center", justifyContent: "center" }}
      >
        {active ? (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: accent.uva,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={22} color="#FFFFFF" />
          </View>
        ) : (
          <Ionicons name={`${icon}-outline` as never} size={24} color="rgba(255,255,255,0.5)" />
        )}
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: PILL,
          borderRadius: 9999,
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 14,
        }}
      >
        {tab(ORDER[0])}
        {tab(ORDER[1])}
        {/* FAB — nova transação */}
        <Pressable
          onPress={() => router.push("/nova")}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            marginHorizontal: 4,
            backgroundColor: accent.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={28} color="#0D0D0D" />
        </Pressable>
        {tab(ORDER[2])}
        {tab(ORDER[3])}
      </View>
    </View>
  );
}
