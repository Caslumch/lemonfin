import { atom } from "jotai";

// Jotai fica reservado a estado EFÊMERO de UI (mesmo padrão do web) — dados de
// servidor vivem no React Query. Exemplo inicial: mês selecionado no dashboard.
export const selectedMonthAtom = atom<string | null>(null);
