import { fetch as expoFetch } from "expo/fetch";
import { API_URL } from "./api";
import { getToken } from "./token-store";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

// Stream do chat "Limão" contra POST /chat/completions (SSE).
// Usa expo/fetch (suporta response.body streaming no RN). O backend emite
// linhas `data: {"type":"text","text":"…"}` e finaliza com `data: [DONE]`.
export async function streamChat(
  message: string,
  history: ChatHistoryItem[],
  onToken: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const res = await expoFetch(`${API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Erro ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Eventos SSE são separados por linha em branco.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      const line = evt.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      let parsed: { type?: string; text?: string; message?: string };
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }
      if (parsed.type === "error") throw new Error(parsed.message || "Erro no chat.");
      if (parsed.type === "text" && parsed.text) onToken(parsed.text);
    }
  }
}
