import * as React from 'react';

export interface IconButtonProps {
  icon: React.ReactNode;
  /** @default "grape" */
  variant?: 'grape' | 'lemon' | 'dark' | 'light' | 'ghost' | 'dark-ghost';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** @default "full" */
  rounded?: 'full' | 'md';
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/** Circular icon-only button (the round "+" / bell affordances). */
export function IconButton(props: IconButtonProps): JSX.Element;
