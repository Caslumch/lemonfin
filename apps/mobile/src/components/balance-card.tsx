import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { accent, fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { formatBRL } from "@/lib/format";
import { Txt } from "./ui/text";

// Card de saldo — protagonista da Home. Superfície escura fixa (#0D0D0D no
// claro; surface no escuro), texto claro nos dois. Olho oculta os valores.
export function BalanceCard({
  balance,
  income,
  expense,
}: {
  balance: number;
  income: number;
  expense: number;
}) {
  const { palette, isDark } = useTheme();
  const [hidden, setHidden] = useState(false);

  const full = formatBRL(balance);
  const [intPart, cents] = full.split(",");

  return (
    <View
      style={{
        backgroundColor: isDark ? palette.surface : "#0D0D0D",
        borderWidth: isDark ? 1 : 0,
        borderColor: palette.border,
        borderRadius: radii.xl,
        padding: 22,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Txt variant="caption" color="#9E9E9E">
          Saldo disponível
        </Txt>
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
          <Ionicons
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="#9E9E9E"
          />
        </Pressable>
      </View>

      {hidden ? (
        <Txt variant="balance" color="#F5F5F5">
          R$ ••••
        </Txt>
      ) : (
        <Txt variant="balance" color="#F5F5F5">
          {intPart}
          <Txt style={{ fontFamily: fonts.outfit, fontSize: 22 }} color="#9E9E9E">
            ,{cents}
          </Txt>
        </Txt>
      )}

      <View style={{ flexDirection: "row", gap: 24, marginTop: 16 }}>
        <View>
          <Txt variant="small" color="#6B6B6B">
            Entradas
          </Txt>
          <Txt style={{ fontFamily: fonts.mono, fontSize: 15 }} color={accent.success}>
            {hidden ? "••••" : formatBRL(income)}
          </Txt>
        </View>
        <View>
          <Txt variant="small" color="#6B6B6B">
            Saídas
          </Txt>
          <Txt style={{ fontFamily: fonts.mono, fontSize: 15 }} color={accent.danger}>
            {hidden ? "••••" : formatBRL(expense)}
          </Txt>
        </View>
      </View>
    </View>
  );
}
