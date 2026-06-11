/**
 * Teste manual do cálculo de orçamento (GetBudgetUseCase). Auto-limpante.
 *   pnpm --filter api exec tsx scripts/test-budget.ts
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
import { TransactionsRepository } from '../src/modules/transactions/repositories/transactions.repository';
import { BudgetsRepository } from '../src/modules/budgets/repositories/budgets.repository';
import { FamilyContextService } from '../src/modules/families/services/family-context.service';
import { FamiliesRepository } from '../src/modules/families/repositories/families.repository';
import { GetBudgetUseCase } from '../src/modules/budgets/use-cases/get-budget.use-case';

const prisma = new PrismaService();
const txRepo = new TransactionsRepository(prisma);
const budgetRepo = new BudgetsRepository(prisma);
const familyContext = new FamilyContextService(new FamiliesRepository(prisma));
const getBudget = new GetBudgetUseCase(budgetRepo, txRepo, familyContext);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = '') {
  console.log(`  ${cond ? '✅' : '❌'} ${label} ${cond ? '' : extra}`);
  cond ? pass++ : fail++;
}

let userId: string | undefined;

async function main() {
  const cat = await prisma.category.findFirst();
  if (!cat) throw new Error('Sem categorias.');
  const user = await prisma.user.create({
    data: { email: `budget-test-${Date.now()}@lemonfin.test`, name: 'Budget Test', passwordHash: 't' },
  });
  userId = user.id;
  console.log(`\nUsuário: ${user.id}\n`);

  // Cenário: março/2026 (31 dias), "hoje" é dia 10.
  const now = new Date(2026, 2, 10, 12, 0, 0);
  const month = '2026-03';

  // Orçamento de R$ 3.000.
  await budgetRepo.upsert(user.id, month, 3000);

  // Despesas no mês: 600 à vista (dia 3) + 600 no cartão (dia 5) = 1200 gastos.
  await txRepo.create({
    amount: 600, type: 'EXPENSE', description: 'Gasto à vista',
    date: new Date(2026, 2, 3).toISOString(), source: 'MANUAL',
    userId: user.id, categoryId: cat.id,
  });
  // Cartão: precisa de um card real para cardId.
  const card = await prisma.card.create({
    data: { name: 'Cartão Teste', closingDay: 1, userId: user.id },
  });
  await txRepo.create({
    amount: 600, type: 'EXPENSE', description: 'Gasto cartão',
    date: new Date(2026, 2, 5).toISOString(), source: 'MANUAL',
    userId: user.id, categoryId: cat.id, cardId: card.id,
  });
  // Uma receita (NÃO deve afetar o teto).
  await txRepo.create({
    amount: 5000, type: 'INCOME', description: 'Salário',
    date: new Date(2026, 2, 5).toISOString(), source: 'MANUAL',
    userId: user.id, categoryId: cat.id,
  });

  const r = await getBudget.execute(user.id, month, now);
  console.log('Resultado:', JSON.stringify(r, null, 2), '\n');

  check('teto = 3000', r.amount === 3000, `(got ${r.amount})`);
  // Gasto = 600 à vista + 600 cartão = 1200 (receita ignorada).
  check('gasto = 1200 (despesa+cartão, sem receita)', r.spent === 1200, `(got ${r.spent})`);
  check('sobra = 1800', r.remaining === 1800, `(got ${r.remaining})`);
  check('percentual = 40%', r.percentage === 40, `(got ${r.percentage})`);
  check('dias restantes = 21', r.daysRemaining === 21, `(got ${r.daysRemaining})`);
  check('não estourou', r.exceeded === false);
  // Projeção: 1200 em 10 dias → 120/dia × 31 = 3720. Acima do teto → pace 'over'.
  check('projetado = 3720', r.projectedSpend === 3720, `(got ${r.projectedSpend})`);
  check('ritmo = over (projeção acima do teto)', r.pace === 'over', `(got ${r.pace})`);

  // Cenário 2: sem orçamento definido para abril.
  const r2 = await getBudget.execute(user.id, '2026-04', new Date(2026, 3, 15, 12, 0, 0));
  check('mês sem orçamento → amount null', r2.amount === null, `(got ${r2.amount})`);

  console.log(`\n======================\nRESULTADO: ${pass} passou, ${fail} falhou\n======================\n`);
}

main()
  .catch((e) => { console.error('ERRO:', e); fail++; })
  .finally(async () => {
    console.log('Limpando...');
    if (userId) {
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.budget.deleteMany({ where: { userId } });
      await prisma.card.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log('OK.');
    process.exit(fail > 0 ? 1 : 0);
  });
