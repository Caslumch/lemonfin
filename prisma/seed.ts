import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: 'Alimentacao', slug: 'alimentacao', icon: '🛒', colorBg: '#FFF3E0', colorText: '#E65100' },
  { name: 'Transporte', slug: 'transporte', icon: '🚗', colorBg: '#E3F2FD', colorText: '#1565C0' },
  { name: 'Moradia', slug: 'moradia', icon: '🏠', colorBg: '#F3E5F5', colorText: '#7B1FA2' },
  { name: 'Saude', slug: 'saude', icon: '💊', colorBg: '#FBE9E7', colorText: '#BF360C' },
  { name: 'Lazer', slug: 'lazer', icon: '🎮', colorBg: '#E8F5E9', colorText: '#2E7D32' },
  { name: 'Educacao', slug: 'educacao', icon: '📚', colorBg: '#E0F7FA', colorText: '#00838F' },
  { name: 'Compras', slug: 'compras', icon: '🛍️', colorBg: '#FFF8E1', colorText: '#F57F17' },
  { name: 'Salario', slug: 'salario', icon: '💰', colorBg: '#E8F5E9', colorText: '#2E7D32' },
  { name: 'Freelance', slug: 'freelance', icon: '💻', colorBg: '#EDE7F6', colorText: '#4527A0' },
  { name: 'Outros', slug: 'outros', icon: '📌', colorBg: '#F5F5F5', colorText: '#6B6B6B' },
]

async function main() {
  console.log('Seeding categories...')

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    })
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
