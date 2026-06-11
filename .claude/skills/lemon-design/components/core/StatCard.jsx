import React from 'react';
import { Card } from './Card.jsx';

const ICON_TONES = {
  lemon:   { bg: 'var(--lemon-100)',   fg: '#5C6B00' },
  grape:   { bg: 'var(--grape-100)',   fg: 'var(--grape-600)' },
  success: { bg: 'var(--success-muted)', fg: 'var(--success-strong)' },
  danger:  { bg: 'var(--danger-muted)',  fg: 'var(--danger)' },
  warning: { bg: 'var(--warning-muted)', fg: '#B45309' },
  neutral: { bg: 'var(--surface-inset)', fg: 'var(--text-secondary)' },
  'on-dark': { bg: 'var(--lemon-400)', fg: 'var(--text-on-lemon)' },
};

const VALUE_COLORS = {
  default: 'inherit',
  success: 'var(--success-strong)',
  danger:  'var(--danger)',
  warning: '#B45309',
};

/**
 * Summary metric card: icon chip + label + big money value + sub-line.
 * Use tone="dark" for the highlighted balance card.
 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  iconTone,
  tone = 'light',
  valueColor = 'default',
  action = null,
  style,
  ...rest
}) {
  const isDark = tone === 'dark';
  const it = ICON_TONES[iconTone || (isDark ? 'on-dark' : 'neutral')] || ICON_TONES.neutral;

  return (
    <Card tone={tone} radius="xl" padding={22} shadow={isDark ? 'lg' : 'sm'} style={style} {...rest}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        {icon != null && (
          <span style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: it.bg, color: it.fg,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
          </span>
        )}
        {action}
      </div>

      <div style={{
        fontSize: 13, fontWeight: 500,
        color: isDark ? 'var(--text-on-dark-muted)' : 'var(--text-secondary)',
        marginBottom: 6,
      }}>{label}</div>

      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 30, lineHeight: 1.1, letterSpacing: 'var(--tracking-tight)',
        fontFeatureSettings: 'var(--num-features)',
        color: valueColor === 'default' ? 'inherit' : VALUE_COLORS[valueColor],
      }}>{value}</div>

      {sub != null && (
        <div style={{
          marginTop: 8, fontSize: 12.5, fontWeight: 500,
          color: isDark ? 'var(--text-on-dark-muted)' : 'var(--text-tertiary)',
        }}>{sub}</div>
      )}
    </Card>
  );
}
