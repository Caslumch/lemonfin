import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/providers/auth-provider";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (name.length < 2 || !email || password.length < 8) {
      Alert.alert(
        "Campos inválidos",
        "Nome (2+), e-mail válido e senha (8+ caracteres).",
      );
      return;
    }
    setLoading(true);
    const ok = await signUp({ name: name.trim(), email: email.trim(), password });
    setLoading(false);
    if (ok) router.replace("/(app)");
    else Alert.alert("Não foi possível criar a conta", "Tente outro e-mail.");
  }

  return (
    <Screen className="px-6">
      <View className="flex-1 justify-center gap-6">
        <Text className="font-heading-bold text-3xl text-dark">
          Criar conta
        </Text>

        <View className="gap-4">
          <TextField label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
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
            placeholder="Mínimo 8 caracteres"
          />
          <Button label="Criar conta" onPress={handleSubmit} loading={loading} />
        </View>

        <View className="flex-row justify-center gap-1">
          <Text className="font-sans text-sm text-gray-500">Já tem conta?</Text>
          <Link href="/(auth)/login" className="font-sans-medium text-sm text-dark">
            Entrar
          </Link>
        </View>
      </View>
    </Screen>
  );
}
