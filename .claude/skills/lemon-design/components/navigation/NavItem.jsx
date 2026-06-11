import React from 'react';

/**
 * Sidebar navigation item. Works on the light sidebar (active = lemon pill)
 * and the dark rail (active = subtle fill + grape icon). Omit `label` for an
 * icon-only rail item.
 */
export function NavItem({
  icon,
  label,
  active = false,
  tone = 'light',
  badge,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const isDark = tone === 'dark';
  const iconOnly = !label;

  let bg = 'transparent';
  let color = isDark ? 'var(--text-on-dark-muted)' : 'var(--text-secondary)';
  let iconColor = color;

  if (active) {
    if (isDark) {
      bg = 'rgba(255,255,255,0.07)';
      color = '#fff';
      iconColor = 'var(--grape-400)';
    } else {
      bg = 'var(--lemon-400)';
      color = 'var(--text-on-lemon)';
      iconColor = 'var(--text-on-lemon)';
    }
  } else if (hover) {
    bg = isDark ? 'rgba(255,255,255,0.04)' : 'var(--surface-inset)';
    color = isDark ? 'rgba(255,255,255,0.85)' : 'var(--text-primary)';
    iconColor = color;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={iconOnly ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: iconOnly ? 44 : '100%',
        height: 44, padding: iconOnly ? 0 : '0 14px',
        justifyContent: iconOnly ? 'center' : 'flex-start',
        background: bg, color,
        border: 'none', borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-body)', fontSize: 14.5,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'background var(--duration-fast), color var(--duration-fast)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 22, height: 22, flexShrink: 0, color: iconColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      {label && <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>}
      {label && badge != null && (
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          background: active ? 'rgba(13,13,13,0.12)' : 'var(--grape-100)',
          color: active ? 'var(--text-on-lemon)' : 'var(--grape-700)',
        }}>{badge}</span>
      )}
    </button>
  );
}
