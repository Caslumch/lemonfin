import React from 'react';
import { Badge } from '../core/Badge.jsx';

function formatBRL(n) {
  if (typeof n !== 'number') return n;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * A single transaction row: category badge, title + metadata, signed amount,
 * and optional edit/delete actions. Renders as a soft rounded card.
 */
export function TransactionRow({
  title,
  category,
  categoryLabel,
  meta,
  amount,
  type = 'expense',
  logo,
  onEdit,
  onDelete,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const isIncome = type === 'income';
  const sign = isIncome ? '+' : '-';
  const color = isIncome ? 'var(--success-strong)' : 'var(--danger)';
  const display = typeof amount === 'number' ? `${sign} R$ ${formatBRL(Math.abs(amount))}` : amount;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: hover ? 'var(--shadow-sm)' : 'none',
        transition: 'box-shadow var(--duration-fast)',
        ...style,
      }}
      {...rest}
    >
      {/* Leading: logo or category badge */}
      {logo ? (
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--surface-inset)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {typeof logo === 'string' ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : logo}
        </div>
      ) : (
        <div style={{ width: 96, flexShrink: 0 }}>
          <Badge category={category}>{categoryLabel || category}</Badge>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {meta && <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 3 }}>{meta}</div>}
      </div>

      {/* Amount */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 15,
        color, whiteSpace: 'nowrap', fontFeatureSettings: 'var(--num-features)',
      }}>{display}</div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: 4, opacity: hover ? 1 : 0.35, transition: 'opacity var(--duration-fast)' }}>
          {onEdit && (
            <button onClick={onEdit} aria-label="Editar" style={actionBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} aria-label="Excluir" style={actionBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const actionBtn = {
  width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
  color: 'var(--text-tertiary)', cursor: 'pointer',
};
