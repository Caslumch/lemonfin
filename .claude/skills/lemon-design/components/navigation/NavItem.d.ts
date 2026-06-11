import * as React from 'react';

export interface NavItemProps {
  icon: React.ReactNode;
  /** Omit for an icon-only rail item. */
  label?: React.ReactNode;
  active?: boolean;
  /** @default "light" */
  tone?: 'light' | 'dark';
  /** Optional count pill. */
  badge?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** Sidebar navigation item (light pill or dark rail). */
export function NavItem(props: NavItemProps): JSX.Element;
