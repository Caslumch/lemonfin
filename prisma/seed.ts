import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: 'Alimentação', slug: 'alimentacao', icon: '🛒', colorBg: '#FFF3E0', colorText: '#E65100' },
  { name: 'Transporte', slug: 'transporte', icon: '🚗', colorBg: '#E3F2FD', colorText: '#1565C0' },
  { name: 'Moradia', slug: 'moradia', icon: '🏠', colorBg: '#F3E5F5', colorText: '#7B1FA2' },
  { name: 'Saúde', slug: 'saude', icon: '💊', colorBg: '#FBE9E7', colorText: '#BF360C' },
  { name: 'Lazer', slug: 'lazer', icon: '🎮', colorBg: '#E8F5E9', colorText: '#2E7D32' },
  { name: 'Educação', slug: 'educacao', icon: '📚', colorBg: '#E0F7FA', colorText: '#00838F' },
  { name: 'Compras', slug: 'compras', icon: '🛍️', colorBg: '#FFF8E1', colorText: '#F57F17' },
  { name: 'Salário', slug: 'salario', icon: '💰', colorBg: '#E8F5E9', colorText: '#2E7D32' },
  { name: 'Freelance', slug: 'freelance', icon: '💻', colorBg: '#EDE7F6', colorText: '#4527A0' },
  { name: 'Reservas', slug: 'reservas', icon: '🏦', colorBg: '#E0F2F1', colorText: '#00695C' },
  { name: 'Pagamento de fatura', slug: 'pagamento-fatura', icon: '💳', colorBg: '#E8EAF6', colorText: '#3F51B5' },
  { name: 'Ajuste de fatura', slug: 'ajuste-fatura', icon: '🧾', colorBg: '#ECEFF1', colorText: '#455A64' },
  { name: 'Outros', slug: 'outros', icon: '📌', colorBg: '#F5F5F5', colorText: '#6B6B6B' },
]

async function main() {
  console.log('Seeding categories...')

  for (const category of categories) {
    // Categorias de sistema têm userId null. Com o compound unique (userId, slug)
    // não dá para usar upsert direto (a semântica de NULL no SQL não casa em
    // índice único), então buscamos a de sistema pelo slug e criamos/atualizamos.
    const existing = await prisma.category.findFirst({
      where: { slug: category.slug, userId: null },
    })
    if (existing) {
      await prisma.category.update({ where: { id: existing.id }, data: category })
    } else {
      await prisma.category.create({ data: category })
    }
  }

  console.log(`Seeded ${categories.length} categories`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
