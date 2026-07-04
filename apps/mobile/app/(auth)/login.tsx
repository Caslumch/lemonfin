import { useState } from "react";
import { Alert, View } from "react-native";
import { Link, router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts, radii } from "@/theme/tokens";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { palette } = useTheme();
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
      Alert.alert(
        "Verificação em duas etapas",
        "Sua conta tem 2FA. A tela de verificação TOTP entra na próxima fatia.",
      );
      return;
    }
    Alert.alert("Não foi possível entrar", res.error);
  }

  return (
    <Screen padded bottomInset>
      <View style={{ flex: 1, justifyContent: "center", gap: 24 }}>
        <View style={{ gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.lg,
              backgroundColor: accent.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt style={{ fontFamily: fonts.outfit, fontSize: 30 }} color="#0D0D0D">
              $
            </Txt>
          </View>
          <View>
            <Txt style={{ fontFamily: fonts.outfit, fontSize: 30 }}>LemonFin</Txt>
            <Txt variant="body" color={palette.textSecondary}>
              Entre para ver seu painel financeiro.
            </Txt>
          </View>
        </View>

        <View style={{ gap: 16 }}>
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

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}>
          <Txt variant="small" color={palette.textSecondary}>
            Não tem conta?
          </Txt>
          <Link href="/(auth)/register">
            <Txt variant="small" color={accent.success} style={{ fontFamily: fonts.sansSemi }}>
              Criar conta
            </Txt>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
