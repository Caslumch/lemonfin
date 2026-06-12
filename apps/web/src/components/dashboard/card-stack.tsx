"use client";

import { useState } from "react";
import type { Card } from "@/types/card";
import { CreditCardVisual } from "./credit-card-visual";

interface CardStackProps {
  cards: Card[];
}

// Quantos cartões "espiam" atrás do selecionado. Acima disso, vira contador.
const MAX_PEEK = 2;

/**
 * Pilha de cartões estilo carteira: o selecionado fica na frente; os demais
 * aparecem empilhados atrás (deslocados pra cima e levemente menores).
 * Clicar num cartão de trás o traz para a frente.
 *
 * Reusa o CreditCardVisual para o cartão da frente (com a barra de limite); os
 * de trás são só "lombadas" decorativas e clicáveis.
 */
export function CardStack({ cards }: CardStackProps) {
  const [selectedId, setSelectedId] = useState<string>(cards[0]?.id ?? "");

  if (cards.length === 0) return null;
  if (cards.length === 1) return <CreditCardVisual card={cards[0]} />;

  const selected = cards.find((c) => c.id === selectedId) ?? cards[0];
  // Os outros cartões, na ordem original, são as lombadas de trás.
  const others = cards.filter((c) => c.id !== selected.id);
  const peek = others.slice(0, MAX_PEEK);
  const hiddenCount = others.length - peek.length;

  // Cada lombada de trás recua 10px e encolhe um pouco. A de mais atrás primeiro
  // (índice maior = mais ao fundo) para o z-index empilhar certo.
  const PEEK_OFFSET = 10;
  const PEEK_SCALE_STEP = 0.04;

  return (
    <div
      className="relative"
      // Espaço no topo para as lombadas que sobem além do cartão da frente.
      style={{ paddingTop: peek.length * PEEK_OFFSET }}
    >
      {/* Lombadas de trás (renderizadas do fundo para a frente). */}
      {peek
        .map((card, i) => {
          const depth = i + 1; // 1 = logo atrás; 2 = mais ao fundo
          const translateY = -(depth * PEEK_OFFSET);
          const scale = 1 - depth * PEEK_SCALE_STEP;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedId(card.id)}
              aria-label={`Selecionar cartão ${card.name}`}
              className="absolute inset-x-0 top-0 origin-top cursor-pointer rounded-[18px] border border-white/10 bg-gradient-to-br from-[#26262A] to-[#121214] transition-transform hover:-translate-y-px"
              style={{
                height: 60,
                transform: `translateY(${translateY}px) scale(${scale})`,
                zIndex: depth, // mais fundo = z menor
              }}
            >
              <span className="sr-only">{card.name}</span>
            </button>
          );
        })
        // Inverte para o DOM ter o mais ao fundo primeiro (z-index visual ok).
        .reverse()}

      {/* Cartão selecionado, na frente. */}
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
