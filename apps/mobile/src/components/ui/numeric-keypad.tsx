import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { Txt } from "./text";

// Teclado numérico grande do DS (nova transação). Opera sobre `value` = string
// de dígitos (centavos); "00" agiliza valores redondos, ⌫ apaga.
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"];

export function NumericKeypad({
  value,
  onChange,
  maxDigits = 9,
}: {
  value: string;
  onChange: (raw: string) => void;
  maxDigits?: number;
}) {
  const { palette } = useTheme();

  const press = (k: string) => {
    if (k === "back") onChange(value.slice(0, -1));
    else onChange((value + k).slice(0, maxDigits));
  };

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => press(k)}
          style={({ pressed }) => ({
            width: "33.333%",
            height: 58,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: pressed ? palette.surfaceElevated : "transparent",
          })}
        >
          {k === "back" ? (
            <Ionicons name="backspace-outline" size={24} color={palette.text} />
          ) : (
            <Txt style={{ fontFamily: fonts.outfitSemi, fontSize: 24 }}>{k}</Txt>
          )}
        </Pressable>
      ))}
    </View>
  );
}
