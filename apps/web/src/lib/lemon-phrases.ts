/**
 * Frases da marca — o eco do "com quantos paus se faz uma canoa", em versão limão.
 *
 * A assinatura afirmativa fecha a landing (FinalCta); as frases lúdicas rodam na
 * tela de boas-vindas pós-login. Quem vê uma e depois a outra sente continuidade,
 * então elas moram juntas aqui de propósito.
 */

/** Assinatura da landing. Afirma em vez de perguntar — headline já foi dada. */
export const LEMON_TAGLINE = "Com poucos limões se faz uma bela limonada.";

/** Frases da tela pós-login. Curtas: ficam no ar menos de um segundo. */
export const LEMON_LOADING_PHRASES = [
  "Com quantos limões se faz uma limonada?",
  "Espremendo seus números...",
  "Já já sua limonada tá pronta.",
  "Somando os gastos do mês...",
  "Separando os limões maduros...",
  "Adoçando na medida certa...",
  "Contando cada centavo...",
  "Preparando sua limonada financeira...",
] as const;

/** Sorteia uma frase. Chamada no client, nunca durante render de servidor. */
export function randomLoadingPhrase(): string {
  const i = Math.floor(Math.random() * LEMON_LOADING_PHRASES.length);
  return LEMON_LOADING_PHRASES[i];
}
