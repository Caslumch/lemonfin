import * as React from 'react';

export interface InputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  /** Fixed monetary prefix, e.g. "R$". */
  prefix?: string;
  iconLeft?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/** Text / currency input. */
export function Input(props: InputProps): JSX.Element;
