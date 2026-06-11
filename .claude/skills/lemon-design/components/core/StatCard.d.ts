import * as React from 'react';

/**
 * Props for StatCard.
 * @startingPoint section="Finance" subtitle="Summary metric cards" viewport="700x420"
 */
export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Sub-line, e.g. "3 transações" or "+28%". */
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  /** Icon chip color. Defaults to neutral (light) / lemon (dark). */
  iconTone?: 'lemon' | 'grape' | 'success' | 'danger' | 'warning' | 'neutral' | 'on-dark';
  /** @default "light" */
  tone?: 'light' | 'muted' | 'dark' | 'lemon';
  /** Tint the big value semantically. @default "default" */
  valueColor?: 'default' | 'success' | 'danger' | 'warning';
  /** Top-right slot (e.g. a kebab IconButton). */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Summary metric card (Entradas / Saídas / Saldo / Total Balance). */
export function StatCard(props: StatCardProps): JSX.Element;
