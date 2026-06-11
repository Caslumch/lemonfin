import React from 'react';

/** On/off toggle. Lemon track when on, gray when off. */
export function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  style,
  ...rest
}) {
  const dims = size === 'sm'
    ? { w: 38, h: 22, thumb: 16 }
    : { w: 46, h: 26, thumb: 20 };
  const offset = dims.w - dims.thumb - 6;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        position: 'relative', flexShrink: 0,
        width: dims.w, height: dims.h,
        borderRadius: 'var(--radius-full)',
        background: checked ? 'var(--lemon-400)' : 'var(--gray-300)',
        border: 'none', padding: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--duration-base) var(--ease-out)',
        ...style,
      }}
      {...rest}
    >
      <span style={{
        position: 'absolute', top: 3, left: 3,
        width: dims.thumb, height: dims.thumb,
        borderRadius: 'var(--radius-full)',
        background: '#fff', boxShadow: 'var(--shadow-sm)',
        transform: checked ? `translateX(${offset}px)` : 'translateX(0)',
        transition: 'transform var(--duration-base) var(--ease-out)',
      }} />
    </button>
  );
}
