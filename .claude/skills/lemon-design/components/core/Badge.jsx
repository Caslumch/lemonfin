import React from 'react';

/* Category → CSS var pairs (see tokens/colors.css). */
const CATEGORIES = {
  food: 'food', alimentacao: 'food',
  transport: 'transport', transporte: 'transport',
  housing: 'housing', moradia: 'housing',
  leisure: 'leisure', lazer: 'leisure',
  health: 'health', saude: 'health',
  education: 'education', educacao: 'education',
  shopping: 'shopping', compras: 'shopping',
  salary: 'salary', salario: 'salary',
  freelance: 'freelance',
  other: 'other', outros: 'other',
};

const STATUS = {
  income:  { bg: 'var(--success-muted)', fg: 'var(--success-strong)' },
  expense: { bg: 'var(--danger-muted)',  fg: 'var(--danger-strong)' },
  warning: { bg: 'var(--warning-muted)', fg: '#B45309' },
  neutral: { bg: 'var(--surface-inset)', fg: 'var(--text-secondary)' },
  lemon:   { bg: 'var(--lemon-100)',     fg: '#5C6B00' },
  grape:   { bg: 'var(--grape-100)',     fg: 'var(--grape-700)' },
};

/**
 * Pill badge for transaction categories or financial status.
 * Pass `category` for the fixed category palette, or `status` for semantics.
 */
export function Badge({
  children,
  category,
  status,
  size = 'md',
  style,
  ...rest
}) {
  let bg = 'var(--surface-inset)', fg = 'var(--text-secondary)';
  if (category) {
    const key = CATEGORIES[String(category).toLowerCase()] || 'other';
    bg = `var(--cat-${key}-bg)`;
    fg = `var(--cat-${key}-fg)`;
  } else if (status) {
    const s = STATUS[status] || STATUS.neutral;
    bg = s.bg; fg = s.fg;
  }
  const pad = size === 'sm' ? '3px 9px' : '5px 12px';
  const fs = size === 'sm' ? 11 : 12;

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: bg, color: fg,
        padding: pad, fontSize: fs, fontWeight: 600,
        fontFamily: 'var(--font-body)', lineHeight: 1.2,
        borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
