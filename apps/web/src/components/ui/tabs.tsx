"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string }[];
  className?: string;
}

export function Tabs({ value, onValueChange, items, className }: TabsProps) {
  return (
    <div
      className={cn(
        "inline-flex bg-muted p-[3px] rounded-lg",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onValueChange(item.value)}
          className={cn(
            "px-5 py-2 text-[13px] font-medium rounded-lg transition-all duration-150 cursor-pointer",
            value === item.value
              ? "bg-surface shadow-sm font-semibold text-fg"
              : "text-fg-secondary hover:text-fg"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
