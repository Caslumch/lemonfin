import React from 'react';

const SIZES = {
  sm: { padding: '8px 16px',  fontSize: 13, height: 36, gap: 6,  iconSize: 16 },
  md: { padding: '11px 22px', fontSize: 14, height: 44, gap: 8,  iconSize: 18 },
  lg: { padding: '14px 28px', fontSize: 15, height: 52, gap: 10, iconSize: 20 },
};

const VARIANTS = {
  primary: {
    background: 'var(--lemon-400)', color: 'var(--text-on-lemon)',
    border: '1px solid transparent',
    '--hover-bg': 'var(--lemon-hover)',
  },
  secondary: {
    background: 'var(--dark)', color: 'var(--text-on-dark)',
    border: '1px solid transparent',
    '--hover-bg': '#000',
  },
  grape: {
    background: 'var(--grape-500)', color: 'var(--text-on-grape)',
    border: '1px solid transparent',
    '--hover-bg': 'var(--grape-600)',
  },
  outline: {
    background: 'transparent', color: 'var(--text-primary)',
    border: '1.5px solid var(--border-strong)',
    '--hover-bg': 'var(--surface-inset)',
  },
  ghost: {
    background: 'transparent', color: 'var(--text-secondary)',
    border: '1px solid transparent',
    '--hover-bg': 'var(--surface-inset)',
  },
  danger: {
    background: 'var(--danger)', color: '#fff',
    border: '1px solid transparent',
    '--hover-bg': 'var(--danger-strong)',
  },
};

/**
 * LemonFin primary action button. Pill-shaped, with optional leading/trailing icons.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  block = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const base = {
    display: block ? 'flex' : 'inline-flex',
    width: block ? '100%' : 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: s.fontSize,
    lineHeight: 1,
    minHeight: s.height,
    padding: s.padding,
    borderRadius: pill ? 'var(--radius-full)' : 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
    transition: 'background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out), filter var(--duration-fast)',
    background: hover && !disabled ? v['--hover-bg'] : v.background,
    color: v.color,
    border: v.border,
    transform: active && !disabled ? 'scale(0.97)' : 'scale(1)',
    ...style,
  };

  const iconStyle = { width: s.iconSize, height: s.iconSize, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={base}
      {...rest}
    >
      {iconLeft && <span style={iconStyle}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={iconStyle}>{iconRight}</span>}
    </button>
  );
}
