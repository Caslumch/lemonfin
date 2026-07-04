import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/theme/use-theme";

// Rota raiz: decide o destino conforme o estado de auth hidratado do SecureStore.
export default function Index() {
  const { status } = useAuth();
  const { palette } = useTheme();

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.bg,
        }}
      >
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }

  return status === "authenticated" ? (
    <Redirect href="/(app)" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}
