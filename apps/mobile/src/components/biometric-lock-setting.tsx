import { useEffect, useState } from "react";
import { Alert, Switch, View } from "react-native";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import {
  authenticate,
  biometricLabel,
  isBiometricAvailable,
  isLockEnabled,
  setLockEnabled,
} from "@/lib/biometrics";
import { useLock } from "@/providers/lock-provider";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

// Toggle "Bloqueio por Face ID/biometria" — só renderiza se o aparelho tem
// biometria cadastrada. Ao ligar, pede uma autenticação de confirmação.
export function BiometricLockSetting() {
  const { palette } = useTheme();
  const { refreshLockPref } = useLock();
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState("Biometria");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await isBiometricAvailable();
      setAvailable(ok);
      if (ok) {
        setLabel(await biometricLabel());
        setEnabled(await isLockEnabled());
      }
    })();
  }, []);

  async function toggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      // Confirma com biometria antes de LIGAR (evita ligar sem o dono validar).
      if (next) {
        const ok = await authenticate("Confirme para ativar o bloqueio");
        if (!ok) return;
      }
      await setLockEnabled(next);
      setEnabled(next);
      await refreshLockPref();
    } catch (e) {
      Alert.alert("Não foi possível", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <View>
      <Txt variant="caption" color={palette.textTertiary} style={{ marginBottom: 8 }}>
        Segurança
      </Txt>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyMedium">Bloqueio por {label}</Txt>
            <Txt variant="small" color={palette.textTertiary}>
              Pede {label} ao abrir o app
            </Txt>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggle}
            disabled={busy}
            trackColor={{ true: accent.primary, false: palette.muted }}
            thumbColor="#FFFFFF"
            style={{ transform: [{ scale: 0.85 }] }}
          />
        </View>
      </Card>
    </View>
  );
}
