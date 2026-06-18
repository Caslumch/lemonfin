"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Card } from "@/types/card";
import { CreditCardVisual } from "./credit-card-visual";

interface CardStackProps {
  cards: Card[];
}

/**
 * Carrossel de cartões: mostra um cartão por vez ocupando todo o espaço, com
 * setas ‹ › para avançar/voltar e dots embaixo que também selecionam. Padrão
 * conhecido e sem empilhamento — substitui a antiga pilha/leque, que ficava
 * confusa no painel estreito (não dava pra saber que as lombadas eram clicáveis).
 */
export function CardStack({ cards }: CardStackProps) {
  const [index, setIndex] = useState(0);

  if (cards.length === 0) return null;
  if (cards.length === 1) return <CreditCardVisual card={cards[0]} />;

  // Index seguro mesmo se a lista encolher (ex.: cartão removido em outra aba).
  const current = Math.min(index, cards.length - 1);
  const card = cards[current];

  const go = (delta: number) => {
    const next = (current + delta + cards.length) % cards.length;
    setIndex(next);
  };

  return (
    <div>
      <CreditCardVisual card={card} />

      {/* Navegação: setas flanqueando os dots, numa linha só abaixo do cartão.
          Fora do cartão para não cobrir número/limite. */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Cartão anterior"
          className="flex h-7 w-7 items-center justify-center rounded-full text-on-dark-muted transition-colors hover:bg-white/10 hover:text-on-dark cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1.5">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver cartão ${c.name}`}
              aria-current={i === current}
              className={`h-1.5 rounded-full transition-all ${
                i === current
                  ? "w-5 bg-on-dark"
                  : "w-1.5 bg-on-dark-muted/60 hover:bg-on-dark-muted"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Próximo cartão"
          className="flex h-7 w-7 items-center justify-center rounded-full text-on-dark-muted transition-colors hover:bg-white/10 hover:text-on-dark cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
