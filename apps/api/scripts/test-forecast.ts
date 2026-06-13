/**
 * Teste manual do cálculo de previsão de saldo (GetForecastUseCase).
 *
 * Cria dados de teste isolados, exercita o use-case real com datas
 * controladas, valida e limpa tudo no final.
 *
 * Rodar da raiz do repo:
 *   pnpm --filter api exec tsx scripts/test-forecast.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(__dirname, '..', '..', '..', '.env');
const dbMatch = readFileSync(envPath, 'utf8').match(/^DATABASE_URL=(.+)$/m);
if (!dbMatch) {
  console.error('DATABASE_URL não encontrado no .env da raiz');
  process.exit(1);
}
process.env.DATABASE_URL = dbMatch[1].trim();

import { PrismaService } from '../src/prisma/prisma.service';
import { TransactionsRepository } from '../src/modules/transactions/repositories/transactions.repository';
import { RecurringRepository } from '../src/modules/recurring/repositories/recurring.repository';
import { FamilyContextService } from '../src/modules/families/services/family-context.service';
import { FamiliesRepository } from '../src/modules/families/repositories/families.repository';
import { GetForecastUseCase } from '../src/modules/transactions/use-cases/get-forecast.use-case';

const prisma = new PrismaService();
const txRepo = new TransactionsRepository(prisma);
const recRepo = new RecurringRepository(prisma);
const familiesRepo = new FamiliesRepository(prisma);
const familyContext = new FamilyContextService(familiesRepo);
const forecast = new GetForecastUseCase(txRepo, recRepo, familyContext);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = '') {
  if (cond) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label} ${extra}`);
    fail++;
  }
}

let userId: string | undefined;
const recIds: string[] = [];

async function main() {
  const category = await prisma.category.findFirst();
  if (!category) throw new Error('Sem categorias. Rode o seed.');

  const user = await prisma.user.create({
    data: {
      email: `forecast-test-${Date.now()}@lemonfin.test`,
      name: 'Forecast Test',
      passwordHash: 'test',
    },
  });
  userId = user.id;
  console.log(`\nUsuário de teste: ${user.id}\n`);

  // Cenário: hoje é dia 10 de um mês de 31 dias (março/2026).
  const now = new Date(2026, 2, 10, 12, 0, 0);

  // Transação realizada do mês: uma despesa de 200 no dia 3.
  await txRepo.create({
    amount: 200,
    type: 'EXPENSE',
    description: 'Gasto realizado',
    date: new Date(2026, 2, 3, 12, 0, 0).toISOString(),
    source: 'MANUAL',
    userId: user.id,
    categoryId: category.id,
  });
  // Uma receita realizada de 5000 no dia 5.
  await txRepo.create({
    amount: 5000,
    type: 'INCOME',
    description: 'Salário recebido',
    date: new Date(2026, 2, 5, 12, 0, 0).toISOString(),
    source: 'MANUAL',
    userId: user.id,
    categoryId: category.id,
  });

  // Histórico de gasto variável: 1800 em fev/2026 (mês completo anterior).
  // Janela de média = dez/jan/fev = 90 dias → média de 20/dia.
  await txRepo.create({
    amount: 1800,
    type: 'EXPENSE',
    description: 'Gastos variáveis fev',
    date: new Date(2026, 1, 15, 12, 0, 0).toISOString(),
    source: 'MANUAL',
    userId: user.id,
    categoryId: category.id,
  });

  // Recorrências:
  // - Aluguel 1500, dia 15 (FUTURO → deve entrar como pendente)
  const aluguel = await recRepo.create({
    description: 'Aluguel',
    amount: 1500,
    type: 'EXPENSE',
    dayOfMonth: 15,
    userId: user.id,
    categoryId: category.id,
  });
  recIds.push(aluguel.id);
  // - Internet 100, dia 5 (PASSADO → NÃO deve entrar)
  const internet = await recRepo.create({
    description: 'Internet',
    amount: 100,
    type: 'EXPENSE',
    dayOfMonth: 5,
    userId: user.id,
    categoryId: category.id,
  });
  recIds.push(internet.id);
  // - Freela 800, dia 20 (FUTURO, receita → entra como pendingIncome)
  const freela = await recRepo.create({
    description: 'Freela',
    amount: 800,
    type: 'INCOME',
    dayOfMonth: 20,
    userId: user.id,
    categoryId: category.id,
  });
  recIds.push(freela.id);
  // - Pausada 999, dia 25 (inativa → NÃO entra)
  const pausada = await recRepo.create({
    description: 'Pausada',
    amount: 999,
    type: 'EXPENSE',
    dayOfMonth: 25,
    userId: user.id,
    categoryId: category.id,
  });
  recIds.push(pausada.id);
  await recRepo.update(pausada.id, { active: false });

  const result = await forecast.execute(user.id, now);

  console.log('Resultado:', JSON.stringify(result, null, 2), '\n');

  // Saldo realizado = 5000 - 200 = 4800
  check('saldo atual = 4800', result.currentBalance === 4800, `(got ${result.currentBalance})`);
  // Pendentes: aluguel(15) e freela(20). Internet(5) e Pausada já excluídos.
  check('2 recorrências pendentes', result.pending.length === 2, `(got ${result.pending.length})`);
  check('pendingIncome = 800', result.pendingIncome === 800, `(got ${result.pendingIncome})`);
  check('pendingExpense = 1500', result.pendingExpense === 1500, `(got ${result.pendingExpense})`);
  // Média diária de gasto variável = 1800 / 90 dias = 20
  check(
    'média diária variável = 20',
    result.avgDailyVariableExpense === 20,
    `(got ${result.avgDailyVariableExpense})`,
  );
  // Estimado p/ o resto do mês = 20 * 21 dias restantes = 420
  check(
    'gasto variável estimado = 420',
    result.estimatedVariableExpense === 420,
    `(got ${result.estimatedVariableExpense})`,
  );
  // Projetado = 4800 + 800 - 1500 - 420 = 3680
  check('projetado = 3680', result.projectedBalance === 3680, `(got ${result.projectedBalance})`);
  // Dias restantes = 31 - 10 = 21
  check('dias restantes = 21', result.daysRemaining === 21, `(got ${result.daysRemaining})`);
  // Internet NÃO está na lista
  check(
    'recorrência passada (Internet) excluída',
    !result.pending.some((p) => p.description === 'Internet'),
  );
  // Pausada NÃO está
  check(
    'recorrência pausada excluída',
    !result.pending.some((p) => p.description === 'Pausada'),
  );
  // Ordenado por dia
  check(
    'pendentes ordenadas por dia',
    result.pending[0].dayOfMonth <= result.pending[1].dayOfMonth,
  );

  console.log(`\n========================================`);
  console.log(`RESULTADO: ${pass} passou, ${fail} falhou`);
  console.log(`========================================\n`);
}

main()
  .catch((e) => {
    console.error('\nERRO:', e);
    fail++;
  })
  .finally(async () => {
    console.log('Limpando dados de teste...');
    if (recIds.length) {
      await prisma.recurringTransaction.deleteMany({ where: { id: { in: recIds } } });
    }
    if (userId) {
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log('Limpeza concluída.');
    process.exit(fail > 0 ? 1 : 0);
  });
