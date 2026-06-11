"use client";

/* LemonFin Design System primitives, ported to production TSX and scoped to
   the landing page. Faithful to .claude/skills/LemonFin Design System. */

import {
  useState,
  type CSSProperties,
  type ReactNode,
  type MouseEvent,
} from "react";

/* ---- Button -------------------------------------------------------------- */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "grape"
  | "outline"
  | "ghost"
  | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BTN_SIZES: Record<
  ButtonSize,
  { padding: string; fontSize: number; height: number; gap: number }
> = {
  sm: { padding: "8px 16px", fontSize: 13, height: 36, gap: 6 },
  md: { padding: "11px 22px", fontSize: 14, height: 44, gap: 8 },
  lg: { padding: "14px 28px", fontSize: 15, height: 52, gap: 10 },
};

const BTN_VARIANTS: Record<
  ButtonVariant,
  { background: string; color: string; border: string; hover: string }
> = {
  primary: {
    background: "var(--lemon-400)",
    color: "var(--text-on-lemon)",
    border: "1px solid transparent",
    hover: "var(--lemon-hover)",
  },
  secondary: {
    background: "var(--dark)",
    color: "var(--text-on-dark)",
    border: "1px solid transparent",
    hover: "#000",
  },
  grape: {
    background: "var(--grape-500)",
    color: "var(--text-on-grape)",
    border: "1px solid transparent",
    hover: "var(--grape-600)",
  },
  outline: {
    background: "transparent",
    color: "var(--text-primary)",
    border: "1.5px solid var(--border-strong)",
    hover: "var(--surface-inset)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid transparent",
    hover: "var(--surface-inset)",
  },
  danger: {
    background: "var(--danger)",
    color: "#fff",
    border: "1px solid transparent",
    hover: "var(--danger-strong)",
  },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  pill = false,
  block = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  href,
  type = "button",
  onClick,
  style,
}: {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  block?: boolean;
  disabled?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const s = BTN_SIZES[size];
  const v = BTN_VARIANTS[variant];
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const base: CSSProperties = {
    display: block ? "flex" : "inline-flex",
    width: block ? "100%" : "auto",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    fontSize: s.fontSize,
    lineHeight: 1,
    minHeight: s.height,
    padding: s.padding,
    borderRadius: pill ? "var(--radius-full)" : "var(--radius-sm)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
    textDecoration: "none",
    transition:
      "background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out), filter var(--duration-fast)",
    background: hover && !disabled ? v.hover : v.background,
    color: v.color,
    border: v.border,
    transform: active && !disabled ? "scale(0.97)" : "scale(1)",
    ...style,
  };

  const iconStyle: CSSProperties = {
    width: BTN_SIZES[size].fontSize + 4,
    height: BTN_SIZES[size].fontSize + 4,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const inner = (
    <>
      {iconLeft && <span style={iconStyle}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={iconStyle}>{iconRight}</span>}
    </>
  );

  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
  };

  if (href) {
    return (
      <a href={href} style={base} {...handlers}>
        {inner}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={base}
      {...handlers}
    >
      {inner}
    </button>
  );
}

/* ---- IconButton ---------------------------------------------------------- */

type IconButtonVariant =
  | "grape"
  | "lemon"
  | "dark"
  | "light"
  | "ghost"
  | "dark-ghost";
type IconButtonSize = "sm" | "md" | "lg";

const IB_SIZES: Record<IconButtonSize, number> = { sm: 32, md: 40, lg: 48 };
const IB_ICON: Record<IconButtonSize, number> = { sm: 16, md: 18, lg: 22 };

const IB_VARIANTS: Record<
  IconButtonVariant,
  { background: string; color: string; hover: string }
> = {
  grape: { background: "var(--grape-500)", color: "#fff", hover: "var(--grape-600)" },
  lemon: {
    background: "var(--lemon-400)",
    color: "var(--text-on-lemon)",
    hover: "var(--lemon-hover)",
  },
  dark: { background: "var(--dark)", color: "#fff", hover: "#000" },
  light: {
    background: "var(--white)",
    color: "var(--text-primary)",
    hover: "var(--surface-inset)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-secondary)",
    hover: "var(--surface-inset)",
  },
  "dark-ghost": {
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    hover: "rgba(255,255,255,0.16)",
  },
};

export function IconButton({
  icon,
  variant = "grape",
  size = "md",
  rounded = "full",
  disabled = false,
  ariaLabel,
  onClick,
  style,
}: {
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  rounded?: "full" | "md";
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const dim = IB_SIZES[size];
  const v = IB_VARIANTS[variant];
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        flexShrink: 0,
        borderRadius: rounded === "full" ? "var(--radius-full)" : "var(--radius-md)",
        border: variant === "light" ? "1px solid var(--border)" : "1px solid transparent",
        background: hover && !disabled ? v.hover : v.background,
        color: v.color,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition:
          "background var(--duration-fast) var(--ease-out), transform var(--duration-fast)",
        transform: active && !disabled ? "scale(0.92)" : "scale(1)",
        boxShadow: variant === "light" ? "var(--shadow-xs)" : "none",
        ...style,
      }}
    >
      <span
        style={{
          width: IB_ICON[size],
          height: IB_ICON[size],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
    </button>
  );
}

/* ---- Card ---------------------------------------------------------------- */

type CardTone = "light" | "muted" | "dark" | "lemon";
type CardRadius = "lg" | "xl" | "2xl" | "3xl";
type CardShadow = "none" | "xs" | "sm" | "md" | "lg";

export function Card({
  children,
  tone = "light",
  radius = "xl",
  padding = 24,
  border = true,
  shadow = "sm",
  interactive = false,
  style,
  id,
}: {
  children?: ReactNode;
  tone?: CardTone;
  radius?: CardRadius;
  padding?: number | string;
  border?: boolean;
  shadow?: CardShadow;
  interactive?: boolean;
  style?: CSSProperties;
  id?: string;
}) {
  const [hover, setHover] = useState(false);

  const tones: Record<CardTone, CSSProperties> = {
    light: {
      background: "var(--surface)",
      color: "var(--text-primary)",
      border: border ? "1px solid var(--border)" : "none",
    },
    muted: {
      background: "var(--surface-muted)",
      color: "var(--text-primary)",
      border: border ? "1px solid var(--border)" : "none",
    },
    dark: {
      background: "var(--surface-dark)",
      color: "var(--text-on-dark)",
      border: border ? "1px solid var(--border-dark)" : "none",
    },
    lemon: {
      background: "var(--lemon-400)",
      color: "var(--text-on-lemon)",
      border: "none",
    },
  };
  const t = tones[tone];

  const shadows: Record<CardShadow, string> = {
    none: "none",
    xs: "var(--shadow-xs)",
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
  };
  const radii: Record<CardRadius, string> = {
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
    "3xl": "var(--radius-3xl)",
  };

  return (
    <div
      id={id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: t.background,
        color: t.color,
        border: t.border,
        borderRadius: radii[radius],
        padding,
        boxShadow: interactive && hover ? "var(--shadow-md)" : shadows[shadow],
        transition:
          "box-shadow var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)",
        transform: interactive && hover ? "translateY(-2px)" : "none",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---- StatCard ------------------------------------------------------------ */

type IconTone =
  | "lemon"
  | "grape"
  | "success"
  | "danger"
  | "warning"
  | "neutral"
  | "on-dark";
type ValueColor = "default" | "success" | "danger" | "warning";

const ICON_TONES: Record<IconTone, { bg: string; fg: string }> = {
  lemon: { bg: "var(--lemon-100)", fg: "#5C6B00" },
  grape: { bg: "var(--grape-100)", fg: "var(--grape-600)" },
  success: { bg: "var(--success-muted)", fg: "var(--success-strong)" },
  danger: { bg: "var(--danger-muted)", fg: "var(--danger)" },
  warning: { bg: "var(--warning-muted)", fg: "#B45309" },
  neutral: { bg: "var(--surface-inset)", fg: "var(--text-secondary)" },
  "on-dark": { bg: "var(--lemon-400)", fg: "var(--text-on-lemon)" },
};

const VALUE_COLORS: Record<ValueColor, string> = {
  default: "inherit",
  success: "var(--success-strong)",
  danger: "var(--danger)",
  warning: "#B45309",
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  iconTone,
  tone = "light",
  valueColor = "default",
  style,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  iconTone?: IconTone;
  tone?: "light" | "dark";
  valueColor?: ValueColor;
  style?: CSSProperties;
}) {
  const isDark = tone === "dark";
  const it = ICON_TONES[iconTone || (isDark ? "on-dark" : "neutral")];

  return (
    <Card
      tone={tone}
      radius="xl"
      padding={22}
      shadow={isDark ? "lg" : "sm"}
      style={style}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        {icon != null && (
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: it.bg,
              color: it.fg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </span>
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: isDark ? "var(--text-on-dark-muted)" : "var(--text-secondary)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 30,
          lineHeight: 1.1,
          letterSpacing: "var(--tracking-tight)",
          fontFeatureSettings: "var(--num-features)",
          color: valueColor === "default" ? "inherit" : VALUE_COLORS[valueColor],
        }}
      >
        {value}
      </div>

      {sub != null && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12.5,
            fontWeight: 500,
            color: isDark ? "var(--text-on-dark-muted)" : "var(--text-tertiary)",
          }}
        >
          {sub}
        </div>
      )}
    </Card>
  );
}

/* ---- Avatar -------------------------------------------------------------- */

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
const AV_SIZES: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };
const AV_FONT: Record<AvatarSize, number> = { xs: 10, sm: 13, md: 15, lg: 18, xl: 22 };

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function Avatar({
  name = "",
  size = "md",
  ring = false,
  dimmed = false,
  style,
}: {
  name?: string;
  size?: AvatarSize;
  ring?: boolean;
  dimmed?: boolean;
  style?: CSSProperties;
}) {
  const dim = AV_SIZES[size];
  return (
    <div
      style={{
        width: dim,
        height: dim,
        flexShrink: 0,
        borderRadius: "var(--radius-full)",
        background: "var(--grape-100)",
        color: "var(--grape-700)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: AV_FONT[size],
        border: ring ? "2px solid var(--surface-dark)" : "none",
        boxShadow: ring ? "0 0 0 2px rgba(255,255,255,0.06)" : "none",
        opacity: dimmed ? 0.55 : 1,
        overflow: "hidden",
        userSelect: "none",
        ...style,
      }}
    >
      {initials(name)}
    </div>
  );
}

/* ---- Badge --------------------------------------------------------------- */

const CATEGORIES: Record<string, string> = {
  food: "food",
  alimentacao: "food",
  transport: "transport",
  transporte: "transport",
  housing: "housing",
  moradia: "housing",
  leisure: "leisure",
  lazer: "leisure",
  health: "health",
  saude: "health",
  education: "education",
  educacao: "education",
  shopping: "shopping",
  compras: "shopping",
  salary: "salary",
  salario: "salary",
  freelance: "freelance",
  other: "other",
  outros: "other",
};

export function Badge({
  children,
  category,
  size = "md",
  style,
}: {
  children?: ReactNode;
  category?: string;
  size?: "sm" | "md";
  style?: CSSProperties;
}) {
  let bg = "var(--surface-inset)";
  let fg = "var(--text-secondary)";
  if (category) {
    const key = CATEGORIES[String(category).toLowerCase()] || "other";
    bg = `var(--cat-${key}-bg)`;
    fg = `var(--cat-${key}-fg)`;
  }
  const pad = size === "sm" ? "3px 9px" : "5px 12px";
  const fs = size === "sm" ? 11 : 12;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: bg,
        color: fg,
        padding: pad,
        fontSize: fs,
        fontWeight: 600,
        fontFamily: "var(--font-body)",
        lineHeight: 1.2,
        borderRadius: "var(--radius-full)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ---- CreditCard ---------------------------------------------------------- */

export function CreditCard({
  brand = "VISA",
  balance,
  number = "**** **** **** 2342",
  exp = "05/29",
  tone = "lemon",
  stacked = true,
  style,
}: {
  brand?: string;
  balance?: ReactNode;
  number?: string;
  exp?: string;
  tone?: "lemon" | "dark";
  stacked?: boolean;
  style?: CSSProperties;
}) {
  const isDark = tone === "dark";
  const surface = isDark ? "var(--surface-dark)" : "var(--lemon-400)";
  const fg = isDark ? "#fff" : "var(--text-on-lemon)";
  const muted = isDark ? "var(--text-on-dark-muted)" : "rgba(13,13,13,0.62)";

  return (
    <div style={{ position: "relative", ...style }}>
      {stacked && (
        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: -10,
            height: 40,
            borderRadius: "var(--radius-2xl)",
            background: "linear-gradient(90deg, var(--grape-500), var(--grape-400))",
            zIndex: 0,
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: "var(--radius-2xl)",
          background: surface,
          color: fg,
          padding: 22,
          minHeight: 188,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontStyle: "italic",
              fontSize: 22,
              letterSpacing: "-0.01em",
            }}
          >
            {brand}
          </span>
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke={fg}
            strokeWidth="2"
            strokeLinecap="round"
            style={{ opacity: 0.85 }}
          >
            <path d="M8 8a6 6 0 0 1 0 8" />
            <path d="M11 5.5a10 10 0 0 1 0 13" />
            <path d="M14 3a14 14 0 0 1 0 18" />
          </svg>
        </div>

        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: "var(--tracking-tight)",
              fontFeatureSettings: "var(--num-features)",
            }}
          >
            {balance}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              letterSpacing: "0.06em",
              fontWeight: 500,
            }}
          >
            {number}
          </div>
          <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Exp {exp}</div>
        </div>
      </div>
    </div>
  );
}

/* ---- TransactionRow ------------------------------------------------------ */

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TransactionRow({
  title,
  category,
  categoryLabel,
  meta,
  amount,
  type = "expense",
  style,
}: {
  title: string;
  category: string;
  categoryLabel?: string;
  meta?: string;
  amount: number;
  type?: "income" | "expense";
  style?: CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const isIncome = type === "income";
  const sign = isIncome ? "+" : "-";
  const color = isIncome ? "var(--success-strong)" : "var(--danger)";
  const display = `${sign} R$ ${formatBRL(Math.abs(amount))}`;

  const handleEnter = (_e: MouseEvent) => setHover(true);
  const handleLeave = (_e: MouseEvent) => setHover(false);

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: hover ? "var(--shadow-sm)" : "none",
        transition: "box-shadow var(--duration-fast)",
        ...style,
      }}
    >
      <div style={{ width: 96, flexShrink: 0 }}>
        <Badge category={category}>{categoryLabel || category}</Badge>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        {meta && (
          <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 3 }}>
            {meta}
          </div>
        )}
      </div>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: 15,
          color,
          whiteSpace: "nowrap",
          fontFeatureSettings: "var(--num-features)",
        }}
      >
        {display}
      </div>
    </div>
  );
}
