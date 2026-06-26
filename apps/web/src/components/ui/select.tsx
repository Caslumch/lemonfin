"use client";

import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: ReactNode;
  // Texto exibido no gatilho quando selecionado, se diferente de `label`.
  triggerLabel?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  // Ícone opcional à esquerda do gatilho (ex.: lupa, filtro).
  icon?: ReactNode;
  label?: string;
  id?: string;
  className?: string;
  // Largura do menu: por padrão acompanha o gatilho (w-full). Use "auto" para
  // menus compactos (ex.: ordenação) cuja largura segue o conteúdo.
  menuWidth?: "trigger" | "auto";
  "aria-label"?: string;
}

// Dropdown custom da plataforma — mesma identidade visual do seletor de parcelas
// (botão + lista, chevron, checkmark lima no item ativo, abre p/ cima ou baixo).
// Substitui os <select> nativos para manter a UI consistente em todo o app.
const SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2.5 text-sm",
} as const;

const MENU_MAX_H = 240; // mantém em sincronia com max-h-60 (15rem)

export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  disabled = false,
  size = "md",
  icon,
  label,
  id,
  className,
  menuWidth = "trigger",
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);

  // Abre decidindo a direção: se não couber abaixo na viewport, abre para cima.
  function toggle() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setDropUp(spaceBelow < MENU_MAX_H + 16 && spaceAbove > spaceBelow);
    }
    setOpen(true);
  }

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Fecha com Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-fg mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative" ref={wrapRef}>
        <button
          id={id}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border-[1.5px] border-border bg-surface text-fg transition-colors duration-150 focus:border-fg focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
            SIZES[size],
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon && <span className="shrink-0 text-fg-muted">{icon}</span>}
            <span
              className={cn(
                "truncate",
                !selected && "text-fg-muted",
              )}
            >
              {selected
                ? (selected.triggerLabel ?? selected.label)
                : placeholder}
            </span>
          </span>
          <ChevronDown
            size={size === "sm" ? 14 : 16}
            className={cn(
              "shrink-0 text-fg-muted transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <ul
            role="listbox"
            className={cn(
              "absolute z-30 max-h-60 overflow-y-auto rounded-md border-[1.5px] border-border bg-surface py-1 shadow-lg",
              menuWidth === "trigger" ? "w-full" : "min-w-full w-max",
              dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
            )}
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3.5 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed",
                      active ? "font-medium text-fg" : "text-fg-muted",
                    )}
                  >
                    <span className="truncate text-left">{opt.label}</span>
                    {active && <Check size={15} className="shrink-0 text-lima" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
