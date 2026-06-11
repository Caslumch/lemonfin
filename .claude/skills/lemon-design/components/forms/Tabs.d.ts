import * as React from 'react';

export type TabItem = string | { value: string; label: string };

export interface TabsProps {
  tabs: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
  /** @default "md" */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

/** Pill segmented control (Todas / Despesas / Receitas). */
export function Tabs(props: TabsProps): JSX.Element;
