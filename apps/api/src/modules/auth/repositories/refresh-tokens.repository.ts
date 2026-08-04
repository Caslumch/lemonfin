import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

// Validade da SESSÃO de longa duração (refresh token). 60 dias SEM rotação:
// quem usa o app renova só o access (15min) e segue logado; a sessão em si só
// cai por revogação explícita (logout, troca/reset de senha) ou 60 dias de
// inatividade.
const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;

// Motivo da revogação — só auditoria (não há mais lógica que dependa dele; a
// distinção "rotation vs security" existia para a janela de graça, agora
// removida junto com a rotação).
export type RevokeReason = 'logout' | 'security';

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

  async findByToken(raw: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(raw) },
    });
  }

  async revoke(id: string, reason: RevokeReason) {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  // Derruba TODAS as sessões do usuário (troca/reset de senha).
  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'security' },
    });
  }

  // Limpeza oportunista: remove tokens vencidos/revogados antigos do usuário.
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
