/**
 * Teste do ConversationRepository (estado pendente + histórico). Auto-limpante.
 *   pnpm --filter api exec tsx scripts/test-conversation.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const dbMatch = readFileSync(join(__dirname, '..', '..', '..', '.env'), 'utf8').match(
  /^DATABASE_URL=(.+)$/m,
);
if (!dbMatch) {
  console.error('DATABASE_URL não encontrado');
  process.exit(1);
}
process.env.DATABASE_URL = dbMatch[1].trim();

import { PrismaService } from '../src/prisma/prisma.service';
import {
  ConversationRepository,
  PendingConfirmation,
} from '../src/modules/whatsapp/repositories/conversation.repository';

const prisma = new PrismaService();
const repo = new ConversationRepository(prisma);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = '') {
  console.log(`  ${cond ? '✅' : '❌'} ${label} ${cond ? '' : extra}`);
  cond ? pass++ : fail++;
}

const phone = `test-conv-${Date.now()}`;

async function main() {
  // 1) Estado inicial vazio.
  check('pending inicial = null', (await repo.getPending(phone)) === null);
  check('history inicial = []', (await repo.getHistory(phone)).length === 0);

  // 2) Salva pendente.
  const pending: PendingConfirmation = {
    type: 'category',
    amount: 50,
    txType: 'EXPENSE',
    description: 'gastei 50 ali',
    options: [
      { slug: 'alimentacao', label: '🛒 Alimentação' },
      { slug: 'outros', label: '📌 Outros' },
    ],
  };
  await repo.setPending(phone, pending);
  const got = await repo.getPending(phone);
  check('pending salvo e lido', got?.amount === 50 && got?.options.length === 2, JSON.stringify(got));

  // 3) Limpa pendente.
  await repo.clearPending(phone);
  check('pending limpo = null', (await repo.getPending(phone)) === null);

  // 4) Histórico: append e leitura.
  await repo.appendHistory(phone, [{ role: 'user', text: 'quanto gastei?' }]);
  await repo.appendHistory(phone, [{ role: 'bot', text: 'R$1.800 em junho' }]);
  const h = await repo.getHistory(phone);
  check('histórico tem 2 entradas', h.length === 2, `(got ${h.length})`);
  check('ordem preservada', h[0].text === 'quanto gastei?' && h[1].role === 'bot');

  // 5) Limite de histórico (MAX_HISTORY = 4): adiciona 6, sobram 4.
  for (let i = 0; i < 6; i++) {
    await repo.appendHistory(phone, [{ role: 'user', text: `msg ${i}` }]);
  }
  const h2 = await repo.getHistory(phone);
  check('histórico limitado a 4', h2.length === 4, `(got ${h2.length})`);
  check('mantém as mais recentes', h2[h2.length - 1].text === 'msg 5', `(got ${h2[h2.length - 1].text})`);

  // 6) Truncamento de texto longo (MAX_TEXT = 160).
  const longText = 'x'.repeat(500);
  await repo.appendHistory(phone, [{ role: 'user', text: longText }]);
  const h3 = await repo.getHistory(phone);
  check('texto truncado a 160', h3[h3.length - 1].text.length === 160, `(got ${h3[h3.length - 1].text.length})`);

  // 7) Pendente e histórico coexistem.
  await repo.setPending(phone, pending);
  const coexist = await repo.getHistory(phone);
  check('histórico preservado ao setar pendente', coexist.length === 4);
  check('pendente presente junto com histórico', (await repo.getPending(phone)) !== null);

  console.log(`\n======================\nRESULTADO: ${pass} passou, ${fail} falhou\n======================\n`);
}

main()
  .catch((e) => { console.error('ERRO:', e); fail++; })
  .finally(async () => {
    console.log('Limpando...');
    await prisma.conversationState.deleteMany({ where: { phone } });
    await prisma.$disconnect();
    console.log('OK.');
    process.exit(fail > 0 ? 1 : 0);
  });
