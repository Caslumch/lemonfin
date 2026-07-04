import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/providers/auth-provider";
import { TabBar } from "@/components/tab-bar";

// Navegação principal — Opção B do DS: 4 abas + FAB central (na TabBar).
// A ordem das telas define a ordem na barra (o FAB entra após a 2ª).
export default function AppLayout() {
  const { status } = useAuth();

  if (status === "loading") return null;
  if (status !== "authenticated") return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar state={props.state} navigation={props.navigation} />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="extrato" />
      <Tabs.Screen name="cartoes" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
