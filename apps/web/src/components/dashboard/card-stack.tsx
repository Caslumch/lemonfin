"use client";

import { useState } from "react";
import type { Card } from "@/types/card";
import { CreditCardVisual } from "./credit-card-visual";

interface CardStackProps {
  cards: Card[];
}

// Quantas "lombadas" aparecem atrás do cartão selecionado. Acima disso o
// excedente só conta nos dots (+N). Mantido baixo para a pilha ficar limpa
// dentro do painel estreito (~300px úteis).
const MAX_PEEK = 2;

// Geometria da pilha: cada cartão de trás recua um pouco PARA BAIXO (não para
// cima — assim nunca colide com o cabeçalho "Meus Cartões") e encolhe de leve,
// como um maço de cartas visto de cima. Direção única e sutil: nada de leque
// alternado que estoura as bordas do painel.
const PEEK_DROP = 10; // quanto cada nível desce (px)
const PEEK_INSET = 10; // quanto cada nível recua nas laterais (px)
const PEEK_SCALE_STEP = 0.04;

/**
 * Pilha de cartões: o selecionado fica reto na frente; os demais aparecem como
 * lombadas finas logo abaixo, recuadas e levemente menores. Clicar numa lombada
 * a traz para a frente; os dots embaixo também selecionam.
 */
export function CardStack({ cards }: CardStackProps) {
  const [selectedId, setSelectedId] = useState<string>(cards[0]?.id ?? "");

  if (cards.length === 0) return null;
  if (cards.length === 1) return <CreditCardVisual card={cards[0]} />;

  const selected = cards.find((c) => c.id === selectedId) ?? cards[0];
  // Os outros cartões, na ordem original, são as lombadas da pilha.
  const others = cards.filter((c) => c.id !== selected.id);
  const peek = others.slice(0, MAX_PEEK);
  const hiddenCount = others.length - peek.length;

  return (
    <div
      className="relative"
      // Espaço embaixo para as lombadas que descem além do cartão da frente.
      style={{ paddingBottom: peek.length * PEEK_DROP }}
    >
      {/* Cartão selecionado, reto na frente. */}
      <div className="relative" style={{ zIndex: peek.length + 1 }}>
        <CreditCardVisual card={selected} />
      </div>

      {/* Lombadas (renderizadas do fundo para a frente para o z-index bater). */}
      {peek
        .map((card, i) => {
          const depth = i + 1; // 1 = logo atrás; maior = mais ao fundo
          const inset = depth * PEEK_INSET;
          const drop = depth * PEEK_DROP;
          const scale = 1 - depth * PEEK_SCALE_STEP;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedId(card.id)}
              aria-label={`Selecionar cartão ${card.name}`}
              className="absolute bottom-0 origin-bottom cursor-pointer overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br from-[#26262A] to-[#121214] shadow-md transition-transform duration-200 hover:translate-y-0.5"
              style={{
                left: inset,
                right: inset,
                height: 56,
                transform: `translateY(${drop}px) scale(${scale})`,
                zIndex: peek.length - depth, // mais fundo = z menor
              }}
            >
              {/* Nome no topo da lombada, única parte visível abaixo do cartão. */}
              <span className="absolute left-4 top-2.5 truncate text-[11px] font-medium text-white/55">
                {card.name}
              </span>
            </button>
          );
        })
        // Mais ao fundo primeiro no DOM.
        .reverse()}

      {/* Indicador/seletor: pontos para cada cartão. */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
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
