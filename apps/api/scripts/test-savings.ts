/**
 * Teste do SavingsGoalsRepository + computeSavingsProgress. Auto-limpante.
 *   pnpm --filter api exec tsx scripts/test-savings.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const dbMatch = readFileSync(
  join(__dirname, '..', '..', '..', '.env'),
  'utf8',
).match(/^DATABASE_URL=(.+)$/m);
if (!dbMatch) {
  console.error('DATABASE_URL não encontrado');
  process.exit(1);
}
process.env.DATABASE_URL = dbMatch[1].trim();

import { PrismaService } from '../src/prisma/prisma.service';
import { SavingsGoalsRepository } from '../src/modules/savings-goals/repositories/savings-goals.repository';
import { computeSavingsProgress } from '../src/modules/savings-goals/savings-goal-progress';

const prisma = new PrismaService();
const repo = new SavingsGoalsRepository(prisma);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = '') {
  console.log(`  ${cond ? '✅' : '❌'} ${label} ${cond ? '' : extra}`);
  cond ? pass++ : fail++;
}

const stamp = Date.now();
const email = `test-savings-${stamp}@example.com`;
let userId = '';

async function main() {
  // Usuário descartável (FK). Cascade limpa metas e transações no fim.
  const user = await prisma.user.create({
    data: { email, name: 'Test Savings', passwordHash: 'x' },
  });
  userId = user.id;

  const deadline = new Date(new Date().getFullYear() + 1, 0, 31); // jan do ano que vem

  // 1) Create: saved 0, active true.
  const goal = await repo.create({
    name: 'viagem',
    targetAmount: 5000,
    deadline,
    userId,
  });
  check('criado com savedAmount 0', goal.savedAmount.toNumber() === 0);
  check('criado active=true', goal.active === true);

  // 2) findManyActive retorna a meta.
  const active1 = await repo.findManyActive([userId]);
  check('findManyActive acha a meta', active1.some((g) => g.id === goal.id));

  // 3) addContribution(200) incrementa.
  const after200 = await repo.addContribution(goal.id, 200);
  check(
    'aporte 200 → saved 200',
    after200.savedAmount.toNumber() === 200,
    `(got ${after200.savedAmount.toNumber()})`,
  );
  check('ainda active após aporte parcial', after200.active === true);

  // 4) Aporte que cruza o alvo desativa e some da lista ativa.
  const afterDone = await repo.addContribution(goal.id, 5000);
  check('saved >= target após cruzar', afterDone.savedAmount.toNumber() >= 5000);
  check('desativa ao completar', afterDone.active === false);
  const active2 = await repo.findManyActive([userId]);
  check(
    'meta completa sai de findManyActive',
    !active2.some((g) => g.id === goal.id),
  );

  // 5) computeSavingsProgress — asserts puros.
  const now = new Date(2026, 0, 1); // jan/2026
  const p = computeSavingsProgress(1000, 250, new Date(2026, 4, 31), now); // maio
  check('percentage 25%', p.percentage === 25, `(got ${p.percentage})`);
  check('remaining 750', p.remaining === 750, `(got ${p.remaining})`);
  check('monthsRemaining 4', p.monthsRemaining === 4, `(got ${p.monthsRemaining})`);
  check(
    'suggestedMonthly ceil(750/4)=188',
    p.suggestedMonthly === 188,
    `(got ${p.suggestedMonthly})`,
  );

  // Edge: prazo neste mês → monthsRemaining mínimo 1.
  const pEdge = computeSavingsProgress(1000, 0, new Date(2026, 0, 15), now);
  check(
    'prazo no mês → monthsRemaining 1',
    pEdge.monthsRemaining === 1,
    `(got ${pEdge.monthsRemaining})`,
  );

  console.log(
    `\n======================\nRESULTADO: ${pass} passou, ${fail} falhou\n======================\n`,
  );
}

main()
  .catch((e) => {
    console.error('ERRO:', e);
    fail++;
  })
  .finally(async () => {
    console.log('Limpando...');
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
    console.log('OK.');
    process.exit(fail > 0 ? 1 : 0);
  });
