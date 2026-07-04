import { ActivityIndicator, Pressable, Text } from "react-native";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}

// Botão base do design system. Primary = fundo lemon (#D4F400) com texto escuro
// (design-system.md §Button/Primary).
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      className={[
        "h-12 items-center justify-center rounded-2xl px-5",
        isPrimary ? "bg-primary" : "bg-transparent",
        inactive ? "opacity-50" : "active:opacity-80",
      ].join(" ")}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#1A1A1A" : "#6B6B6B"} />
      ) : (
        <Text
          className={`font-heading text-base ${
            isPrimary ? "text-dark" : "text-gray-500"
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
