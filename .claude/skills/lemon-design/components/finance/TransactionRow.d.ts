import * as React from 'react';

/**
 * Props for TransactionRow.
 * @startingPoint section="Finance" subtitle="Transaction list rows" viewport="700x420"
 */
export interface TransactionRowProps {
  title: React.ReactNode;
  /** Category key for the badge palette (see Badge). */
  category?: string;
  /** Visible category label if different from the key. */
  categoryLabel?: React.ReactNode;
  /** Sub-line, e.g. "10 de jun. · Lucas · via WhatsApp". */
  meta?: React.ReactNode;
  /** Number (auto-formats to R$) or a preformatted string. */
  amount: number | string;
  /** @default "expense" */
  type?: 'income' | 'expense';
  /** Merchant logo URL or node — replaces the category badge as the leading element. */
  logo?: string | React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  style?: React.CSSProperties;
}

/** Transaction list row with category badge, metadata and signed amount. */
export function TransactionRow(props: TransactionRowProps): JSX.Element;
