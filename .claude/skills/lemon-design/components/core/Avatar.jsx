import React from 'react';

const SIZES = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };
const FONT = { xs: 10, sm: 13, md: 15, lg: 18, xl: 22 };

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/**
 * User avatar — shows a photo when `src` is given, otherwise initials.
 * `ring` adds the overlapping-stack border seen in the contacts row.
 */
export function Avatar({
  src,
  name = '',
  size = 'md',
  ring = false,
  dimmed = false,
  style,
  ...rest
}) {
  const dim = SIZES[size] || SIZES.md;
  return (
    <div
      style={{
        width: dim, height: dim, flexShrink: 0,
        borderRadius: 'var(--radius-full)',
        background: src ? `center/cover no-repeat url(${src})` : 'var(--grape-100)',
        color: 'var(--grape-700)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: FONT[size],
        border: ring ? '2px solid var(--surface-dark)' : 'none',
        boxShadow: ring ? '0 0 0 2px rgba(255,255,255,0.06)' : 'none',
        opacity: dimmed ? 0.55 : 1,
        overflow: 'hidden', userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {!src && initials(name)}
    </div>
  );
}
