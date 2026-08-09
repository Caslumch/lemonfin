import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Link, router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { LemonLogo } from "@/components/ui/lemon-logo";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/theme/use-theme";
import { accent, fonts } from "@/theme/tokens";

export default function LoginScreen() {
  const { signIn, verifyTotp } = useAuth();
  const { palette } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Etapa de 2FA: quando o login pede TOTP, guardamos o tempToken e trocamos de
  // fase para pedir o código do autenticador.
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

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
      setCode("");
      setTempToken(res.totp.tempToken);
      return;
    }
    Alert.alert("Não foi possível entrar", res.error);
  }

  async function handleVerify() {
    if (!tempToken || code.length < 6) return;
    setVerifying(true);
    const ok = await verifyTotp(tempToken, code);
    setVerifying(false);
    if (ok) {
      router.replace("/(app)");
      return;
    }
    setCode("");
    Alert.alert("Código inválido", "Confira o código do seu app autenticador e tente de novo.");
  }

  // --- Etapa 2FA ---
  if (tempToken) {
    return (
      <Screen padded bottomInset>
        <View style={{ flex: 1, justifyContent: "center", gap: 24 }}>
          <View style={{ gap: 12 }}>
            <LemonLogo size={56} />
            <View>
              <Txt style={{ fontFamily: fonts.outfit, fontSize: 30 }}>Verificação em duas etapas</Txt>
              <Txt variant="body" color={palette.textSecondary}>
                Digite o código de 6 dígitos do seu app autenticador.
              </Txt>
            </View>
          </View>

          <View style={{ gap: 16 }}>
            <TextField
              label="Código"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              autoFocus
              placeholder="000000"
            />
            <Button
              label="Verificar"
              onPress={handleVerify}
              loading={verifying}
              disabled={code.length < 6 || verifying}
            />
          </View>

          <Pressable
            onPress={() => {
              setTempToken(null);
              setCode("");
            }}
            style={{ alignItems: "center" }}
          >
            <Txt variant="small" color={palette.textSecondary}>
              Voltar
            </Txt>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // --- Etapa credenciais ---
  return (
    <Screen padded bottomInset>
      <View style={{ flex: 1, justifyContent: "center", gap: 24 }}>
        <View style={{ gap: 12 }}>
          <LemonLogo size={56} />
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
