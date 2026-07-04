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
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { Txt } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Chip } from "@/components/ui/chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  useCategories,
  useCreateTransaction,
  useUpdateTransaction,
} from "@/hooks/use-financial-data";
import { useTheme } from "@/theme/use-theme";
import { fonts } from "@/theme/tokens";
import { formatBRL } from "@/lib/format";

type TxType = "EXPENSE" | "INCOME";

// Nova transação (FAB) e edição (swipe no Extrato) compartilham este form.
// Sem params → cria (POST); com `id` → edita (PATCH). Ambos invalidam os
// caches, refletindo na hora na Home/Extrato.
export default function NovaScreen() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{
    id?: string;
    cents?: string;
    type?: string;
    categoryId?: string;
    description?: string;
  }>();
  const isEdit = !!params.id;

  const categories = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const pending = create.isPending || update.isPending;

  const amountRef = useRef<TextInput>(null);
  const [raw, setRaw] = useState(params.cents ?? "");
  const [type, setType] = useState<TxType>(params.type === "INCOME" ? "INCOME" : "EXPENSE");
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId || null);
  const [description, setDescription] = useState(params.description ?? "");

  const cents = Number(raw || "0");
  const amount = cents / 100;
  const canSave = amount > 0 && !!categoryId && !pending;

  function handleSave() {
    if (!canSave || !categoryId) return;
    const onDone = {
      onSuccess: () => router.back(),
      onError: (err: unknown) =>
        Alert.alert("Não foi possível salvar", (err as Error).message),
    };
    const input = { amount, type, categoryId, description: description.trim() || undefined };
    if (isEdit && params.id) {
      update.mutate({ id: params.id, input }, onDone);
    } else {
      create.mutate(input, onDone);
    }
  }

  return (
    <Screen padded bottomInset>
      {/* Grabber */}
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <View style={{ width: 40, height: 5, borderRadius: 9999, backgroundColor: palette.border }} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Txt variant="title">{isEdit ? "Editar transação" : "Nova transação"}</Txt>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={palette.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
              autoFocus={!isEdit}
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
        label={isEdit ? "Salvar alterações" : type === "EXPENSE" ? "Salvar saída" : "Salvar entrada"}
        onPress={handleSave}
        loading={pending}
        disabled={!canSave}
      />
    </Screen>
  );
}
