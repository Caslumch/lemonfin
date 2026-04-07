"use client";

import { CategoryIcon } from "@/components/ui/category-icon";
import type { CategoryBreakdown as CategoryBreakdownType } from "@/types/transaction";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface CategoryBreakdownProps {
  data: CategoryBreakdownType[];
  loading?: boolean;
}

export function CategoryBreakdown({ data, loading }: CategoryBreakdownProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 bg-muted rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="h-1.5 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxTotal = data[0]?.total ?? 1;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 animate-fade-in-up">
      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-fg mb-4">
        Gastos por categoria
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-fg-muted">Nenhum gasto registrado.</p>
      ) : (
        <div className="space-y-3">
          {data.map((item, index) => {
            const percent = (item.total / maxTotal) * 100;
            return (
              <div
                key={item.categoryId}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-fg">
                    <CategoryIcon slug={item.category?.slug} size={14} className="inline mr-1.5" />
                    {item.category?.name ?? "Outros"}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-sm text-fg-secondary">
                    {formatCurrency(item.total)}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      backgroundColor:
                        item.category?.colorText ?? "var(--color-fg-muted)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
