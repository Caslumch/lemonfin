/**
 * Frases da marca — o eco do "com quantos paus se faz uma canoa", em versão limão.
 *
 * A assinatura afirmativa fecha a landing (FinalCta); as frases lúdicas rodam na
 * tela de boas-vindas pós-login. Quem vê uma e depois a outra sente continuidade,
 * então elas moram juntas aqui de propósito.
 */

/** Assinatura da landing. Afirma em vez de perguntar — headline já foi dada. */
export const LEMON_TAGLINE = "Com poucos limões se faz uma bela limonada.";

/**
 * Frases da tela pós-login. Mantidas em ~25-38 caracteres para que qualquer
 * sorteio caiba no mesmo tempo de tela — frase curta demais desperdiça o hold,
 * longa demais não termina de ser lida.
 *
 * A pergunta original abre a lista de propósito: é a frase que deu origem ao
 * tema e a única que pode ser mais longa sem parecer deslocada.
 */
export const LEMON_LOADING_PHRASES = [
  "Com quantos limões se faz uma limonada?",
  "Espremendo seus números...",
  "Já já sua limonada tá pronta.",
  "Somando os gastos do mês...",
  "Separando os limões maduros...",
  "Adoçando na medida certa...",
  "Contando cada centavo...",
  "Sua limonada tá saindo...",
] as const;

/** Sorteia uma frase. Chamada no client, nunca durante render de servidor. */
export function randomLoadingPhrase(): string {
  const i = Math.floor(Math.random() * LEMON_LOADING_PHRASES.length);
  return LEMON_LOADING_PHRASES[i];
}
