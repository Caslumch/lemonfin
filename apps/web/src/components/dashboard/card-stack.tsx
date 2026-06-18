"use client";

import { useState } from "react";
import type { Card } from "@/types/card";
import { CreditCardVisual, themeFor } from "./credit-card-visual";

interface CardStackProps {
  cards: Card[];
}

/**
 * Pilha de cartões: o selecionado fica reto na frente; logo atrás espia UMA
 * lombada — o PRÓXIMO cartão da fila, pintado na cor real da bandeira dele
 * (dica de quem vem a seguir). Clicar na lombada avança a seleção de forma
 * cíclica (último → primeiro), trazendo o próximo pra frente e revelando o
 * seguinte atrás. Os dots embaixo também selecionam direto.
 */
export function CardStack({ cards }: CardStackProps) {
  const [index, setIndex] = useState(0);

  if (cards.length === 0) return null;
  if (cards.length === 1) return <CreditCardVisual card={cards[0]} />;

  // Index seguro mesmo se a lista encolher (ex.: cartão removido em outra aba).
  const current = Math.min(index, cards.length - 1);
  const card = cards[current];

  // O "próximo" da fila, cíclico — é ele que aparece como lombada atrás.
  const nextIndex = (current + 1) % cards.length;
  const next = cards[nextIndex];
  const nextTheme = themeFor(next.brand);

  return (
    <div>
      {/* Espaço no topo (pt-6 ≈ 24px) para a faixa da lombada que sobe além do
          cartão da frente — o bastante para ler o nome do próximo cartão. */}
      <div className="relative pt-6">
        {/* Lombada de trás = próximo cartão, na cor real dele. Clicar avança. */}
        <button
          type="button"
          onClick={() => setIndex(nextIndex)}
          aria-label={`Selecionar cartão ${next.name}`}
          className={`absolute inset-x-3 top-0 h-20 origin-bottom cursor-pointer overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br ${nextTheme.gradient} shadow-md transition-transform duration-200 hover:-translate-y-0.5`}
        >
          {/* Nome no topo da lombada, única parte visível acima do cartão. */}
          <span className="absolute left-4 top-1.5 truncate text-[11px] font-medium text-white/75">
            {next.name}
          </span>
        </button>

        {/* Cartão selecionado, reto na frente. */}
        <div className="relative z-10">
          <CreditCardVisual card={card} />
        </div>
      </div>

      {/* Indicador/seletor: pontos para cada cartão. */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
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
    </div>
  );
}
