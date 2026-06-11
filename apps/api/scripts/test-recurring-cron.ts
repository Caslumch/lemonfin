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
