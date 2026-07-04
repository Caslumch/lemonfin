import { useState } from "react";
import { Alert, View } from "react-native";
import { Link, router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { LemonLogo } from "@/components/ui/lemon-logo";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { palette } = useTheme();
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
    <Screen padded bottomInset>
      <View style={{ flex: 1, justifyContent: "center", gap: 24 }}>
        <View style={{ gap: 12 }}>
          <LemonLogo size={48} />
          <Txt style={{ fontFamily: fonts.outfit, fontSize: 30 }}>Criar conta</Txt>
        </View>

        <View style={{ gap: 16 }}>
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

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}>
          <Txt variant="small" color={palette.textSecondary}>
            Já tem conta?
          </Txt>
          <Link href="/(auth)/login">
            <Txt variant="small" color={accent.success} style={{ fontFamily: fonts.sansSemi }}>
              Entrar
            </Txt>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
