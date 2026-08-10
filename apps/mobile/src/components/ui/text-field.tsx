import { TextInput, View, type TextInputProps } from "react-native";
import { fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { Txt } from "./text";

interface TextFieldProps extends TextInputProps {
  label: string;
}

// Input do DS: altura 48+ (alvo de toque), base 16px (evita zoom do iOS),
// cores do tema. Label em small/textSecondary.
export function TextField({ label, style, ...props }: TextFieldProps) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="small" color={palette.textSecondary}>
        {label}
      </Txt>
      <TextInput
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
