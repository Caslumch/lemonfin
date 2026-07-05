import { atom } from "jotai";

// Quantos bottom sheets estão abertos. A tab bar flutuante (position:absolute)
// se esconde quando > 0 — senão fica por cima dos botões do sheet nas telas de
// aba (ex.: form de cartão na aba Cartões).
export const openSheetCountAtom = atom(0);
