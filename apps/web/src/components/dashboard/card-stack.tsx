"use client";

import { useState } from "react";
import type { Card } from "@/types/card";
import { CreditCardVisual } from "./credit-card-visual";

interface CardStackProps {
  cards: Card[];
}

// Quantos cartões "espiam" atrás do selecionado, em leque. Acima disso, o
// excedente vira contador (+N) nos dots — manter o leque legível e dentro da
// largura do painel (~340px).
const MAX_PEEK = 3;

// Geometria do leque: cada cartão de trás recua um pouco para cima, abre para o
// lado e gira. Sinais alternam (par à direita, ímpar à esquerda) para o leque
// abrir simétrico em vez de cair só para um lado. Offsets contidos: o painel
// tem ~300px úteis (340px - padding) e o cartão da frente ocupa toda a largura,
// então o leque precisa ser sutil para não vazar/cortar nas bordas.
const PEEK_LIFT = 12; // quanto cada nível sobe (px)
const PEEK_SHIFT = 10; // quanto cada nível desloca lateralmente (px)
const PEEK_ROTATE = 4; // rotação por nível (deg)
const PEEK_SCALE_STEP = 0.05;

/**
 * Leque de cartões estilo "mão de cartas": o selecionado fica reto na frente; os
 * demais aparecem atrás, girados e abertos para os lados. Clicar num cartão de
 * trás o traz para a frente. Os dots embaixo também selecionam.
 */
export function CardStack({ cards }: CardStackProps) {
  const [selectedId, setSelectedId] = useState<string>(cards[0]?.id ?? "");

  if (cards.length === 0) return null;
  if (cards.length === 1) return <CreditCardVisual card={cards[0]} />;

  const selected = cards.find((c) => c.id === selectedId) ?? cards[0];
  // Os outros cartões, na ordem original, são as lombadas do leque.
  const others = cards.filter((c) => c.id !== selected.id);
  const peek = others.slice(0, MAX_PEEK);
  const hiddenCount = others.length - peek.length;

  return (
    <div
      className="relative"
      // Espaço no topo para as lombadas que sobem além do cartão da frente.
      style={{ paddingTop: peek.length * PEEK_LIFT }}
    >
      {/* Lombadas do leque (renderizadas do fundo para a frente). */}
      {peek
        .map((card, i) => {
          const depth = i + 1; // 1 = logo atrás; maior = mais ao fundo
          const dir = depth % 2 === 0 ? 1 : -1; // alterna lados
          const translateX = dir * depth * PEEK_SHIFT;
          const translateY = -(depth * PEEK_LIFT);
          const rotate = dir * depth * PEEK_ROTATE;
          const scale = 1 - depth * PEEK_SCALE_STEP;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedId(card.id)}
              aria-label={`Selecionar cartão ${card.name}`}
              className="absolute inset-x-0 top-0 origin-bottom cursor-pointer rounded-[18px] border border-white/10 bg-gradient-to-br from-[#26262A] to-[#121214] shadow-md transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                height: 80,
                transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                zIndex: depth, // mais fundo = z menor
              }}
            >
              {/* Mostra o nome no topo da lombada, que fica visível no leque. */}
              <span className="absolute left-4 top-2.5 text-[11px] font-medium text-white/55">
                {card.name}
              </span>
            </button>
          );
        })
        // Inverte para o DOM ter o mais ao fundo primeiro (z-index visual ok).
        .reverse()}

      {/* Cartão selecionado, reto na frente. */}
      <div className="relative" style={{ zIndex: peek.length + 1 }}>
        <CreditCardVisual card={selected} />
      </div>

      {/* Indicador/seletor: pontos para cada cartão. */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setSelectedId(card.id)}
            aria-label={`Ver cartão ${card.name}`}
            aria-current={card.id === selected.id}
            className={`h-1.5 rounded-full transition-all ${
              card.id === selected.id
                ? "w-5 bg-on-dark"
                : "w-1.5 bg-on-dark-muted/40 hover:bg-on-dark-muted"
            }`}
          />
        ))}
        {hiddenCount > 0 && (
          <span className="ml-1 text-[10px] text-on-dark-muted">
            +{hiddenCount}
          </span>
        )}
      </div>
    </div>
  );
}
