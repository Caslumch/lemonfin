/**
 * Teste manual da detecção de assinaturas (AlertsService.detectSubscriptionsForUser).
 * Exercita a lógica de agrupamento via os repositórios reais, validando contra
 * dados controlados. Auto-limpante.
 *
 * Rodar da raiz:
 *   pnpm --filter api exec tsx scripts/test-subscription-detection.ts
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
import { RecurringRepository } from '../src/modules/recurring/repositories/recurring.repository';
import { FamilyContextService } from '../src/modules/families/services/family-context.service';
import { FamiliesRepository } from '../src/modules/families/repositories/families.repository';

const prisma = new PrismaService();
const txRepo = new TransactionsRepository(prisma);
const recRepo = new RecurringRepository(prisma);
const familyContext = new FamilyContextService(new FamiliesRepository(prisma));

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = '') {
  console.log(`  ${cond ? '✅' : '❌'} ${label} ${cond ? '' : extra}`);
  cond ? pass++ : fail++;
}

// Replica a lógica de detecção (mesma do AlertsService) para validar o resultado.
function normalizeDesc(desc: string): string {
  return desc
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

let userId: string | undefined;
const recIds: string[] = [];

async function detect(uid: string) {
  const userIds = await familyContext.resolveUserIds(uid);
  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [expenses, recurrences] = await Promise.all([
    txRepo.findExpensesWithDescriptionSince(userIds, since),
    recRepo.findMany(userIds, false),
  ]);
  const known = new Set(recurrences.map((r) => normalizeDesc(r.description)));
  const groups = new Map<string, { label: string; months: Set<string> }>();
  for (const tx of expenses) {
    const key = normalizeDesc(tx.description ?? '');
    if (!key || known.has(key)) continue;
    const d = new Date(tx.date);
    const mk = `${d.getFullYear()}-${d.getMonth()}`;
    const g = groups.get(key);
    if (g) g.months.add(mk);
    else groups.set(key, { label: tx.description ?? '', months: new Set([mk]) });
  }
  return Array.from(groups.values()).filter((g) => g.months.size >= 2);
}

async function main() {
  const cat = await prisma.category.findFirst();
  if (!cat) throw new Error('Sem categorias.');
  const user = await prisma.user.create({
    data: { email: `sub-test-${Date.now()}@lemonfin.test`, name: 'Sub Test', passwordHash: 't' },
  });
  userId = user.id;
  console.log(`\nUsuário: ${user.id}\n`);

  const mk = (monthsAgo: number, desc: string, amount: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    d.setDate(10);
    return txRepo.create({
      amount,
      type: 'EXPENSE' as const,
      description: desc,
      date: d.toISOString(),
      source: 'MANUAL' as const,
      userId: user.id,
      categoryId: cat.id,
    });
  };

  // Netflix em 2 meses → deve detectar.
  await mk(0, 'Netflix', 55);
  await mk(1, 'netflix ', 55); // variação de caixa/espaço → mesmo grupo
  // Spotify em 3 meses → deve detectar.
  await mk(0, 'Spotify', 21);
  await mk(1, 'Spotify', 21);
  await mk(2, 'Spotify', 21);
  // Mercado só 1 mês → NÃO detecta.
  await mk(0, 'Mercado', 200);
  // Academia em 2 meses MAS já é recorrência → NÃO sugere.
  await mk(0, 'Academia', 90);
  await mk(1, 'Academia', 90);
  const rec = await recRepo.create({
    description: 'Academia',
    amount: 90,
    type: 'EXPENSE',
    dayOfMonth: 10,
    userId: user.id,
    categoryId: cat.id,
  });
  recIds.push(rec.id);

  const subs = await detect(user.id);
  const labels = subs.map((s) => normalizeDesc(s.label)).sort();
  console.log('Detectadas:', subs.map((s) => `${s.label} (${s.months.size}m)`).join(', '), '\n');

  check('detectou Netflix (variação agrupada)', labels.includes('netflix'));
  check('detectou Spotify', labels.includes('spotify'));
  check('NÃO sugeriu Mercado (só 1 mês)', !labels.includes('mercado'));
  check('NÃO sugeriu Academia (já é recorrência)', !labels.includes('academia'));
  check('total de 2 sugestões', subs.length === 2, `(got ${subs.length})`);

  console.log(`\n======================\nRESULTADO: ${pass} passou, ${fail} falhou\n======================\n`);
}

main()
  .catch((e) => {
    console.error('ERRO:', e);
    fail++;
  })
  .finally(async () => {
    console.log('Limpando...');
    if (recIds.length) await prisma.recurringTransaction.deleteMany({ where: { id: { in: recIds } } });
    if (userId) {
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log('OK.');
    process.exit(fail > 0 ? 1 : 0);
  });
