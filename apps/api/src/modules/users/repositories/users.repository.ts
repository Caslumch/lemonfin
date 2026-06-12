import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// findById é chamado em quase toda request autenticada (resolução do usuário
// atual). Cache curto (5min) evita ir ao banco repetidamente. As mutações
// abaixo invalidam a entrada para não servir dado velho após editar perfil,
// trocar senha ou mexer no 2FA.
const USER_CACHE_TTL = 5 * 60 * 1000; // 5min
const byIdKey = (id: string) => `user:id:${id}`;

@Injectable()
export class UsersRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    const key = byIdKey(id);
    const cached = await this.cache.get<User>(key);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (user) await this.cache.set(key, user, USER_CACHE_TTL);
    return user;
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findAllWithPhone() {
    return this.prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, phone: true },
    });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    trialEndsAt?: Date;
  }) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: { name?: string; phone?: string | null }) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, phone: true },
    });
    await this.cache.del(byIdKey(id));
    return user;
  }

  async markOnboarded(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { onboardedAt: new Date() },
      select: { id: true, onboardedAt: true },
    });
    await this.cache.del(byIdKey(id));
    return user;
  }

  async updatePassword(id: string, passwordHash: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true },
    });
    await this.cache.del(byIdKey(id));
    return user;
  }

  async markEmailVerified(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: new Date() },
      select: { id: true, emailVerifiedAt: true },
    });
    await this.cache.del(byIdKey(id));
    return user;
  }

  async updateTwoFactor(
    id: string,
    data: {
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string | null;
      backupCodes?: string[];
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        twoFactorEnabled: true,
      },
    });
    await this.cache.del(byIdKey(id));
    return user;
  }
}
