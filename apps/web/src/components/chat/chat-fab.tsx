"use client";

import { X, BotMessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

function LemonIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Folha */}
      <path
        d="M14.5 5.5c1.2-.8 2.5-1 3.2-.3c.7.7.5 2-.3 3.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Corpo do limao siciliano — oval alongado com pontas */}
      <path
        d="M5 13.5c-.8-3 .2-5.5 2.2-7c2-1.5 4.5-1.8 7-.8c2.5 1 4.2 3 4.8 5.5c.6 2.5-.2 5-2 6.5c-1.8 1.5-4.5 1.8-7 .8C7.5 17.5 5.8 16.5 5 13.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface ChatFabProps {
  isOpen: boolean;
  onToggle: () => void;
  hasNotification?: boolean;
}

export function ChatFab({ isOpen, onToggle, hasNotification }: ChatFabProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-lima text-dark shadow-xl transition-all duration-200 hover:brightness-110 active:scale-95 cursor-pointer",
        isOpen && "bg-dark dark:bg-surface-raised text-white",
      )}
      aria-label={isOpen ? "Fechar chat" : "Abrir chat"}
    >
      {isOpen ? <X size={24} /> : <BotMessageSquare size={24} />}
      {!isOpen && hasNotification && (
        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-lima border-2 border-dark" />
      )}
    </button>
  );
}
