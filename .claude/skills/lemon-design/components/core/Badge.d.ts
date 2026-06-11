import * as React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** Fixed category palette key (en or pt): food/alimentacao, transport/transporte, housing/moradia, leisure/lazer, health/saude, education/educacao, shopping/compras, salary/salario, freelance, other/outros. */
  category?: string;
  /** Semantic financial status. */
  status?: 'income' | 'expense' | 'warning' | 'neutral' | 'lemon' | 'grape';
  /** @default "md" */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

/** Pill badge for transaction categories / financial status. */
export function Badge(props: BadgeProps): JSX.Element;
