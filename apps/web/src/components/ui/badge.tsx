"use client";

import { cn } from "@/lib/utils";

type CategorySlug =
  | "alimentacao"
  | "transporte"
  | "moradia"
  | "saude"
  | "lazer"
  | "educacao"
  | "compras"
  | "salario"
  | "freelance"
  | "outros";

type StatusType = "income" | "expense" | "warning";

interface CategoryBadgeProps {
  category: CategorySlug;
  children: React.ReactNode;
  className?: string;
}

interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  className?: string;
}

export type BadgeProps = CategoryBadgeProps | StatusBadgeProps;

const categoryStyles: Record<CategorySlug, string> = {
  alimentacao: "bg-cat-alimentacao text-cat-alimentacao-text",
  transporte: "bg-cat-transporte text-cat-transporte-text",
  moradia: "bg-cat-moradia text-cat-moradia-text",
  saude: "bg-cat-saude text-cat-saude-text",
  lazer: "bg-cat-lazer text-cat-lazer-text",
  educacao: "bg-cat-educacao text-cat-educacao-text",
  compras: "bg-cat-compras text-cat-compras-text",
  salario: "bg-cat-salario text-cat-salario-text",
  freelance: "bg-cat-freelance text-cat-freelance-text",
  outros: "bg-cat-outros text-cat-outros-text",
};

const statusStyles: Record<StatusType, string> = {
  income: "bg-success-muted text-success",
  expense: "bg-danger-muted text-danger",
  warning: "bg-warning-muted text-warning",
};

function isCategoryBadge(props: BadgeProps): props is CategoryBadgeProps {
  return "category" in props;
}

export function Badge(props: BadgeProps) {
  const style = isCategoryBadge(props)
    ? categoryStyles[props.category]
    : statusStyles[props.status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
        style,
        props.className
      )}
    >
      {props.children}
    </span>
  );
}
