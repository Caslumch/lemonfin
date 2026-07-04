import { Pressable } from "react-native";
import { accent, fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { Txt } from "./text";

// Chip/pill do DS — filtros e seleção. Ativo `primary`, inativo surfaceElevated.
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 40,
        paddingHorizontal: 14,
        borderRadius: radii.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? accent.primary : palette.surfaceElevated,
      }}
    >
      <Txt
        style={{ fontFamily: fonts.sansMedium, fontSize: 14 }}
        color={active ? "#0D0D0D" : palette.text}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
