import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Chip } from "@/components/ui/chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  useCategories,
  useCreateTransaction,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { fonts } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

type TxType = "EXPENSE" | "INCOME";

// Nova transação — form real (create loop). Registra via POST /transactions e
// invalida os caches, então aparece na hora na Home/Extrato.
export default function NovaScreen() {
  const { palette } = useTheme();
  const categories = useCategories();
  const create = useCreateTransaction();

  const amountRef = useRef<TextInput>(null);
  const [raw, setRaw] = useState("");
  const [type, setType] = useState<TxType>("EXPENSE");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const cents = Number(raw || "0");
  const amount = cents / 100;
  const canSave = amount > 0 && !!categoryId && !create.isPending;

  function handleSave() {
    if (!canSave || !categoryId) return;
    create.mutate(
      { amount, type, categoryId, description: description.trim() || undefined },
      {
        onSuccess: () => router.back(),
        onError: (err) =>
          Alert.alert("Não foi possível salvar", (err as Error).message),
      },
    );
  }

  return (
    <Screen padded bottomInset>
      {/* Grabber */}
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <View style={{ width: 40, height: 5, borderRadius: 9999, backgroundColor: palette.border }} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Txt variant="title">Nova transação</Txt>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={palette.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Toggle tipo */}
          <SegmentedControl<TxType>
            value={type}
            onChange={setType}
            segments={[
              { key: "EXPENSE", label: "Saída" },
              { key: "INCOME", label: "Entrada" },
            ]}
          />

          {/* Valor (input de moeda em centavos) */}
          <Pressable
            onPress={() => amountRef.current?.focus()}
            style={{ alignItems: "center", paddingVertical: 28 }}
          >
            <Txt
              style={{ fontFamily: fonts.outfit, fontSize: 44 }}
              color={amount > 0 ? palette.text : palette.textTertiary}
            >
              {formatBRL(amount)}
            </Txt>
            <TextInput
              ref={amountRef}
              value={raw}
              onChangeText={(t) => setRaw(t.replace(/\D/g, "").slice(0, 9))}
              keyboardType="number-pad"
              autoFocus
              style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
            />
          </Pressable>

          {/* Categoria */}
          <Txt variant="caption" color={palette.textTertiary} style={{ marginBottom: 10 }}>
            Categoria
          </Txt>
          {categories.isLoading ? (
            <Txt variant="small" color={palette.textTertiary}>
              Carregando…
            </Txt>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(categories.data ?? []).map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.icon ?? ""} ${c.name}`.trim()}
                  active={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </View>
          )}

          {/* Descrição */}
          <View style={{ marginTop: 24 }}>
            <TextField
              label="Descrição (opcional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: mercado da esquina"
            />
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Button
        label={type === "EXPENSE" ? "Salvar saída" : "Salvar entrada"}
        onPress={handleSave}
        loading={create.isPending}
        disabled={!canSave}
      />
    </Screen>
  );
}
