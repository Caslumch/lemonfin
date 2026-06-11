import React from 'react';

/**
 * Surface container. `tone` switches between the light card and the black
 * accent card; `inset` removes default padding for custom layouts.
 */
export function Card({
  children,
  tone = 'light',
  radius = 'xl',
  padding = 24,
  border = true,
  shadow = 'sm',
  interactive = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const isDark = tone === 'dark';
  const isLemon = tone === 'lemon';

  const tones = {
    light: { background: 'var(--surface)', color: 'var(--text-primary)', border: border ? '1px solid var(--border)' : 'none' },
    muted: { background: 'var(--surface-muted)', color: 'var(--text-primary)', border: border ? '1px solid var(--border)' : 'none' },
    dark:  { background: 'var(--surface-dark)', color: 'var(--text-on-dark)', border: border ? '1px solid var(--border-dark)' : 'none' },
    lemon: { background: 'var(--lemon-400)', color: 'var(--text-on-lemon)', border: 'none' },
  };
  const t = tones[tone] || tones.light;

  const shadows = { none: 'none', xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' };
  const radii = { lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', '2xl': 'var(--radius-2xl)', '3xl': 'var(--radius-3xl)' };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: t.background,
        color: t.color,
        border: t.border,
        borderRadius: radii[radius] || 'var(--radius-xl)',
        padding,
        boxShadow: interactive && hover ? 'var(--shadow-md)' : (shadows[shadow] || 'var(--shadow-sm)'),
        transition: 'box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)',
        transform: interactive && hover ? 'translateY(-2px)' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
