/**
 * Gera todas as formas equivalentes de um número de telefone brasileiro para
 * casar com o cadastro, sem ADIVINHAR qual é a "certa".
 *
 * Contexto: o WhatsApp entrega a mesma pessoa ora COM o nono dígito
 * (ex. `5586998674004`), ora SEM ele (ex. `558698674004`) — depende de como o
 * device dela está registrado. Não existe heurística que diga se um número BR
 * tem ou não o 9; só o servidor sabe. Então, em vez de tentar normalizar para
 * uma forma única, enumeramos todas as variações plausíveis e deixamos o banco
 * decidir qual existe (o `phone` cadastrado é a verdade).
 *
 * As variações cobertas:
 *  - com/sem o prefixo de país `55`
 *  - com/sem o nono dígito (o `9` extra logo após o DDD, em celulares)
 *
 * Estrutura de um celular BR: `55` + DDD(2) + [9] + 8 dígitos.
 *  - com 9: 13 dígitos com 55  (ou 11 sem o 55)
 *  - sem 9: 12 dígitos com 55  (ou 10 sem o 55)
 */
export function phoneCandidates(input: string): string[] {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) return [];

  const candidates = new Set<string>([digits]);

  // Normaliza para a parte nacional (sem o 55) para raciocinar sobre o 9.
  const hasCountry = digits.startsWith('55');
  const national = hasCountry ? digits.slice(2) : digits;

  // national esperado: DDD(2) + número (8 ou 9 dígitos).
  if (national.length === 11 || national.length === 10) {
    const ddd = national.slice(0, 2);
    const rest = national.slice(2);

    let with9: string;
    let without9: string;

    if (rest.length === 9 && rest.startsWith('9')) {
      // veio COM o nono dígito → deriva a forma SEM
      with9 = rest;
      without9 = rest.slice(1);
    } else if (rest.length === 8) {
      // veio SEM o nono dígito → deriva a forma COM
      without9 = rest;
      with9 = `9${rest}`;
    } else {
      with9 = rest;
      without9 = rest;
    }

    for (const r of new Set([with9, without9])) {
      const nat = `${ddd}${r}`;
      candidates.add(nat); // sem 55
      candidates.add(`55${nat}`); // com 55
    }
  } else {
    // Não parece celular BR: cobre só a variação do 55.
    if (hasCountry) candidates.add(national);
    else candidates.add(`55${digits}`);
  }

  return Array.from(candidates);
}
