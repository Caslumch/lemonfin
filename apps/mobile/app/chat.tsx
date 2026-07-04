import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useTheme } from "@/theme/use-theme";
import { accent, fonts, radii } from "@/theme/tokens";
import { streamChat } from "@/lib/chat-stream";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const newId = () => Math.random().toString(36).slice(2);

// Chat do "Limão" — tela empilhada sobre a Home (§7 do DS), com streaming SSE
// real contra /chat/completions (via expo/fetch).
function Bubble({ me, children }: { me?: boolean; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        alignSelf: me ? "flex-end" : "flex-start",
        maxWidth: "82%",
        backgroundColor: me ? accent.primary : palette.surface,
        borderWidth: me ? 0 : 1,
        borderColor: palette.border,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: me ? 18 : 5,
        borderBottomRightRadius: me ? 5 : 18,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <Txt variant="small" color={me ? "#0D0D0D" : palette.text}>
        {children}
      </Txt>
    </View>
  );
}

export default function ChatScreen() {
  const { palette } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Oi! 🍋 Sou o Limão. Posso te ajudar com seus gastos, metas e dúvidas financeiras. Manda ver!",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Cancela um stream em andamento se a tela for fechada.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const asstId = newId();
    setMessages((prev) => [
      ...prev,
      { id: newId(), role: "user", content: text },
      { id: asstId, role: "assistant", content: "" },
    ]);
    setInput("");
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        text,
        history,
        (token) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === asstId ? { ...m, content: m.content + token } : m)),
          ),
        controller.signal,
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstId
            ? { ...m, content: `${m.content}\n⚠️ ${(err as Error).message}` }
            : m,
        ),
      );
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  return (
    <Screen bottomInset>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={palette.text} />
        </Pressable>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: accent.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="sparkles" size={18} color="#0D0D0D" />
        </View>
        <View>
          <Txt variant="bodyMedium">Limão</Txt>
          <Txt variant="small" color={accent.success}>
            ● Online
          </Txt>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
        style={{ flex: 1 }}
      >
        {/* Mensagens */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => (
            <Bubble key={m.id} me={m.role === "user"}>
              {m.content || "…"}
            </Bubble>
          ))}
        </ScrollView>

        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            paddingHorizontal: 14,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: palette.border,
            backgroundColor: palette.surface,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
            placeholder="Escreva sua pergunta…"
            placeholderTextColor={palette.textTertiary}
            editable={!sending}
            style={{
              flex: 1,
              backgroundColor: palette.surfaceElevated,
              borderRadius: radii.full,
              paddingVertical: 12,
              paddingHorizontal: 16,
              fontFamily: fonts.sans,
              fontSize: 15,
              color: palette.text,
            }}
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || sending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: accent.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: !input.trim() || sending ? 0.5 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#0D0D0D" />
            ) : (
              <Ionicons name="send" size={18} color="#0D0D0D" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
