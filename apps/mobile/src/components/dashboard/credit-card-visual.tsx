import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { type Card } from "@/hooks/use-financial-data";
import { fonts } from "@/theme/tokens";
import { maskedNumber, themeFor, usageBarColor } from "@/theme/card-themes";

const brl0 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const START = { x: 0, y: 0 };
const END = { x: 1, y: 1 };

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.sans,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "rgba(255,255,255,0.5)",
      }}
    >
      {children}
    </Text>
  );
}

const mono = (size: number, color = "rgba(255,255,255,0.9)") => ({
  fontFamily: fonts.mono,
  fontSize: size,
  color,
});

// Cartão de crédito visual — 1:1 com o web. Gradiente por tema, chip metálico,
// número mascarado, fechamento/vencimento/limite e barra de uso da fatura.
export function CreditCardVisual({ card }: { card: Card }) {
  const theme = themeFor(card);
  const brandLabel = (card.brand || "").trim() ? (card.brand as string).toUpperCase() : "CARTÃO";
  const spent = card.currentSpend ?? 0;
  const limit = card.limit != null ? Number(card.limit) : null;
  const ratio = limit && limit > 0 ? spent / limit : 0;
  const pct = limit && limit > 0 ? Math.round(ratio * 100) : null;

  return (
    <LinearGradient
      colors={theme.gradient}
      start={START}
      end={END}
      style={{
        borderRadius: 18,
        padding: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      {/* Círculos decorativos */}
      <View style={{ position: "absolute", top: -40, right: -32, width: 128, height: 128, borderRadius: 64, backgroundColor: "rgba(255,255,255,0.05)" }} />
      <View style={{ position: "absolute", top: 24, right: -8, width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.03)" }} />

      {/* Nome + bandeira */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: "rgba(255,255,255,0.8)", flex: 1 }} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={{ fontFamily: fonts.outfit, fontSize: 14, fontStyle: "italic", letterSpacing: 0.5, color: theme.accent }}>
          {brandLabel}
        </Text>
      </View>

      {/* Chip */}
      <LinearGradient colors={theme.chip} start={START} end={END} style={{ width: 40, height: 28, borderRadius: 6, marginTop: 24 }} />

      {/* Número mascarado */}
      <Text style={{ ...mono(17), letterSpacing: 3, marginTop: 16 }}>{maskedNumber(card.id)}</Text>

      {/* Fechamento / Vencimento / Limite */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 16 }}>
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View>
            <Overline>Fechamento</Overline>
            <Text style={mono(14)}>dia {card.closingDay}</Text>
          </View>
          {card.dueDay != null && (
            <View>
              <Overline>Vencimento</Overline>
              <Text style={mono(14)}>dia {card.dueDay}</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Overline>{limit !== null ? "Limite" : "Fatura atual"}</Overline>
          <Text style={mono(14)}>{brl0(limit !== null ? limit : spent)}</Text>
        </View>
      </View>

      {/* Barra de uso do limite */}
      {limit !== null && limit > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={mono(12, "rgba(255,255,255,0.85)")}>
              <Overline>Fatura </Overline>
              {brl0(spent)}
            </Text>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
              {pct}% usado
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
            <View style={{ height: "100%", borderRadius: 9999, width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: usageBarColor(ratio) }} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}
