import { useRef } from "react";
import { Pressable, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { accent, categoryColors, fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { type Transaction } from "@/hooks/use-financial-data";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Txt } from "./ui/text";

// Linha de transação do DS. Quando recebe onEdit/onDelete, habilita swipe para
// a esquerda revelando as ações (Swipeable legado, sem reanimated).
export function TransactionRow({
  tx,
  showDivider = true,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  showDivider?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { palette, scheme } = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const swipeable = !!(onEdit || onDelete);
  const isIncome = tx.type === "INCOME";
  const amount = Number(tx.amount);
  const cat = categoryColors(scheme, tx.category?.colorBg, tx.category?.colorText);

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        backgroundColor: swipeable ? palette.bg : "transparent",
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

  if (!onEdit && !onDelete) return content;

  const action = (
    icon: keyof typeof Ionicons.glyphMap,
    bg: string,
    fg: string,
    onPress: () => void,
  ) => (
    <Pressable
      onPress={() => {
        swipeRef.current?.close();
        onPress();
      }}
      style={{ width: 72, alignItems: "center", justifyContent: "center", backgroundColor: bg }}
    >
      <Ionicons name={icon} size={22} color={fg} />
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeRef}
      overshootRight={false}
      renderRightActions={() => (
        <View style={{ flexDirection: "row" }}>
          {onEdit && action("create-outline", palette.surfaceElevated, palette.text, onEdit)}
          {onDelete && action("trash-outline", accent.danger, "#FFFFFF", onDelete)}
        </View>
      )}
    >
      {content}
    </Swipeable>
  );
}
