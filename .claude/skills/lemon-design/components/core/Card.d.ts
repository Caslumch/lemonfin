import * as React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  /** Surface tone. @default "light" */
  tone?: 'light' | 'muted' | 'dark' | 'lemon';
  /** @default "xl" */
  radius?: 'lg' | 'xl' | '2xl' | '3xl';
  /** Padding in px. @default 24 */
  padding?: number;
  border?: boolean;
  /** @default "sm" */
  shadow?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  /** Lift + shadow on hover. @default false */
  interactive?: boolean;
  style?: React.CSSProperties;
}

/** Rounded surface container; `dark` tone is the black accent card. */
export function Card(props: CardProps): JSX.Element;
