import { Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <Screen className="px-6">
      <View className="flex-1 gap-6 py-4">
        <Text className="font-heading-bold text-2xl text-dark">Ajustes</Text>

        <View className="gap-1 rounded-2xl bg-white p-4">
          <Text className="font-sans-medium text-base text-dark">
            {user?.name}
          </Text>
          <Text className="font-sans text-sm text-gray-500">{user?.email}</Text>
        </View>

        {/*
          READER-MODE (iOS): esta tela NÃO exibe preço, botão "assinar" nem link
          de compra — isso evita o gatilho de In-App Purchase da Apple. A
          assinatura é gerenciada no site. Ver docs/mobile-strategy (a criar) e
          issues #10/#11. Aqui só refletimos o status vindo da API quando houver.
        */}
        <View className="gap-1 rounded-2xl bg-gray-100 p-4">
          <Text className="font-sans-medium text-sm text-dark">Assinatura</Text>
          <Text className="font-sans text-sm text-gray-500">
            Gerencie seu plano pela sua conta no site do LemonFin.
          </Text>
        </View>

        {/* TODO(#07): exclusão de conta in-app (obrigatória nas lojas + LGPD). */}

        <View className="mt-auto">
          <Button label="Sair" variant="ghost" onPress={() => void signOut()} />
        </View>
      </View>
    </Screen>
  );
}
