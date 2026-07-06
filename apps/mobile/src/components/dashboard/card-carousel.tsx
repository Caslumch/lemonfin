import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { type Card } from "@/hooks/use-financial-data";
import { CreditCardVisual } from "./credit-card-visual";

// Carrossel de cartões da Home: um cartão por vez, arrasta pro lado pra ver o
// próximo (paginado) + dots. Tocar abre a fatura do cartão.
export function CardCarousel({ cards }: { cards: Card[] }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const openInvoice = (c: Card) =>
    router.push({ pathname: "/fatura", params: { id: c.id, name: c.name } });

  if (cards.length === 1) {
    return (
      <Pressable onPress={() => openInvoice(cards[0])}>
        <CreditCardVisual card={cards[0]} />
      </Pressable>
    );
  }

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          data={cards}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c.id}
          decelerationRate="fast"
          renderItem={({ item }) => (
            <Pressable onPress={() => openInvoice(item)} style={{ width }}>
              <CreditCardVisual card={item} />
            </Pressable>
          )}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
        />
      )}

      {/* Dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {cards.map((c, i) => (
          <View
            key={c.id}
            style={{
              height: 6,
              borderRadius: 9999,
              width: i === index ? 20 : 6,
              backgroundColor: i === index ? "#FFFFFF" : "rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </View>
    </View>
  );
}
