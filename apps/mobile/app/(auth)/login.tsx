import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/providers/auth-provider";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    const res = await signIn(email.trim(), password);
    setLoading(false);

    if (res.ok) {
      router.replace("/(app)");
      return;
    }
    if ("totp" in res) {
      // 2FA habilitado: encaminha para a verificação do código (tela futura).
      Alert.alert(
        "Verificação em duas etapas",
        "Sua conta tem 2FA. A tela de verificação TOTP entra na próxima fatia.",
      );
      return;
    }
    Alert.alert("Não foi possível entrar", res.error);
  }

  return (
    <Screen className="px-6">
      <View className="flex-1 justify-center gap-6">
        <View className="gap-1">
          <Text className="font-heading-bold text-3xl text-dark">LemonFin</Text>
          <Text className="font-sans text-base text-gray-500">
            Entre para ver seu painel financeiro.
          </Text>
        </View>

        <View className="gap-4">
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="voce@email.com"
          />
          <TextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          <Button label="Entrar" onPress={handleSubmit} loading={loading} />
        </View>

        <View className="flex-row justify-center gap-1">
          <Text className="font-sans text-sm text-gray-500">
            Não tem conta?
          </Text>
          <Link href="/(auth)/register" className="font-sans-medium text-sm text-dark">
            Criar conta
          </Link>
        </View>
      </View>
    </Screen>
  );
}
