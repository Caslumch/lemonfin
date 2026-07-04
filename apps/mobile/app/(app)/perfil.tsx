import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/theme/use-theme";

type ThemeMode = "system" | "light" | "dark";

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const { palette, setScheme } = useTheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  const changeTheme = (m: ThemeMode) => {
    setMode(m);
    setScheme(m);
  };

  return (
    <Screen padded>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, gap: 20 }}
      >
        <Txt variant="title">Perfil</Txt>

        <Card>
          <Txt variant="bodyMedium">{user?.name}</Txt>
          <Txt variant="small" color={palette.textSecondary} style={{ marginTop: 2 }}>
            {user?.email}
          </Txt>
        </Card>

        <View style={{ gap: 10 }}>
          <Txt variant="caption" color={palette.textTertiary}>
            Aparência
          </Txt>
          <SegmentedControl<ThemeMode>
            value={mode}
            onChange={changeTheme}
            segments={[
              { key: "system", label: "Sistema" },
              { key: "light", label: "Claro" },
              { key: "dark", label: "Escuro" },
            ]}
          />
        </View>

        {/*
          READER-MODE (iOS): sem preço/compra aqui — evita o gatilho de IAP da
          Apple. Assinatura gerida no site. Ver issues #10/#11.
        */}
        <View style={{ gap: 10 }}>
          <Txt variant="caption" color={palette.textTertiary}>
            Assinatura
          </Txt>
          <Card>
            <Txt variant="small" color={palette.textSecondary}>
              Gerencie seu plano pela sua conta no site do LemonFin.
            </Txt>
          </Card>
        </View>

        <View style={{ marginTop: 8 }}>
          <Button label="Sair" variant="outline" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
