import { useEffect, useState } from "react";
import { Alert, Linking, Switch, View } from "react-native";
import { Card } from "@/components/ui/card";
import { Txt } from "@/components/ui/text";
import {
  getNotificationStatus,
  getPushPref,
  isPushSupported,
  registerDevice,
  setPushPref,
  unregisterDevice,
} from "@/lib/push";
import { useTheme } from "@/theme/use-theme";
import { accent } from "@/theme/tokens";

// Toggle "Notificações no celular" — controla o opt-out local e registra/dá
// baixa no device. Só renderiza em aparelho físico (push não roda em simulador).
export function PushNotificationSetting() {
  const { palette } = useTheme();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = isPushSupported();
      setSupported(ok);
      if (ok) setEnabled(await getPushPref());
    })();
  }, []);

  async function toggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await setPushPref(next);
      setEnabled(next);
      if (next) {
        await registerDevice();
        // Se a permissão do SO estiver negada, avisa e oferece abrir os ajustes.
        const status = await getNotificationStatus();
        if (status === "denied") {
          Alert.alert(
            "Notificações bloqueadas",
            "Ative as notificações do LemonFin nos ajustes do sistema para receber os lembretes.",
            [
              { text: "Agora não", style: "cancel" },
              { text: "Abrir ajustes", onPress: () => void Linking.openSettings() },
            ],
          );
        }
      } else {
        await unregisterDevice();
      }
    } catch (e) {
      Alert.alert("Não foi possível", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <View>
      <Txt variant="caption" color={palette.textTertiary} style={{ marginBottom: 8 }}>
        Notificações
      </Txt>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyMedium">Notificações no celular</Txt>
            <Txt variant="small" color={palette.textTertiary}>
              Lembretes de vencimento e resumo direto no app
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
