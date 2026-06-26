"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import type { Category } from "@/types/transaction";

interface FiltersBarProps {
  type: string;
  onTypeChange: (type: string) => void;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  month: Date;
  onMonthChange: (month: Date) => void;
  search: string;
  onSearchChange: (search: string) => void;
  categories: Category[];
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatMonth(date: Date) {
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function FiltersBar({
  type,
  onTypeChange,
  categoryId,
  onCategoryChange,
  month,
  onMonthChange,
  search,
  onSearchChange,
  categories,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
      {/* Type filter */}
      <Tabs
        value={type}
        onValueChange={onTypeChange}
        items={[
          { value: "ALL", label: "Todas" },
          { value: "EXPENSE", label: "Despesas" },
          { value: "INCOME", label: "Receitas" },
        ]}
      />

      {/* Category filter */}
      <Select
        value={categoryId}
        onChange={onCategoryChange}
        size="md"
        className="sm:w-48"
        options={[
          { value: "", label: "Todas categorias" },
          ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
        ]}
      />

      {/* Month selector */}
      <div className="flex items-center rounded-[12px] border-[1.5px] border-border bg-surface">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => onMonthChange(addMonths(month, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-l-[10px] text-fg-secondary transition-colors hover:bg-muted hover:text-fg"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[120px] select-none px-1 text-center text-sm font-medium text-fg">
          {formatMonth(month)}
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-r-[10px] text-fg-secondary transition-colors hover:bg-muted hover:text-fg"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="relative sm:ml-auto sm:w-56">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar transação..."
          className="w-full rounded-[12px] border-[1.5px] border-border bg-surface py-2 pl-10 pr-3.5 text-sm text-fg placeholder:text-fg-muted transition-colors focus:border-fg focus:outline-none"
        />
      </div>
    </div>
  );
}
