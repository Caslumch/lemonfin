/**
 * Teste da lógica de detecção de gasto fora do padrão. Auto-limpante.
 *   pnpm --filter api exec tsx scripts/test-anomaly.ts
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

const prisma = new PrismaService();
const txRepo = new TransactionsRepository(prisma);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = '') {
  console.log(`  ${cond ? '✅' : '❌'} ${label} ${cond ? '' : extra}`);
  cond ? pass++ : fail++;
}

let userId: string | undefined;

// Replica a lógica de detecção do AlertsService para validar.
async function detect(uid: string, now: Date) {
  const userIds = [uid];
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentStart = new Date(year, month, 1);
  const currentEnd = new Date(year, month + 1, 0, 23, 59, 59);
  const histStart = new Date(year, month - 3, 1);
  const histEnd = new Date(year, month, 0, 23, 59, 59);

  const [currentCats, histCats] = await Promise.all([
    txRepo.getCategoryBreakdown(userIds, currentStart.toISOString(), currentEnd.toISOString()),
    txRepo.getCategoryBreakdown(userIds, histStart.toISOString(), histEnd.toISOString()),
  ]);
  const histAvg = new Map<string, number>();
  for (const c of histCats) histAvg.set(c.categoryId, c.total / 3);

  const anomalies: { name: string; ratio: number }[] = [];
  for (const cur of currentCats) {
    const avg = histAvg.get(cur.categoryId);
    if (!avg || avg < 50) continue;
    const ratio = cur.total / avg;
    const excess = cur.total - avg;
    if (ratio >= 1.5 && excess >= 100) {
      anomalies.push({ name: cur.category?.name ?? '?', ratio });
    }
  }
  return anomalies;
}

async function main() {
  const cats = await prisma.category.findMany({ take: 3 });
  if (cats.length < 3) throw new Error('Precisa de 3+ categorias.');
  const [lazer, alim, transp] = cats;

  const user = await prisma.user.create({
    data: { email: `anomaly-test-${Date.now()}@lemonfin.test`, name: 'Anomaly', passwordHash: 't' },
  });
  userId = user.id;
  console.log(`\nUsuário: ${user.id}\n`);

  // "hoje" = 15 de junho/2026.
  const now = new Date(2026, 5, 15, 12, 0, 0);

  const mk = (monthsAgo: number, catId: string, amount: number) => {
    const d = new Date(2026, 5 - monthsAgo, 10, 12, 0, 0);
    return txRepo.create({
      amount, type: 'EXPENSE' as const, description: 'gasto',
      date: d.toISOString(), source: 'MANUAL' as const,
      userId: user.id, categoryId: catId,
    });
  };

  // LAZER: média histórica 200/mês (3 meses × 200), mês atual 600 → 3x → ANOMALIA.
  await mk(1, lazer.id, 200);
  await mk(2, lazer.id, 200);
  await mk(3, lazer.id, 200);
  await mk(0, lazer.id, 600);

  // ALIMENTACAO: média 800/mês, mês atual 850 → 1.06x → NÃO é anomalia.
  await mk(1, alim.id, 800);
  await mk(2, alim.id, 800);
  await mk(3, alim.id, 800);
  await mk(0, alim.id, 850);

  // TRANSPORTE: sem histórico (só mês atual 300) → NÃO alerta (sem base).
  await mk(0, transp.id, 300);

  const anomalies = await detect(user.id, now);
  const names = anomalies.map((a) => a.name);
  console.log('Anomalias:', anomalies.map((a) => `${a.name} (${a.ratio.toFixed(1)}x)`).join(', ') || '(nenhuma)', '\n');

  check('detectou Lazer (3x acima)', names.includes(lazer.name));
  check('NÃO alertou Alimentação (dentro da média)', !names.includes(alim.name));
  check('NÃO alertou Transporte (sem histórico)', !names.includes(transp.name));
  check('total de 1 anomalia', anomalies.length === 1, `(got ${anomalies.length})`);

  console.log(`\n======================\nRESULTADO: ${pass} passou, ${fail} falhou\n======================\n`);
}

main()
  .catch((e) => { console.error('ERRO:', e); fail++; })
  .finally(async () => {
    console.log('Limpando...');
    if (userId) {
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log('OK.');
    process.exit(fail > 0 ? 1 : 0);
  });
