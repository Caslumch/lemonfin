import type { CSSProperties } from "react";

export const CTA_URL = "/register";
export const LOGIN_URL = "/login";

/** LemonFin disc mark — lemon radial gradient with a soft highlight. */
export function LemonMark({
  size = 32,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="LemonFin"
      style={style}
    >
      <defs>
        <radialGradient id="lf-mark" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#E9FA85" />
          <stop offset="45%" stopColor="#D4F400" />
          <stop offset="100%" stopColor="#A8C200" />
        </radialGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill="url(#lf-mark)" />
      <ellipse cx="36" cy="30" rx="15" ry="9" fill="#FBFFE5" opacity="0.55" />
    </svg>
  );
}
