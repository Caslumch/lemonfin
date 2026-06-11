/* @ds-bundle: {"format":3,"namespace":"LemonFinDesignSystem_1143b6","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"StatCard","sourcePath":"components/core/StatCard.jsx"},{"name":"CreditCard","sourcePath":"components/finance/CreditCard.jsx"},{"name":"TransactionRow","sourcePath":"components/finance/TransactionRow.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/forms/Tabs.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"37e6269babf3","components/core/Badge.jsx":"f71699d08a8d","components/core/Button.jsx":"81df7ea8bfe6","components/core/Card.jsx":"31e9369555bf","components/core/IconButton.jsx":"4d38c3fa9032","components/core/StatCard.jsx":"b72c9ab3b2df","components/finance/CreditCard.jsx":"4e54eb21f3e1","components/finance/TransactionRow.jsx":"68d34e220ee0","components/forms/Input.jsx":"cc10d9552511","components/forms/Select.jsx":"c359f1531f68","components/forms/Switch.jsx":"a733704fd0e0","components/forms/Tabs.jsx":"313eb008fb3f","components/navigation/NavItem.jsx":"ac8326cae323","ui_kits/lemonfin/Dashboard.jsx":"0dd9b72798ea","ui_kits/lemonfin/Sidebar.jsx":"daeef8aef4f9","ui_kits/lemonfin/Transactions.jsx":"4df5ac1d56ce","ui_kits/lemonfin/icons.jsx":"599204a8e563"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LemonFinDesignSystem_1143b6 = window.LemonFinDesignSystem_1143b6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64
};
const FONT = {
  xs: 10,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22
};
function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/**
 * User avatar — shows a photo when `src` is given, otherwise initials.
 * `ring` adds the overlapping-stack border seen in the contacts row.
 */
function Avatar({
  src,
  name = '',
  size = 'md',
  ring = false,
  dimmed = false,
  style,
  ...rest
}) {
  const dim = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: dim,
      height: dim,
      flexShrink: 0,
      borderRadius: 'var(--radius-full)',
      background: src ? `center/cover no-repeat url(${src})` : 'var(--grape-100)',
      color: 'var(--grape-700)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: FONT[size],
      border: ring ? '2px solid var(--surface-dark)' : 'none',
      boxShadow: ring ? '0 0 0 2px rgba(255,255,255,0.06)' : 'none',
      opacity: dimmed ? 0.55 : 1,
      overflow: 'hidden',
      userSelect: 'none',
      ...style
    }
  }, rest), !src && initials(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Category → CSS var pairs (see tokens/colors.css). */
const CATEGORIES = {
  food: 'food',
  alimentacao: 'food',
  transport: 'transport',
  transporte: 'transport',
  housing: 'housing',
  moradia: 'housing',
  leisure: 'leisure',
  lazer: 'leisure',
  health: 'health',
  saude: 'health',
  education: 'education',
  educacao: 'education',
  shopping: 'shopping',
  compras: 'shopping',
  salary: 'salary',
  salario: 'salary',
  freelance: 'freelance',
  other: 'other',
  outros: 'other'
};
const STATUS = {
  income: {
    bg: 'var(--success-muted)',
    fg: 'var(--success-strong)'
  },
  expense: {
    bg: 'var(--danger-muted)',
    fg: 'var(--danger-strong)'
  },
  warning: {
    bg: 'var(--warning-muted)',
    fg: '#B45309'
  },
  neutral: {
    bg: 'var(--surface-inset)',
    fg: 'var(--text-secondary)'
  },
  lemon: {
    bg: 'var(--lemon-100)',
    fg: '#5C6B00'
  },
  grape: {
    bg: 'var(--grape-100)',
    fg: 'var(--grape-700)'
  }
};

/**
 * Pill badge for transaction categories or financial status.
 * Pass `category` for the fixed category palette, or `status` for semantics.
 */
function Badge({
  children,
  category,
  status,
  size = 'md',
  style,
  ...rest
}) {
  let bg = 'var(--surface-inset)',
    fg = 'var(--text-secondary)';
  if (category) {
    const key = CATEGORIES[String(category).toLowerCase()] || 'other';
    bg = `var(--cat-${key}-bg)`;
    fg = `var(--cat-${key}-fg)`;
  } else if (status) {
    const s = STATUS[status] || STATUS.neutral;
    bg = s.bg;
    fg = s.fg;
  }
  const pad = size === 'sm' ? '3px 9px' : '5px 12px';
  const fs = size === 'sm' ? 11 : 12;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: bg,
      color: fg,
      padding: pad,
      fontSize: fs,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      lineHeight: 1.2,
      borderRadius: 'var(--radius-full)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    padding: '8px 16px',
    fontSize: 13,
    height: 36,
    gap: 6,
    iconSize: 16
  },
  md: {
    padding: '11px 22px',
    fontSize: 14,
    height: 44,
    gap: 8,
    iconSize: 18
  },
  lg: {
    padding: '14px 28px',
    fontSize: 15,
    height: 52,
    gap: 10,
    iconSize: 20
  }
};
const VARIANTS = {
  primary: {
    background: 'var(--lemon-400)',
    color: 'var(--text-on-lemon)',
    border: '1px solid transparent',
    '--hover-bg': 'var(--lemon-hover)'
  },
  secondary: {
    background: 'var(--dark)',
    color: 'var(--text-on-dark)',
    border: '1px solid transparent',
    '--hover-bg': '#000'
  },
  grape: {
    background: 'var(--grape-500)',
    color: 'var(--text-on-grape)',
    border: '1px solid transparent',
    '--hover-bg': 'var(--grape-600)'
  },
  outline: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1.5px solid var(--border-strong)',
    '--hover-bg': 'var(--surface-inset)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
    '--hover-bg': 'var(--surface-inset)'
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: '1px solid transparent',
    '--hover-bg': 'var(--danger-strong)'
  }
};

/**
 * LemonFin primary action button. Pill-shaped, with optional leading/trailing icons.
 */
function Button({
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
    ...style
  };
  const iconStyle = {
    width: s.iconSize,
    height: s.iconSize,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: base
  }, rest), iconLeft && /*#__PURE__*/React.createElement("span", {
    style: iconStyle
  }, iconLeft), children, iconRight && /*#__PURE__*/React.createElement("span", {
    style: iconStyle
  }, iconRight));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Surface container. `tone` switches between the light card and the black
 * accent card; `inset` removes default padding for custom layouts.
 */
function Card({
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
    light: {
      background: 'var(--surface)',
      color: 'var(--text-primary)',
      border: border ? '1px solid var(--border)' : 'none'
    },
    muted: {
      background: 'var(--surface-muted)',
      color: 'var(--text-primary)',
      border: border ? '1px solid var(--border)' : 'none'
    },
    dark: {
      background: 'var(--surface-dark)',
      color: 'var(--text-on-dark)',
      border: border ? '1px solid var(--border-dark)' : 'none'
    },
    lemon: {
      background: 'var(--lemon-400)',
      color: 'var(--text-on-lemon)',
      border: 'none'
    }
  };
  const t = tones[tone] || tones.light;
  const shadows = {
    none: 'none',
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)'
  };
  const radii = {
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    '3xl': 'var(--radius-3xl)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: t.background,
      color: t.color,
      border: t.border,
      borderRadius: radii[radius] || 'var(--radius-xl)',
      padding,
      boxShadow: interactive && hover ? 'var(--shadow-md)' : shadows[shadow] || 'var(--shadow-sm)',
      transition: 'box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)',
      transform: interactive && hover ? 'translateY(-2px)' : 'none',
      cursor: interactive ? 'pointer' : 'default',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 32,
  md: 40,
  lg: 48
};
const ICON = {
  sm: 16,
  md: 18,
  lg: 22
};
const VARIANTS = {
  grape: {
    background: 'var(--grape-500)',
    color: '#fff',
    '--hover': 'var(--grape-600)'
  },
  lemon: {
    background: 'var(--lemon-400)',
    color: 'var(--text-on-lemon)',
    '--hover': 'var(--lemon-hover)'
  },
  dark: {
    background: 'var(--dark)',
    color: '#fff',
    '--hover': '#000'
  },
  light: {
    background: 'var(--white)',
    color: 'var(--text-primary)',
    '--hover': 'var(--surface-inset)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    '--hover': 'var(--surface-inset)'
  },
  'dark-ghost': {
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    '--hover': 'rgba(255,255,255,0.16)'
  }
};

/**
 * Circular icon-only button — the round "+" / bell / action affordances.
 */
function IconButton({
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
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dim,
      height: dim,
      flexShrink: 0,
      borderRadius: rounded === 'full' ? 'var(--radius-full)' : 'var(--radius-md)',
      border: variant === 'light' ? '1px solid var(--border)' : '1px solid transparent',
      background: hover && !disabled ? v['--hover'] : v.background,
      color: v.color,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--duration-fast) var(--ease-out), transform var(--duration-fast)',
      transform: active && !disabled ? 'scale(0.92)' : 'scale(1)',
      boxShadow: variant === 'light' ? 'var(--shadow-xs)' : 'none',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: ICON[size],
      height: ICON[size],
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICON_TONES = {
  lemon: {
    bg: 'var(--lemon-100)',
    fg: '#5C6B00'
  },
  grape: {
    bg: 'var(--grape-100)',
    fg: 'var(--grape-600)'
  },
  success: {
    bg: 'var(--success-muted)',
    fg: 'var(--success-strong)'
  },
  danger: {
    bg: 'var(--danger-muted)',
    fg: 'var(--danger)'
  },
  warning: {
    bg: 'var(--warning-muted)',
    fg: '#B45309'
  },
  neutral: {
    bg: 'var(--surface-inset)',
    fg: 'var(--text-secondary)'
  },
  'on-dark': {
    bg: 'var(--lemon-400)',
    fg: 'var(--text-on-lemon)'
  }
};
const VALUE_COLORS = {
  default: 'inherit',
  success: 'var(--success-strong)',
  danger: 'var(--danger)',
  warning: '#B45309'
};

/**
 * Summary metric card: icon chip + label + big money value + sub-line.
 * Use tone="dark" for the highlighted balance card.
 */
function StatCard({
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
  return /*#__PURE__*/React.createElement(__ds_scope.Card, _extends({
    tone: tone,
    radius: "xl",
    padding: 22,
    shadow: isDark ? 'lg' : 'sm',
    style: style
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 18
    }
  }, icon != null && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-md)',
      background: it.bg,
      color: it.fg,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, icon)), action), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: isDark ? 'var(--text-on-dark-muted)' : 'var(--text-secondary)',
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 30,
      lineHeight: 1.1,
      letterSpacing: 'var(--tracking-tight)',
      fontFeatureSettings: 'var(--num-features)',
      color: valueColor === 'default' ? 'inherit' : VALUE_COLORS[valueColor]
    }
  }, value), sub != null && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 12.5,
      fontWeight: 500,
      color: isDark ? 'var(--text-on-dark-muted)' : 'var(--text-tertiary)'
    }
  }, sub));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/finance/CreditCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Lemon credit/debit card visual — the signature lime card with a grape
 * gradient peeking behind it. Tone "lemon" (default) or "dark".
 */
function CreditCard({
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
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      ...style
    }
  }, rest), stacked && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 10,
      right: 10,
      top: -10,
      height: 40,
      borderRadius: 'var(--radius-2xl)',
      background: 'linear-gradient(90deg, var(--grape-500), var(--grape-400))',
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      borderRadius: 'var(--radius-2xl)',
      background: surface,
      color: fg,
      padding: 22,
      minHeight: 188,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontStyle: 'italic',
      fontSize: 22,
      letterSpacing: '-0.01em'
    }
  }, brand), /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "26",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: fg,
    strokeWidth: "2",
    strokeLinecap: "round",
    style: {
      opacity: 0.85
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 8a6 6 0 0 1 0 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11 5.5a10 10 0 0 1 0 13"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 3a14 14 0 0 1 0 18"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: 'var(--tracking-tight)',
      fontFeatureSettings: 'var(--num-features)'
    }
  }, balance)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      letterSpacing: '0.06em',
      fontWeight: 500
    }
  }, number), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: muted,
      fontWeight: 600
    }
  }, "Exp ", exp)), holder && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: muted,
      fontWeight: 600,
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }
  }, holder)));
}
Object.assign(__ds_scope, { CreditCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/finance/CreditCard.jsx", error: String((e && e.message) || e) }); }

// components/finance/TransactionRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function formatBRL(n) {
  if (typeof n !== 'number') return n;
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * A single transaction row: category badge, title + metadata, signed amount,
 * and optional edit/delete actions. Renders as a soft rounded card.
 */
function TransactionRow({
  title,
  category,
  categoryLabel,
  meta,
  amount,
  type = 'expense',
  logo,
  onEdit,
  onDelete,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const isIncome = type === 'income';
  const sign = isIncome ? '+' : '-';
  const color = isIncome ? 'var(--success-strong)' : 'var(--danger)';
  const display = typeof amount === 'number' ? `${sign} R$ ${formatBRL(Math.abs(amount))}` : amount;
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '16px 20px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: hover ? 'var(--shadow-sm)' : 'none',
      transition: 'box-shadow var(--duration-fast)',
      ...style
    }
  }, rest), logo ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-inset)',
      overflow: 'hidden',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, typeof logo === 'string' ? /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : logo) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 96,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    category: category
  }, categoryLabel || category)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), meta && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 3
    }
  }, meta)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      fontSize: 15,
      color,
      whiteSpace: 'nowrap',
      fontFeatureSettings: 'var(--num-features)'
    }
  }, display), (onEdit || onDelete) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      opacity: hover ? 1 : 0.35,
      transition: 'opacity var(--duration-fast)'
    }
  }, onEdit && /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    "aria-label": "Editar",
    style: actionBtn
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 20h9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
  }))), onDelete && /*#__PURE__*/React.createElement("button", {
    onClick: onDelete,
    "aria-label": "Excluir",
    style: actionBtn
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 6h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 6V4h8v2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 6l1 14h10l1-14"
  })))));
}
const actionBtn = {
  width: 32,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-tertiary)',
  cursor: 'pointer'
};
Object.assign(__ds_scope, { TransactionRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/finance/TransactionRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text input with optional currency prefix and leading icon.
 * Border darkens on focus; turns danger on error.
 */
function Input({
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
  const heights = {
    sm: 38,
    md: 46,
    lg: 52
  };
  const h = heights[size] || heights.md;
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--dark)' : 'var(--border-strong)';
  const padLeft = prefix ? 42 : iconLeft ? 42 : 16;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      ...style
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 16,
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-tertiary)',
      pointerEvents: 'none'
    }
  }, prefix), iconLeft && !prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 14,
      width: 18,
      height: 18,
      color: 'var(--text-tertiary)',
      display: 'inline-flex'
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      height: h,
      boxSizing: 'border-box',
      padding: `0 16px 0 ${padLeft}px`,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)',
      background: disabled ? 'var(--surface-inset)' : 'var(--surface)',
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-sm)',
      outline: 'none',
      boxShadow: focus && !error ? '0 0 0 4px var(--focus-ring)' : 'none',
      transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
      opacity: disabled ? 0.6 : 1
    }
  }, rest)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Native-styled select matching the LemonFin input language. */
function Select({
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
  const heights = {
    sm: 38,
    md: 46,
    lg: 52
  };
  const h = heights[size] || heights.md;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      ...style
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      height: h,
      boxSizing: 'border-box',
      padding: '0 40px 0 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: value ? 'var(--text-primary)' : 'var(--text-placeholder)',
      background: 'var(--surface)',
      border: `1.5px solid ${focus ? 'var(--dark)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-sm)',
      appearance: 'none',
      WebkitAppearance: 'none',
      outline: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: focus ? '0 0 0 4px var(--focus-ring)' : 'none',
      transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)'
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lbl = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lbl);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** On/off toggle. Lemon track when on, gray when off. */
function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  style,
  ...rest
}) {
  const dims = size === 'sm' ? {
    w: 38,
    h: 22,
    thumb: 16
  } : {
    w: 46,
    h: 26,
    thumb: 20
  };
  const offset = dims.w - dims.thumb - 6;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: 'relative',
      flexShrink: 0,
      width: dims.w,
      height: dims.h,
      borderRadius: 'var(--radius-full)',
      background: checked ? 'var(--lemon-400)' : 'var(--gray-300)',
      border: 'none',
      padding: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--duration-base) var(--ease-out)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: 3,
      width: dims.thumb,
      height: dims.thumb,
      borderRadius: 'var(--radius-full)',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transform: checked ? `translateX(${offset}px)` : 'translateX(0)',
      transition: 'transform var(--duration-base) var(--ease-out)'
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Segmented control — the pill toggle group (Todas / Despesas / Receitas).
 * Active tab gets a white pill with a soft shadow.
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  size = 'md',
  style,
  ...rest
}) {
  const pad = size === 'sm' ? '7px 16px' : '9px 20px';
  const fs = size === 'sm' ? 13 : 14;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: 'var(--surface-inset)',
      padding: 4,
      borderRadius: 'var(--radius-full)',
      ...style
    }
  }, rest), tabs.map(t => {
    const val = typeof t === 'string' ? t : t.value;
    const lbl = typeof t === 'string' ? t : t.label;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": active,
      onClick: () => onChange && onChange(val),
      style: {
        padding: pad,
        fontSize: fs,
        fontFamily: 'var(--font-body)',
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--surface)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all var(--duration-fast) var(--ease-out)'
      }
    }, lbl);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Sidebar navigation item. Works on the light sidebar (active = lemon pill)
 * and the dark rail (active = subtle fill + grape icon). Omit `label` for an
 * icon-only rail item.
 */
function NavItem({
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
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    title: iconOnly ? label : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: iconOnly ? 44 : '100%',
      height: 44,
      padding: iconOnly ? 0 : '0 14px',
      justifyContent: iconOnly ? 'center' : 'flex-start',
      background: bg,
      color,
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-body)',
      fontSize: 14.5,
      fontWeight: active ? 600 : 500,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'background var(--duration-fast), color var(--duration-fast)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      flexShrink: 0,
      color: iconColor,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, icon), label && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: 'left'
    }
  }, label), label && badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      background: active ? 'rgba(13,13,13,0.12)' : 'var(--grape-100)',
      color: active ? 'var(--text-on-lemon)' : 'var(--grape-700)'
    }
  }, badge));
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lemonfin/Dashboard.jsx
try { (() => {
/* LemonFin Dashboard — reference-style recreation, pt-BR. */
const DS = window.LemonFinDesignSystem_1143b6;

/* ---- small helpers -------------------------------------------------------- */
function CardHead({
  title,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 17,
      color: 'var(--text-primary)'
    }
  }, title), right);
}
function Dropdown({
  children
}) {
  const Chevron = window.LFIcons.chevron;
  return /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-body)'
    }
  }, children, /*#__PURE__*/React.createElement(Chevron, {
    size: 15
  }));
}
function Pill({
  children,
  color
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'var(--dark)',
      color: '#fff',
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      fontSize: 12,
      padding: '4px 10px',
      borderRadius: 'var(--radius-full)',
      whiteSpace: 'nowrap'
    }
  }, children);
}

/* ---- line chart ----------------------------------------------------------- */
function LineChart() {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 380 96",
    width: "100%",
    height: "96",
    preserveAspectRatio: "none",
    style: {
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "incFill",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#6C5CE7",
    stopOpacity: "0.18"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#6C5CE7",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M0 70 C50 64 70 40 110 44 S180 78 230 60 300 22 380 30 L380 96 L0 96 Z",
    fill: "url(#incFill)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0 70 C50 64 70 40 110 44 S180 78 230 60 300 22 380 30",
    fill: "none",
    stroke: "#6C5CE7",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "230",
    cy: "60",
    r: "5",
    fill: "#fff",
    stroke: "#6C5CE7",
    strokeWidth: "2.5"
  }));
}

/* ---- bar chart ------------------------------------------------------------ */
function BarChart() {
  const data = [{
    m: 'Abr',
    h: 38
  }, {
    m: 'Mai',
    h: 52
  }, {
    m: 'Jun',
    h: 44
  }, {
    m: 'Jul',
    h: 86,
    active: true
  }, {
    m: 'Ago',
    h: 48
  }, {
    m: 'Set',
    h: 60
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 120,
      gap: 14
    }
  }, data.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.m,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: '100%',
      position: 'relative'
    }
  }, d.active && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -2
    }
  }, /*#__PURE__*/React.createElement(Pill, null, "R$ 2.121")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 30,
      height: `${d.h}%`,
      borderRadius: '8px 8px 4px 4px',
      background: d.active ? 'var(--grape-500)' : 'repeating-linear-gradient(135deg, var(--gray-200), var(--gray-200) 4px, var(--gray-100) 4px, var(--gray-100) 8px)'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 14,
      marginTop: 10
    }
  }, data.map(d => /*#__PURE__*/React.createElement("span", {
    key: d.m,
    style: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      fontWeight: 500
    }
  }, d.m))));
}

/* ---- merchant mini-list --------------------------------------------------- */
function MerchantChip({
  label,
  color
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-full)',
      background: color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 15,
      flexShrink: 0,
      fontFamily: 'var(--font-display)'
    }
  }, label);
}
function MiniTx({
  chip,
  name,
  date,
  amount
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '9px 0'
    }
  }, /*#__PURE__*/React.createElement(MerchantChip, chip), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, date)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--text-primary)',
      fontFeatureSettings: 'var(--num-features)'
    }
  }, amount));
}

/* ---- right column: cards + contacts --------------------------------------- */
function CardsPanel() {
  const {
    Card,
    IconButton,
    Button,
    CreditCard,
    Avatar
  } = DS;
  const Ic = window.LFIcons;
  const contacts = [{
    name: 'Daniel'
  }, {
    name: 'Emily'
  }, {
    name: 'Ryan'
  }, {
    name: 'Jason'
  }, {
    name: 'Luke',
    dimmed: true
  }];
  return /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    radius: "2xl",
    padding: 22,
    shadow: "lg",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: '#fff'
    }
  }, "Meus Cart\xF5es"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-on-dark-muted)',
      marginTop: 2
    }
  }, "2 cart\xF5es")), /*#__PURE__*/React.createElement(IconButton, {
    variant: "grape",
    size: "sm",
    icon: React.createElement(Ic.plus),
    ariaLabel: "Adicionar cart\xE3o"
  })), /*#__PURE__*/React.createElement(CreditCard, {
    balance: "R$ 3.265,75",
    number: "**** **** 1287 2342",
    exp: "05/29"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    pill: true,
    block: true,
    iconLeft: React.createElement(Ic.arrowUR, {
      size: 18
    }),
    style: {
      background: '#fff',
      color: 'var(--dark)'
    }
  }, "Enviar"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    pill: true,
    block: true,
    iconLeft: React.createElement(Ic.arrowDL, {
      size: 18
    }),
    style: {
      background: 'rgba(255,255,255,0.1)',
      color: '#fff'
    }
  }, "Receber")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 17,
      color: '#fff'
    }
  }, "Contatos recentes"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-on-dark-muted)',
      marginTop: 2
    }
  }, "24 contatos")), /*#__PURE__*/React.createElement(IconButton, {
    variant: "grape",
    size: "sm",
    icon: React.createElement(Ic.plus),
    ariaLabel: "Adicionar contato"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14
    }
  }, contacts.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.name,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name,
    size: "lg",
    dimmed: c.dimmed
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: c.dimmed ? 'var(--text-on-dark-muted)' : 'rgba(255,255,255,0.85)'
    }
  }, c.name)))));
}

/* ---- main ----------------------------------------------------------------- */
function Dashboard() {
  const {
    StatCard,
    IconButton,
    Avatar,
    Card
  } = DS;
  const Ic = window.LFIcons;
  const kebab = /*#__PURE__*/React.createElement(IconButton, {
    variant: "ghost",
    size: "sm",
    icon: React.createElement(Ic.kebab),
    ariaLabel: "Mais"
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 38,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)'
    }
  }, "Bem-vindo de volta!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--text-secondary)',
      marginTop: 4
    }
  }, "Painel")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    variant: "light",
    size: "lg",
    icon: React.createElement(Ic.bell),
    ariaLabel: "Notifica\xE7\xF5es"
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Lucas Machado",
    size: "lg"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    tone: "dark",
    label: "Saldo total",
    value: "R$ 6.556,73",
    icon: React.createElement(Ic.wallet),
    action: /*#__PURE__*/React.createElement(IconButton, {
      variant: "dark-ghost",
      size: "sm",
      icon: React.createElement(Ic.kebab),
      ariaLabel: "Mais"
    })
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Gastos do m\xEAs",
    value: "R$ 3.450,65",
    iconTone: "grape",
    icon: React.createElement(Ic.trendDn),
    action: kebab
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Economia",
    value: "R$ 1.867,42",
    iconTone: "lemon",
    icon: React.createElement(Ic.piggy),
    action: kebab
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    radius: "xl",
    padding: 22
  }, /*#__PURE__*/React.createElement(CardHead, {
    title: "Receita",
    right: /*#__PURE__*/React.createElement(Dropdown, null, "30 dias")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 28,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)',
      fontFeatureSettings: 'var(--num-features)'
    }
  }, "R$ 6.556,73"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--success-strong)'
    }
  }, React.createElement(Ic.trendUp, {
    size: 15
  }), " +28%")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 70,
      top: -6,
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(Pill, null, "R$ 4.121")), /*#__PURE__*/React.createElement(LineChart, null))), /*#__PURE__*/React.createElement(Card, {
    radius: "xl",
    padding: 22,
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(CardHead, {
    title: "Transa\xE7\xF5es",
    right: /*#__PURE__*/React.createElement(Dropdown, null, "Esta semana")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(MiniTx, {
    chip: {
      label: 'U',
      color: '#0D0D0D'
    },
    name: "Uber",
    date: "28 jul. \xB7 Transporte",
    amount: "\u2212 R$ 24,90"
  }), /*#__PURE__*/React.createElement(MiniTx, {
    chip: {
      label: 'iF',
      color: '#EA1D2C'
    },
    name: "iFood",
    date: "28 jul. \xB7 Alimenta\xE7\xE3o",
    amount: "\u2212 R$ 62,40"
  }), /*#__PURE__*/React.createElement(MiniTx, {
    chip: {
      label: 'V',
      color: '#660099'
    },
    name: "Vivo",
    date: "27 jul. \xB7 Outros",
    amount: "\u2212 R$ 30,00"
  }), /*#__PURE__*/React.createElement(MiniTx, {
    chip: {
      label: 'S',
      color: '#1DB954'
    },
    name: "Spotify",
    date: "26 jul. \xB7 Lazer",
    amount: "\u2212 R$ 21,90"
  })))), /*#__PURE__*/React.createElement(Card, {
    radius: "xl",
    padding: 22
  }, /*#__PURE__*/React.createElement(CardHead, {
    title: "Despesas",
    right: /*#__PURE__*/React.createElement(Dropdown, null, "2025")
  }), /*#__PURE__*/React.createElement(BarChart, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 340,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(CardsPanel, null)));
}
window.Dashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lemonfin/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lemonfin/Sidebar.jsx
try { (() => {
/* LemonFin sidebar — dark rail inside the shell. Logo, labeled nav, footer. */
const {
  NavItem,
  Avatar
} = window.LemonFinDesignSystem_1143b6;
function Sidebar({
  active,
  onNavigate
}) {
  const Ic = window.LFIcons;
  const items = [{
    id: 'home',
    label: 'Home',
    icon: Ic.home
  }, {
    id: 'transactions',
    label: 'Transações',
    icon: Ic.swap
  }, {
    id: 'categories',
    label: 'Categorias',
    icon: Ic.layers
  }, {
    id: 'cards',
    label: 'Cartões',
    icon: Ic.card
  }, {
    id: 'goals',
    label: 'Metas',
    icon: Ic.target
  }, {
    id: 'insights',
    label: 'Insights',
    icon: Ic.bulb
  }, {
    id: 'settings',
    label: 'Configurações',
    icon: Ic.gear
  }];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 248,
      flexShrink: 0,
      alignSelf: 'stretch',
      background: 'var(--shell-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      padding: '26px 18px 22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '0 8px',
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/lemonfin-mark.svg",
    alt: "",
    style: {
      width: 34,
      height: 34
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 21,
      color: '#fff',
      letterSpacing: '-0.02em'
    }
  }, "LemonFin")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    tone: "dark",
    icon: React.createElement(it.icon),
    label: it.label,
    active: active === it.id,
    onClick: () => onNavigate(it.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(NavItem, {
    tone: "dark",
    icon: React.createElement(Ic.sun),
    label: "Claro",
    onClick: () => {}
  }), /*#__PURE__*/React.createElement(NavItem, {
    tone: "dark",
    icon: React.createElement(Ic.logout, {
      style: {
        transform: 'scaleX(-1)'
      }
    }),
    label: "Recolher",
    onClick: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '14px 8px 0',
      borderTop: '1px solid var(--border-dark)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Lucas Machado",
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: '#fff',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Lucas Machado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-on-dark-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "caslumach@gmail.com"))));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lemonfin/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lemonfin/Transactions.jsx
try { (() => {
/* LemonFin — Transações (refactored in the new visual language). */
const TX_DS = window.LemonFinDesignSystem_1143b6;
function Transactions() {
  const {
    StatCard,
    IconButton,
    Button,
    Tabs,
    Select,
    Input,
    TransactionRow
  } = TX_DS;
  const Ic = window.LFIcons;
  const [tab, setTab] = React.useState('todas');
  const [rows, setRows] = React.useState([{
    id: 1,
    title: 'Gasto com Uber',
    category: 'transporte',
    categoryLabel: 'Transporte',
    meta: '10 de jun. · Lucas · via WhatsApp',
    amount: 20,
    type: 'expense'
  }, {
    id: 2,
    title: 'Salário',
    category: 'salario',
    categoryLabel: 'Salário',
    meta: '05 de jun. · Lucas',
    amount: 4200,
    type: 'income'
  }, {
    id: 3,
    title: 'Gastei 20',
    category: 'outros',
    categoryLabel: 'Outros',
    meta: '10 de jun. · Lucas · via WhatsApp',
    amount: 20,
    type: 'expense'
  }, {
    id: 4,
    title: 'chip da vivo',
    category: 'outros',
    categoryLabel: 'Outros',
    meta: '10 de jun. · Lucas · via WhatsApp',
    amount: 30,
    type: 'expense'
  }, {
    id: 5,
    title: 'Almoço iFood',
    category: 'alimentacao',
    categoryLabel: 'Alimentação',
    meta: '09 de jun. · Lucas · via WhatsApp',
    amount: 62.4,
    type: 'expense'
  }]);
  const visible = rows.filter(r => tab === 'todas' ? true : tab === 'despesas' ? r.type === 'expense' : r.type === 'income');
  const remove = id => setRows(rs => rs.filter(r => r.id !== id));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 34,
      letterSpacing: '-0.02em',
      color: 'var(--text-primary)'
    }
  }, "Transa\xE7\xF5es"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    pill: true,
    iconLeft: React.createElement(Ic.plus, {
      size: 18
    })
  }, "Nova transa\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Entradas",
    value: "R$ 4.200,00",
    sub: "1 transa\xE7\xE3o",
    valueColor: "success",
    iconTone: "success",
    icon: React.createElement(Ic.trendUp)
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Sa\xEDdas",
    value: "R$ 132,40",
    sub: "4 transa\xE7\xF5es",
    valueColor: "danger",
    iconTone: "danger",
    icon: React.createElement(Ic.trendDn)
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Fatura cart\xE3o",
    value: "R$ 30,00",
    sub: "aberta",
    valueColor: "warning",
    iconTone: "warning",
    icon: React.createElement(Ic.card)
  }), /*#__PURE__*/React.createElement(StatCard, {
    tone: "dark",
    label: "Saldo",
    value: "R$ 4.067,60",
    sub: "este m\xEAs",
    icon: React.createElement(Ic.wallet)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: 'todas',
      label: 'Todas'
    }, {
      value: 'despesas',
      label: 'Despesas'
    }, {
      value: 'receitas',
      label: 'Receitas'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 200
    }
  }, /*#__PURE__*/React.createElement(Select, {
    placeholder: "Todas categorias",
    options: ['Transporte', 'Alimentação', 'Moradia', 'Lazer', 'Salário', 'Outros']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150
    }
  }, /*#__PURE__*/React.createElement(Input, {
    type: "date"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-tertiary)'
    }
  }, "at\xE9"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150
    }
  }, /*#__PURE__*/React.createElement(Input, {
    type: "date"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, visible.map(r => /*#__PURE__*/React.createElement(TransactionRow, {
    key: r.id,
    title: r.title,
    category: r.category,
    categoryLabel: r.categoryLabel,
    meta: r.meta,
    amount: r.amount,
    type: r.type,
    onEdit: () => {},
    onDelete: () => remove(r.id)
  })), visible.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '48px 0',
      textAlign: 'center',
      color: 'var(--text-tertiary)',
      fontSize: 14
    }
  }, "Nenhuma transa\xE7\xE3o neste filtro.")), /*#__PURE__*/React.createElement("button", {
    style: {
      position: 'fixed',
      right: 34,
      bottom: 30,
      width: 60,
      height: 60,
      borderRadius: 'var(--radius-full)',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--lemon-400)',
      color: 'var(--dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'var(--shadow-lemon)'
    },
    "aria-label": "Assistente"
  }, React.createElement(window.LFIcons.bot, {
    size: 28
  })));
}
window.Transactions = Transactions;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lemonfin/Transactions.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lemonfin/icons.jsx
try { (() => {
/* Shared line-icon set for the LemonFin UI kit. Stroke icons, 1.9 weight,
   matching the reference. Exported to window for the babel screen scripts. */
const I = (paths, opts = {}) => (props = {}) => React.createElement('svg', {
  width: props.size || 22,
  height: props.size || 22,
  viewBox: '0 0 24 24',
  fill: opts.fill ? 'currentColor' : 'none',
  stroke: opts.fill ? 'none' : 'currentColor',
  strokeWidth: opts.sw || 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...props
}, paths);
const p = (d, k) => React.createElement('path', {
  d,
  key: k
});
const el = (type, attrs, k) => React.createElement(type, {
  ...attrs,
  key: k
});
const LFIcons = {
  home: I([p('M3 10.5 12 3l9 7.5', 'a'), p('M5 9.5V21h14V9.5', 'b')]),
  swap: I([p('M7 4 3 8l4 4', 'a'), p('M3 8h14', 'b'), p('M17 20l4-4-4-4', 'c'), p('M21 16H7', 'd')]),
  layers: I([p('M12 3 2 8l10 5 10-5-10-5Z', 'a'), p('M2 13l10 5 10-5', 'b'), p('M2 18l10 5 10-5', 'c')]),
  card: I([el('rect', {
    x: 2.5,
    y: 5,
    width: 19,
    height: 14,
    rx: 3
  }, 'a'), p('M2.5 10h19', 'b')]),
  target: I([el('circle', {
    cx: 12,
    cy: 12,
    r: 9
  }, 'a'), el('circle', {
    cx: 12,
    cy: 12,
    r: 5
  }, 'b'), el('circle', {
    cx: 12,
    cy: 12,
    r: 1.4
  }, 'c')]),
  bulb: I([p('M9 18h6', 'a'), p('M10 21h4', 'b'), p('M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z', 'c')]),
  gear: I([el('circle', {
    cx: 12,
    cy: 12,
    r: 3.2
  }, 'a'), p('M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z', 'b')]),
  bell: I([p('M6 9a6 6 0 0 1 12 0c0 7 2 8 2 8H4s2-1 2-8', 'a'), p('M10 21a2 2 0 0 0 4 0', 'b')]),
  plus: I([p('M12 5v14M5 12h14', 'a')], {
    sw: 2.4
  }),
  arrowUR: I([p('M7 17 17 7', 'a'), p('M9 7h8v8', 'b')], {
    sw: 2.1
  }),
  arrowDL: I([p('M17 7 7 17', 'a'), p('M15 17H7V9', 'b')], {
    sw: 2.1
  }),
  wallet: I([el('rect', {
    x: 3,
    y: 6,
    width: 18,
    height: 13,
    rx: 3
  }, 'a'), p('M3 10h18', 'b'), el('circle', {
    cx: 16.5,
    cy: 13.5,
    r: 1.3,
    fill: 'currentColor',
    stroke: 'none'
  }, 'c')]),
  trendUp: I([p('M4 17l6-6 4 4 6-7', 'a'), p('M20 8v5h-5', 'b')], {
    sw: 2
  }),
  trendDn: I([p('M4 7l6 6 4-4 6 7', 'a'), p('M20 16v-5h-5', 'b')], {
    sw: 2
  }),
  receipt: I([p('M5 3v18l2-1.4L9 21l2-1.4L13 21l2-1.4L17 21l2-1.4V3l-2 1.4L15 3l-2 1.4L11 3 9 4.4 7 3 5 4.4Z', 'a'), p('M8 8h8', 'b'), p('M8 12h8', 'c')]),
  piggy: I([p('M19 11a5 5 0 0 0-5-4H9a5 5 0 0 0-5 5 4 4 0 0 0 2 3.5V19h3v-2h3v2h3v-3a5 5 0 0 0 1-3Z', 'a'), p('M19 11h1.5a1 1 0 0 1 0 2H19', 'b'), el('circle', {
    cx: 8,
    cy: 11,
    r: 1,
    fill: 'currentColor',
    stroke: 'none'
  }, 'c')]),
  search: I([el('circle', {
    cx: 11,
    cy: 11,
    r: 7
  }, 'a'), p('M21 21l-4-4', 'b')]),
  calendar: I([el('rect', {
    x: 3,
    y: 4.5,
    width: 18,
    height: 16,
    rx: 3
  }, 'a'), p('M3 9h18M8 3v4M16 3v4', 'b')]),
  kebab: I([el('circle', {
    cx: 12,
    cy: 5,
    r: 1.4,
    fill: 'currentColor',
    stroke: 'none'
  }, 'a'), el('circle', {
    cx: 12,
    cy: 12,
    r: 1.4,
    fill: 'currentColor',
    stroke: 'none'
  }, 'b'), el('circle', {
    cx: 12,
    cy: 19,
    r: 1.4,
    fill: 'currentColor',
    stroke: 'none'
  }, 'c')]),
  chevron: I([p('M6 9l6 6 6-6', 'a')], {
    sw: 2.1
  }),
  sun: I([el('circle', {
    cx: 12,
    cy: 12,
    r: 4
  }, 'a'), p('M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19', 'b')]),
  logout: I([p('M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'a'), p('M10 17l5-5-5-5', 'b'), p('M15 12H3', 'c')]),
  bot: I([el('rect', {
    x: 4,
    y: 8,
    width: 16,
    height: 12,
    rx: 4
  }, 'a'), p('M12 8V4M9 4h6', 'b'), el('circle', {
    cx: 9.5,
    cy: 14,
    r: 1.2,
    fill: 'currentColor',
    stroke: 'none'
  }, 'c'), el('circle', {
    cx: 14.5,
    cy: 14,
    r: 1.2,
    fill: 'currentColor',
    stroke: 'none'
  }, 'd')])
};
window.LFIcons = LFIcons;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lemonfin/icons.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.CreditCard = __ds_scope.CreditCard;

__ds_ns.TransactionRow = __ds_scope.TransactionRow;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.NavItem = __ds_scope.NavItem;

})();
