"use client";

import { useState } from "react";
import { ChatFab } from "./chat-fab";
import { ChatPanel } from "./chat-panel";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ChatPanel isOpen={isOpen} />
      <ChatFab
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
      />
    </>
  );
}
