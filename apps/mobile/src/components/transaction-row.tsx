import { View } from "react-native";
import { accent, fonts, radii } from "@/theme/tokens";
import { categoryColors } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { type Transaction } from "@/hooks/use-financial-data";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Txt } from "./ui/text";

// Linha de transação do DS: ícone da categoria + nome + metadata + valor.
// (Swipe para editar/excluir entra no próximo incremento com gesture-handler.)
export function TransactionRow({
  tx,
  showDivider = true,
}: {
  tx: Transaction;
  showDivider?: boolean;
}) {
  const { palette, scheme } = useTheme();
  const isIncome = tx.type === "INCOME";
  const amount = Number(tx.amount);
  const cat = categoryColors(scheme, tx.category?.colorBg, tx.category?.colorText);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: palette.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11, flex: 1 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            backgroundColor: cat.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt style={{ fontSize: 18 }} color={cat.fg}>
            {tx.category?.icon ?? "💸"}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.sansSemi, fontSize: 15 }} numberOfLines={1}>
            {tx.description || tx.category?.name || "Transação"}
          </Txt>
          <Txt variant="small" color={palette.textTertiary} numberOfLines={1}>
            {tx.category?.name ?? "—"} • {formatDateBR(tx.date)}
          </Txt>
        </View>
      </View>
      <Txt
        style={{ fontFamily: fonts.outfit, fontSize: 15 }}
        color={isIncome ? accent.success : palette.text}
      >
        {isIncome ? "+ " : "- "}
        {formatBRL(Math.abs(amount))}
      </Txt>
    </View>
  );
}
