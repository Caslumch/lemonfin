import React from 'react';

/**
 * Lemon credit/debit card visual — the signature lime card with a grape
 * gradient peeking behind it. Tone "lemon" (default) or "dark".
 */
export function CreditCard({
  brand = 'VISA',
  balance,
  number = '**** **** **** 2342',
  exp = '05/29',
  holder,
  tone = 'lemon',
  stacked = true,
  style,
  ...rest
}) {
  const isDark = tone === 'dark';
  const surface = isDark ? 'var(--surface-dark)' : 'var(--lemon-400)';
  const fg = isDark ? '#fff' : 'var(--text-on-lemon)';
  const muted = isDark ? 'var(--text-on-dark-muted)' : 'rgba(13,13,13,0.62)';

  return (
    <div style={{ position: 'relative', ...style }} {...rest}>
      {/* grape gradient peeking behind */}
      {stacked && (
        <div style={{
          position: 'absolute', left: 10, right: 10, top: -10, height: 40,
          borderRadius: 'var(--radius-2xl)',
          background: 'linear-gradient(90deg, var(--grape-500), var(--grape-400))',
          zIndex: 0,
        }} />
      )}
      <div style={{
        position: 'relative', zIndex: 1,
        borderRadius: 'var(--radius-2xl)',
        background: surface, color: fg,
        padding: 22, minHeight: 188, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)', overflow: 'hidden',
      }}>
        {/* top row: brand + contactless */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', fontSize: 22, letterSpacing: '-0.01em' }}>{brand}</span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.85 }}>
            <path d="M8 8a6 6 0 0 1 0 8"/><path d="M11 5.5a10 10 0 0 1 0 13"/><path d="M14 3a14 14 0 0 1 0 18"/>
          </svg>
        </div>

        {/* balance */}
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30,
            letterSpacing: 'var(--tracking-tight)', fontFeatureSettings: 'var(--num-features)',
          }}>{balance}</div>
        </div>

        {/* number + exp */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: '0.06em', fontWeight: 500 }}>{number}</div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Exp {exp}</div>
        </div>
        {holder && <div style={{ fontSize: 11, color: muted, fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{holder}</div>}
      </div>
    </div>
  );
}
