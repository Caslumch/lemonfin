import React from 'react';

/**
 * Text input with optional currency prefix and leading icon.
 * Border darkens on focus; turns danger on error.
 */
export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
  iconLeft,
  error = false,
  disabled = false,
  size = 'md',
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const heights = { sm: 38, md: 46, lg: 52 };
  const h = heights[size] || heights.md;

  const borderColor = error ? 'var(--danger)' : (focus ? 'var(--dark)' : 'var(--border-strong)');
  const padLeft = prefix ? 42 : (iconLeft ? 42 : 16);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', ...style }}>
      {prefix && (
        <span style={{ position: 'absolute', left: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-tertiary)', pointerEvents: 'none' }}>{prefix}</span>
      )}
      {iconLeft && !prefix && (
        <span style={{ position: 'absolute', left: 14, width: 18, height: 18, color: 'var(--text-tertiary)', display: 'inline-flex' }}>{iconLeft}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%', height: h, boxSizing: 'border-box',
          padding: `0 16px 0 ${padLeft}px`,
          fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)',
          background: disabled ? 'var(--surface-inset)' : 'var(--surface)',
          border: `1.5px solid ${borderColor}`,
          borderRadius: 'var(--radius-sm)',
          outline: 'none',
          boxShadow: focus && !error ? '0 0 0 4px var(--focus-ring)' : 'none',
          transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
          opacity: disabled ? 0.6 : 1,
        }}
        {...rest}
      />
    </div>
  );
}
