import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

// Validade da sessão de longa duração. 60 dias com ROTAÇÃO a cada uso: quem
// usa o app segue logado indefinidamente; quem some por 60 dias faz login de
// novo.
const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Emite um refresh token novo para o usuário. Devolve o token CRU (única vez
  // que ele existe fora do cliente) — no banco fica só o hash.
  async issue(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return raw;
  }

  // Busca pelo token cru SEM filtrar revogado/expirado — quem chama decide o
  // que fazer (reuso de revogado é sinal de roubo, não um simples "não achei").
  async findByToken(raw: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(raw) },
    });
  }

  async revoke(id: string) {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  // Derruba TODAS as sessões do usuário (troca/reset de senha, reuso de token).
  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Limpeza oportunista: remove tokens vencidos/revogados antigos do usuário
  // (chamada no refresh — evita crescimento sem precisar de cron dedicado).
  async pruneForUser(userId: string) {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }],
      },
    });
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
