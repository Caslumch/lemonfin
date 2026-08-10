import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { formatBRL } from "@/lib/format";

// Input de valor (centavos) para uso DENTRO de bottom sheets. `raw` = dígitos.
export function AmountInput({
  raw,
  onChange,
  autoFocus,
}: {
  raw: string;
  onChange: (raw: string) => void;
  autoFocus?: boolean;
}) {
  const { palette } = useTheme();
  const amount = Number(raw || "0") / 100;
  return (
    <BottomSheetTextInput
      value={formatBRL(amount)}
      onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 9))}
      keyboardType="number-pad"
      autoFocus={autoFocus}
      style={{
        fontFamily: fonts.outfit,
        fontSize: 40,
        textAlign: "center",
        paddingVertical: 12,
        color: amount > 0 ? palette.text : palette.textTertiary,
      }}
    />
  );
}
