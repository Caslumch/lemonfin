import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PushTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Registra (ou reassocia) um token. O token é único globalmente: se o mesmo
  // aparelho passa a ser usado por outra conta (logout/login), o token migra
  // para o novo dono em vez de duplicar. `lastUsedAt` marca atividade.
  async register(userId: string, token: string, platform: string) {
    const now = new Date();
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, lastUsedAt: now },
    });
  }

  // Remove um token específico (logout no device). Não falha se já não existe.
  async unregister(token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token } });
  }

  // Remove vários tokens (limpeza de tokens mortos após DeviceNotRegistered).
  async removeMany(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.prisma.pushToken.deleteMany({ where: { token: { in: tokens } } });
  }

  async findByUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return rows.map((r) => r.token);
  }
}
