import * as React from 'react';

/**
 * Props for the LemonFin Button.
 * @startingPoint section="Core" subtitle="Buttons in every variant & size" viewport="700x430"
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual style. @default "primary" */
  variant?: 'primary' | 'secondary' | 'grape' | 'outline' | 'ghost' | 'danger';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Fully rounded pill shape (Send/Receive style). @default false */
  pill?: boolean;
  /** Full-width. @default false */
  block?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/** Primary action button for LemonFin. */
export function Button(props: ButtonProps): JSX.Element;
