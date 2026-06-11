import * as React from 'react';

/**
 * Props for CreditCard.
 * @startingPoint section="Finance" subtitle="Lemon credit card visual" viewport="380x260"
 */
export interface CreditCardProps {
  /** @default "VISA" */
  brand?: string;
  /** Big balance figure, e.g. "R$ 3.265,75". */
  balance?: React.ReactNode;
  /** @default "**** **** **** 2342" */
  number?: string;
  /** @default "05/29" */
  exp?: string;
  holder?: string;
  /** @default "lemon" */
  tone?: 'lemon' | 'dark';
  /** Show the grape gradient card peeking behind. @default true */
  stacked?: boolean;
  style?: React.CSSProperties;
}

/** Lemon credit card visual with grape gradient behind. */
export function CreditCard(props: CreditCardProps): JSX.Element;
