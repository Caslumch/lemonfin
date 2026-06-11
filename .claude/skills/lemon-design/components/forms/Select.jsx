import React from 'react';

/** Native-styled select matching the LemonFin input language. */
export function Select({
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  size = 'md',
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const heights = { sm: 38, md: 46, lg: 52 };
  const h = heights[size] || heights.md;

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%', height: h, boxSizing: 'border-box',
          padding: '0 40px 0 16px',
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: value ? 'var(--text-primary)' : 'var(--text-placeholder)',
          background: 'var(--surface)',
          border: `1.5px solid ${focus ? 'var(--dark)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-sm)',
          appearance: 'none', WebkitAppearance: 'none', outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: focus ? '0 0 0 4px var(--focus-ring)' : 'none',
          transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
        }}
        {...rest}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => {
          const val = typeof o === 'string' ? o : o.value;
          const lbl = typeof o === 'string' ? o : o.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      <span style={{
        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: 'var(--text-secondary)', display: 'inline-flex',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </div>
  );
}
