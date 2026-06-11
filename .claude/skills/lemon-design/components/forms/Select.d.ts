import * as React from 'react';

export type SelectOption = string | { value: string; label: string };

export interface SelectProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/** Styled dropdown select with chevron. */
export function Select(props: SelectProps): JSX.Element;
