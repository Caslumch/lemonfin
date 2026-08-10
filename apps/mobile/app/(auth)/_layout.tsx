import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/providers/auth-provider";

export default function AuthLayout() {
  const { status } = useAuth();

  // Já autenticado não vê as telas de login/registro.
  if (status === "authenticated") return <Redirect href="/(app)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
