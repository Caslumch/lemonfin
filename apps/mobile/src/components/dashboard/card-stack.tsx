import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { type Card } from "@/hooks/use-financial-data";
import { fonts } from "@/theme/tokens";
import { themeFor } from "@/theme/card-themes";
import { CreditCardVisual } from "./credit-card-visual";

// Pilha de cartões (usada no container escuro "Meus Cartões" da Home): o
// selecionado à frente; a lombada de trás é o PRÓXIMO cartão, na cor real dele.
// Tocar na lombada ou nos dots troca a seleção.
export function CardStack({ cards }: { cards: Card[] }) {
  const [index, setIndex] = useState(0);
  if (cards.length === 0) return null;
  if (cards.length === 1) return <CreditCardVisual card={cards[0]} />;

  const current = Math.min(index, cards.length - 1);
  const nextIndex = (current + 1) % cards.length;
  const next = cards[nextIndex];
  const nextTheme = themeFor(next);

  return (
    <View>
      <View style={{ paddingTop: 24 }}>
        {/* Lombada = próximo cartão */}
        <Pressable
          onPress={() => setIndex(nextIndex)}
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: 0,
            height: 80,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <LinearGradient colors={nextTheme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
            <Text
              style={{ position: "absolute", left: 16, top: 6, fontFamily: fonts.sansMedium, fontSize: 11, color: "rgba(255,255,255,0.75)" }}
              numberOfLines={1}
            >
              {next.name}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Cartão da frente */}
        <View style={{ zIndex: 10 }}>
          <CreditCardVisual card={cards[current]} />
        </View>
      </View>

      {/* Dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {cards.map((c, i) => (
          <Pressable key={c.id} onPress={() => setIndex(i)} hitSlop={6}>
            <View
              style={{
                height: 6,
                borderRadius: 9999,
                width: i === current ? 20 : 6,
                backgroundColor: i === current ? "#FFFFFF" : "rgba(255,255,255,0.4)",
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
