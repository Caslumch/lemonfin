"use client";

import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { Category } from "@/types/transaction";

interface FiltersBarProps {
  type: string;
  onTypeChange: (type: string) => void;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  categories: Category[];
}

export function FiltersBar({
  type,
  onTypeChange,
  categoryId,
  onCategoryChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  categories,
}: FiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
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
      <select
        value={categoryId}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="rounded-md border-[1.5px] border-border bg-surface px-3 py-2 text-sm text-fg transition-colors focus:border-fg focus:outline-none"
      >
        <option value="">Todas categorias</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="!py-2 !text-xs"
        />
        <span className="text-fg-muted text-xs">ate</span>
        <Input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="!py-2 !text-xs"
        />
      </div>
    </div>
  );
}
