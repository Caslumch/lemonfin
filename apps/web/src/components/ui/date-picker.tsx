"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
// Os estilos-base do react-day-picker são importados globalmente em
// app/globals.css (ver comentário lá) — não aqui, para o cabeçalho de
// navegação não colapsar no Next 16.
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  // Valor em "YYYY-MM-DD" (mesmo formato do antigo <input type="date">).
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
}

// Converte "YYYY-MM-DD" <-> Date ancorado ao MEIO-DIA local. Usar meio-dia evita
// que mudanças de fuso/DST empurrem a data para o dia anterior na ida e volta.
function parseValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, 12, 0, 0);
}

function toValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatLabel(value: string): string {
  const date = parseValue(value);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Date-picker da plataforma: substitui o <input type="date"> nativo por um
// popover com calendário (react-day-picker, pt-BR), no mesmo estilo dos demais
// campos (borda, surface, chevron/ícone). Mantém o valor em "YYYY-MM-DD".
export function DatePicker({
  value,
  onChange,
  label,
  id,
  disabled = false,
  error,
  placeholder = "Selecione a data",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  // Posição do popover em coordenadas de VIEWPORT (position: fixed). O popover é
  // renderizado num PORTAL no <body>, não dentro do form — senão o overflow do
  // modal (form overflow-y-auto + container overflow-hidden) corta o topo do
  // calendário quando ele abre para cima. Ver date-picker clipping no modal.
  const [pos, setPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = parseValue(value);
  const MENU_H = 360;

  // Mede o trigger e decide abrir para baixo (top) ou para cima (bottom),
  // sempre em coordenadas de viewport para o popover fixo.
  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropUp = spaceBelow < MENU_H + 16 && spaceAbove > spaceBelow;
    setPos({
      left: rect.left,
      width: rect.width,
      ...(dropUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  }

  function toggle() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    place();
    setOpen(true);
  }

  // Reposiciona ao abrir e mantém alinhado em scroll/resize (o popover é fixo,
  // então precisa acompanhar o trigger que rola junto com o form).
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onScrollResize = () => place();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      // O popover vive num portal fora do wrapper — checa os dois.
      if (
        wrapRef.current &&
        !wrapRef.current.contains(t) &&
        popoverRef.current &&
        !popoverRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-fg mb-1.5">
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
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[12px] border-[1.5px] border-border bg-surface px-3.5 py-2.5 text-sm text-fg transition-colors duration-150 focus:border-fg focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-danger focus:border-danger",
          )}
        >
          <span className={cn("truncate", !selected && "text-fg-muted")}>
            {selected ? formatLabel(value) : placeholder}
          </span>
          <Calendar size={16} className="shrink-0 text-fg-muted" />
        </button>

        {open &&
          pos &&
          createPortal(
            <div
              ref={popoverRef}
              style={{
                position: "fixed",
                left: pos.left,
                top: pos.top,
                bottom: pos.bottom,
                minWidth: pos.width,
              }}
              className="z-[60] rounded-[16px] border-[1.5px] border-border bg-surface p-3 shadow-lg"
            >
              <DayPicker
                mode="single"
                locale={ptBR}
                defaultMonth={selected}
                selected={selected}
                onSelect={(d) => {
                  if (d) {
                    onChange(toValue(d));
                    setOpen(false);
                  }
                }}
                className="lemon-daypicker"
              />
            </div>,
            document.body,
          )}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
