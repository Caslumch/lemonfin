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

  // Procura o usuário por qualquer uma das formas equivalentes do número (com/sem
  // o nono dígito, com/sem 55). O WhatsApp entrega a mesma pessoa em formas
  // diferentes, e não há heurística que diga qual é a "certa" — então passamos
  // todas as variações plausíveis e o banco decide qual existe.
  async findByPhoneCandidates(candidates: string[]) {
    if (candidates.length === 0) return null;
    return this.prisma.user.findFirst({
      where: { phone: { in: candidates } },
    });
  }

  async findAllWithPhone() {
    return this.prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, phone: true, ttsEnabled: true },
    });
  }

  // Usuários em TRIAL cujo teste termina dentro da janela — para o aviso de
  // fim de trial. Só TRIALING: quem já assinou (ACTIVE) não recebe.
  async findTrialsEndingBetween(start: Date, end: Date) {
    return this.prisma.user.findMany({
      where: {
        subscriptionStatus: 'TRIALING',
        trialEndsAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        trialEndsAt: true,
      },
    });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    trialEndsAt?: Date;
    termsAcceptedAt?: Date;
    termsVersion?: string;
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

  // Carimba (ou limpa, com null) o envio das boas-vindas do WhatsApp. Limpa-se
  // quando o telefone é removido, para um novo vínculo ser recebido de novo.
  async setWhatsappWelcomed(id: string, when: Date | null) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { whatsappWelcomedAt: when },
      select: { id: true, whatsappWelcomedAt: true },
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
