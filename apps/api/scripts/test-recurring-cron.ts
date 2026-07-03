/**
 * Teste manual do cron de materializacao de recorrencias.
 *
 * Cria dados de teste isolados, roda o RecurringMaterializerService real
 * com datas controladas, valida os comportamentos criticos e limpa tudo
 * no final (mesmo em caso de erro).
 *
 * Rodar da raiz do repo:
 *   pnpm --filter api exec tsx scripts/test-recurring-cron.ts
 *
 * Requer DATABASE_URL no ambiente (carregado abaixo a partir do .env da raiz).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

// Carrega DATABASE_URL do .env da raiz (script standalone nao usa ConfigModule).
const envPath = join(__dirname, '..', '..', '..', '.env');
const envContent = readFileSync(envPath, 'utf8');
const dbMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!dbMatch) {
  console.error('DATABASE_URL nao encontrado no .env da raiz');
  process.exit(1);
}
process.env.DATABASE_URL = dbMatch[1].trim();

import { PrismaService } from '../src/prisma/prisma.service';
import { RecurringRepository } from '../src/modules/recurring/repositories/recurring.repository';
import { TransactionsRepository } from '../src/modules/transactions/repositories/transactions.repository';
import { RecurringMaterializerService } from '../src/modules/recurring/services/recurring-materializer.service';

const prisma = new PrismaService();
const recurringRepo = new RecurringRepository(prisma);
const transactionsRepo = new TransactionsRepository(prisma);
const materializer = new RecurringMaterializerService(
  recurringRepo,
  transactionsRepo,
);

let pass = 0;
let fail = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label}`);
    fail++;
  }
}

// IDs criados para limpeza no finally.
let testUserId: string | undefined;
const recurringIds: string[] = [];

async function countMaterialized(recurringId: string): Promise<number> {
  return prisma.transaction.count({ where: { recurringId } });
}

async function main() {
  // --- Setup: usuario e categoria de teste ---
  const category = await prisma.category.findFirst();
  if (!category) {
    throw new Error('Nenhuma categoria no banco. Rode o seed primeiro.');
  }

  const user = await prisma.user.create({
    data: {
      email: `cron-test-${Date.now()}@lemonfin.test`,
      name: 'Cron Test User',
      passwordHash: 'test',
    },
  });
  testUserId = user.id;
  console.log(`\nUsuario de teste: ${user.id}\n`);

  // Usa um mes/ano fixo e conhecido para controlar o cenario.
  // Marco/2026: dia 10 existe; ultimo dia = 31.
  const marchDay10 = new Date(2026, 2, 10, 12, 0, 0); // mes 2 = marco

  // --- Cenario 1: materializacao basica ---
  console.log('CENARIO 1 — Materializacao basica (dia 10 em marco)');
  const rec1 = await recurringRepo.create({
    description: 'Aluguel teste',
    amount: 1500,
    type: 'EXPENSE',
    dayOfMonth: 10,
    userId: user.id,
    categoryId: category.id,
  });
  recurringIds.push(rec1.id);

  await materializer.materializeDueRecurrences(marchDay10);
  check('criou 1 transacao', (await countMaterialized(rec1.id)) === 1);

  const tx = await prisma.transaction.findFirst({
    where: { recurringId: rec1.id },
  });
  check('source = RECURRING', tx?.source === 'RECURRING');
  check('valor correto (1500)', tx ? Number(tx.amount) === 1500 : false);
  check('vinculada ao usuario', tx?.userId === user.id);

  // --- Cenario 2: idempotencia (rodar de novo nao duplica) ---
  console.log('\nCENARIO 2 — Idempotencia (re-rodar no mesmo mes)');
  await materializer.materializeDueRecurrences(marchDay10);
  await materializer.materializeDueRecurrences(marchDay10);
  check(
    'ainda 1 transacao apos 2 re-execucoes',
    (await countMaterialized(rec1.id)) === 1,
  );

  // --- Cenario 3: recorrencia pausada nao materializa ---
  console.log('\nCENARIO 3 — Recorrencia pausada (active=false)');
  const rec2 = await recurringRepo.create({
    description: 'Pausada teste',
    amount: 99,
    type: 'EXPENSE',
    dayOfMonth: 10,
    userId: user.id,
    categoryId: category.id,
  });
  recurringIds.push(rec2.id);
  await recurringRepo.update(rec2.id, { active: false });

  await materializer.materializeDueRecurrences(marchDay10);
  check('pausada NAO gerou transacao', (await countMaterialized(rec2.id)) === 0);

  // --- Cenario 4: dia que nao e hoje nao materializa ---
  console.log('\nCENARIO 4 — Dia diferente de hoje');
  const rec3 = await recurringRepo.create({
    description: 'Dia 25 teste',
    amount: 200,
    type: 'EXPENSE',
    dayOfMonth: 25,
    userId: user.id,
    categoryId: category.id,
  });
  recurringIds.push(rec3.id);

  // Ainda rodando "no dia 10" — a do dia 25 nao deve cair.
  await materializer.materializeDueRecurrences(marchDay10);
  check(
    'dia 25 NAO materializa no dia 10',
    (await countMaterialized(rec3.id)) === 0,
  );

  // --- Cenario 5: meses curtos (dia 31 em fevereiro) ---
  console.log('\nCENARIO 5 — Mes curto (dia 31 cai no ultimo dia de fev)');
  const rec4 = await recurringRepo.create({
    description: 'Dia 31 teste',
    amount: 300,
    type: 'EXPENSE',
    dayOfMonth: 31,
    userId: user.id,
    categoryId: category.id,
  });
  recurringIds.push(rec4.id);

  // Fev/2026 tem 28 dias. Rodando no dia 28 (ultimo dia), a do dia 31 deve cair.
  const feb28 = new Date(2026, 1, 28, 12, 0, 0); // mes 1 = fevereiro
  await materializer.materializeDueRecurrences(feb28);
  check(
    'dia 31 materializou no ultimo dia de fev',
    (await countMaterialized(rec4.id)) === 1,
  );

  // E nao deve materializar de novo se rodar num dia anterior do mesmo mes.
  const feb20 = new Date(2026, 1, 20, 12, 0, 0);
  await materializer.materializeDueRecurrences(feb20);
  check(
    'nao duplica a do dia 31 no mesmo fev',
    (await countMaterialized(rec4.id)) === 1,
  );

  // --- Cenario 6: ajuste de dia util PREVIOUS (salario dia 5 num domingo) ---
  console.log('\nCENARIO 6 — Dia util PREVIOUS (dia 5 domingo → sexta 3)');
  const rec5 = await recurringRepo.create({
    description: 'Salario dia util teste',
    amount: 8000,
    type: 'INCOME',
    dayOfMonth: 5,
    businessDayAdjustment: 'PREVIOUS',
    userId: user.id,
    categoryId: category.id,
  });
  recurringIds.push(rec5.id);

  // 05/07/2026 e domingo → PREVIOUS materializa na sexta 03/07.
  const jul5 = new Date(Date.UTC(2026, 6, 5, 12, 0, 0)); // domingo
  const jul3 = new Date(Date.UTC(2026, 6, 3, 12, 0, 0)); // sexta

  // Rodando NO dia 5 (domingo) NAO deve materializar — o dia efetivo e o 3.
  await materializer.materializeDueRecurrences(jul5);
  check(
    'PREVIOUS: NAO materializa no dia 5 (domingo)',
    (await countMaterialized(rec5.id)) === 0,
  );

  // Rodando no dia 3 (sexta) DEVE materializar, com a data ancorada no dia 3.
  await materializer.materializeDueRecurrences(jul3);
  check(
    'PREVIOUS: materializa no dia util anterior (sexta 3)',
    (await countMaterialized(rec5.id)) === 1,
  );
  const tx5 = await prisma.transaction.findFirst({
    where: { recurringId: rec5.id },
  });
  check(
    'PREVIOUS: transacao datada em 03/07 (noon UTC)',
    tx5?.date.toISOString() === '2026-07-03T12:00:00.000Z',
  );

  // --- Cenario 7: ajuste de dia util NEXT (dia 5 domingo → segunda 6) ---
  console.log('\nCENARIO 7 — Dia util NEXT (dia 5 domingo → segunda 6)');
  const rec6 = await recurringRepo.create({
    description: 'Boleto dia util teste',
    amount: 250,
    type: 'EXPENSE',
    dayOfMonth: 5,
    businessDayAdjustment: 'NEXT',
    userId: user.id,
    categoryId: category.id,
  });
  recurringIds.push(rec6.id);

  const jul6 = new Date(Date.UTC(2026, 6, 6, 12, 0, 0)); // segunda
  await materializer.materializeDueRecurrences(jul5);
  check(
    'NEXT: NAO materializa no dia 5 (domingo)',
    (await countMaterialized(rec6.id)) === 0,
  );
  await materializer.materializeDueRecurrences(jul6);
  check(
    'NEXT: materializa no dia util seguinte (segunda 6)',
    (await countMaterialized(rec6.id)) === 1,
  );

  // --- Cenario 8: "Lançar agora" (materializeOne) + idempotencia ---
  console.log('\nCENARIO 8 — Lançar agora (materializeOne)');
  const rec7 = await recurringRepo.create({
    description: 'Lancar agora teste',
    amount: 120,
    type: 'EXPENSE',
    dayOfMonth: 20,
    userId: user.id,
    categoryId: category.id,
  });
  recurringIds.push(rec7.id);

  // Lança manualmente com data fixa (agosto/2026 p/ nao colidir com os outros).
  const aug10 = new Date(Date.UTC(2026, 7, 10, 12, 0, 0)); // mes 7 = agosto
  const r1 = await materializer.materializeOne(rec7, aug10);
  check('materializeOne criou a transacao (created=true)', r1.created === true);
  check(
    'transacao existe apos lançar agora',
    (await countMaterialized(rec7.id)) === 1,
  );
  const txNow = await prisma.transaction.findFirst({
    where: { recurringId: rec7.id },
  });
  check(
    'datada no dia do lançamento (10/08 noon UTC)',
    txNow?.date.toISOString() === '2026-08-10T12:00:00.000Z',
  );

  // Segunda chamada no mesmo mes NAO duplica (created=false).
  const aug15 = new Date(Date.UTC(2026, 7, 15, 12, 0, 0));
  const r2 = await materializer.materializeOne(rec7, aug15);
  check('2a chamada no mesmo mes: created=false', r2.created === false);
  check(
    'nao duplicou (ainda 1 transacao)',
    (await countMaterialized(rec7.id)) === 1,
  );

  console.log(`\n========================================`);
  console.log(`RESULTADO: ${pass} passou, ${fail} falhou`);
  console.log(`========================================\n`);
}

main()
  .catch((e) => {
    console.error('\nERRO no teste:', e);
    fail++;
  })
  .finally(async () => {
    // Limpeza: apaga transacoes, recorrencias e usuario de teste.
    console.log('Limpando dados de teste...');
    if (recurringIds.length > 0) {
      await prisma.transaction.deleteMany({
        where: { recurringId: { in: recurringIds } },
      });
      await prisma.recurringTransaction.deleteMany({
        where: { id: { in: recurringIds } },
      });
    }
    if (testUserId) {
      await prisma.transaction.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log('Limpeza concluida.');
    process.exit(fail > 0 ? 1 : 0);
  });
