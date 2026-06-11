import React from 'react';

/**
 * Segmented control — the pill toggle group (Todas / Despesas / Receitas).
 * Active tab gets a white pill with a soft shadow.
 */
export function Tabs({
  tabs = [],
  value,
  onChange,
  size = 'md',
  style,
  ...rest
}) {
  const pad = size === 'sm' ? '7px 16px' : '9px 20px';
  const fs = size === 'sm' ? 13 : 14;

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'var(--surface-inset)',
        padding: 4, borderRadius: 'var(--radius-full)',
        ...style,
      }}
      {...rest}
    >
      {tabs.map((t) => {
        const val = typeof t === 'string' ? t : t.value;
        const lbl = typeof t === 'string' ? t : t.label;
        const active = val === value;
        return (
          <button
            key={val}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(val)}
            style={{
              padding: pad, fontSize: fs,
              fontFamily: 'var(--font-body)',
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: active ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              boxShadow: active ? 'var(--shadow-xs)' : 'none',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all var(--duration-fast) var(--ease-out)',
            }}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}
