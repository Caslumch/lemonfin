import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/providers/auth-provider";
import { colors } from "@/theme/colors";

// Rota raiz: decide o destino conforme o estado de auth hidratado do SecureStore.
export default function Index() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color={colors.dark} />
      </View>
    );
  }

  return status === "authenticated" ? (
    <Redirect href="/(app)" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}
