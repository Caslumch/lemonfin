"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { ChatMessage } from "./chat-message";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  isOpen: boolean;
}

const SUGGESTIONS = [
  "Estou gastando muito?",
  "Onde posso economizar?",
  "Resumo do mes",
];

export function ChatPanel({ isOpen }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { token } = useApi();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !token) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
    };

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Erro ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "text") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.text,
                  };
                }
                return updated;
              });
            } else if (parsed.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: parsed.message,
                  };
                }
                return updated;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      console.error("[ChatPanel] Error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: "Desculpe, tive um problema ao processar sua mensagem. Tente novamente.",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div
      className={cn(
        "fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl bg-page border border-border shadow-xl transition-all duration-300",
        isOpen
          ? "h-[520px] opacity-100 translate-y-0"
          : "h-0 opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-surface">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lima text-dark">
          <Sparkles size={16} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-fg font-[family-name:var(--font-display)]">
            LemonFin IA
          </p>
          <p className="text-xs text-fg-muted">Seu assistente financeiro</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:text-danger hover:bg-danger-muted disabled:opacity-30 cursor-pointer"
            aria-label="Limpar conversa"
            title="Limpar conversa"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lima/10">
              <Sparkles size={24} className="text-lima" />
            </div>
            <div>
              <p className="text-sm font-medium text-fg">
                Ola! Sou seu assistente financeiro.
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Pergunte sobre seus gastos, receitas ou dicas.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-fg-secondary transition-colors hover:bg-subtle cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages
              .filter((msg) => msg.content || msg.role === "user")
              .map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                />
              ))}
            {isLoading && (
              <p className="text-xs text-fg-muted italic pl-9">
                LemonFin está digitando...
              </p>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border px-4 py-3 bg-surface"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo..."
          disabled={isLoading}
          className="flex-1 rounded-lg border border-border bg-page px-3 py-2 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-lima transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-dark text-white transition-all hover:brightness-120 disabled:opacity-30 cursor-pointer"
          aria-label="Enviar mensagem"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
