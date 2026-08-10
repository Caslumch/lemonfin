import { Pressable, View } from "react-native";
import { fonts, radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { Txt } from "./text";

export interface Segment<T extends string> {
  key: T;
  label: string;
}

// Segmented control do DS: trilho surfaceElevated, item ativo em `surface`
// com sombra sutil. Usado no filtro Geral/Entradas/Saídas.
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: palette.surfaceElevated,
        borderRadius: radii.md,
        padding: 4,
        gap: 4,
      }}
    >
      {segments.map((seg) => {
        const active = seg.key === value;
        return (
          <Pressable
            key={seg.key}
            onPress={() => onChange(seg.key)}
            style={{
              flex: 1,
              height: 38,
              borderRadius: radii.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? palette.surface : "transparent",
              shadowColor: "#000",
              shadowOpacity: active ? 0.06 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <Txt
              style={{
                fontFamily: active ? fonts.sansSemi : fonts.sansMedium,
                fontSize: 14,
              }}
              color={active ? palette.text : palette.textSecondary}
            >
              {seg.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
