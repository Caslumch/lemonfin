import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

// Logo do LemonFin — disco com gradiente radial limão + brilho elíptico.
// Fiel ao lemon-logo.tsx do web.
export function LemonLogo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Defs>
        <RadialGradient id="lemonLogo" cx="38%" cy="32%" r="72%">
          <Stop offset="0%" stopColor="#E9FA85" />
          <Stop offset="45%" stopColor="#D4F400" />
          <Stop offset="100%" stopColor="#A8C200" />
        </RadialGradient>
      </Defs>
      <Circle cx="48" cy="48" r="44" fill="url(#lemonLogo)" />
      <Ellipse cx="36" cy="30" rx="15" ry="9" fill="#FBFFE5" opacity={0.55} />
    </Svg>
  );
}
