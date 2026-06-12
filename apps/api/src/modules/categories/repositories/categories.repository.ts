import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { Category } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Categorias mudam raramente (são fixas/seed). São lidas em quase toda
// operação — sobretudo findBySlug, chamado a cada mensagem do WhatsApp/chat.
// Cache em memória com TTL 1h evita ir ao banco repetidamente.
const CACHE_TTL = 60 * 60 * 1000; // 1h
const ALL_KEY = 'categories:all';
const slugKey = (slug: string) => `categories:slug:${slug}`;
const idKey = (id: string) => `categories:id:${id}`;

@Injectable()
export class CategoriesRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(): Promise<Category[]> {
    const cached = await this.cache.get<Category[]>(ALL_KEY);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    await this.cache.set(ALL_KEY, categories, CACHE_TTL);
    return categories;
  }

  async findById(id: string): Promise<Category | null> {
    const key = idKey(id);
    const cached = await this.cache.get<Category>(key);
    if (cached) return cached;

    const category = await this.prisma.category.findUnique({ where: { id } });
    if (category) await this.cache.set(key, category, CACHE_TTL);
    return category;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const key = slugKey(slug);
    const cached = await this.cache.get<Category>(key);
    if (cached) return cached;

    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (category) await this.cache.set(key, category, CACHE_TTL);
    return category;
  }
}
