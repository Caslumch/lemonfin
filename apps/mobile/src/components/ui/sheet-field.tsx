import { View, type TextInputProps } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { Txt } from "./text";

// Campo de texto para uso DENTRO de bottom sheets (usa BottomSheetTextInput,
// que coordena com o teclado do gorhom).
export function SheetField({ label, style, ...props }: { label: string } & TextInputProps) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="small" color={palette.textSecondary}>{label}</Txt>
      <BottomSheetTextInput
        placeholderTextColor={palette.textTertiary}
        style={[
          {
            height: 50,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.surface,
            paddingHorizontal: 16,
            fontFamily: fonts.sans,
            fontSize: 16,
            color: palette.text,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}
