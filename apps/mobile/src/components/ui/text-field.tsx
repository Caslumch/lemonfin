import { Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, ...props }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-medium text-sm text-gray-500">{label}</Text>
      <TextInput
        className="h-12 rounded-2xl border border-gray-200 bg-white px-4 font-sans text-base text-dark"
        placeholderTextColor="#9E9E9E"
        {...props}
      />
    </View>
  );
}
