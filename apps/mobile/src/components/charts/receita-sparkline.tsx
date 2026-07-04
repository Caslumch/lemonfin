import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { accent } from "@/theme/tokens";

// Sparkline linha+área da receita (espelha o SVG inline do web). Linha e
// gradiente em uva (#6C5CE7), ponto final destacado.
export function ReceitaSparkline({
  values,
  height = 90,
  color = accent.uva,
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  const [w, setW] = useState(0);
  const pts = values.length >= 2 ? values : [0, 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const pad = 6;
  const innerH = height - pad * 2;
  const innerW = Math.max(w - pad * 2, 1);

  const coords = pts.map((v, i) => ({
    x: pad + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * innerW),
    y: pad + innerH - ((v - min) / range) * innerH,
  }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const area = `${line} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="recgrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.18} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#recgrad)" />
          <Path
            d={line}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx={last.x} cy={last.y} r={5} fill="#FFFFFF" stroke={color} strokeWidth={2.5} />
        </Svg>
      )}
    </View>
  );
}
