import React from 'react';

const SIZES = { sm: 32, md: 40, lg: 48 };
const ICON = { sm: 16, md: 18, lg: 22 };

const VARIANTS = {
  grape:   { background: 'var(--grape-500)', color: '#fff', '--hover': 'var(--grape-600)' },
  lemon:   { background: 'var(--lemon-400)', color: 'var(--text-on-lemon)', '--hover': 'var(--lemon-hover)' },
  dark:    { background: 'var(--dark)', color: '#fff', '--hover': '#000' },
  light:   { background: 'var(--white)', color: 'var(--text-primary)', '--hover': 'var(--surface-inset)' },
  ghost:   { background: 'transparent', color: 'var(--text-secondary)', '--hover': 'var(--surface-inset)' },
  'dark-ghost': { background: 'rgba(255,255,255,0.08)', color: '#fff', '--hover': 'rgba(255,255,255,0.16)' },
};

/**
 * Circular icon-only button — the round "+" / bell / action affordances.
 */
export function IconButton({
  icon,
  variant = 'grape',
  size = 'md',
  rounded = 'full',
  disabled = false,
  ariaLabel,
  onClick,
  style,
  ...rest
}) {
  const dim = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.grape;
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dim, height: dim, flexShrink: 0,
        borderRadius: rounded === 'full' ? 'var(--radius-full)' : 'var(--radius-md)',
        border: variant === 'light' ? '1px solid var(--border)' : '1px solid transparent',
        background: hover && !disabled ? v['--hover'] : v.background,
        color: v.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--duration-fast) var(--ease-out), transform var(--duration-fast)',
        transform: active && !disabled ? 'scale(0.92)' : 'scale(1)',
        boxShadow: variant === 'light' ? 'var(--shadow-xs)' : 'none',
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: ICON[size], height: ICON[size], display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
    </button>
  );
}
