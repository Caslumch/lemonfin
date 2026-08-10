import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAtomValue } from "jotai";
import { accent } from "@/theme/tokens";
import { haptic } from "@/lib/haptics";
import { openSheetCountAtom } from "@/state/ui";

// Tab bar flutuante estilo Nubank: pill de VIDRO FOSCO (glassmorphism via
// expo-blur) flutuando sobre o conteúdo, item ativo num círculo uva, ícones sem
// label + FAB lima central (nova transação).
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

export function TabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  const openSheets = useAtomValue(openSheetCountAtom);

  // Esconde a barra enquanto um sheet está aberto (senão cobre os botões dele).
  if (openSheets > 0) return null;

  const tab = (name: string) => {
    const active = name === activeName;
    const icon = ICONS[name];
    return (
      <Pressable
        key={name}
        onPress={() => {
          haptic.light();
          navigation.navigate(name);
        }}
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
          <Ionicons name={`${icon}-outline` as never} size={24} color="rgba(255,255,255,0.7)" />
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
      {/* Container só pra sombra (overflow visível). O blur é clipado no filho. */}
      <View
        style={{
          borderRadius: 9999,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 14,
        }}
      >
        <BlurView
          intensity={50}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
            paddingVertical: 8,
            borderRadius: 9999,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            // leve escurecida por cima do blur → contraste dos ícones em qualquer fundo
            backgroundColor: "rgba(20,20,22,0.35)",
          }}
        >
          {tab(ORDER[0])}
          {tab(ORDER[1])}
          {/* FAB — nova transação */}
          <Pressable
            onPress={() => {
              haptic.medium();
              router.push("/nova");
            }}
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
        </BlurView>
      </View>
    </View>
  );
}
