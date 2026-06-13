/**
 * Teste manual do CRUD de categorias personalizadas.
 *
 * Exercita os use-cases reais contra o banco, valida e limpa no final.
 * Use o banco LOCAL — passe a URL no ambiente:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/lemonfin \
 *     pnpm --filter api exec tsx scripts/test-categories.ts
 *
 * Se DATABASE_URL não estiver no ambiente, cai para o .env da raiz.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

if (!process.env.DATABASE_URL) {
  const envPath = join(__dirname, '..', '..', '..', '.env');
  const m = readFileSync(envPath, 'utf8').match(/^DATABASE_URL=(.+)$/m);
  if (!m) {
    console.error('DATABASE_URL não encontrado no ambiente nem no .env');
    process.exit(1);
  }
  process.env.DATABASE_URL = m[1].trim();
}

import { PrismaService } from '../src/prisma/prisma.service';
import { CategoriesRepository } from '../src/modules/categories/repositories/categories.repository';
import { FamiliesRepository } from '../src/modules/families/repositories/families.repository';
import { FamilyContextService } from '../src/modules/families/services/family-context.service';
import { CreateCategoryUseCase } from '../src/modules/categories/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from '../src/modules/categories/use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from '../src/modules/categories/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from '../src/modules/categories/use-cases/delete-category.use-case';
import { slugify } from '../src/modules/categories/dtos/category.dto';

const prisma = new PrismaService();
// Cache no-op: o teste valida lógica, não cache.
const noopCache = {
  get: async () => undefined,
  set: async () => undefined,
  del: async () => undefined,
} as any;

const catRepo = new CategoriesRepository(prisma, noopCache);
const familiesRepo = new FamiliesRepository(prisma);
const familyContext = new FamilyContextService(familiesRepo);
const createCat = new CreateCategoryUseCase(catRepo);
const listCat = new ListCategoriesUseCase(catRepo, familyContext);
const updateCat = new UpdateCategoryUseCase(catRepo, familyContext);
const deleteCat = new DeleteCategoryUseCase(catRepo, familyContext);

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

const userIds: string[] = [];

async function main() {
  // slugify isolado
  check(
    'slugify remove acento e espaço',
    slugify('Saúde do Pet') === 'saude-do-pet',
    `(got ${slugify('Saúde do Pet')})`,
  );

  const userA = await prisma.user.create({
    data: {
      email: `cat-test-a-${Date.now()}@lemonfin.test`,
      name: 'Cat Test A',
      passwordHash: 'test',
    },
  });
  userIds.push(userA.id);
  const userB = await prisma.user.create({
    data: {
      email: `cat-test-b-${Date.now()}@lemonfin.test`,
      name: 'Cat Test B',
      passwordHash: 'test',
    },
  });
  userIds.push(userB.id);

  // Criar categoria
  const pet = await createCat.execute(userA.id, {
    name: 'Pet',
    icon: '🐶',
    colorPreset: 'azul',
  });
  check('cria categoria com userId', pet.userId === userA.id);
  check('slug gerado', pet.slug === 'pet', `(got ${pet.slug})`);
  check('cor resolvida do preset', pet.colorBg === '#E3F2FD');

  // Slug duplicado → sufixo
  const pet2 = await createCat.execute(userA.id, {
    name: 'Pet',
    icon: '🐱',
    colorPreset: 'verde',
  });
  check('slug duplicado vira pet-2', pet2.slug === 'pet-2', `(got ${pet2.slug})`);

  // Colisão com slug de sistema (alimentacao) → sufixo
  const ali = await createCat.execute(userA.id, {
    name: 'Alimentação',
    icon: '🍔',
    colorPreset: 'laranja',
  });
  check(
    'colisão com slug de sistema vira alimentacao-2',
    ali.slug === 'alimentacao-2',
    `(got ${ali.slug})`,
  );

  // Listagem: sistema (editable false) + próprias (editable true)
  const listA = await listCat.execute(userA.id);
  const sys = listA.find((c) => c.slug === 'outros');
  const own = listA.find((c) => c.id === pet.id);
  check('sistema vem com editable=false', !!sys && sys.editable === false);
  check('própria vem com editable=true', !!own && own.editable === true);
  check('lista inclui as 3 criadas', listA.filter((c) => c.editable).length === 3);

  // Update: nome/cor/icon mudam; slug fica estável
  const updated = await updateCat.execute(pet.id, userA.id, {
    name: 'Pet & Cia',
    colorPreset: 'roxo',
  });
  check('nome atualizado', updated.name === 'Pet & Cia');
  check('cor atualizada', updated.colorBg === '#F3E5F5');
  check('slug permanece estável após rename', updated.slug === 'pet');

  // Update de categoria de sistema → NotFound
  const sysCat = listA.find((c) => c.slug === 'outros')!;
  let blockedSystem = false;
  try {
    await updateCat.execute(sysCat.id, userA.id, { name: 'Hack' });
  } catch {
    blockedSystem = true;
  }
  check('edição de categoria de sistema é bloqueada', blockedSystem);

  // Isolamento: userB (sem família) não vê categorias de userA
  const listB = await listCat.execute(userB.id);
  check(
    'userB não vê categorias de userA',
    !listB.some((c) => c.id === pet.id),
  );
  let blockedCross = false;
  try {
    await updateCat.execute(pet.id, userB.id, { name: 'Invasor' });
  } catch {
    blockedCross = true;
  }
  check('userB não consegue editar categoria de userA', blockedCross);

  // Delete com reatribuição: cria transação + meta na categoria, deleta
  const outros = await prisma.category.findFirst({
    where: { slug: 'outros', userId: null },
  });
  const tx = await prisma.transaction.create({
    data: {
      amount: 50,
      type: 'EXPENSE',
      description: 'gasto pet',
      userId: userA.id,
      categoryId: pet.id,
    },
  });
  await prisma.goal.create({
    data: { name: 'meta pet', amount: 200, userId: userA.id, categoryId: pet.id },
  });

  await deleteCat.execute(pet.id, userA.id);

  const txAfter = await prisma.transaction.findUnique({ where: { id: tx.id } });
  check(
    'transação reatribuída para Outros',
    txAfter?.categoryId === outros?.id,
    `(got ${txAfter?.categoryId})`,
  );
  const catGone = await prisma.category.findUnique({ where: { id: pet.id } });
  check('categoria excluída', catGone === null);
  const goalGone = await prisma.goal.findFirst({
    where: { categoryId: pet.id },
  });
  check('meta vinculada removida', goalGone === null);

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
    for (const uid of userIds) {
      await prisma.transaction.deleteMany({ where: { userId: uid } });
      await prisma.goal.deleteMany({ where: { userId: uid } });
      await prisma.category.deleteMany({ where: { userId: uid } });
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log('Limpeza concluída.');
    process.exit(fail > 0 ? 1 : 0);
  });
