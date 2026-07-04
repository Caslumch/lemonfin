import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/auth-provider";
import { colors } from "@/theme/colors";

export default function AppLayout() {
  const { status } = useAuth();

  if (status === "loading") return null;
  if (status !== "authenticated") return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.dark,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.gray200 },
        tabBarLabelStyle: { fontFamily: "DMSans_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transações",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
