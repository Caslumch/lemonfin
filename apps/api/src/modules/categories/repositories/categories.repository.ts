import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { Category } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Apenas as categorias de SISTEMA (userId null) são cacheadas — mudam raramente
// e são lidas a cada mensagem do WhatsApp/chat. As categorias do usuário são
// poucas e sempre buscadas frescas, evitando cache velho ao criar/editar/excluir.
const CACHE_TTL = 60 * 60 * 1000; // 1h
const SYSTEM_KEY = 'categories:system';

@Injectable()
export class CategoriesRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findSystem(): Promise<Category[]> {
    const cached = await this.cache.get<Category[]>(SYSTEM_KEY);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { userId: null },
      orderBy: { name: 'asc' },
    });
    await this.cache.set(SYSTEM_KEY, categories, CACHE_TTL);
    return categories;
  }

  // Sistema + categorias da família (userIds). Sistema primeiro, depois as do
  // usuário por nome.
  async findForUser(userIds: string[]): Promise<Category[]> {
    const [system, own] = await Promise.all([
      this.findSystem(),
      this.prisma.category.findMany({
        where: { userId: { in: userIds } },
        orderBy: { name: 'asc' },
      }),
    ]);
    return [...system, ...own];
  }

  // Lookup por id (validação de categoryId em transações/metas/recorrentes).
  // Cache só para as de sistema; as do usuário vão direto ao banco.
  async findById(id: string): Promise<Category | null> {
    const system = await this.findSystem();
    const inSystem = system.find((c) => c.id === id);
    if (inSystem) return inSystem;
    return this.prisma.category.findUnique({ where: { id } });
  }

  // Resolve um slug. Com userIds, procura nas da família primeiro (categorias
  // customizadas têm prioridade), depois cai nas de sistema. Sem userIds
  // (callers legados), procura só nas de sistema.
  async findBySlug(slug: string, userIds?: string[]): Promise<Category | null> {
    if (userIds && userIds.length > 0) {
      const own = await this.prisma.category.findFirst({
        where: { slug, userId: { in: userIds } },
      });
      if (own) return own;
    }
    const system = await this.findSystem();
    return system.find((c) => c.slug === slug) ?? null;
  }

  // Slugs já ocupados para um dono: as de sistema + as próprias. Base para gerar
  // um slug único na criação.
  async getTakenSlugs(userId: string): Promise<Set<string>> {
    const cats = await this.prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      select: { slug: true },
    });
    return new Set(cats.map((c) => c.slug));
  }

  // Categoria pertencente ao escopo da família (exclui as de sistema, que têm
  // userId null e não entram no filtro). Usada para autorizar edição/exclusão.
  async findOwned(id: string, userIds: string[]): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, userId: { in: userIds } },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    icon: string;
    colorBg: string;
    colorText: string;
    userId: string;
  }): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      icon?: string;
      colorBg?: string;
      colorText?: string;
    },
  ): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  // Exclui a categoria reatribuindo transações/recorrentes para "Outros" e
  // removendo metas vinculadas (Goal tem unique[userId, categoryId] e FK sem
  // cascade). Tudo numa transação para não deixar estado inconsistente.
  async deleteAndReassign(id: string): Promise<void> {
    const outros = await this.prisma.category.findFirst({
      where: { slug: 'outros', userId: null },
    });
    if (!outros) {
      throw new Error('Categoria de sistema "Outros" nao encontrada');
    }

    await this.prisma.$transaction([
      this.prisma.transaction.updateMany({
        where: { categoryId: id },
        data: { categoryId: outros.id },
      }),
      this.prisma.recurringTransaction.updateMany({
        where: { categoryId: id },
        data: { categoryId: outros.id },
      }),
      this.prisma.goal.deleteMany({ where: { categoryId: id } }),
      this.prisma.category.delete({ where: { id } }),
    ]);
  }
}
