/**
 * Logo do LemonFin — disco com gradiente radial limão + brilho elíptico.
 * Fiel ao asset da skill (assets/lemonfin-mark.svg).
 */
interface LemonLogoProps {
  size?: number;
  className?: string;
}

export function LemonLogo({ size = 32, className }: LemonLogoProps) {
  // id único por instância evita conflito de <defs> quando há vários logos.
  const gid = `lemon-logo-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="LemonFin"
      className={className}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#E9FA85" />
          <stop offset="45%" stopColor="#D4F400" />
          <stop offset="100%" stopColor="#A8C200" />
        </radialGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill={`url(#${gid})`} />
      <ellipse cx="36" cy="30" rx="15" ry="9" fill="#FBFFE5" opacity="0.55" />
    </svg>
  );
}
